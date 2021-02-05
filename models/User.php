<?php namespace app\models;

use Exception;
use kiss\models\Identity;
use GALL;
use kiss\db\ActiveQuery;
use kiss\db\ActiveRecord;
use kiss\db\Query;
use kiss\exception\ArgumentException;
use kiss\exception\NotYetImplementedException;
use kiss\exception\SQLDuplicateException;
use kiss\exception\SQLException;
use kiss\helpers\Arrays;
use kiss\helpers\HTTP;
use kiss\helpers\Strings;
use kiss\Kiss;
use kiss\schema\IntegerProperty;
use kiss\schema\RefProperty;
use kiss\schema\StringProperty;

/**
 * @property int $sparkles the number of sparkles a user has
 * @package app\models
 */
class User extends Identity {
    
    /** @var \app\components\discord\User stored discord user. */
    private $_discordUser;
    protected $profile_name = null;
    protected $profile_image;
    protected $snowflake;
    protected $score;

    public static function getSchemaProperties($options = [])
    {
        return [
            'uuid'          => new StringProperty('ID of the user'),
            'snowflake'     => new StringProperty('Discord Snowflake id'),
            'username'      => new StringProperty('Name of hte user'),
            'displayName'   => new StringProperty('Name of hte user'),
            'profileName'   => new StringProperty('Name of the user\'s profile'),
            'profileImage'  => new RefProperty(Image::class, 'Profile image'),
            'sparkles'      => new StringProperty('Number of sparkles the user has', [ 'readOnly' => true ])
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

#region Profile
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
#endregion

#region Galleries
    /** @return ActiveQuery|Gallery[] the best galleries the user has submitted */
    public function getBestGalleries() {
        return $this->getGalleries()->orderByDesc('views');
    }

    /** @return ActiveQuery|Gallery[] the galleries the user submitted themselves */
    public function getGalleries() {
        return Gallery::findByFounder($this);
    }

    /** @return int the number of galleries the user has */
    public function getGalleryCount() {
        return $this->getGalleries()->select(null, [ 'COUNT(*)' ])->one(true)['COUNT(*)'];
    }

    public function searchRecommdendedGalleries($page, $limit) {
        $tags = $this->getFavouriteTags()->limit(5)->all();
        if (count($tags) == 0) $tags = $this->getFavouriteTagsSubmitted()->limit(5)->all();
        if (count($tags) == 0) return $this->getBestGalleries()->limit(5)->all();

        $search = join(',', Arrays::map($tags, function($t) { return '|' . $t->name; }));
        return Gallery::search([ 'tag' => $search ], $page, $limit);
    }
#endregion

#region Favourites
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
    
    /** @return ActiveQuery|Favourite[] gets the favourites */
    public function getFavouriteCount() {
        return Favourite::findByProfile($this)->select(null, [ 'COUNT(*)' ])->one(true)['COUNT(*)'];
    }

    
    /** @return ActiveQuery|Gallery[] get the favourite galleries */
    public function getFavouriteGalleries() {
        return Gallery::find()->leftJoin(Favourite::class, [ '$gallery.id' => 'gallery_id' ])->where(['user_id', $this ]);
    }

#endregion

#region Blacklist
    /** Adds a tag to the blacklist
     * @param Tag|int $tag the tag to add
     * @return $this
     */
    public function addBlacklist($tag) {
        Kiss::$app->db()->createQuery()
                                ->insert(['user_id' => $this->id, 'tag_id' => $tag instanceof Tag ? $tag->getKey() : $tag ], '$blacklist')
                                ->execute();
        return $this;
    }

    /** @return Query returns the active query for the basic blacklists */
    public function getBlacklist() {
        return Kiss::$app->db()->createQuery()
                                    ->select('$blacklist')
                                    ->where([ 'user_id', $this->id ]);
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
                                ->where(['tag_id', $this->getBlacklist()->fields([ 'tag_id' ]) ])
                            ]);
    }
#endregion Blacklist

#region Auto-Tag
    /** @return Query returns the query for the auto tags */
    public function getAutoTags() {
        return Kiss::$app->db()->createQuery()
                                    ->select('$auto_tags')
                                    ->where(['user_id', $this->id]);
    }

