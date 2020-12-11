<?php namespace kiss\helpers;


class StringHelper {
    /** checks if the string starts with another substring */
    public static function startsWith (String $string, String  $needle) : bool
    { 
        $len = strlen($needle); 
        return (substr($string, 0, $len) === $needle); 
    } 

    /** checks if the string ends with another substring */
    public static function endsWith(String $string, String  $needle) : bool
    { 
        $len = strlen($needle); 
        if ($len == 0) { 
            return true; 
        } 
        return (substr($string, -$len) === $needle); 
    } 

    /** Generates a cryptographically secure random token
     * @return string Hexidecimal token.
     */
    public static function token($length = 16) {
        return bin2hex(random_bytes($length));
    }

    /** Turns a number into a pretty form 
     * @param int $n the number
     * @param int $precision how many decimal places
     * @return string
    */
    public static function shortNumber($n, $precision = 1) {
        
        if ($n > 1000000000) 
            return number_format($n / 1000000, $precision) . 'B';
        
        if ($n > 1000000)
            return number_format($n / 1000000, $precision) . 'M';
        
        if ($n > 1000)
            return number_format($n / 1000, $precision) . 'K';
        
        return number_format($n, 0);
    }

    public static function camelToSnake($str) {
        
    }
}