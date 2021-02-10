<?php namespace app\controllers\api\gallery;

use app\controllers\api\BaseApiRoute;
use app\models\Gallery;
use app\models\Guild;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\router\Route;

/**
 * @property Gallery $gallery
 * @package app\controllers\api\gallery
 */
class GalleryRoute extends BaseApiRoute {
    use \kiss\controllers\api\Actions;


    protected $gallery_id;
    
    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return "/gallery/:gallery_id"; }

    protected function scopes() {
        switch(HTTP::method()) {
            default:            return parent::scopes();
            case HTTP::GET:     return parent::scopes();
            case HTTP::PUT:     return [ 'gallery.update' ];
        }
    }

    public function get() {
        return $this->getGallery();
    }

    public function put($data) { 
        $guild      = $data['guild_id'];
        $channel    = $data['channel_id'];
        $message    = $data['message_id'];

        //TODO: Allow title editing

        if (empty($guild)) throw new HttpException(HTTP::BAD_REQUEST, 'guild_id cannot be empty');
        if (empty($channel)) throw new HttpException(HTTP::BAD_REQUEST, 'channel_id cannot be empty');
        if (empty($message)) throw new HttpException(HTTP::BAD_REQUEST, 'message_id cannot be empty');

        $guild = Guild::findByKey($guild)->orWhere(['snowflake', $guild])->one();
        if ($guild == null) throw new HttpException(HTTP::BAD_REQUEST, 'invalid guild given');

        $this->gallery->message_snowflake = $message;
        $this->gallery->channel_snowflake = $channel;
        $this->gallery->guild_id = $guild->getKey();
        if (!$this->gallery->save()) 
            throw new HttpException(HTTP::BAD_REQUEST, $this->gallery->errors());

        return $this->gallery;
    }

    /**
     * Finds a project
     * @return Gallery|null
     * @throws HttpException 
     */
    public function getGallery() {
        $query = Gallery::findByKey($this->gallery_id)->limit(1);
        $gallery = $query->one();
        if ($gallery == null) throw new HttpException(HTTP::NOT_FOUND);
        return $gallery;
    }

    
}