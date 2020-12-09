<?php namespace kiss\db;

use kiss\exception\ArgumentException;
use kiss\Kiss;
use kiss\models\BaseObject;

class ActiveRecord extends BaseObject{

    private $_columns   = null;
    private $_dirty     = [];
    private $_newRecord = true;

    /** The name of the table */
    public static function tableName() 
    {
        $parts = explode('\\', get_called_class());
        return "$" . strtolower(end($parts)); 
    }

    /** The ID of the table */
    public static function tableKey() { return ['id']; }
    
    public function __get($name) {
        if (method_exists($this, "get$name")) {
            $result = $this->{"get$name"}();
            if ($result instanceof ActiveQuery) {
                $all = $result->all();
                $limit = $result->getLimit();
                if ($limit == null || $limit[0] > 1) return $all;
                return $all[0] ?? null;
            }
            return $result;
        }

        if (stripos($name, '_') !== 0 && property_exists($this, $name))
            return $this->{$name};
    }

    public function __set($name, $value) {      
        if (method_exists($this, "set$name")) {            
            $this->{"set$name"}($value);
            $this->_dirty[] = $name;
        } else  if (stripos($name, '_') !== 0 && property_exists($this, $name)) {
            $this->{$name} = $value;
            $this->_dirty[] = $name;
        }         
    }

    /** Gets the string representation of the key
     * @return string 
     */
    public function getKey() {
        return join(',', array_values($this->getKeys()));
    }

    /** Gets the list of keys
     * @return array keys
      */
    public function getKeys() {
        $keys = [];
        foreach(self::tableKey() as $key) $keys[$key] = $this->{$key};
        return $keys;
    }

    /** Checks if the record is new.
     * @return boolean true if it has not yet been saved or loaded.
     */
    public function isNewRecord() { return $this->_newRecord; }

    
    /** Checks if hte record is dirty.
     * @return boolean true if it is dirty.
     */
    public function isDirtyRecord() { return $this->isNewRecord() || count($this->_dirty) > 0; }

    /** List of attributes that are dirty and need saving
     * @return string[] 
     */
    public function getDirty() {  return $this->isNewRecord() ? $this->fields() : $this->_dirty; }

    /** Clears the attributes that are dirty 
     * @return $this
    */
    public function clearDirty() {
        $this->_dirty = [];
        return $this;
    }

    /** Before the load */
    protected function beforeQueryLoad($data) {}
    /** After the load */
    protected function afterQueryLoad($data) {}

    /** Before the save */
    protected function beforeSave() {}
    /** After the save */
    protected function afterSave() {}

    /** An array of fields */
    public function fields() { 
        if (!empty($this->_columns)) 
            return $this->_columns;
        
        $keys = array_keys(get_object_vars($this));
        $fields = [];
        foreach($keys as $k) { 
            if (strpos($k, "_") !== 0) {
                $fields[] = $k;
            }
        }

        return $fields;
    }
    
    /** The columns that have been loaded in the last Load(); */
    public function columns() { return $this->_columns; }

    /** Will load the active record with the given tableKey. Will define the properties of the object and store the loaded columns. 
     * {@inheritdoc}
    */
    public function load($data = null) {
        
        //Load via the schema
        if ($data != null) {
            return parent::load($data);
        }

        //Otherwise load it regularly
        $this->beforeLoad($data);
        
        //Prepare the query
        $query = Kiss::$app->db()->createQuery()->select(self::tableName())->limit(1);
        
        //Add the table keys as the where condition
        $condition = self::whereByKeys($this);
        $query->andWhere($condition);
        //$tableKeys = self::tableKey();
        //if (is_string($tableKeys)) {
        //    $query->andWhere([$tableKeys, $this->{$tableKeys}]);
        //} else {
        //    foreach($tableKeys as $key) {
        //        $query->andWhere([$key, $this->{$key}]);
        //    }
        //}

        //Execute the query
        $result = $query->execute();
        if ($result !== false) {

            //Make sure we have the correct amount of values
            if (count($result) == 0) {
                $this->afterLoad([], false);
                return false;
            }
            
            //Copy all the values over
            assert(count($result) == 1, 'Only 1 item found.');
            $this->setQueryResult($result[0]);
            $this->afterLoad($result[0], true);
            return true;
        }

        //We didn't load anything
        $this->afterLoad([], false);
        return false;
    }

    /** Validates if this model is able to save. 
     * This method should use [[addError]] to record the reason the object is unable to save.
     * @return bool true if its validated.
     */
    public function validate() { return true;  }    //TODO: Implement Schema Validate

