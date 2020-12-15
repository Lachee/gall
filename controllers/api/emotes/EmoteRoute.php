<?php namespace app\controllers\api\emotes;

use app\controllers\api\BaseApiRoute;
use app\models\Emote;
use app\models\Gallery;
use app\models\Guild;
use GALL;
use kiss\controllers\api\ApiRoute;
use kiss\exception\HttpException;
use kiss\exception\NotYetImplementedException;
use kiss\helpers\HTTP;
use kiss\router\Route;

class EmoteRoute extends ApiRoute {

    protected $emote_id;
    private $_cache;

    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return "/emotes/:emote_id"; }

    protected function scopes() {
        switch(HTTP::method()) {
            default:            return [ ];
            case HTTP::PUT:     return [ 'emote.update' ];
            case HTTP::DELETE:  return [ 'emote.delete' ];
        }
    }

    /** Gets a specific emote */
    public function get() {
        return $this->emote;
    }
    
    /** Updates an emote */
    public function put($data) { 
        $this->emote->name          = $data['name'];
        $this->emote->animated      = $data['animated'];
        if (!$this->emote->save()) throw new HttpException(HTTP::BAD_REQUEST, $this->emote->errors());
        return $this->emote;
    }

    /** Deletes an emote */
    public function delete() { 
        return $this->emote->delete();
    }

    public function options() { throw new HttpException(HTTP::METHOD_NOT_ALLOWED); }
    public function post($data) { throw new HttpException(HTTP::METHOD_NOT_ALLOWED); }
    
    /**
     * Finds a project
     * @return Emote|null
     * @throws HttpException 
     */
    public function getEmote() {
        if ($this->_cache) return $this->_cache;
        $query = Emote::findByKey($this->emote_id)->orWhere(['snowflake', $this->emote_id])->limit(1);
        $this->_cache = $query->one();
        if ($this->_cache == null) throw new HttpException(HTTP::NOT_FOUND);
        return $this->_cache;
    }

    
}