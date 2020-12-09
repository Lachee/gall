<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use kiss\db\ActiveQuery;
use kiss\helpers\HTTP;
use kiss\Kiss;

class User extends Identity {
    
    /** @var \app\components\discord\User stored discord user. */
    private $_discordUser;
    protected $profile_name = null;

    public $snowflake;
    protected $profile_image;

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

    /** Gets the URL of the users avatar
     * @return string the URL
     */
    public function getAvatarUrl($size = 64) {
        return HTTP::url( ['/api/proxy', 'url' => "https://d.lu.je/avatar/{$this->snowflake}?size=$size" ] );  
    }
    /** @return ActiveQuery|Image gets the profile image */
    public function getProfileImage() {
        if (empty($this->profile_image)) return null;
        return Image::findByKey($this->profile_image)->limit(1);
    }
    /** @return string the name of the profile page. Some users may have a custom one. */
    public function getProfileName() {
        return !empty($this->profile_name) ? $this->profile_name : $this->snowflake;
    }
    /** @return string the name to display to others. */
    public function getDisplayName() {
        return !empty($this->profile_name) ? $this->profile_name :  $this->username;
    }

    /** @return ActiveQuery|Favourite[] gets the favourites */
    public function getFavouriteCount() {
        return Favourite::findByProfile($this)->select(null, [ 'COUNT(*)' ])->one(true)['COUNT(*)'];
    }

    /** @return ActiveQuery|Gallery[] get the favourite galleries */
    public function getFavouriteGalleries() {
        return Gallery::find()->leftJoin(Favourite::class, [ '$gallery.id' => 'gallery_id' ])->where(['user_id', $this ]);
    }

    /** @return ActiveQuery|Gallery[] the best galleries the user has submitted */
    public function getBestGalleries() {
        return $this->getGalleries()->orderByDesc('views');
    }

    /** @return ActiveQuery|Gallery[] the galleries the user submitted themselves */
    public function getGalleries() {
        return Gallery::findByFounder($this);
    }

    public function getRecommendedGalleries() {
        return $this->getBestGalleries();
    }

    /** @return ActiveQuery|Tag[] gets the users favourite tags */
    public function getFavouriteTags() {
        //TODO: Implement Favourite Tags
        return Tag::find()->limit(5);
    }



    /** @return ActiveQuery|$this finds the profile from the given name */
    public static function findByProfileName($profile) {
        if ($profile == '@me') {
            return self::findByKey(Kiss::$app->user->getKey());
        }
        return self::findBySnowflake($profile)->orWhere(['profile_name', $profile]);
    }

}