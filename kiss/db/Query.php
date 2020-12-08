<?php namespace kiss\db;

use Exception;
use kiss\exception\QueryException;
use kiss\exception\SQLException;
use kiss\Kiss;

class Query {

    protected const QUERY_SELECT = 'SELECT';
    protected const QUERY_SELECT_MINIMISE = 'SELECT_MINIMISE';
    protected const QUERY_DELETE = 'DELETE';
    protected const QUERY_UPDATE = 'UPDATE';
    protected const QUERY_INSERT = 'INSERT';
    protected const QUERY_INSERT_OR_UPDATE = 'INSERT_OR_UPDATE';

    /** @var int $cacheDuration how long in second cached results last for. */
    public $cacheDuration = 5;
    private $cacheVersion = 4;

    protected $conn;
    
    protected $query;
    protected $from;
    protected $values = [];
    protected $fields = [];
    protected $limit = null;
    protected $orderBy = null;
    protected $order = 'DESC';
    protected $includeNull = false;
    protected $join = [];
    protected $groupBy = null;

    /** @var mixed An array of arrays. Each sub array represents the joiner, field, operator, value */
    protected $wheres = [];

    private static $_execLog = [];
    public static function getLog() { return self::$_execLog; }

    public function __construct(Connection $conn)
    {
        $this->conn = $conn;
    }

    /** The current DB connection */
    public function db() : Connection { return $this->conn; }

    /** Sets the table.
     * @param string $tableName name of the table.
     * @return $this
     */
    public function from($tableName) {
        $this->from = $tableName;
        return $this;
    }

    /** Performs a SQL SELECT
     * @param string $from name of the table.
     * @param string[] $fields the list of fields
     * @return $this
     */
    public function select($from = null, $fields = null)
    {
        $this->query = $fields === null ? self::QUERY_SELECT : self::QUERY_SELECT_MINIMISE;
        $this->from = $from ?? $this->from;
        $this->fields = $fields ?? [ "*" ];
        return $this;
    }

    /** Selects only the specified fields.
     * @param string|string[] $fields the columns to select
     * @return $this */
    public function fields($fields) {
        if (is_array($fields)) {
            $this->fields = $fields;
        } else {
            $this->fields = [ $fields ];
        }

        return $this;
    }

    /** sets if null parameters should be included. 
     * @param bool $state
     * @return $this
    */
    public function withNull($state = true) {
        $this->includeNull = $state;
        return $this;
    }

    /** sets if null parameters should be included. 
     * @param string $from name of the table.
     * @return $this
    */
    public function delete($from = null) {
        $this->query = self::QUERY_DELETE;
        $this->from = $from ?? $this->from;
        return $this;
    }

    /** Updates a table
     * @param string[] $values the values to update
     * @param string $from name of the table.
     * @return $this
    */
    public function update($values, $from = null) {
        $this->query = self::QUERY_UPDATE;
        $this->values = $values;
        $this->from = $from ?? $this->from;
        return $this;
    }

    /** Insert into a table
     * @param string[] $values the values to update
     * @param string $from name of the table.
     * @return $this
    */
    public function insert($values, $from = null) {
        $this->query = self::QUERY_INSERT;
        $this->values = $values;
        $this->from = $from ?? $this->from;
        return $this;
    }

    /** Inserts or Updates a table
     * @param string[] $values the values to update
     * @param string $from name of the table.
     * @return $this
    */
    public function insertOrUpdate($values, $from = null) {
        $this->query = self::QUERY_INSERT_OR_UPDATE;
        $this->values = $values;
        $this->from = $from ?? $this->from;
        return $this;
    }

    /** Left Joins another table
     * @param string $table the table to join
     * @param array $on the rule to join on. In the format of ['left_column' => 'right_column']
     * @return $this
     */
    public function leftJoin($table, $on) {
        return $this->join($table, $on, 'LEFT JOIN');
    }
    
    /** Joins another table
     * @param string $table the table to join
     * @param array $on the rule to join on. In the format of ['left_column' => 'right_column']
     * @return $this
     */
    public function join($table, $on, $joinType = 'JOIN') {
        $this->join[] = [
            'type'  => $joinType,
            'table' => $table,
            'on'    => $on
        ];
        return $this;
    }

    /** Groups by a field
     * @param string $field the field to group on
     * @return $this
     */
    public function groupBy($field) {
        $this->groupBy = $field;
        return $this;
    }

    /** Sets how long the results will last for.
     * @param int $duration seconds to live. If below 0, then they will not be cached.
     * @return $this
     */
    public function cache($duration) {
        $this->cacheDuration = $duration;
        return $this;
    }

