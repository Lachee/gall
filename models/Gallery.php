<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use InvalidArgumentException;
use kiss\db\ActiveQuery;
use kiss\db\ActiveRecord;
use kiss\db\Query;
use kiss\exception\ArgumentException;
use kiss\exception\InvalidOperationException;
use kiss\exception\SQLDuplicateException;
use kiss\helpers\Arrays;
use kiss\helpers\Strings;
use kiss\Kiss;
use kiss\schema\BooleanProperty;
use kiss\schema\EnumProperty;
use kiss\schema\IntegerProperty;
use kiss\schema\RefProperty;
use kiss\schema\StringProperty;

/**
 * @property User $founder
 * @package app\models
 */
class Gallery extends ActiveRecord {
    protected $id;
    protected $identifier;
    protected $founder_id;
    
    protected $guild_id;
    protected $channel_snowflake;
    protected $message_snowflake;

    protected $title;
    protected $description;
    protected $type;
    protected $scraper;
    protected $url;
    protected $cover_id;
    protected $views;




    public const TYPE_COMIC = 'comic';
    public const TYPE_ARTWORK = 'artwork';

    public static function getSchemaProperties($options = [])
    {
        return [
            'id'                => new IntegerProperty('Unique ID of the gallery'),
            'identifier'        => new StringProperty('Identifier of scraped data'),
            'type'              => new EnumProperty('Type of the gallery', [ self::TYPE_ARTWORK, self::TYPE_COMIC ]),
            'founder'           => new RefProperty(User::class, 'the user that found it'),
            'guild'             => new RefProperty(Guild::class, 'the guild that it is in'),
            'channel_snowflake' => new StringProperty('Snowflake of the discord channel'),
            'message_snowflake' => new StringProperty('Snowflake of the discord message'),
            'title'             => new StringProperty('Title of the gallery'),
            'description'       => new StringProperty('Description of the gallery'),
            'url'               => new StringProperty('Original string URL'),
            'cover'             => new RefProperty(Image::class, 'Cover image'),
            'views'             => new IntegerProperty('Number of views'),
            'messageLink'       => new StringProperty('Link to the discord message'),
            'favourited'        => new BooleanProperty('Is this object favourited by the current active user', false, [ 'readOnly' => true ]),
        ];
    }

    /** @inheritdoc */
    public function validate()
    {
        if (!parent::validate()) return false;
        if ($this->isNewRecord()) {
            if (empty($this->url))  {
                $this->addError('URL cannot be empty');
                return false;
            }

            if (Gallery::findByUrl($this->url)->ttl(0)->one() != null) {
                $this->addError('URL already exists');
                return false;
            }
        }

        return true;
    }

    public function getShortDescription() {
        $maxLength = 100;
        if (strlen($this->description) > $maxLength) return substr($this->description, 0, $maxLength - 3) . '...';
        return $this->description;
    }

    public function getShortTitle() {
        $maxLength = 40;
        if (strlen($this->title) > $maxLength) return substr($this->title, 0, $maxLength - 3) . '...';
        return $this->title;
    }

    /** @return string gets the current title */
    public function getTitle() { return $this->title; }

    /**
     * Sets the title of the gallery
     * @param string $title the title
     * @return $this 
     */
    public function setTitle($title) { $this->title = $title; return $this; }

    /** Gets the discord message link
     * @return string link to the message, otherwise null
     */
    public function getMessageLink() {
        if (empty($this->guild_id)) return null;
        if (empty($this->message_snowflake)) return null;
        if (empty($this->channel_snowflake)) return null;
        $guild = $this->getGuild()->fields(['snowflake'])->one();
        if ($guild == null) return null;
        return "https://discord.com/channels/{$this->guild->snowflake}/{$this->channel_snowflake}/{$this->message_snowflake}";
    }

    /** @return ActiveQuery|User gets the guild this gallery is in */
    public function getGuild() {
        if (empty($this->guild_id)) return null;
        return Guild::findByKey($this->guild_id)->limit(1)->ttl(60);
    }

    /** @return ActiveQuery|User gets the user that found this gallery */
    public function getFounder() {
        return User::findByKey($this->founder_id)->limit(1)->ttl(60);
    }

    /** @return bool if this gallery has a cover image to display. */
    public function hasCover() {
        return !empty($this->cover_id) && $this->type == self::TYPE_COMIC;
    }

