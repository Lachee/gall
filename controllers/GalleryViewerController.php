<?php namespace app\controllers;

use app\components\mixer\Mixer;
use app\models\Emote;
use app\models\Gallery;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\models\BaseObject;
use app\models\User;
use GALL;
use kiss\exception\NotYetImplementedException;
use kiss\helpers\Arrays;
use kiss\Kiss;
use Ramsey\Uuid\Uuid;

class GalleryViewerController extends BaseController {

    public $gallery_id;
    public static function route() { return "/gallery/:gallery_id"; }

    /** @inheritdoc
     * Discord's scraper is allowed to look at the galleries as it will get redirected to a image anyways
     */
    public function authorize($action) {        
        if (HTTP::isDiscordBot() && $action == 'index') return true;
        return parent::authorize($action);
    }

    function actionIndex() {

        /** @var Gallery $gallery */
        $gallery = $this->gallery;

        //Redirect to the image if we are a bot
        if (HTTP::isDiscordBot())
            return Response::redirect($this->gallery->cover->proxyUrl);
        
        
        //Force our tags to update
        $gallery->updateTags();

        //Dont trigger the views if its your own
        if ($gallery->founder_id != Kiss::$app->user->id)
            $gallery->incrementView();
        
        /** @var Image[] $images */
        $images = $gallery->getDisplayImages()->all();
        $reactions = Arrays::map($gallery->getReactions()->execute(), function($r) { 
            return [
                'user'  => User::findByKey($r['user_id'])->one(),
                'emote' => Emote::findByKey($r['emote_id'])->one(),
            ];
        });

        return $this->render('index', [
            'gallery'   => $this->gallery,
            'images'    => $images,
            'reactions' => $reactions
        ]);
    }

    function actionDownload() {
        $title = $this->gallery->title;
        $images = $this->gallery->getImages()->ttl(0)->all();
        $count = count($images);
        switch($count) {
            case 0:
                return Response::redirect($this->gallery->cover->getProxyUrl($title));
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