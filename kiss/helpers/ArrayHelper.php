<?php namespace kiss\helpers;

class ArrayHelper {

    /** Merges arrays togther. It can have any number of arguments
     * @param array $arrays the different arrays
     * @return array the returned merge
     */
    public static function merge(...$arrays) {

        $merged = array();
        while ($arrays) {
            $array = array_shift($arrays);
            if (!is_array($array)) {
                trigger_error(__FUNCTION__ .' encountered a non array argument', E_USER_WARNING);
                return;
            }
            if (!$array)
                continue;
            foreach ($array as $key => $value)
                if (is_string($key))
                    if (is_array($value) && array_key_exists($key, $merged) && is_array($merged[$key]))
                        $merged[$key] = call_user_func(__FUNCTION__, $merged[$key], $value);
                    else
                        $merged[$key] = $value;
                else
                    $merged[] = $value;
        }
        return $merged;
    }

    /** Maps the value of the array */
    public static function map($array, $callback) {
        $tmp = [];
        foreach((array) $array as $k => $p) { 
            $tmp[$k] = call_user_func($callback, $p);
        }
        return $tmp;
    }

    /** Trns the array into an associative array */
    public static function assoc($array, $callback) {
        $tmp = [];
        foreach($array as $p) {
            $key = call_user_func($callback, $p);
            $tmp[$key] = $p;
        }
        return $tmp;
    }
    
    /** Maps an array. The callback needs to return an array with exactly 2 values.*/
    public static function mapArray($array, $callback) {
        $tmp = [];
        foreach($array as $p) {
            [ $k, $v ] = call_user_func($callback, $p);
            $tmp[$k] = $v;
        }
        return $tmp;
    }
}