    /** @return ActiveQuery|Image gets an appropriate image to display as the cover. If no cover image is present, then the first image is used. */
    public function getCover() { 
        if (empty($this->cover_id)) return Image::findByGallery($this->id)->orderByAsc('id')->limit(1)->ttl(60);
        return Image::findByKey($this->cover_id)->limit(1)->ttl(60);
    }

    /** Gets all the images in the gallery.
     * @return ActiveQuery|Image[]
     */
    public function getImages() {
        return Image::findByGallery($this->id)->orderByAsc('id')->ttl(60);
    }

    /** Gets all the images to be rendered on the display page. This may exclude the cover if appropriate 
     * @return ActiveQuery|Image[]
    */
    public function getDisplayImages() {
        $query = $this->getImages()->andWhere(['is_cover', 0]);
        //if ($this->hasCover()) $query->andWhere(['id', '<>', $this->cover_id]);
        return $query;
    }

    /** Get all the tags
     * @return ActiveQuery|Tag[]
    */
    public function getAllTags() {
        return Tag::find()->leftJoin('$tags', ['id' => 'tag_id'])->orderByAsc('name')->groupBy('$tags.tag_id')->where(['gallery_id', $this->id])->ttl(60);
    }

    /** Get tags
     * @return ActiveQuery|Tag[]  */
    public function getTags() {
        return $this->getAllTags()->andWhere(['type', '<>', Tag::TYPE_ARTIST ]);
    }

    /** Gets the artist tags
     * @return ActiveQuery|Tag[] 
    */
    public function getArtist() {
        return $this->getAllTags()->andWhere(['type', Tag::TYPE_ARTIST ])->ttl(60);
    }

    /** Gets the top tags
     * @return ActiveQuery|Tag[] 
    */
    public function getTopTags() {
        return $this->getAllTags()->orderByDesc('cnt')->limit(5)->ttl(10);
    }


    /** @return ActiveQuery|Favourite list of all people that favourited this gallery */
    public function getFavourites() {
        return Favourite::find()->where(['gallery_id',  $this->getKey() ]);
    }

    /** @return bool checks if the current user has favourited this gallery */
    public function getFavourited() { 
        if (!GALL::$app->loggedIn()) return false;
        return GALL::$app->user->hasFavouritedGallery($this);
    }

#region views
    /** Increments the views */
    public function incrementView() {
        $this->views++;
        self::find()->increment([ 'views' ])->where([ 'id', $this ])->execute();

        if ($this->views % 1000 == 0) {
            //TODO: Make sure this is atomic
            $this->founder->giveSparkles('SCORE_VIEWS_1000', $this, Kiss::$app->getUser());
        }
    }
    /** Gets the number of views */
    public function getViews() { return self::find()->fields(['id', 'views'])->where(['id', $this])->cache(false)->one(true)['views']; }
    public function setViews() { throw new InvalidOperationException('Views cannot be set'); }
#endregion

    /** Creates a link between the tag and this gallery
     * @param Tag|string $tag the tag to add
     * @param User $founder the person to add the tag
     * @return Tag|false returns the tag
     */
    public function addTag($tag, $founder = null) {
        //if (!($tag instanceof Tag)) throw new ArgumentException('$tag must be of type Tag');

        //Convert the name to a tag
        if (is_string($tag)) {
            $name = trim(Strings::toLowerCase($tag));
            $tag = Tag::find()->where(['name', $name])->andWhere([ 'type', Tag::TYPE_TAG ])->remember(false)->ttl(0)->one();

            //Create a new tag if it doesn't exist
            if ($tag == null) {
                $tag = new Tag([
                    'name'          => $name,
                    'type'          => Tag::TYPE_TAG,
                    'founder_id'    => $founder == null ? null : $founder->getKey(),
                ]);

                //Save the tag
                if (!$tag->save()) {
                    $this->addError($tag->errors());
                    return false;
                }
            }
        }

        try {
            $tag_id = $tag instanceof Tag ? $tag->getId() : $tag;
            $success = Kiss::$app->db()->createQuery()->insert([
                'tag_id'        => $tag_id,
                'gallery_id'    => $this->getKey(),
                'founder_id'    => $founder == null ? null : $founder->getKey(),
            ], '$tags' )->execute();

            if ($success && $founder != null)
                $founder->giveSparkles('SCORE_TAG', $this, $tag_id);
            
            return $tag;
        } catch(SQLDuplicateException $dupeException) { return $tag; }
        return false;
    }

