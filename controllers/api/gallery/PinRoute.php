<?php namespace app\controllers\api\gallery;

use app\models\Gallery;
use app\models\User;
use GALL;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\Kiss;
use kiss\router\Route;

class PinRoute extends GalleryRoute {
    use \kiss\controllers\api\Actions;


    protected $gallery_id;
    
    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return parent::route() . "/pin"; }

    /** Sets the user's profile image */
    public function post($data) {

        $gallery    = $this->getGallery();
        $user       = $this->actingUser;
        if ($user == null) throw new HttpException(HTTP::UNAUTHORIZED, 'Cannot favourite without an active user');        

        $user->profileImage = $gallery->getCover()->fields(['id'])->one()->id;
        return $user->save();
    }    
}