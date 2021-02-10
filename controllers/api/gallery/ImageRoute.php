<?php namespace app\controllers\api\gallery;

use app\models\Gallery;
use app\models\User;
use GALL;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\Kiss;
use kiss\router\Route;

class ImageRoute extends GalleryRoute {
    use \kiss\controllers\api\Actions;


    protected $gallery_id;
    
    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return parent::route() . "/images"; }

    public function get() {
        $gallery    = $this->getGallery();
        return $gallery->getImages()->fields(['id', 'url', 'origin'])->all();
    }
}