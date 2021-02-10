<?php namespace app\controllers\api\image;

use app\models\Gallery;
use app\models\User;
use GALL;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\Kiss;
use kiss\router\Route;

class PinRoute extends ImageRoute {
    use \kiss\controllers\api\Actions;

    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return parent::route() . "/pin"; }

    /** Sets the user's profile image */
    public function post($data) {
        $user       = $this->actingUser;
        if ($user == null) throw new HttpException(HTTP::UNAUTHORIZED, 'Cannot pin without an active user');        

        $image              = $this->getImage();
        $user->profileImage = $image->id;
        return $user->save();
    }    
}