    /** Saves the active record using the tableFields. Returns false if unsuccessful.
     * @param boolean $validate should the validate function be called before saving.
     * @param array|null $fields the fields to save
     * @param boolean $ignoreEmpty will cause it to pretend it was saved when there are no fields to save.
    */
    public function save($validate = true, $fields = null, $ignoreEmpty = true) {
        
        //Validation error
        if ($validate && !$this->validate()) return false;

        $this->beforeSave();

        //Prepare all the values
        $values = [];
        if ($fields == null) $fields = $this->getDirty();
        if (count($fields) == null) return $ignoreEmpty && !$this->_newRecord;

        //Prepare the values
        foreach ($fields as $key) {
            $values[$key] = $this->{$key};
        }

        $class = get_called_class();
        $table = $class::tableName();

        //Prepare the query and execute
        if ($this->isNewRecord()) {
            $query = Kiss::$app->db()->createQuery()
                                        ->insertOrUpdate($values, $table);
        } else {
            $query = Kiss::$app->db()->createQuery()
                                        ->update($values, $table)
                                        ->where(self::whereByKeys($this));
        }

        //Execute the query, returning false if it didn't work
        $result = $query->execute();
        if ($result === false) {
            $this->addError('Failed to execute the save query.');
            return false;
        }

        //Update our ID
        $this->_newRecord = false;        
        $this->clearDirty();

        $tableKeys = self::tableKey();
        if (is_string($tableKeys)) {
            if ($result !== '0' || $this->{$tableKeys} == null)
                $this->{$tableKeys} = $result;
        } else {            
            if ($result !== '0' || $this->{$tableKeys[0]} == null)
                $this->{$tableKeys[0]} = $result;
        }

        //Return the last auto incremented id
        $this->afterSave();
        return true;
    }

    /** Sets the results from the query */
    public function setQueryResult($result) {
        $this->beforeQueryLoad($result);
        $this->beforeLoad($result);

        $this->_newRecord = false;  // ( no longer a new record, so lets toggle that flag )
        $this->clearDirty();

        foreach($result as $key => $pair) {
            $type = self::getPropertyType($key);
            switch($type) {
                default:
                case 'string':
                    $this->{$key} = "{$pair}";
                    break;
                case 'integer':
                    $this->{$key} = intval($pair);
                    break;
                case 'float':
                    $this->{$key} = floatval($pair);
                    break;
                case 'boolean':
                    $this->{$key} = boolval($pair);
                    break;
                    
                //TODO: Add support for refs here.
            }

            $this->_columns[] = $key;
        }
        $this->afterLoad($result, true);
        $this->afterQueryLoad($result);
    }

    /** Prepares an ActiveQuery statement for the class 
     * @return ActiveQuery
    */
    public static function find() {
        return new ActiveQuery(Kiss::$app->db(), get_called_class());
    }

    /** Finds the query by keys.
     * @param mixed $keys either a key, op, keys or a string of value.
     * @return ActiveQuery
     */
    public static function findByKey($keys) {
        $condition = self::whereByKeys($keys);
        return self::find()->where($condition);
    }

    /** Converts the table keys into a where condition
     * @param array|string|ActiveRecord $keys They keys and their values, a list of composite values, or a specific active record to find.
     * @param $this $object the object to pull the key values from.
     * @return array the condition
     */
    protected static function whereByKeys($keys) {
        $tableKeys = self::tableKey();

        if (is_string($tableKeys)) {
            $tableKeys = [ self::tableKey() ];
        }

        $condition = [];

        if (is_numeric($keys)) {
            $keys = "$keys";
        }
        
        //Its null, so lets use our attributes
        if ($keys instanceof ActiveRecord) {
            $record = $keys;
            $keys = [];
            foreach($tableKeys as $key)
                $keys[$key] = $record->__get($key);
        }

        //Its a string, so lets just use it (unless we are composite, then convert to array)
        if (is_string($keys)) {
            if (count($tableKeys) == 1) {
                $condition = [ $tableKeys[0], '=', $keys ];
            } else {
                //WE explode it into an array. It will have a 1 to 1 matching with the table keys.
                $keys = explode(',', $keys);
            }
        } 
    
        //Its an array, so work on the composite
        if (is_array($keys)) {
            foreach ($keys as $key => $value) {

                if ($value instanceof ActiveRecord)
                    $value = $value->getKey();
                
                if (is_numeric($key)) {
                    $condition[] = [ $tableKeys[$key], '=', $value ];
                } else {
                    $condition[] = [$key, '=', $value ];
                }
            }
        }

        return $condition;
    }
}