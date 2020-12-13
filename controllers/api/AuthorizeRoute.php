<?php namespace app\controllers\api;

use app\models\ScrapeData;
use app\models\User;
use GALL;
use kiss\controllers\api\ApiRoute;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\Kiss;
use kiss\models\BaseObject;
use kiss\router\Route;
use kiss\router\RouteFactory;
use Ramsey\Uuid\Uuid;

class AuthorizeRoute extends ApiRoute {

    protected static function route() { return "/authorize"; }
}