<?php namespace kiss\helpers;

use kiss\exception\ArgumentException;
use kiss\exception\HttpException;
use kiss\Kiss;
use kiss\models\Identity;

class Scope {
    /**
     * Checks if the identity meets all the requirements
     * @param Identity $identity the user we are validating against
     * @param array $scopes the scopes we need
     * @return bool true if they are authorized
     * @throws ArgumentException 
     */
    public static function authenticate($identity, $scopes) {
            
        if ($scopes === null) return true;
        if ($identity == null) return false;
        
        //Verify the identity
        if (!($identity instanceof Identity)) 
            throw new ArgumentException('invalid type of identity');

        //Get authentication
        $auth = $identity->authorization();
        if ($auth == null) return false;

        //Verify its identity. This is a critical error because it means the user isn't from here
        if ($auth->sub != $identity->uuid)
            throw new HttpException(HTTP::FORBIDDEN, 'CRITICAL: JWT does not belong to identity');

        //Verify its origins
        if ($auth->iss != Kiss::$app->baseURL()) 
            return false;

        //Verify each scope
        foreach($scopes as $scope) {
            if (Strings::startsWith($scope, 'jwt:')) {
                $parts = explode(':', $scope);
                $value = Arrays::value($auth, $parts[1], null);
                if ($value === null) return false;
                if ($value != $parts[2]) return false;
            }
        }

        return true;
    }
}