    /** Creates an autotag
     * @param Emote|int $emote the emote
     * @param Tag|int $tag the tag
     * @return $this
     */
    public function addAutoTag($emote, $tag) {
        Kiss::$app->db()->createQuery()
                            ->insert([
                                'user_id'   => $this->id, 
                                'tag_id'    => $tag instanceof Tag ? $tag->getKey() : $tag,
                                'emote_id'  => $emote instanceof Emote ? $emote->getKey() : $emote,
                            ], '$auto_tags')
                            ->execute();
        return $this;
    }
#endregion

#region Reactions
    /** Reacts to a gallery
     * @param Gallery $gallery
     * @param Emote $emote
     * @return $this
     */
    public function addReaction($gallery, $emote) {
        try {
            //Add the reactions
            $success = Kiss::$app->db()->createQuery()
                            ->insert([ 
                                'user_id'       => $this->getKey(),
                                'gallery_id'    => $gallery->getKey(),
                                'emote_id'      => $emote->getKey()
                            ], '$reaction')->execute();
        } catch(SQLDuplicateException $dupeException) { return $this; }

        //Award the original author
        $gallery->founder->giveSparkles('SCORE_REACTION', '', $gallery, $this->getKey() . ',' , $emote->getKey());

        //Apply Autotag
        $tagged = [];
        $autoTags = $this->getAutoTags()->andWhere(['emote_id', $emote->getKey()])->execute();
        Kiss::$app->db()->beginTransaction();
        try {
            foreach($autoTags as $at) {
                try {
                    $success = $gallery->addTag($at['tag_id'], $this);
                    if ($success) $tagged[] = $at;
                }catch(SQLDuplicateException $dupeException) { /** no-op for duplicates */}
            }
            Kiss::$app->db()->commit();
        }catch(Exception $e) {
            Kiss::$app->db()->rollBack();
            throw $e;
        }

        return $this;
    }

    /** Unreacts to a gallery
     * @param Gallery $gallery
     * @param Emote $emote
     */
    public function removeReaction($gallery, $emote) {
        $rowCount = Kiss::$app->db()->createQuery()
                                    ->delete('$reaction')
                                    ->andWhere(['user_id', $this->getKey()])
                                    ->andWhere(['gallery_id', $gallery->getKey()])
                                    ->andWhere(['emote_id', $emote->getKey()])
                                    ->execute();

        //TODO: Undo award for reaction and reacting
        return $this;
    }
#endregion

    /** @return bool is the profile the signed in user */
    public function isMe() {
        if (Kiss::$app->user == null) return false;
        return $this->id == Kiss::$app->user->id;
    }

    /** Gives the user a specific amount of sparkles */
    public function giveSparkles($sparkles, $type = 'MISC', $gallery = null, $resource = null) { 
        if ($sparkles instanceof Sparkle) {
            $sparkles->user_id = $this->id;
            $sparkles->save();
            return $sparkles;
        }

        if (is_string($sparkles) && Strings::startsWith($sparkles, 'SCORE_')) {
            $class = new \ReflectionClass(Sparkle::class);
            $value = $class->getConstant(strtoupper($sparkles));
            if ($value !== false) {
                $type       = strtoupper($sparkles);
                $sparkles   = $value;
            }
        }

        $spark = new Sparkle([
            'user_id' => $this->id,
            'type'      => $type,
            'score'     => $sparkles,
            'gallery_id'    => $gallery instanceof ActiveRecord ? $gallery->getKey() : $gallery,
            'resource'  => $resource instanceof ActiveRecord ? $resource->getKey() : $resource,
        ]);
        $spark->save();
        return $spark;
    }

    /** @return int number of sparkles the user has */
    public function getSparkles() { return $this->score; }

    /** Recomputes the number of sparkles the user has. 
     * @return int number of sparkles */
    public function recalculateSparkles() {
        $query = Kiss::$app->db()->createQuery()
                        ->select('$sparkles', [ 'SUM(score) as SCORE' ])
                        ->where(['user_id', $this->getKey() ])
                        ->execute();
        
        $sparkles = $query[0]['SCORE'];
        $this->score = $sparkles ?? 0;
        $this->save(false, ['score']);
        return $sparkles;
    }

    /** @return ActiveQuery|$this finds the profile from the given name */
    public static function findByProfileName($profile) {
        if ($profile == '@me') {
            return self::findByKey(Kiss::$app->user->getKey());
        }
        return self::findBySnowflake($profile)->orWhere(['profile_name', $profile]);
    }

}