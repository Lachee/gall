<?php namespace app\controllers\api;

use app\models\ScrapeData;
use app\models\User;
use GALL;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\Kiss;
use kiss\models\BaseObject;
use kiss\router\Route;
use kiss\router\RouteFactory;
use Ramsey\Uuid\Uuid;

class AuthorizeRoute extends Route {

    protected static function route() { return "/authorize"; }

    /** Authorizes this bot account on behalf of a user.
     * (IT will give it another API specific JWT, that will act on behalf of the user instead.)
     */
    public function post() { }
}