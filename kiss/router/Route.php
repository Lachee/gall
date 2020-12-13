<?php
namespace kiss\router;

use Exception;
use kiss\exception\NotYetImplementedException;
use kiss\helpers\Strings;
use kiss\models\BaseObject;

class Route extends BaseObject {

    const ARGUMENT_PREFIX = ":";
    private static $_cache = [];

    /** @return string the route the controller is on */
    protected static function route() { 
        $class = get_called_class();
        return str_replace('\\', '/', $class);
    }

    /** @return string[] a list of scopes that are required for this route. If none are required, then a false will be returned */
    protected function scopes() {
        return false;
    }

    /** Checks if hte identity has the requried scopes.
     * @return bool true if they have meet all the scope requirements
    */
    public function hasScopes($identity) {
        //TODO: Put RBAC system here.
        $scopes = $this->scopes();
        if ($scopes === false) return true;

        throw new NotYetImplementedException();
    }

    /** @return string[] Gets the routing itself */
    public static function getRouting() { 
        $cache = self::getRouteCache(get_called_class());
        return $cache[0];
    }

    /** @return string[] Gets the route parameters */
    public static function getParameters() {
        $cache = self::getRouteCache(get_called_class());
        return $cache[1];
    }

    /** Clears the cached routes and parameters
     * @return void 
     */ 
    public static function clearRouteCache() { 
        self::$_cache = [];
    }

    /** Gets the route from the cache  */
    private static function getRouteCache($class) {       
        
        //Just return the cache
        if (isset(self::$_cache[$class]))
            return self::$_cache[$class];
      
        $str = $class::route();
        //if (empty($str)) throw new Exception("Route $class has no routing");
        $route  = explode('/', $str);
        $params = [];

        //Calculate hte params from the route
        for ($i = 0; $i < count($route); $i++) {
            if (Strings::startsWith($route[$i], self::ARGUMENT_PREFIX)) 
                $params[] =  substr($route[$i], 1);
        }

        //Creat ethe cahce
        self::$_cache[$class] = [ $route, $params ];
        return self::$_cache[$class];
    }
}