    /** Removes a specific tag */
    public function removeTag($tag) {
        if (is_string($tag)) $tag = Tag::findByName($tag)->one();
        if ($tag == null) throw new ArgumentException('Tag cannot be null');
        
        //TODO: un award score because the tag was removed. UNTAG.

        $query = Kiss::$app->db()->createQuery();
        return $query->delete('$tags')->where(['tag_id', $tag->getKey() ])->andWhere(['gallery_id', $this->getKey() ])->execute();
    }

    /** Checks the tags and removes any duplicates.
     * Additionally, it checks for automatic tagging
     */
    public function updateTags() {

        //Insure that we have all the nessary tags first
        $this->insureTags();

        //Sort the tags
        $tags = Tag::find()
                        ->fields(['*', '$tags.founder_id as FID'])
                        ->leftJoin('$tags', ['id' => 'tag_id'])
                        ->groupBy('$tags.tag_id')
                        ->where(['gallery_id', $this->id])
                        ->ttl(60)
                        ->all(true);

        $ids = Arrays::mapArray($tags, function($tag) { return [ $tag['id'], $tag ]; });
        
        //List of tags we need
        $create_tags = [];
        $remove_tags = [];

        foreach($tags as $tag) {
            if (empty($tag['alias_id']))
                continue;
        
            //Scan for the root tag
            $alias = $tag; $iteration = 0;
            while ($alias != null && !empty($alias['alias_id']) && $iteration++ < 10) {
                $FID = $alias['FID'];
                $alias = Tag::find()->where(['id', $alias['alias_id']])->one(true);
                $alias['FID'] = $FID;
            }

            //Add to the appriopriate lists
            $remove_tags[$tag['id']] = $tag;
            $create_tags[$alias['id']] = $alias;
        }

        //Add tags we need
        $adding_tags = array_filter($create_tags, function($t) use ($ids) { return !isset($ids[$t['id']]); });
        foreach($create_tags as $id => $t) {
            if (isset($ids[$id])) continue;

            $query = Kiss::$app->db()->createQuery();
            $query->insert([
                'tag_id'        => $id,
                'gallery_id'    => $this->getKey(),
                'founder_id'    => $t['FID'],
            ], '$tags' )->execute();

            //TODO: Add Score Rewards
        }

        //Remove tags we dont need
        if (count($remove_tags) > 0) {
            $query = Kiss::$app->db()->createQuery();
            $query->delete('$tags')->where(['gallery_id', $this->getKey() ])->andWhere(['tag_id', array_keys($remove_tags)])->execute();

            //TODO: Remove Score Rewards
        }

        //Check if its a comic tag, then upgrade it
        $newTags = $this->getTags()->all();
        foreach($newTags as $tag) {
            if ($tag->name == 'comic') {
                $this->type = self::TYPE_COMIC;
                $this->save(true, ['type']);
                break;
            }
        }
    }


    /** Checks for any automatically determined tags and assigns them (like discord or video) */
    protected function insureTags() {

        //Prepare a list of additional tags to add
        $tags = [];

        //Scan for all the videos
        /** @var Image[] $images */
        $images = $this->getImages()->fields(['origin'])->all();
        foreach($images as $image) {
            if ($image->isVideo()) {
                $tags[] = 'video';
                $tags[] = 'animated';
            }

            if ($image->getExtension() == '.gif' || $image->getExtension() == '.apng')
                $tags[] = 'animated';
        }

        //Remove dupes and add them
        $tags = array_unique($tags);
        foreach($tags as $tag) $this->addTag($tag);
    }

    /** @return Query|array returns all the reactions for the gallery */
    public function getReactions() {
        return Kiss::$app->db()->createQuery()->select('$reaction')->where(['gallery_id', $this->getKey()]);
    }


    /** Finds a gallery by the given tag
     * @param Tag $tag the tag
     * @return ActiveQuery|Gallery[] the gallery
     */
    public static function findByTag($tag) {
        if ($tag instanceof Tag) $tag = $tag->getKey();
        $query = Gallery::find()->select(Gallery::tableName() . ' g', [ 'g.*' ]);
        $query = $query->join('$tags', ['id' => 'gallery_id'], 'LEFT JOIN');
        return $query->where(['$tags.tag_id', $tag])->ttl(10);
    }

