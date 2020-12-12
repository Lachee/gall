<?php namespace app\controllers;

use app\components\mixer\Mixer;
use app\models\Gallery;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\models\BaseObject;
use app\models\User;
use GALL;
use kiss\exception\NotYetImplementedException;
use kiss\Kiss;
use Ramsey\Uuid\Uuid;

class GalleryViewerController extends BaseController {

    public $gallery_id;
    public static function route() { return "/gallery/:gallery_id"; }

    function actionIndex() {

        /** @var Gallery $gallery */
        $this->gallery->incrementView();

        /** @var Image[] $images */
        $thumbnail = $this->gallery->thumbnail;
        $images = $this->gallery->getImages($thumbnail->id)->all();

        return $this->render('index', [
            'gallery'   => $this->gallery,
            'thumbnail' => $thumbnail,
            'images'    => $images,
        ]);
    }

    function actionDownload() {
        $title = $this->gallery->title;
        $thumbnail = $this->gallery->thumbnail;
        $images = $this->gallery->getImages($thumbnail->id)->ttl(0)->all();
        $count = count($images);
        switch($count) {
            case 0:
                return Response::redirect($thumbnail->getProxyUrl($title));
            case 1:
                return Response::redirect($images[0]->getProxyUrl($title));
            default:
                throw new NotYetImplementedException('Multiple file downloads are not yet supported');
        }
    }

    /** Gets the gallery or throws */
    public function getGallery() {        
        /** @var Gallery $gallery */
        $gallery = Gallery::findByKey($this->gallery_id)->one();
        if ($gallery == null) throw new HttpException(HTTP::NOT_FOUND);
        return $gallery;
    }

}