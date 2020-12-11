<?php 


//defined('KISS_SESSIONLESS') or define('KISS_SESSIONLESS', true);
defined('KISS_DEBUG') or define('KISS_DEBUG', in_array(@$_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1']));

include __DIR__ . "/../../autoload.php";

use kiss\exception\AggregateException;
use kiss\exception\HttpException;
use kiss\exception\UncaughtException;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\helpers\StringHelper;
use kiss\Kiss;
use kiss\router\RouteFactory;

//Set the default response type to JSON
Kiss::$app->setDefaultResponseType(HTTP::CONTENT_APPLICATION_JSON);

//We are going to be HYPER CRITICAL in the API
// And any error we didnt expect, we will capture and immediately terminate
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    $exception = new UncaughtException($errno, $errstr, $errfile, $errline);        
    Kiss::$app->respond($exception);
    exit;
});

//Handle the request and respond with its content.
$object = handle_request();
Kiss::$app->respond($object);

/** Handles the API request with a custom controller. Will return a response or payload. */
function handle_request() {

    
    //Prepare the route we wish to use 
    //Just exit with no response because they are accessing the API page directly
    $route = HTTP::route();    
    if (empty($route)) die('no route given');

    //Register all the routes in the specified folder    
    $basedir = Kiss::$app->baseDir();
    RouteFactory::registerDirectory($basedir . "/controllers/api/", ["*.php", "**/*.php"]);

    //Break up the segments and get the controller
    $segments = explode('/', substr($route, 4));
    $controller = RouteFactory::route($segments);
    
    if ($controller == null)  return new HttpException(HTTP::NOT_FOUND, "'{$route}' is not a valid endpoint");

    try {
        //Depending on the method, we want to execute specific functions
        //TODO: Catch exceptions and return them
        switch ($_SERVER['REQUEST_METHOD']) {
            default: break;

            case 'OPTIONS': 
                if (method_exists($controller, 'options'))
                    return $controller->options();
                break;      

            case 'GET': 
                if (method_exists($controller, 'get'))
                    return $controller->get();
                break;          
            case 'HEAD': 
                if (method_exists($controller, 'get')) {
                    $response = $controller->get();
                    $response->setContent(null);
                    return $response;
                }
                break;      
            
            case 'DELETE': 
                if (method_exists($controller, 'delete'))
                    return $controller->delete();
                break;

            case 'PUT':
            case 'PATCH':
                if (method_exists($controller, 'put'))
                    return $controller->put(HTTP::json());
                break;

            case 'POST':
                if (method_exists($controller, 'post'))
                    return $controller->post(HTTP::json());
                break;            
        }
    }
    catch(\Throwable $e) 
    {
        //Otherwise just return the regular exception
        return $e;
    }

    //We didn't return before, so the method is obviously not supported on this endpoint
    return new HttpException(HTTP::METHOD_NOT_ALLOWED, 'method is not supported on this endpoint');
}