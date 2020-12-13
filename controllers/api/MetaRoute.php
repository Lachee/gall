<?php namespace app\controllers\api;

use kiss\controllers\api\ApiRoute;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\router\Route;
use kiss\router\RouteFactory;

class MetaRoute extends BaseApiRoute {
    
    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return "/meta"; }

    /** @inheritdoc */
    protected function scopes() { return null; }

    //HTTP GET on the route. Return an object and it will be sent back as JSON to the client.
    // Throw an exception to send exceptions back.
    // Supports get, delete
    public function get() {
        return RouteFactory::getRoutes();
    }
}