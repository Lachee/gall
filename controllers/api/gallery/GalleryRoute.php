<?php namespace app\controllers\api\project;

use app\models\Gallery;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\router\Route;

class GalleryRoute extends Route {

    protected $gallery_id;
    
    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return "/gallery/:gallery_id"; }

    //HTTP GET on the route. Return an object and it will be sent back as JSON to the client.
    // Throw an exception to send exceptions back.
    // Supports get, delete
    public function get() {
        return $this->getGallery();
    }

    /**
     * Finds a project
     * @return Project|null
     * @throws HttpException 
     */
    public function getGallery() {
        $gallery = Gallery::findByKey($this->gallery_id)->one();
        if ($gallery == null) throw new HttpException(HTTP::NOT_FOUND);
        return $gallery;
    }

}