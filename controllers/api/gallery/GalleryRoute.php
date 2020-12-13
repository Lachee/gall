<?php namespace app\controllers\api\gallery;

use app\models\Gallery;
use kiss\controllers\api\ApiRoute;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\router\Route;

class GalleryRoute extends ApiRoute {

    protected $gallery_id;
    
    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return "/gallery/:gallery_id"; }

    protected function scopes() {
        return array_merge(parent::scopes(), [ 
            'ctrl:allow_users'
        ]);
    }

    //HTTP GET on the route. Return an object and it will be sent back as JSON to the client.
    // Throw an exception to send exceptions back.
    // Supports get, delete
    public function get() {
        return $this->getGallery();
    }

    /**
     * Finds a project
     * @return Gallery|null
     * @throws HttpException 
     */
    public function getGallery() {
        $query = Gallery::findByKey($this->gallery_id)->limit(1);
        $gallery = $query->one();
        if ($gallery == null) throw new HttpException(HTTP::NOT_FOUND);
        return $gallery;
    }

}