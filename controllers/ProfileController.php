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
        $profile = User::findByProfileName($this->profile_name)->one();
        if ($profile == null) throw new HttpException(HTTP::NOT_FOUND);

        return $this->render('index', [
            'profile'       => $profile,
            'submissions'   => Gallery::findByTopSubmitted($profile)->limit(4)->all(),
            'favourites'    => Gallery::findBySubmitted($profile)->all()
        ]);
    }
}