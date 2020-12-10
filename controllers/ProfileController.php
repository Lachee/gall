<?php namespace app\controllers;

use app\components\mixer\Mixer;
use app\models\Gallery;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\models\BaseObject;
use app\models\User;
use GALL;
use kiss\Kiss;
use Ramsey\Uuid\Uuid;

class ProfileController extends BaseController {
    public $profile_name;
    public static function route() { return "/profile/:profile_name"; }

    function actionIndex() {
        /** @var User $profile */
        $profile = User::findByProfileName($this->profile_name)->one();
        if ($profile == null) throw new HttpException(HTTP::NOT_FOUND, 'Profile doesn\'t exist');

        return $this->render('index', [
            'profile'       => $profile,
            'submissions'   => $profile->getBestGalleries()->limit(4)->all(),
            'favourites'    => $profile->getFavouriteGalleries()->all()
        ]);
    }

    function actionSettings() {
        /** @var User $profile */
        $profile = User::findByProfileName($this->profile_name)->one();
        if ($profile != Kiss::$app->user) throw new HttpException(HTTP::FORBIDDEN, 'Can only edit your own settings');
        if ($profile == null) throw new HttpException(HTTP::FORBIDDEN, 'You must be logged in to edit your settings');
        
        return $this->render('index', [
            'profile'       => $profile,
            'submissions'   => $profile->getBestGalleries()->limit(4)->all(),
            'favourites'    => $profile->getFavouriteGalleries()->all()
        ]);
    }
}