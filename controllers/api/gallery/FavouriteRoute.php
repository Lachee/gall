<?php namespace app\controllers\api\gallery;

use app\models\Gallery;
use app\models\User;
use GALL;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\Kiss;
use kiss\router\Route;

class FavouriteRoute extends GalleryRoute {

    protected $gallery_id;
    
    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return parent::route() . "/favourite"; }

    protected function scopes() {
        switch(HTTP::method()) {
            default:            return parent::scopes();
            case HTTP::POST:    return [ 'ctrl:allow_users', 'gallery' ];
        }
    }

    //HTTP GET on the route. Return an object and it will be sent back as JSON to the client.
    // Throw an exception to send exceptions back.
    // Supports get, delete
    public function get() {
        return $this->getGallery()->getFavourites()->all();
    }

    /** Creates a new favourite */
    public function post($data) {
        $gallery    = $this->getGallery();
        $user       = $this->actingUser;
        if ($user == null) throw new HttpException(HTTP::UNAUTHORIZED, 'Cannot favourite without an active user');        
        return $user->addFavourite($gallery);
    }    
    
    /** Deletes a new favourite */
    public function delete() {
        $gallery    = $this->getGallery();
        $user       = $this->actingUser;
        if ($user == null) throw new HttpException(HTTP::UNAUTHORIZED, 'Cannot favourite without an active user');        
        return $user->removeFavourite($gallery);
    }

}