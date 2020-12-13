<?php namespace app\controllers\api;

use app\models\Tag;
use kiss\controllers\api\ApiRoute;
use kiss\exception\HttpException;
use kiss\helpers\Arrays;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\router\Route;
use kiss\router\RouteFactory;

class TagRoute extends ApiRoute {

    const DEFAULT_PAGE_SIZE = 10;
    const MAX_PAGE_SIZE = 150;

    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return "/tags"; }

    //HTTP GET on the route. Return an object and it will be sent back as JSON to the client.
    // Throw an exception to send exceptions back.
    // Supports get, delete
    public function get() {
        $term           = HTTP::get('term', HTTP::get('q', ''));
        $page           = HTTP::get('page', 1);
        $pageLimit      = HTTP::get('limit', self::DEFAULT_PAGE_SIZE);
        $includeAlias   = HTTP::get('inc_alias', false, FILTER_VALIDATE_BOOLEAN);
        $asSelect2      = HTTP::get('select2', false, FILTER_VALIDATE_BOOLEAN);

        //They probably actually meant page 1
        if ($page == 0)  $page = 1;

        if ($pageLimit > self::MAX_PAGE_SIZE)
            throw new HttpException(HTTP::BAD_REQUEST, "Cannot request more than " . self::MAX_PAGE_SIZE . " items");

        $query = Tag::find()->where([ 'name', 'like', "%{$term}%"])->limit($pageLimit, ($page-1) * $pageLimit);
        if (!$includeAlias) $query->andWhere(['alias_id', null]);
        
        $results = $query->all(true);
        if (!$asSelect2) return $results;

        $results = Arrays::map($results, function($t) { 
            return [
                'id'    => $t['id'],
                'type'  => $t['type'],
                'text'  => $t['name'],
                'total' => $t['cnt'],
                'alias' => $t['alias_id'] != null,
            ]; 
        });
            
        return new Response(HTTP::OK, [], [
            'results'   => $results,
            'pagination' => [
                'count' => count($results),
                'more'  => count($results) == $pageLimit
            ]
        ], HTTP::CONTENT_APPLICATION_JSON);
    }
}