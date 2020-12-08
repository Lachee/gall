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
}