<?php namespace app\controllers\api;

use app\models\ScrapeData;
use app\models\User;
use GALL;
use kiss\controllers\api\ApiRoute;
use kiss\exception\HttpException;
use kiss\exception\NotYetImplementedException;
use kiss\helpers\HTTP;
use kiss\Kiss;
use kiss\models\BaseObject;
use kiss\router\Route;
use kiss\router\RouteFactory;
use Ramsey\Uuid\Uuid;

class BaseGalleryRoute extends ApiRoute {

    protected static function route() { return "/gallery"; }

    public function get() {
        $url = HTTP::get('url', false);
        if ($url == false) throw new HttpException(HTTP::BAD_REQUEST, 'expected url query');
        return GALL::$app->scraper->scrape($url);
    }

    public function post($data) {
       
        

    }
}