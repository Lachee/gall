<?php namespace app\controllers\api;

use app\models\Tag;
use GALL;
use kiss\controllers\api\ApiRoute;
use kiss\exception\HttpException;
use kiss\exception\UncaughtException;
use kiss\helpers\Arrays;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\Kiss;
use kiss\router\Route;
use kiss\router\RouteFactory;

class SlashRoute extends BaseApiRoute {

    const DEFAULT_PAGE_SIZE = 10;
    const MAX_PAGE_SIZE = 150;

    /** @inheritdoc */
    protected static function route() { return "/slash"; }
    
    /** @inheritdoc */
    protected function scopes() { return null; } // Proxy doesn't need any scopes since it handles its own.

    public function authenticate($identity) {
        $signature  	= HTTP::header('x-signature-ed25519');
        $timestamp  	= HTTP::header('x-signature-timestamp');
        if (empty($signature) || empty($timestamp)) 
            throw new HttpException(HTTP::UNAUTHORIZED, 'Bad signature');

        $binary_signature = sodium_hex2bin($signature);
        $binary_key = sodium_hex2bin(GALL::$app->discord->interactivityPublicKey);

        $body = HTTP::body();
        $message = $timestamp . $body;
        if (!sodium_crypto_sign_verify_detached($binary_signature, $message, $binary_key))
            throw new HttpException(HTTP::UNAUTHORIZED, 'Bad signature');

        return true;
    }


    public function action($endpoint) {
        //We are going to be HYPER CRITICAL in the API
        // And any error we didnt expect, we will capture and immediately terminate
        set_error_handler(function($errno, $errstr, $errfile, $errline) {
            $exception = new UncaughtException($errno, $errstr, $errfile, $errline);        
            Kiss::$app->respond($exception);
            exit;
        });

        //verify our authentication
        $this->authenticate(Kiss::$app->user);

        //Prepare the data
        $data = HTTP::json();
        
        /** Handle the Pings */
        if ($data['type'] == 1)
        return Response::jsonRaw(HTTP::OK, [ 'type' => 1 ]);
                
        /** Handle ApplicationCommand */
        if ($data['type'] == 2) 
            return Response::jsonRaw(HTTP::OK, [ 'type' => 2 ]);

        /** Handle everything else */
        $response = $this->command($data);

        //Verify the resposne then return it.
        if ($response == null || $response == false) 
            return Response::jsonRaw(HTTP::BAD_REQUEST, [ ]);
        return Response::jsonRaw(HTTP::OK, $response);
    }

    /** Handles the command  */
    public function command($data) {
        return null;
    }
}