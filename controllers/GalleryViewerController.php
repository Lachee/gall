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

class GalleryViewerController extends BaseController {

    public $gallery_id;
    public static function route() { return "/gallery/:gallery_id"; }

    function actionIndex() {
        /** @var Gallery $gallery */
        $gallery = Gallery::findByKey($this->gallery_id)->one();
        if ($gallery == null) throw new HttpException(HTTP::NOT_FOUND);
        
        $gallery->incrementView();

        /** @var Image[] $images */
        $images = $gallery->getImages()->all();
        return $this->render('index', [
            'gallery'   => $gallery,
            'images'    => $images,
        ]);
    }

}