    /** Where condition. 
     * @param array[] $params parameters. eg: [ [ key, value ], [ key, op, value ] ], [ key, value ]
     * @param string $method operator, ie and.
     * @return $this
    */
    public function where($params, $method = 'and') {
        if (!is_array($params))
            throw new QueryException($this, "where parameter is not an array");

        if (count($params) == 0)
            throw new QueryException($this, "where parameter cannot be empty");

        if (is_array($params[0])) {
            //We are an array of AND WHERES
            // so we will recursively add them
            foreach($params as $p) {
                $this->where($p, $method);
            }

            return $this;
        }

        $field = ''; $operator = '='; $value = '';
        if (count($params) == 2) {       
            $field = $params[0];
            $value = $params[1];
        } else {
            $field = $params[0];
            $operator = $params[1];
            $value = $params[2];
        }


        $this->wheres[] = [$method, $field, $operator, $value ];
        return $this;
    }

    /** And Where on the query
     * @param mixed[] $params parameters.
     * @return $this 
    */
    public function andWhere($params) { return $this->where($params, 'and'); }

    /** Or Where on the query
     * @param mixed[] $params parameters.
     * @return $this 
    */
    public function orWhere($params) { return $this->where($params, 'or'); }

    /** Limit the count of values returned
     * @param int $count the number of rows to limit
     * @return $this 
    */
    public function limit($count, $skip = 0) { 
        $this->limit = [ $skip, $count ];
        return $this;
    }

    /** Order the query by the value */
    public function orderByDesc($field) {
        $this->orderBy = $field;
        $this->order = 'DESC';
        return $this;
    }

    /** Order the query by the value ascending. */
    public function orderByAsc($field) { 
        $this->orderBy = $field;
        $this->order = "ASC";
        return $this;
    }

    /** Checks if there is at least 1 record.
     *  Changes the SQL into a minimised select and limits the result to 1. 
     *  @return bool true if there is an element */
    public function any() {
        $this->query = self::QUERY_SELECT_MINIMISE;
        $this->limit(1);
        $result = $this->execute();
        return count($result) > 0;
    }

    /** Minimises the select to only the fields required 
     * @return array
    */
    private function minimise() {
        if ($this->query != self::QUERY_SELECT_MINIMISE) 
            throw new QueryException($this, 'Cannot minimise a non-select query');

         //Add existing fields
         $fields = [];
        foreach($this->fields as $field) {
            if ($field != '*') $fields[] = $field;
        }

        //Add all the wheres
        if ($this->wheres !== null) {
            foreach($this->wheres as $w) {
                $fields[] = $w[1];
            }
        }

        //Add all the orderBy
        if (!empty($this->orderBy))
            $this->fields[] = $this->orderBy;

        //Add all the joins
        if ($this->join) {
            foreach($this->join as $join) {
                foreach($join['on'] as $key => $pair) {
                    $this->fields[] = $key;
                    $this->fields[] = $pair;
                }
            }
        }

        //Set the fields
        return array_unique($fields);
    }

