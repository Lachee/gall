<?php namespace app\controllers\api;

use kiss\controllers\api\ApiRoute;
use kiss\Kiss;
use kiss\router\Route;
use kiss\router\RouteFactory;

class MeRoute extends ApiRoute {

    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return "/@me"; }

    //HTTP GET on the route. Return an object and it will be sent back as JSON to the client.
    // Throw an exception to send exceptions back.
    // Supports get, delete
    public function get() {
        $user = Kiss::$app->getUser();
        if ($user == null) return null;
        return [
            'user'      => $user,
            'auth'      => $user->authorization(),
        ];
    }
}