<?php namespace app\controllers\api\guild;

use app\controllers\api\BaseApiRoute;
use app\models\Gallery;
use app\models\Guild;
use GALL;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\router\Route;

class GuildRoute extends BaseApiRoute {
    use \kiss\controllers\api\Actions;


    protected $guild_id;
    private $_guild;

    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return "/guild/:guild_id"; }

    protected function scopes() {
        switch(HTTP::method()) {
            default:  return [ ];
            case HTTP::PUT:     return [ 'guild.update' ];
            case HTTP::DELETE:  return [ 'guild.delete' ];
        }
    }

    /** Gets a guild object */
    public function get() {
        return $this->guild;
    }
    
    /** Deletes a guild */
    public function delete() { 
        return $this->guild->delete();
    }

    /** Updates a guild */
    public function put($data) {
        
        //If we have set the name, then its a manual request to update
        if (!empty($data['name'])) {
         
            //Update hte name and the emotes if we can
            $this->guild->name = $data['name'];
            if ($data['emojis'])
                $this->guild->updateDiscordEmotes($data['emojis']);

        } else {

            //However, they expect us to update. Barberic
            $discordGuild = GALL::$app->discord->getGuild($this->guild->snowflake);
            $this->guild->name = $discordGuild['name'];
            $this->guild->updateDiscordEmotes($discordGuild['emojis']);
        }
        
        //Try to save
        if (!$this->guild->save()) 
            throw new HttpException(HTTP::BAD_REQUEST, $this->guild->errors());
        
        return $this->guild;
    }

    /**
     * Finds a project
     * @return Guild|null
     * @throws HttpException 
     */
    public function getGuild() {
        if ($this->_guild) return $this->_guild;
        $query = Guild::findByKey($this->guild_id)->orWhere(['snowflake', $this->guild_id])->limit(1);
        $this->_guild = $query->one();
        if ($this->_guild == null) throw new HttpException(HTTP::NOT_FOUND, 'Could not find guild');
        return $this->_guild;
    }

    
}