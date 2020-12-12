<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use kiss\db\ActiveRecord;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\schema\IntegerProperty;
use kiss\schema\StringProperty;

class Image extends ActiveRecord {
    protected $id;
    protected $url;
    protected $origin;
    protected $scraper;
    protected $founder_id;
    protected $gallery_id;
    protected $is_thumbnail;

    public static function getSchemaProperties($options = [])
    {
        return [
            'id'            => new IntegerProperty('ID of the image'),
            'url'           => new StringProperty('URL of the image'),
            'origin'        => new StringProperty('Original URL of hte image'),
        ];
    }

    public function getFounder() {
        return User::findByKey($this->founder_id)->limit(1);
    }

    public function getGallery() { 
        return Gallery::findByKey($this->gallery_id)->limit(1);
    }

    public static function findByGallery($gallery) {
        $gallery_id = $gallery instanceof ActiveRecord ? $gallery->getKey() : $gallery;
        return self::find()->where(['gallery_id', $gallery_id]);
    }

    public static function findByOrigin($origin) {
        return self::find()->where(['origin', $origin]);
    }

    /** Proxies the original URL
     * @param string $filename if given, then the image will be given a filename in the proxy and downloaded
     * @return string the URL
     */
    public function getProxyUrl($filename = false) {
        $route = [ '/api/proxy' ];
        $route['url'] = empty($this->url) ? $this->origin : $this->url;
        if ($filename !== false) $route['filename'] = $filename;
        return HTTP::url($route);
    }

    /** Gets the current suitable url */
    public function getUrl() {
        return HTTP::url( ['/api/proxy', 'url' => empty($this->url) ? $this->origin : $this->url] );
    }

    /** Gets the thumbnail url for the given size */
    public function getThumbnail($size = 250, $algo = IMG_BICUBIC) {        
        return HTTP::url( ['/api/proxy', 'url' => empty($this->url) ? $this->origin : $this->url, 'size' => $size, 'algo' => $algo ] );
    }
}