    /** Builds the query 
     * @return array Array containing the query and an array of binding values.
    */
    public function build() {
        $query = "";

        $bindings = [];

        $value_fields   = [];
        $value_binds    = [];

        foreach($this->values as $key => $pair) {
            if ($pair !== null || $this->includeNull) {
                $value_fields[] = $key;
                $value_binds[] = "?";
                if (is_bool($pair)) $pair = $pair === true ? 1 : 0;
                $bindings[]     = $pair;
            }
        }

        switch ($this->query) {
            
            case self::QUERY_SELECT:
            case self::QUERY_SELECT_MINIMISE:
                $fields = join(", ", $this->query == self::QUERY_SELECT_MINIMISE ? $this->minimise() : $this->fields);
                $query = "SELECT {$fields} FROM {$this->from}";
                break;

            case self::QUERY_DELETE:
                $query = "DELETE FROM {$this->from}";
                break;

            case self::QUERY_UPDATE:
                $query = "UPDATE {$this->from} SET ". $this->buildUpdateQuery($this->values);
                break;

            case self::QUERY_INSERT:
                $query = "INSERT INTO {$this->from} (".join(',', $value_fields).") VALUES (".join(',', $value_binds).")";
                break;            
                
            case self::QUERY_INSERT_OR_UPDATE:
                $query = "INSERT INTO {$this->from} (".join(',', $value_fields).") VALUES (".join(',', $value_binds).") ON DUPLICATE KEY UPDATE " . $this->buildUpdateQuery($this->values, $bindings);
                $this->wheres = null;
                $this->limit = null;
                $this->orderBy = null;
                break;
        }

        //Add the joins
        $joins = " ";
        if ($this->join != null && is_array($this->join)) {
            foreach($this->join as $join) {
                $table  = $join['table'];
                $lhs    = array_key_first($join['on']);
                $rhs    = $join['on'][$lhs];
                $joins .= "{$join['type']} `{$table}` ON {$lhs} = `{$table}`.{$rhs} ";
            }
        }
        $query .= $joins;

        //Create the where statement
        $wheres = "";
        if ($this->wheres != null && is_array($this->wheres)) {
            foreach ($this->wheres as $w) {
                if (is_bool($w[3])) $w[3] = $w[3] === true ? 1 : 0;
                if (empty($wheres)) { 
                    $wheres .= " WHERE {$w[1]} {$w[2]} ?";
                } else {
                    $wheres .= " {$w[0]} {$w[1]} {$w[2]} ?";
                }
                $bindings[] = $w[3];
            }
        }
        $query .= $wheres;
        
        //Add the group by
        if ($this->groupBy != null) {
            $query .= " GROUP BY {$this->groupBy} ";
        }

        //Create the order statement
        if ($this->orderBy != null) {
            $query .= " ORDER BY {$this->orderBy} {$this->order}";
        }
        
        //Create the limit
        if ($this->limit != null && count($this->limit) == 2 && $this->limit[1] != 0) {
            $limit = join(',', $this->limit);
            $query .= " LIMIT {$limit}";
        }

        //Return the query and binding
        return array($query, $bindings);
    }

    /** Builds the SET a = ? for updates */
    private function buildUpdateQuery($values, &$bindings = []) {
        $dupe = [];
        foreach($values as $key => $pair) {
            if ($pair !== null || $this->includeNull) {
                $dupe[] = $key . " = ?";
                if (is_bool($pair)) $pair = $pair === true ? 1 : 0;
                $bindings[]     = $pair;
            }
        }
        return join(', ', $dupe);
    }

    /** Builds the query and executes it, returning the result of the execute.
     * @return array|int|false  If the query is select then it will return an associative array of the object; otherwise it will return the last auto incremented id.
     */
    public function execute() {
        list($query, $bindings) = $this->build();
        $querySummary = self::createPreviewStatement($query, $bindings); //$query . ';?' . join(', ', $bindings);
        
        //Check the cache if we ahve the duration for it
        $redis      = Kiss::$app->redis();
        $cacheKey   = 'query:' . $this->cacheVersion . ':' . md5($querySummary);
        if ($redis != null && $this->cacheDuration > 0) {
            $cacheResults = $redis->get($cacheKey);
            if ($cacheResults != null) {
                self::$_execLog[] = 'CACHED ' . $querySummary;
                $data = unserialize($cacheResults);
                return $data;
            }
        }
        
        $stm = $this->conn->prepare($query);
        for($i = 0; $i < count($bindings); $i++) {
            $stm->bindParam($i + 1, $bindings[$i]);
        }

        //Execute and check if we fail or not
        self::$_execLog[] = $querySummary;
        $result = $stm->execute();
        if (!$result) {
            $err = $stm->errorInfo();
            throw new SQLException($this, $query, $err[2]);
        }

        //Select is the only one where we want to return the object
        if ($this->query === self::QUERY_SELECT || $this->query === self::QUERY_SELECT_MINIMISE) {
            $result = $stm->fetchAll(\PDO::FETCH_ASSOC);

            //We should cache it if we can
            if ($redis != null && $this->cacheDuration > 0) {
                $data = serialize($result);
                $redis->set($cacheKey, $data);
                $redis->expire($cacheKey, $this->cacheDuration);
            }

            //finally return the result
            return $result;
        }

        //Everything else returns the last inserted ID
        return $this->conn->lastInsertId();
    }

    /** Gets teh statement for debugging purposes. DO NOT EXECUTE THIS.
     * @return string the SQL statement
     */
    public function previewStatement() {
        list($query, $bindings) = $this->build();
        return self::createPreviewStatement($query, $bindings);
    }

    /** @return string Gets teh statement for debugging purposes. */
    private static function createPreviewStatement($query, $bindings) {
        foreach($bindings as $b) { 
            $index = strpos($query, '?');
            $lhs = substr($query, 0, $index);
            $rhs = substr($query, $index + 1);
            $query = $lhs . $b . $rhs;
        }
        return $query;
    }
}
