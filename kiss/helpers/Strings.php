<?php namespace kiss\helpers;


class Strings {
    /** Converts a string to lower case, respecting the encoding and not destroying UTF-8 
     * @return string the lowercase string*/
    public static function toLowerCase($str) {
        return mb_strtolower($str);
    }
    
    /** Converts a string to upper case, respecting the encoding and not destroying UTF-8 
     * @return string the upper string*/
    public static function toUpperCase($str) {
        return mb_strtoupper($str);
    }

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

    /** Checks if the string looks like a url 
     * @return string|false returns the fully formed URL (with appropriate protocol) or false if it doesn't look like a url
    */
    public static function likeURL($str) {
        $regex = '/(https?:\/\/)?([-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b)([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)?/i';
        if (preg_match($regex, $str, $matches)) {
            $protocol = empty($matches[1]) ? 'https://' : $matches[1];
            return $protocol . $matches[2] . $matches[3];
        }

        return false;
    }
}