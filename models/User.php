<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use kiss\db\ActiveQuery;
use kiss\exception\ArgumentException;
use kiss\helpers\Arrays;
use kiss\helpers\HTTP;
use kiss\Kiss;
use kiss\schema\IntegerProperty;
use kiss\schema\RefProperty;
use kiss\schema\StringProperty;

class User extends Identity {
    
    /** @var \app\components\discord\User stored discord user. */
    private $_discordUser;
    protected $profile_name = null;
    protected $profile_image;
    protected $snowflake;

    public static function getSchemaProperties($options = [])
    {
        return [
            'uuid'          => new StringProperty('ID of the user'),
            'snowflake'     => new IntegerProperty('Discord Snowflake id'),
            'username'      => new StringProperty('Name of hte user'),
            'displayName'   => new StringProperty('Name of hte user'),
            'profileName'   => new StringProperty('Name of the user\'s profile'),
            'profileImage'  => new RefProperty(Image::class, 'Profile image')
        ];
    }

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
        if (empty($this->profile_image)) {
            $bestGallery = $this->getBestGalleries()->limit(1)->one();
            if ($bestGallery) return $bestGallery->cover;
            return null;
        }
        return Image::findByKey($this->profile_image)->limit(1);
    }
    /** Sets the profile image
     * @param Image $image
     * @return $this
     */
    protected function setProfileImage($image) {
        if ($image instanceof Image) $image = $image->getKey();
        $this->profile_image = $image;
        $this->markDirty('profile_image');
        return $this;
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

    public function searchRecommdendedGalleries($page, $limit) {
        $tags = $this->getFavouriteTags()->limit(5)->all();
        if (count($tags) == 0) $tags = $this->getFavouriteTagsSubmitted()->limit(5)->all();
        if (count($tags) == 0) return $this->getBestGalleries();

        $search = join(',', Arrays::map($tags, function($t) { return '|' . $t->name; }));
        return Gallery::search([ 'tag' => $search ], $page, $limit);
    }

    /** @return ActiveQuery|Tag[] gets the users favourite tags */
    public function getFavouriteTags() {
        return Tag::find()
                    ->fields(['*, COUNT(*) as C'])
                    ->leftJoin('$tags', [ 'id' => 'tag_id' ])
                    ->rightJoin(Favourite::class, ['$tags.gallery_id' => 'gallery_id'])
                    ->groupBy('$tags.tag_id')
                    ->where(['user_id', $this])
                    ->orderByDesc('C')->limit(5)->ttl(5);
    }

    /** @return ActiveQuery|Tag[] gets the tags the user most commonly submits */
    public function getFavouriteTagsSubmitted() {
        return Tag::find()
                    ->fields(['*, COUNT(*) as C'])
                    ->leftJoin('$tags', [ 'id' => 'tag_id' ])
                    ->groupBy('$tags.tag_id')
                    ->where(['$tags.founder_id', $this])
                    ->orderByDesc('C')->limit(5)->ttl(5);
    }

    /** Adds a gallery to the user's favourites
     * @param Gallery $gallery the gallery to add
     * @return Favourite|false the resulting favourite. Will return false if unable to add
     */
    public function addFavourite($gallery) {
        $galleryid = $gallery instanceof Gallery ? $gallery->getKey() : intval($gallery);
        $favourite = new Favourite([ 'gallery_id' => $galleryid, 'user_id' => $this->getKey() ]);
        if ($favourite->save()) return $favourite;
        return false;
    }

    /** Removes the gallery from the user's favourites
     * @param Gallery $gallery the gallery to add
     * @return bool True if it was deleted
     */
    public function removeFavourite($gallery) {
        $favourite = Favourite::findByProfile($this)->andWhere(['gallery_id', $gallery])->one();
        if ($favourite == null) return false;
        return $favourite->delete();
    }

    /** @return bool returns if the user has favourited a particular gallery */
    public function hasFavouritedGallery($gallery) {
        return Favourite::findByProfile($this)->select(null, [ 'COUNT(*)' ])->andWhere(['gallery_id', $gallery])->andWhere(['user_id', $this])->ttl(false)->one(true)['COUNT(*)'] != 0;
    }

    /**
     * Applies a blacklist to the gallery
     * @param ActiveQuery $galleryQuery 
     * @return ActiveQuery the modified query 
     */
    public function applyGalleryBlacklist($galleryQuery) {
        if (!($galleryQuery instanceof ActiveQuery) || $galleryQuery->class() != Gallery::class)
            throw new ArgumentException('Unable to apply blacklist gallery as the query is not a Gallery query');

        return $galleryQuery->andWhere(['id', 'NOT', Gallery::find()
                                ->fields(['$gallery.id'])
                                ->leftJoin('$tags', ['id' => 'gallery_id'])
                                ->where(['tag_id', Kiss::$app->db()->createQuery()
                                        ->select('$blacklist', ['tag_id'])
                                        ->where([ 'user_id', $this->id ]) 
                                ])
                            ]);
    }

    /** @return bool is the profile the signed in user */
    public function isMe() {
        if (Kiss::$app->user == null) return false;
        return $this->id == Kiss::$app->user->id;
    }

    /** @return ActiveQuery|$this finds the profile from the given name */
    public static function findByProfileName($profile) {
        if ($profile == '@me') {
            return self::findByKey(Kiss::$app->user->getKey());
        }
        return self::findBySnowflake($profile)->orWhere(['profile_name', $profile]);
    }

}