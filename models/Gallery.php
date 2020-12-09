<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use kiss\db\ActiveRecord;
use kiss\exception\ArgumentException;
use kiss\helpers\ArrayHelper;
use kiss\Kiss;

class Gallery extends ActiveRecord {
    protected $id;
    protected $identifier;
    protected $founder_id;
    protected $title;
    protected $description;
    protected $type;
    protected $scraper;
    protected $url;
    protected $thumbnail_id;

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

    public function getFounder() {
        return User::findByKey($this->founder_id);
    }

    public function getThumbnail() { 
        return Image::findByKey($this->thumbnail_id);
    }

    public function getImages() {
        return Image::findByGallery($this->id)->orderByAsc('id');
    }

    /** Get all the tags
     * @return ActiveQuery|Tag[]
    */
    public function getAllTags() {
        return Tag::find()->leftJoin('$tags', ['id' => 'tag_id'])->orderByAsc('name')->groupBy('$tags.tag_id')->where(['gallery_id', $this->id]);
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
        return $this->getAllTags()->andWhere(['type', Tag::TYPE_ARTIST ]);
    }

    /** Gets the top tags
     * @return ActiveQuery|Tag[] 
    */
    public function getTopTags() {
        return $this->getAllTags()->orderByDesc('cnt')->limit(5);
    }

    /** Creates a link between the tag and this gallery
     * @param Tag $tag the tag to add
     * @param User $founder the person to add the tag
     */
    public function addTag($tag, $founder = null) {
        if (!($tag instanceof Tag)) throw new ArgumentException('$tag must be of type Tag');
        
        $query = Kiss::$app->db()->createQuery();
        return $query->insert([
            'tag_id'        => $tag->getId(),
            'gallery_id'    => $this->getKey(),
            'founder_id'    => $founder == null ? null : $founder->getKey(),
        ], '$tags' )->execute();
    }

    /** Finds a gallery by the given tag
     * @param Tag $tag the tag
     * @return ActiveQuery|Gallery[] the gallery
     */
    public static function findByTag($tag) {
        if ($tag instanceof Tag) $tag = $tag->getKey();
        $query = Gallery::find()->select(Gallery::tableName() . ' g', [ 'g.*' ]);
        $query = $query->join('$tags', ['id' => 'gallery_id'], 'LEFT JOIN');
        return $query->where(['$tags.tag_id', $tag]);
    }

    /** @return ActiveQuery|Gallery[] finds the latest galleries */
    public static function findByLatest() {
        return Gallery::find()->orderByDesc('id');
    }

    /** @return ActiveQuery|Gallery[] finds the best galleries */
    public static function findByRating() {
        //TODO
        return Gallery::find()->orderByAsc('id');
    }

    /** @return ActiveQuery|Gallery[] finds the galleries submitted by the user */
    public static function findBySubmitted($user) {
        return Gallery::find()->where(['founder_id', $user])->orderByDesc('id');
    }
    
    /** @return ActiveQuery|Gallery[] finds the galleries favourited by the user */
    public static function findByFavourite($user) {
        //TODO
        return Gallery::find()->where(['founder_id', $user])->orderByDesc('id');
    }    

    /** @return ActiveQuery|Gallery[] finds the galleries by the users fav tags */
    public static function findByFavouriteTags($user) {
        //TODO
        return Gallery::find()->where(['founder_id', $user])->orderByDesc('id');
    }

    /** @return ActiveQuery|Gallery[] finds the top 5 submissions */
    public static function findByTopSubmitted($user) {
        return Gallery::find()->where(['founder_id', $user])->orderByAsc('id')->limit(5);
    }

    private const SEARCH_EXCLUDE = 0;
    private const SEARCH_ADDITIONAL = 1;
    private const SEARCH_REQUIRED = 2;

    /** @return ActiveQuery|Gallery[] finds the galleirs from the given search */
    public static function search($terms, $page, $limit) {
        $results = [];
        $map = [
            self::SEARCH_EXCLUDE => [],
            self::SEARCH_ADDITIONAL => [],
            self::SEARCH_REQUIRED => [],
        ];

        // Find by Tag
        if (!empty($terms['tag'])) {
            [ $names,  $tagExcludes ] = self::_searchParseQuery($terms['tag']);
            $wheres = ArrayHelper::map($names, function($n) { return [ 'name', $n ]; });
            $links = Kiss::$app->db()->createQuery()
                            ->select('$tags')
                            ->leftJoin(Tag::tableName(), [ 'tag_id' => 'id'])
                            ->orWhere($wheres)
                            ->limit($limit, $page * $limit)
                            ->execute();

            if (count($names) == 1)
            {
                //We only have a single tag, there is no additional filtering requried
                foreach($links as $tag) {
                    $results[] = Gallery::findByKey($tag['gallery_id'])->one();
                }
            } 
            else 
            {
                //We need to map the tags
                $map = [];
                foreach($links as $tag) {
                    $t = $tagExcludes[$tag['name']];
                    $i = $tag['tag_id'];
                    $g = $tag['gallery_id'];
                    if (!isset($map[$t][$i]))   $map[$t][$i] = [];
                    $map[$t][$i][] = $g;
                }
            }
        }
        
        if (!empty($terms['scraper'])) {
            [ $names,  $excludes ] = self::_searchParseQuery($terms['scraper']);
            foreach($excludes as $name => $t) {
                $galleries = Gallery::find()->fields(['id, scraper'])->where(['scraper', $name])->limit($limit, $page * $limit)->all(true);

                foreach($galleries as $gallery) {
                    $i = $name;
                    $g = $gallery['id'];

                    if (!isset($map[$t][$i]))   $map[$t][$i] = [];
                        $map[$t][$i][] = $g;
                }
            }
        }

        //Then filter the map tags
        $galleries = [];
        
        //Add the required
        $requireCount = count($map[self::SEARCH_REQUIRED]);
        if ($requireCount == 1)     $galleries = $map[self::SEARCH_REQUIRED][array_key_first($map[self::SEARCH_REQUIRED])];
        else if ($requireCount > 1) $galleries = array_intersect(...$map[self::SEARCH_REQUIRED]);
        
        //Remove the excludes
        if (!empty($map[self::SEARCH_EXCLUDE]))
            $galleries = array_diff($galleries, ...$map[self::SEARCH_EXCLUDE]);
        
        //Add all the ors
        if (!empty($map[self::SEARCH_ADDITIONAL]))
            $galleries = array_merge($galleries, ...$map[self::SEARCH_ADDITIONAL]);

        //Find all the galleries
        foreach($galleries as $id) {
            $results[] = Gallery::findByKey($id)->one();
        }
        
        return $results;
    }

    private static function _searchParseQuery($query) {
        $names = [];
        $tagExcludes = [];

        foreach(explode(',', $query) as $name) {
            $nm = strtolower(trim($name));
            if (empty($nm)) continue;
            if ($nm[0] == '~') { 
                $nm = substr($nm, 1);
                $tagExcludes[$nm] = self::SEARCH_EXCLUDE;
            } else if ($nm[0] == '|') { 
                $nm = substr($nm, 1);
                $tagExcludes[$nm] = self::SEARCH_ADDITIONAL;
            } else {
                $tagExcludes[$nm] = self::SEARCH_REQUIRED;
            }
            $names[] = $nm;
        }
        return [ $names, $tagExcludes ];
    }
}