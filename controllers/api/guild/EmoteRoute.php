<?php namespace app\controllers\api\guild;

use app\controllers\api\BaseApiRoute;
use app\models\Gallery;
use app\models\Guild;
use GALL;
use kiss\exception\HttpException;
use kiss\exception\NotYetImplementedException;
use kiss\helpers\HTTP;
use kiss\router\Route;

class EmoteRoute extends GuildRoute {

    protected $guild_id;
    private $_guild;

    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return "/guild/:guild_id/emotes"; }

    protected function scopes() {
        switch(HTTP::method()) {
            default:  return [ ];
            case HTTP::POST:     return [ 'emote.publish' ];
        }
    }

    /** Gets a guild object */
    public function get() {
        return $this->guild->emotes;
    }
    
    /** Updates a guild */
    public function post($data) {
        throw new NotYetImplementedException();
    }

    //public function get() { throw new HttpException(HTTP::METHOD_NOT_ALLOWED); }
    public function delete() { throw new HttpException(HTTP::METHOD_NOT_ALLOWED); }
    public function options() { throw new HttpException(HTTP::METHOD_NOT_ALLOWED); }
    //public function post($data) { throw new HttpException(HTTP::METHOD_NOT_ALLOWED); }
    public function put($data) { throw new HttpException(HTTP::METHOD_NOT_ALLOWED); }

    /**
     * Finds a project
     * @return Guild|null
     * @throws HttpException 
     */
    public function getGuild() {
        if ($this->_guild) return $this->_guild;
        $query = Guild::findByKey($this->guild_id)->orWhere(['snowflake', $this->guild_id])->limit(1);
        $this->_guild = $query->one();
        if ($this->_guild == null) throw new HttpException(HTTP::NOT_FOUND);
        return $this->_guild;
    }

    
}