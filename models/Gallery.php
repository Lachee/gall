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

#region views
    /** Increments the views */
    public function incrementView() {
        $this->views++;
        self::find()->increment([ 'views' ])->where([ 'id', $this ])->execute();

        if ($this->views % 1000 == 0) {
            //TODO: Make sure this is atomic
            $this->founder->giveSparkles('SCORE_VIEWS_1000', '', $this, Kiss::$app->getUser());
        }
    }
    /** Gets the number of views */
    public function getViews() { return self::find()->fields(['id', 'views'])->where(['id', $this])->cache(false)->one(true)['views']; }
    public function setViews() { throw new InvalidOperationException('Views cannot be set'); }
#endregion

    /** Creates a link between the tag and this gallery
     * @param Tag $tag the tag to add
     * @param User $founder the person to add the tag
     */
    public function addTag($tag, $founder = null) {
        //if (!($tag instanceof Tag)) throw new ArgumentException('$tag must be of type Tag');
        try {
            $tag_id = $tag instanceof Tag ? $tag->getId() : $tag;
            Kiss::$app->db()->createQuery()->insert([
                'tag_id'        => $tag_id,
                'gallery_id'    => $this->getKey(),
                'founder_id'    => $founder == null ? null : $founder->getKey(),
            ], '$tags' )->execute();

            if ($founder != null)
                $founder->giveSparkles('SCORE_TAG', '', $this, $tag_id);
            
            return true;
        } catch(SQLDuplicateException $dupeException) { return true; }
    }

    /** Removes a specific tag */
    public function removeTag($tag) {
        if (is_string($tag)) $tag = Tag::findByName($tag)->one();
        if ($tag == null) throw new ArgumentException('Tag cannot be null');
        
        $query = Kiss::$app->db()->createQuery();
        return $query->delete('$tags')->where(['tag_id', $tag->getKey() ])->andWhere(['gallery_id', $this->getKey() ])->execute();
    }

    /** Checks the tags and removes any duplicates */
    public function updateTags() {        
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
     * @return ActiveQuery|Gallery[] all valid galleries that match the criteria
    */
    public static function search($tags, $additionalBlacklist = null) {
        
        //Cleanup the tags
        if (!is_array($tags)) {
            $tags = preg_split('/,|\s/', $tags);
        }

        //Build a list of valid IDS
        $whitelist = [];
        $blacklist = [];
        foreach($tags as $name) {
            //Check if its blacklist
            $isBlacklist = false;
            if (Strings::startsWith($name, '-')) {
                $name = substr($name, 1);
                $isBlacklist = true;
            }

            /** @var Tag $tag */
            $tag = Tag::findByName($name)->one();
            if ($tag != null) {
                if ($isBlacklist) $blacklist[] = $tag->getId();
                else              $whitelist[] = $tag->getId();
            }
        }

        //Create the query
        $query  = self::find()->orderByDesc('id');
        if (count($whitelist) > 0) {
            foreach($whitelist as $tag_id) {
                $query->andWhere(['id', Kiss::$app->db()->createQuery()
                                                            ->select('$tags', [ 'gallery_id' ])
                                                            ->where([ 'tag_id', $tag_id ])
                                ]);
            }
        }

        if (count($blacklist) > 0) {
            $query->andWhere(['id', 'NOT',  Kiss::$app->db()->createQuery()
                                                                ->select('$tags', [ 'gallery_id' ])
                                                                ->where([ 'tag_id', $blacklist ])
                            ]);
        }

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