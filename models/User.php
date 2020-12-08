<?php namespace app\models;

use kiss\models\Identity;
use GALL;

class User extends Identity {
    
    /** @var \app\components\discord\User stored discord user. */
    private $_discordUser;
    protected $profile_name = null;

    public $snowflake;


    /** Finds by snowflake */
    public static function findBySnowflake($snowflake) {
        return self::find()->where(['snowflake', $snowflake]);
    }

    /** Gets the current Discord user
     * @return \app\components\discord\User the discord user
     */
    public function getDiscordUser() {
        if ($this->_discordUser != null) return $this->_discordUser;
        $storage = GALL::$app->discord->getStorage($this->uuid);
        $this->_discordUser = GALL::$app->discord->identify($storage);
        return $this->_discordUser;
    }

    /** Runs a quick validation on the discord token
     * @return bool true if the token is valid
     */
    public function validateDiscordToken() {
        if ($this->_discordUser != null) return true;
        
        $storage = GALL::$app->discord->getStorage($this->uuid);
        return GALL::$app->discord->validateAccessToken($storage);
    }

    /** @return string the name of the profile page. Some users may have a custom one. */
    public function getProfileName() {
        return !empty($this->profile_name) ? $this->profile_name : $this->snowflake;
    }

    /** @return string the name to display to others. */
    public function getDisplayName() {
        return !empty($this->profile_name) ? $this->profile_name :  $this->username;
    }
}