    /** @return ActiveQuery|Gallery[] finds the latest galleries */
    public static function findByLatest() {
        return Gallery::find()->orderByDesc('id')->ttl(10);
    }

    /** @return ActiveQuery|Gallery[] finds the best galleries */
    public static function findByRating() {
        //TODO
        return Gallery::find()->orderByDesc('views')->ttl(10);
    }

    /** @param User|int $founder 
     * @return ActiveQuery|Gallery[] finds the galleries base of the founder */
    public static function findByFounder($founder) {
        return Gallery::find()->where(['founder_id', $founder]);
    }

    /** @return ActiveQuery|Gallery[] finds 1 random gallery for each scraper */
    public static function findByRandomUniqueScraper() {
        //SELECT url FROM ( SELECT * FROM gall_gallery ORDER BY RAND() ) as sub GROUP BY scraper
        return Gallery::query()->select('( SELECT * FROM $gallery ORDER BY RAND() ) as sub')->groupBy('scraper');
    }

    /** @return ActiveQuery|Gallery[] finds by the url */
    public static function findByUrl($url) {
        return Gallery::find()->where(['url', $url])->ttl(60);
    }

    /** @return ActiveQuery|Gallery[] finds by the scraper's identifier. Identifiers are only unique to the scraper. */
    public static function findByIdentifier($scraper, $identifier) {
        return Gallery::find()->where(['scraper', $scraper])->andWhere(['identifier', $identifier])->ttl(0);
    }

