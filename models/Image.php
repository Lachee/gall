<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use kiss\db\ActiveRecord;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\schema\BooleanProperty;
use kiss\schema\IntegerProperty;
use kiss\schema\StringProperty;

class Image extends ActiveRecord {
    protected $id;
    protected $url;
    protected $delete_url;
    protected $origin;
    protected $scraper;
    protected $founder_id;
    protected $gallery_id;
    protected $is_cover;

    public static function getSchemaProperties($options = [])
    {
        return [
            'id'            => new IntegerProperty('ID of the image'),
            'url'           => new StringProperty('URL of the image'),
            'origin'        => new StringProperty('Original URL of the image'),
            'is_cover'      => new BooleanProperty('Is the image only used as a cover'),
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

    /** Proxies the url, allowing for downloads if required.
     * @param string $filename If not empty, then the url generated will cause the browser to download the image when opened. This will ignore the url and always use the proxy.
     * @return string the URL
     */
    public function getProxyUrl($filename = false) {
        $route = [ '/api/proxy' ];
        $route['url'] = empty($this->url) ? $this->origin : $this->url;
        if ($filename !== false) $route['filename'] = $filename;
        return HTTP::url($route);
    }

    /** Gets the original extension with leading period
     * @return string|false the extension, otherwise false if it cannot find it. Starts with .
     */
    public function getOriginExtension() {
        $url = $this->origin;
        $url = explode('?', $url)[0];
        $index = strrpos($url, '.');
        if ($index === false) return false;
        $ext = substr($url, $index);
        return $ext;
    }

    /** Gets the current suitable url for display. Similar to getProxyUrl but will never proxy if a url is available */
    public function getUrl() {
        if (empty($this->url)) 
            return HTTP::url( ['/api/proxy', 'url' => $this->origin ] );
        return $this->url;
    }

    /** Gets the thumbnail url for the given size. This will go through our proxy */
    public function getThumbnail($size = 250, $algo = IMG_BICUBIC) {        
        return HTTP::url( ['/api/proxy', 'url' => !empty($this->url) ? $this->url : $this->origin, 'size' => $size, 'algo' => $algo ] );
    }

    /** Downloads the origin data
     * @param \GuzzleHttp\Client|null $guzzle the client to use to download the image.
     * @return \Psr\Http\Message\StreamInterface the image data
     */
    public function downloadOriginData($guzzle = null) {
        //Open a temporary 
        if ($guzzle == null)
            $guzzle = new \GuzzleHttp\Client([
                'headers' => [
                    'Referer' => $this->origin
                ]
            ]);

        //Download the data
        $response = $guzzle->request('GET', $this->origin, []);
        return $response->getBody()->getContents();
    }
}