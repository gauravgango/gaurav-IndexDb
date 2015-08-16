angular.module('indexed-db', []);

function indexDbProvider($windowProvider) {
    'use strict';
    var $window = $windowProvider.$get();
    var indexDb = $window.indexedDB || $window.mozIndexedDB || $window.webkitIndexedDB || $window.msIndexedDB;
    var dbName = "testDb";
    var dbVersion = 1;
    var dbTables = [];
    var checks = {};
    var connection, rootScope;
    var models = {};

    /**
     * Base function class to be used for creating connection to database for models
     */
    function ModelDefination() {

        var modelDefination = this;

        this.createConnection = function () {
            modelDefination.currentConnection = indexDb.open(dbName, dbVersion);
        };


        modelDefination.createConnection();

        modelDefination.currentConnection.onerror = function (event) {
            throw {
                message: "Unable to open connection to database",
                error: event
            };
        };
    }


    /**
     * Base model class extending base connection class 
     * @param {string} modelName [model table name]
     */
    function ModelObject(modelName) {

        /**
         * Function checks base success and error callback types
         * @param  {function} successCallback [success callback definition]
         * @param  {function} errorCallback   [error callback definition]
         */
        function checkBaseCallbacks(successCallback, errorCallback) {
            if (angular.isDefined(successCallback)) {
                if (!angular.isFunction(successCallback)) {
                    throw "Success callback must be a type of function";
                }

                if (angular.isDefined(errorCallback)) {
                    if (!angular.isFunction(errorCallback)) {
                        throw "Error callback must be a type of function";
                    }
                }
            }
        }

        /**
         * Function sets bound value for openCursor definition
         * @param  {object} boundValues [contains bound value definition]
         * @return {null/IDBKeyRange}             [contains null if boundValue object is empty else returns IDBKeyRange]
         */
        function getBounds(boundValues) {
            var bounds = null;
            var notIncludeUpper, notIncludeLower;
            notIncludeLower = notIncludeUpper = false;

            //if bound values has only
            if (angular.isDefined(boundValues.only)) {
                return $window.IDBKeyRange.only(boundValues.only);
            }

            if (angular.isDefined(boundValues.lowerBound)) {
                if (angular.isUndefined(boundValues.lowerBound.value)) {
                    throw "Lower bound value not provided";
                }
                notIncludeLower = (angular.isDefined(boundValues.lowerBound.notInclude)) ? boundValues.lowerBound.notInclude : notIncludeLower;
                return $window.IDBKeyRange.lowerBound(boundValues.lowerBound.value, notIncludeLower);
            }

            if (angular.isDefined(boundValues.upperBound)) {
                if (angular.isUndefined(boundValues.upperBound.value)) {
                    throw "Lower bound value not provided";
                }
                notIncludeUpper = (angular.isDefined(boundValues.upperBound.notInclude)) ? boundValues.upperBound.notInclude : notIncludeUpper;
                return $window.IDBKeyRange.upperBound(boundValues.upperBound.value, notIncludeLower);
            }

            return bounds;
        }

        var model = this;
        model.modelName = modelName;

        /**
         * Function updates the data which also includes the keyPath id
         * @param  {object} data            [contains data to be updated with keyPath id]
         * @param  {function} successCallback [user success callback function]
         * @param  {function} errorCallback   [user error callback function]
         */
        model.deleteId = function (id, successCallback, errorCallback) {
            var transaction;

            checkBaseCallbacks(successCallback, errorCallback);
            if (angular.isUndefined(id)) {
                throw "Index value of undefined given";
            }
            ModelDefination.apply(this); //inheriting base db definition


            //on database connection
            this.currentConnection.onsuccess = function (event) {
                transaction = event.target.result.transaction([model.modelName], "readwrite");
                var objectStore = transaction.objectStore(model.modelName);

                objectStore = objectStore.delete(id);

                objectStore.onsuccess = function (e) {
                    if (angular.isDefined(successCallback)) {
                        //e.target.result contains the record value of result
                        rootScope.$apply(successCallback(e)); //success callback of user
                    }


                };

                objectStore.onerror = function (e) {
                    if (angular.isDefined(errorCallback)) {
                        rootScope.$apply(errorCallback(e)); //error callback of user
                    }
                };
            };
        };

        /**
         * Function updates the data which also includes the keyPath id
         * @param  {object} data            [contains data to be updated with keyPath id]
         * @param  {function} successCallback [user success callback function]
         * @param  {function} errorCallback   [user error callback function]
         */
        model.update = function (data, successCallback, errorCallback) {
            var transaction;

            checkBaseCallbacks(successCallback, errorCallback);
            ModelDefination.apply(this); //inheriting base db definition


            //on database connection
            this.currentConnection.onsuccess = function (event) {
                transaction = event.target.result.transaction([model.modelName], "readwrite");
                var objectStore = transaction.objectStore(model.modelName);

                objectStore = objectStore.put(data);

                objectStore.onsuccess = function (e) {
                    if (angular.isDefined(successCallback)) {
                        //e.target.result contains the record value of result
                        rootScope.$apply(successCallback(e)); //success callback of user
                    }


                };

                objectStore.onerror = function (e) {
                    if (angular.isDefined(errorCallback)) {
                        rootScope.$apply(errorCallback(e)); //error callback of user
                    }
                };
            };
        };

        /**
         * Function retrieves all records against table else returns it as empty
         * @param  {string} index           [index to be searched]
         * @param  {object} boundValues     [bound values of object to be used for filtering]
         * @param  {function} successCallback [success callback]
         * @param  {function} errorCallback   [error callback]
         * @return  {array}   [returns array of records ]
         */
        model.getByIndex = function (index, boundValues, successCallback, errorCallback) {
            var transaction, bounds;

            checkBaseCallbacks(successCallback, errorCallback);
            ModelDefination.apply(this); //inheriting base db definition

            //on database connection
            this.currentConnection.onsuccess = function (event) {
                transaction = event.target.result.transaction([model.modelName], "readwrite");
                var objectStore = transaction.objectStore(model.modelName);
                var data = [];

                if (!angular.isString(index)) {
                    throw "Index must be type of string.";
                }

                if (!angular.isObject(boundValues)) {
                    throw "Bound values value must be type of object.";
                }

                objectStore = objectStore.index(index);
                bounds = getBounds(boundValues);

                if (bounds !== null) {
                    objectStore = objectStore.openCursor(bounds);
                } else {
                    objectStore = objectStore.openCursor();
                }


                objectStore.onsuccess = function (e) {
                    var cursor = e.target.result;

                    //cursor will keep iterating over whole database till it returns empty
                    if (cursor) {
                        data.push(cursor.value);
                        cursor.continue();
                    } else {

                        if (angular.isDefined(successCallback)) {

                            //e.target.result contains the record value of result
                            rootScope.$apply(successCallback(data)); //success callback of user
                        }

                    }
                };

                objectStore.onerror = function (e) {
                    if (angular.isDefined(errorCallback)) {
                        rootScope.$apply(errorCallback(e)); //error callback of user
                    }
                };
            };
        };

        /**
         * Function retrieves all records against table else returns it as empty
         * @param  {string} index           [index to be searched]
         * @param  {mixed} id              [index value to be searched]
         * @param  {function} successCallback [success callback]
         * @param  {function} errorCallback   [error callback]
         * @return  {array}   [returns array of records ]
         */
        model.getAll = function (successCallback, errorCallback) {
            var transaction;

            checkBaseCallbacks(successCallback, errorCallback);
            ModelDefination.apply(this); //inheriting base db definition

            //on database connection
            this.currentConnection.onsuccess = function (event) {
                transaction = event.target.result.transaction([model.modelName], "readwrite");
                var objectStore = transaction.objectStore(model.modelName);
                var data = [];

                //using indexedDB get with index to find first result
                objectStore = objectStore.openCursor();


                objectStore.onsuccess = function (e) {
                    var cursor = e.target.result;

                    //cursor will keep iterating over whole database till it returns empty
                    if (cursor) {
                        data.push(cursor.value);
                        cursor.continue();
                    } else {

                        if (angular.isDefined(successCallback)) {

                            //e.target.result contains the record value of result
                            rootScope.$apply(successCallback(data)); //success callback of user
                        }

                    }
                };

                objectStore.onerror = function (e) {
                    if (angular.isDefined(errorCallback)) {
                        rootScope.$apply(errorCallback(e)); //error callback of user
                    }
                };
            };
        };

        /**
         * Function finds by index and returns first result
         * @param  {string} index           [index to be searched]
         * @param  {mixed} id              [index value to be searched]
         * @param  {function} successCallback [success callback]
         * @param  {function} errorCallback   [error callback]
         * @return  {object/undefined}   [return record value else undefined]
         */
        model.findByIndex = function (index, id, successCallback, errorCallback) {
            var transaction;

            checkBaseCallbacks(successCallback, errorCallback);
            if (!angular.isString(index)) {
                throw "Index must be type of string.";
            }

            if (angular.isUndefined(id)) {
                throw "Index value of undefined given";
            }

            ModelDefination.apply(this); //inheriting base db definition

            //on database connection
            this.currentConnection.onsuccess = function (event) {
                transaction = event.target.result.transaction([model.modelName], "readwrite");
                var objectStore = transaction.objectStore(model.modelName);

                //using indexedDB get with index to find first result
                objectStore = objectStore.index(index).get(id);

                objectStore.onsuccess = function (e) {

                    if (angular.isDefined(successCallback)) {
                        //e.target.result contains the record value of result
                        rootScope.$apply(successCallback(e.target.result, id)); //success callback of user
                    }
                };

                objectStore.onerror = function (e) {

                    if (angular.isDefined(errorCallback)) {
                        rootScope.$apply(errorCallback(e)); //error callback of user
                    }
                };
            };
        };

        /**
         * Function finds the result according to keyPath id of the table and returns 
         * @param  {mixed} id              [contains keyPath value to be searched]
         * @param  {function} successCallback [success callback of user]
         * @param  {error} errorCallback   [error callback of user]
         * @return  {object/undefined}   [return record value else undefined]
         */
        model.find = function (id, successCallback, errorCallback) {
            var transaction;

            checkBaseCallbacks(successCallback, errorCallback);
            ModelDefination.apply(this); //inheriting base db definition

            //on database connection
            this.currentConnection.onsuccess = function (event) {
                transaction = event.target.result.transaction([model.modelName], "readwrite");
                var objectStore = transaction.objectStore(model.modelName);

                //using indexedDB get directly (fires on keyPath default)
                objectStore = objectStore.get(id);

                objectStore.onsuccess = function (e) {

                    if (angular.isDefined(successCallback)) {

                        //e.target.result contains the record value of result
                        rootScope.$apply(successCallback(e.target.result, id)); //user success callback
                    }
                };

                objectStore.onerror = function (e) {
                    if (angular.isDefined(errorCallback)) {
                        errorCallback(e); //user error callback
                    }
                };
            };
        };

        /**
         * Function creates a record to indexDB and returns 
         * @param  {mixed} data            [contains data to be saved]
         * @param  {function} successCallback [success callback function]
         * @param  {function} errorCallback   [error callback function]
         * @return {object} [contains newly created record with result id]
         */
        model.create = function (data, successCallback, errorCallback) {
            var transaction;

            checkBaseCallbacks(successCallback, errorCallback);

            ModelDefination.apply(this); //inheriting base db definition

            //on database connection
            this.currentConnection.onsuccess = function (event) {

                transaction = event.target.result.transaction([model.modelName], "readwrite");
                var objectStore = transaction.objectStore(model.modelName);

                //using indexedDB add to insert data to database
                objectStore = objectStore.add(data);

                objectStore.onsuccess = function (e) {

                    //after successful crate function firing model.find to get complete record value
                    //e.target.result contains newly created record keyPath value
                    //passing both the success and error callback to find
                    model.find(e.target.result, successCallback, errorCallback);
                };

                objectStore.onerror = function (e) {
                    if (angular.isDefined(errorCallback)) {
                        rootScope.$apply(errorCallback(e)); //user error callback
                    }
                };
            };


        };
    }



    /**
     * Checks each field of table for name and keyPath. 
     * If no keyPath is found then overwrites the keyPath field with id.
     * If any error are found then the system throws error
     * @param  {array} fields [contains all fields of current table]
     * @param  {string} tableName [contains table name of current field being checked]
     * @return {object}        [return fields array updated]
     */
    checks.checkFields = function (fields, tableName) {
        var fieldNames = [];
        var keyPath = false;
        var keyPathField = 'id';
        var configFields = [];
        var idIndex = -1;

        angular.forEach(fields, function (field) {

            //validating field structure
            if (angular.isUndefined(field.name)) {
                throw "Field name not given for table " + tableName;
            }

            if (fieldNames.indexOf(field.name) !== -1) {
                throw "Multiple filed name " + field.name + " used in table " + tableName;
            }

            fieldNames.push(field.name);

            //checking if keyPath setting was given
            if (!angular.isUndefined(field.keyPath)) {

                //if keyPath has been already been defined to another field 
                //and also the current field also has key path then throwing error
                if (field.keyPath && keyPath) {
                    throw "Only one keyPath per table is allowed. Found in table " + tableName;
                }

                keyPath = (keyPath === true) ? keyPath : field.keyPath;
                keyPathField = (keyPath === true) ? keyPathField : field.name;
            }

            //pushing non key path fields to other field list
            if (!(keyPath && keyPathField === field.name)) {
                configFields.push(field);
            }

        });

        //till now no key path field was defined then overwriting this key path field with 
        //default id field
        if (!keyPath) {

            //checking if any other field was given same name
            //then removing it from field list
            idIndex = fieldNames.indexOf(keyPathField);
            if (idIndex !== -1) {
                configFields.splice(idIndex, 1);
            }
        }

        return {
            other: configFields,
            keyPathField: keyPathField
        };
    };

    /**
     * Function checks table data and creates general table structure for creating
     * @param  {array} tables [contains table array]
     * @return {array}        [contains updated structure of tables for creating them in database]
     */
    checks.checkTables = function (tables) {
        var tableNames = [];
        var configTables = [];
        var configTable;
        angular.forEach(tables, function (table) {

            configTable = {
                name: '',
                fields: {
                    other: [],
                    keyPathField: 'id'
                }
            };


            if (angular.isUndefined(table.name)) {
                throw "Table name not given";
            }

            if (tableNames.indexOf(table.name) !== -1) {
                throw "Multiple table name " + table.name + " used";
            }

            tableNames.push(table.name);
            configTable.name = table.name;

            if (angular.isDefined(table.fields)) {
                configTable.fields = checks.checkFields(table.fields, table.name);
            }

            configTables.push(configTable);

        });
        return configTables;
    };

    /**
     * Function creates data base and tables on upgrade
     * @param  {string} name    [contains db name]
     * @param  {number} version [contains version]
     * @param  {array} tables  [contains tables for creating]
     */
    function createDb(name, version, tables) {

        connection = indexDb.open(name, version);
        console.log('updated');

        //performing create table on upgrade db 
        connection.onupgradeneeded = function (event) {

            var db = event.target.result;
            angular.forEach(tables, function (table) {

                //inserting new table only not exists
                if (!db.objectStoreNames.contains(table.name)) {

                    var store = db.createObjectStore(table.name, {
                        keyPath: table.fields.keyPathField,
                        autoIncrement: true,
                        unique: true
                    });

                    //inserting other fields of table
                    angular.forEach(table.fields.other, function (field) {
                        store.createIndex(field.name, field.name, {});
                    });
                }

                models[table.name] = new ModelObject(table.name);

            });
        };

        //performing create table models on successful db connection
        connection.onsuccess = function () {
            angular.forEach(tables, function (table) {

                //if model of table is still undefined then creating it
                if (angular.isUndefined(models[table.name])) {
                    models[table.name] = new ModelObject(table.name);
                }

            });
        };

        connection.onerror = function (event) {
            throw {
                message: "Unable to crate connection to database",
                error: event
            };
        };
    }

    /**
     * function initializes the indexDb factory and checks whether indexDb is supported or not
     * @return {indexDB} [contains instance of index db according to browser]
     */
    function initialize($rootScope) {
        rootScope = $rootScope;
        if (angular.isUndefined(indexDb)) {
            throw "indexDb not supported";
        }

        // indexDb.deleteDatabase(dbName);
        createDb(dbName, dbVersion, dbTables);
        return {
            indexDb: indexDb,
            dbName: dbName,
            dbVersion: dbVersion,
            dbTables: dbTables,
            models: models
        };
    }

    initialize.$inject = ["$rootScope"];

    /**
     * Function sets the database name dbName to be used
     * @param {string} name [contains database name]
     */
    function setDbName(name) {

        //validating input
        if (angular.isUndefined(name)) {
            throw "Database name not given";
        }

        if (!angular.isString(name)) {
            throw "Database name must be a string type";
        }

        dbName = name;
    }


    /**
     * function sets dbTable definition
     * @param {array} tables [contains tables definition array]
     */
    function setTables(tables) {

        //validating inputs
        if (angular.isUndefined(tables)) {
            throw "Tables parameter given is undefined";
        }

        if (!angular.isArray(tables)) {
            throw "Tables parameter must be a type of array";
        }

        dbTables = checks.checkTables(tables);
    }

    /**
     * Function sets the database version to be used
     * @param {number} name [contains database version]
     */
    function setVersion(version) {

        //validating inputs
        if (angular.isUndefined(version)) {
            throw "Database version not given";
        }

        if (!angular.isNumber(version)) {
            throw "Database version must be a number type";
        }

        if (version < 1) {
            throw "Minimum version value must be 1";
        }

        dbVersion = parseInt(version, 10);
    }

    return {
        setDbName: setDbName,
        setTables: setTables,
        setVersion: setVersion,
        $get: initialize
    };
}
indexDbProvider.$inject = ["$windowProvider"];
angular.module('indexed-db').provider('indexDb', indexDbProvider);