    /** Finds galleries based of their tags
     * @param string|string[] $tags the name of the tags the gallery requires. If a tag is prefixed with - then it shall be excluded. If a single string, then it should be comma delimitered.
     * @param Tag[]|string[]|User|Query|null $additionalBlacklist additional tags that should be blacklisted. The Query type is only valid if it's a Gallery subquery that returns only the `gallery_id`. If a user is given, then their blacklist will be used.
     * @param Tag[]|string[]|null $additionalOR list of tags that will it has to contain, but doesnt have to contain all of them.
     * @return ActiveQuery|Gallery[] all valid galleries that match the criteria
    */
    public static function search($tags, $additionalBlacklist = null, $additionalOR = null) {
        
        //additionalOR is utilised by the recommendation
        //additionalBlacklist is used to filter by user

        $MODE_WHITELIST = 1;
        $MODE_BLACKLIST = 2;
        $MODE_ORLIST    = 3;

        //Cleanup the tags
        if (!is_array($tags)) {
            $tags = preg_split('/(,| )(?=([^\"]*\"[^\"]*\")*[^\"]*$)/', $tags);
        }

        //Build a list of valid IDS
        $whitelist = [];
        $blacklist = [];
        $orlist    = [];
        $userWhitelist     = [];
        $userBlacklist     = [];
        $userOrlist        = [];


        //---- Addionitional Orlist        
        if ($additionalOR != null) { 
            foreach($additionalOR as $tag) {
                //Its alread a tag
                if ($tag instanceof Tag) {
                    $id = $tag->getId();
                    if (!empty($id)) $orlist[] = $id;
                    continue;
                } 

                //Skip empties
                if (!empty($tag)) { 
                    /** @var Tag $tag */
                    $tag = Tag::findByName($tag)->one();
                    if ($tag != null) $orlist[] = $tag->getId();
                }
            }
        }

        //Scan each tag
        foreach($tags as $name) {

            //Its a tag object already, so get its id.
            if ($name instanceof Tag) {
                $id = $name->getId();
                if (!empty($id)) $whitelist[] = $id;
                continue;
            }

            //Trim the name
            $name = Strings::trim($name, " \n\r\t\v\0\x0B\"");

            //Check if its blacklist
            $mode = $MODE_WHITELIST;
            if (Strings::startsWith($name, '-')) {
                $name = substr($name, 1);
                $mode = $MODE_BLACKLIST;
            } else if (Strings::startsWith($name, '|')) {                
                $name = substr($name, 1);
                $mode = $MODE_ORLIST;
            }

            //Skip empties
            if (empty($name)) continue;

            //Determine if its a control tag
            if (count($control = explode(':', $name, 2)) > 1) {
                $key    = Strings::toLowerCase(Strings::trim($control[0]));
                $value  = Strings::trim($control[1]);
                switch($key) {
                    default: break; // We dont care, continue processing
                    case 'user': 
                        $profile = User::findByProfileName($value)->fields(['id'])->one();
                        if ($profile == null) break;    // Break the switch statement and continue processing
                        switch($mode) {
                            default:
                            case $MODE_WHITELIST:
                                $userWhitelist[] = $profile->getKey();
                                break;

                            case $MODE_BLACKLIST:
                                $userBlacklist[] = $profile->getKey();
                                break;

                            case $MODE_ORLIST:
                                $userOrlist[] = $profile->getKey();
                                break;
                        }
                }
            }

            /** @var Tag $tag */
            $tag = Tag::findByName($name)->one();
            if ($tag != null) {
                switch($mode) {
                    default:
                    case $MODE_WHITELIST:
                        $whitelist[] = $tag->getId();
                        break;

                    case $MODE_BLACKLIST:
                        $blacklist[] = $tag->getId();
                        break;

                    case $MODE_ORLIST:
                        $orlist[] = $tag->getId();
                        break;
                }
            }
        }

        //Create the query
        $query  = self::find()->orderByDesc('id');

        //---- Tag Whitelist
        if (count($whitelist) > 0) {
            foreach($whitelist as $tag_id) {
                $query->andWhere(['id', Kiss::$app->db()->createQuery()
                                                            ->select('$tags', [ 'gallery_id' ])
                                                            ->where([ 'tag_id', $tag_id ])
                                ]);
            }
        }

        //---- Tag Blacklist
        if (count($blacklist) > 0) {
            $query->andWhere(['id', 'NOT',  Kiss::$app->db()->createQuery()
                                                                ->select('$tags', [ 'gallery_id' ])
                                                                ->where([ 'tag_id', $blacklist ])
                            ]);
        }        
        
        //---- Tag Orlist
        if (count($orlist) > 0) {
            $query->orWhere(['id',  Kiss::$app->db()->createQuery()
                                                            ->select('$tags', [ 'gallery_id' ])
                                                            ->where([ 'tag_id', $orlist ])
                            ]);
        }


        //---- User Whitelist
        if (count($userWhitelist) > 0) {
            foreach($userWhitelist as $tag_id) {
                $query->andWhere(['founder_id', $userWhitelist ]);  // We can only have 1 user anyways, so it doesn't matter that it's oring it.
            }
        }

        //---- User Blacklist
        if (count($userBlacklist) > 0) {
            $query->andWhere(['founder_id', 'NOT',  $userBlacklist ]);
        }

        //---- User Orlist
        if (count($userOrlist) > 0) {
            $query->orWhere(['founder_id', $userOrlist ]);
        }

        //---- Guilds Whitelist
        //if (GALL::$app->loggedIn()) {
        //    $user = GALL::$app->user;
        //    $query->andWhere(['guild_id', Arrays::map($user->getGuilds()->all(true), function($g) { return $g['id']; })]);
        //}

        
        //Setup the additional blacklist
        if ($additionalBlacklist != null) {
            $adQuery = null;

            // if the blacklist is a query, then we will just use that.
            // Otherwise we need to break it down some more.
            if ($additionalBlacklist instanceof Query) {
                $adQuery = $additionalBlacklist;
            } else if ($additionalBlacklist instanceof User) {
                $adQuery = $additionalBlacklist->getBlacklist()->fields(['tag_id']);
            } else {
                if (!is_array($additionalBlacklist))
                    throw new InvalidArgumentException('$additionalBlacklist must be either a Query or an array');
                
                $adQuery = [];
                foreach($additionalBlacklist as $tag) {
                    if ($tag instanceof Tag) {
                        //Just get the ID directly
                        $adQuery[] = $tag->getId();
                    } else {
                        //We have to search for the id
                        /** @var Tag $tag */
                        $tag = Tag::findByName($tag)->one();
                        if ($tag != null) $adQuery[] = $tag->getId();
                    }
                }
            }

            //Finally add it to the query
            $query->andWhere(['id', 'NOT',  Kiss::$app->db()->createQuery()
                                    ->select('$tags', [ 'gallery_id' ])
                                    ->where([ 'tag_id', $adQuery ])
                            ]);
        }

        //Return the query
        return $query->orderByDesc('id');
    }
}