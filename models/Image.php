<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use kiss\db\ActiveRecord;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\helpers\Strings;
use kiss\schema\BooleanProperty;
use kiss\schema\IntegerProperty;
use kiss\schema\StringProperty;

class Image extends ActiveRecord {
    protected $id;
    protected $url;
    protected $origin;
    protected $scraper;
    protected $founder_id;
    protected $gallery_id;
    protected $is_cover;
    
    public $delete_url;

    public static function getSchemaProperties($options = [])
    {
        return [
            'id'            => new IntegerProperty('ID of the image'),
            'url'           => new StringProperty('URL of the image'),
            'origin'        => new StringProperty('Original URL of the image'),
            'proxy'         => new StringProperty('Proxy URL of the image'),
            'thumbnail'     => new StringProperty('Thumbnail URL of the image'),
            'extension'     => new StringProperty('File extension'),
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


    /** Gets the original extension with leading period
     * @return string|false the extension, otherwise false if it cannot find it. Starts with .
     */
    public function getOriginExtension() {
        return Strings::extension($this->origin);
    }

    /** Gets the extension with leading period
     * @return string|false the extension, otherwise false if it cannot find it. Starts with .
     */
    public function getExtension() {
        if (empty($this->url)) return $this->getOriginExtension();
        $ext = Strings::extension($this->url);
        if ($ext === false) return $this->getOriginExtension();
        return $ext;
    }

    /** @deprecated use getProxy instead*/
    public function getUrl() {
        return $this->getProxy();
    }

    public function isVideo() {
        $video = [ '.webm', '.mp4' ];
        return in_array($this->getExtension(), $video);
    }

    /** @return bool true if the image is an attachment */
    public function isAttachment() {
        return preg_match('/cdn\.discord(app)?.(com|gg)\/attachments\//', $this->origin);
    }

    /** Gets the url that is suitable for display */
    public function getProxy() {
        //if ($this->isVideo())
        //    return !empty($this->url) ? $this->url : $this->origin;
            
        if (empty($this->url)) {
            //Setup the origin that we will proxy
            $origin = $this->origin;
            
            //If this is an attachment, we need to proxy it
            if ($this->isAttachment())
                $origin = HTTP::url( ['/api/proxy', 'attachment' => $origin ], true);
            
            //Return video's immediately. They cannot be proxied (unless thumbnail).
            if ($this->isVideo()) return $origin;
            
            if (!$this->isVideo() && GALL::$app->proxySettings != null) {
                //We have proxy settings, so lets use those directly instead of going through our old proxy
                $ext = $this->getExtension();
                $endpoint = \app\controllers\api\ProxyRoute::generateImgproxyURL( 
                                                        $origin,
                                                        0, 
                                                        GALL::$app->proxySettings['key'], 
                                                        GALL::$app->proxySettings['salt'],
                                                        $ext != false ? $ext : 'jpg'
                                                    );
    
                $proxy_url = trim(GALL::$app->proxySettings['baseUrl'], '/') . $endpoint;
                return $proxy_url;
            } else {
                //We will just go through our old proxt
                return HTTP::url( ['/api/proxy', 'url' => $origin, 'video' => $this->isVideo() ] );
            }
        }
        
        //Return our URL
        return $this->url;
    }

    /** Proxies the url, allowing for downloads if required.
     * @param string $filename If not empty, then the url generated will cause the browser to download the image when opened. This will ignore the url and always use the proxy.
     * @return string the URL
     */
    public function getDownloadUrl($filename = false) {
        $route = [ '/api/proxy' ];
        $route['url'] = empty($this->url) ? $this->origin : $this->url;
        if ($filename !== false) $route['filename'] = $filename;
        return $this->isVideo() ? $route['url'] :  HTTP::url($route);
    }

    /** Gets the thumbnail url for the given size. This will go through our proxy */
    public function getThumbnail($size = 512, $algo = IMG_BICUBIC) {
        
        //Setup the origin that we will proxy
        $origin = $this->origin;
        
        //If this is an attachment, we need to proxy it
        if ($this->isAttachment())
            $origin = HTTP::url( ['/api/proxy', 'attachment' => $origin ], true);
            
        //If this is a video, then just return it immediately
        //if ($this->isVideo()) return !empty($this->url) ? $this->url : $origin;

        if (!$this->isVideo() && GALL::$app->proxySettings != null) {
            $endpoint = \app\controllers\api\ProxyRoute::generateImgproxyURL( 
                                                    !empty($this->url) ? $this->url : $origin,
                                                    $size, 
                                                    GALL::$app->proxySettings['key'], 
                                                    GALL::$app->proxySettings['salt']
                                                );

            $proxy_url = trim(GALL::$app->proxySettings['baseUrl'], '/') . $endpoint;
            return $proxy_url;
        } else {
            return HTTP::url( ['/api/proxy', 'url' => !empty($this->url) ? $this->url : $origin, 'size' => $size, 'algo' => $algo, 'video' => $this->isVideo() ] );
        }
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