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

class GalleryController extends BaseController {

    function actionIndex() {
        /** @var User $user */
        $user = Kiss::$app->user;
        $limit = 10;

        return $this->render('index', [
            'latest'        => Gallery::findByLatest()->limit($limit)->all(),
            'top_rated'     => Gallery::findByRating()->limit($limit)->all(),

            'submitted'     => $user->getGalleries()->limit($limit)->all(),
            'favourites'    =>  $user->getFavouriteGalleries()->limit($limit)->all(),
            'latest_tagged' => $user->searchRecommdendedGalleries(0, $limit),
        ]);
    }

    function actionSearch() {
        $results = Gallery::search($_GET, HTTP::get('page', 0), HTTP::get('limit', 10));
        return $this->render('list', [
            'results'   => $results
        ]);
    }

    function actionRecache() {
        //GALL::$app->scraper->cacheImage('https://i1.wp.com/hentaicomicsfree.com/wp-content/uploads/2018/12/Overwatch-BdsmMaker-014-630x1024.jpg');

        GALL::$app->scraper->recache();
        //return $this->actionIndex();
    }

}