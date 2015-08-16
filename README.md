# gaurav-IndexDb

###IndexedDB
This is a simple indexedDB module which allows you to do the following

1. Set database name
2. Set database version
3. Create objectStores(tables)
  * Allow you to set indexes(fields)
  * Allow you to set key path field
4. Creates a indexDb factory services,controllers to access database
  * provedies an models object containing various table names as properties to perform operation
5. Operations performed on a table
  1. create
  2. find
  3. update
  4. getAll
  5. findByIndex
  6. getByIndex
6. Each method provides two callback a success call back and an error callback
  
##Installing
First add the js file
```
<script src="indexDb.js"></script>
```

Then add "indexed-db" to you angular application module list 
```javascript
angular.module('demo', ["indexed-db"])
```

##Using
####1. Setting configuration
  * In you .config file infject the "indexDbProvider" like this
```javascript
angular.module('demo').config(function(indexDbProvider){
..code
}
```
  * Configure your database name like this
```javascript
indexDbProvider.setDbName('test');
```
  * Configure your database version like this(it only accepts integer values)
```javascript
indexDbProvider.setDbVersio(1);
```
Setting a increased version number fires onupgradeneeded function

  * Configure your table schema
    * The table schema needs to be provided as an array of objects
```javascript
var tables = [{
        name: 'users',
        fields: [{
            name: 'id',
            keyPath: true
        }, {
            name: 'email',
        }]
    }, {
        name: 'lists',
        fields: [{
            name: 'id',
            keyPath: true
        }, {
            name: 'name'
        }, {
            name: 'userId'
        }, {
            name: 'tasks'
        }]
    }];
```
    * The object of table must contain unique  names else it will throw error.
    * The fields property is also an array containg field names. This too shold be unique else you will get an error
    * An attribute keyPath can bet set which will set this field as main keyPath for the table as unique and autoincrement
    * Only *1* keypath is allowed in a table
    
  * Create table using
```javascript
  indexDbProvider.setTables(tables);
```

####2. Usage
  * In your controller just inject "indexDb" like this
```javascript
angular.module('demo').controller('demoController', function(indexDb){
... code
```
  * create (Create a record)
```javascript
  var data = {};
  data.email = "test@test.com";
  
  /**success callback
   * @param object result [contains record of created object]
   * @param mixed id [contains keyPath value of record]
   */
  function successCallback(result, id){
    ..code
  }
  
  /**error callback
   * @param event error [contains error definition of transaction]
   */
  function errorCallback(error){
    ..code
  }
  
  indexDb.models.users.create(data, successCallback, errorCallback);
  ```
      * Simply fire indexDb.models followed by table name and then create
      * Pass data to be stored
      * Pass second paremeter as function to be used for success callback. This function will have two parameter. First one will be complete object stored in database. Second parmeter will be the keyPath value.
      
  * find (Find by keyPath)
      * .find finds the record against the keyPath value and returns record against it. 
      * If no record is found then returns 'undefined'

```javascript
var id = 5; // keyPath value of record

/** success callback
 * @param object result [contains the retrieved record]
 */
function successCallback (result) {
..code
}

indexDb.models.users.find(id, successCallback, errorCallback);
```

  * findByIndex (Find by other indexes in record)
    * Pass the index name as string
    * Pass the value to match it against
    
```javascript
var index = 'email';
var indexValue = "test@test.com";

/** success callback
 * @param object result [contains the retrieved record]
 */
function successCallback (result) {
..code
}

indexDb.models.users.findByIndex(index, indexValue, successCallback, errorCallback);
```

  * getAll (Retrive all records in a objectStore[table])
    * Just fire getAll to retrieve all records as an array of objects
    
```javascript
indexDb.models.lists.getAll(successCallback, errorCallback);
```

  * getByIndex (The getByIndex allows you to serach for bouded data)
    * first pass the index where you want to search . For example list name
    * Then define the bound object which can have the following properties
      * *only* -  will serach for that value only.(e.g only : 'testList' will serach in database where list name index value is 'testList')
  ```javascript
  var bouds = {};
  bounds.only = "testList";
  ```
      * *lowerBound* - should be an object type. It contains two property value and notInclude. The notInclude propty if set true then will not include the given value
```javascript
bounds.lowerBound = {};
bounds.lowerBound.value = "testList";
```
        * if notInclude property is not set then by default it will contain the lowerBund value
```javascript
bounds.lowerBound.notInclude = true;
```
        * If set to true then result will not include the value
        
       * usage
```javasript
/**successcallback
 * @param array result [contains array of object of records]
 */
 function successCallback(result){
 ..code
 }
 
var index = "name";
indexDb.models.lists.getByIndex(index, bounds, successCallback, errorCallback);
```

  * update (Update simply updates the record at index)
    * Simply create and updated object containing the keyPath property for updating
```javasript
var data = {};
data.id = list.id; //record id to be updated
data.name = newName //data being updated

indexDb.models.lists.update(data, successCallback, errorCallback);
```

  * deleteById (deletes the record at the keyPath record)
``` javascript
var keyPath = 5; //keyPath id being deleted

indexDb.models.lists.deleteById(5, successCallback, errorCallback);
```
