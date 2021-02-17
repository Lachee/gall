<?php namespace app\controllers\api;

use app\models\ScrapeData;
use app\models\User;
use GALL;
use kiss\controllers\api\ApiRoute;
use kiss\exception\HttpException;
use kiss\exception\NotYetImplementedException;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\helpers\Strings;
use kiss\Kiss;
use kiss\models\BaseObject;
use kiss\router\Route;
use kiss\router\RouteFactory;
use Ramsey\Uuid\Uuid;

class ProxyRoute extends BaseApiRoute {
    use \kiss\controllers\api\Actions;


    public const CACHE_DURATION = 60 * 60; //* 24 * 7;
    public const VIDEO_CACHE_DURATION = 7 * 24 * 60 * 60; //* 24 * 7;
    
    public const CACHE_VERSION = 12;
    public const INTERPOLATIONS = [
        'NEAREST_NEIGHBOUR' => IMG_NEAREST_NEIGHBOUR, 
        'BILINEAR_FIXED'    => IMG_BILINEAR_FIXED, 
        'BICUBIC'           => IMG_BICUBIC, 
        'BICUBIC_FIXED'     => IMG_BICUBIC_FIXED
    ];

    protected static function route() { return "/proxy"; }
    
    
    /** @inheritdoc */
    protected function scopes() { return null; } // Proxy doesn't need any scopes.

    public function get() {

        //Proxy the image otherwise
        $attachment  = HTTP::get('attachment', false);
        if ($attachment !== false) 
            return $this->proxyAttachment();

        return $this->proxyImage();
    }

    /** Converts an attachment for proxying */
    private function proxyAttachment() {
        $url  = HTTP::get('attachment', false);

        //Return the cache
        $dataKey        = 'proxy:'.md5(join(':', [self::CACHE_VERSION, 'attachments', $url, 'data']));
        $headerKey      = 'proxy:'.md5(join(':', [self::CACHE_VERSION, 'attachments', $url, 'headers']));
        $dataCache      = Kiss::$app->redis()->get($dataKey);
        $headerCache    = Kiss::$app->redis()->get($headerKey);
        if (!empty($dataCache) && !empty($headerCache)) {
            $headers = explode("\n", $headerCache);
            foreach($headers as $header) header($header);
            die(base64_decode($dataCache));
        }

        //Open a temporary 
        $guzzle = new \GuzzleHttp\Client([
            'timeout' => KISS_DEBUG ? 20 : 5,
            'headers' => [ 'Referer' => self::getReferer($url) ]
        ]);
        $response = $guzzle->request('GET', $url, []);
        $data = $response->getBody()->getContents();

        //Give all the headers we got from the response
        $headers    = $response->getHeaders();
        $headerList = [];
        foreach($headers as $key => $header) {
            if (strtolower($key) === 'content-disposition') continue;
            $headerList[] = $header = $key . ':' . join(';', $header);
            header($header);
        }

        //Set the cache
        Kiss::$app->redis()->set($dataCache, base64_encode($data));
        Kiss::$app->redis()->set($headerCache, join("\n", $headerList));
        Kiss::$app->redis()->expire($dataCache, self::CACHE_DURATION);
        Kiss::$app->redis()->expire($headerCache, self::CACHE_DURATION);

        //Return the data directly.
        die($data);
    }

    /** Returns the proxied image*/
    private function proxyImage() {
        $size       = HTTP::get('size', 512);
        $url        = HTTP::get('url');
        $ext        = Strings::extension($url);

        //Check if its an attachment
        $attachment = preg_match('/cdn\.discord(app)?.(com|gg)\/attachments\//', $url);
        if ($attachment) {
            if (KISS_DEBUG && HTTP::https() == 'http') {  $_GET['attachment'] = $url; return $this->proxyAttachment(); } //Debug just show the attachments raw, since the base will be offline
            $url = trim(GALL::$app->baseURL(), '/') . '/api/proxy?attachment=' . urldecode($url);
        }

        //Check if its a video. If it is, generate teh thumbnail image and return it
        $video = HTTP::get('video', false) !== false || in_array($ext, [ '.webm', '.mp4' ]);
        
        //Otherwise continue as if it was a normal image.
        if (!$video && GALL::$app->proxySettings != null) {
            $size       = HTTP::get('size', 512);
            $endpoint   = self::generateImgproxyURL($url,
                                                    $size, 
                                                    GALL::$app->proxySettings['key'], 
                                                    GALL::$app->proxySettings['salt']
                                                );
            $proxy_url = trim(GALL::$app->proxySettings['baseUrl'], '/') . $endpoint;
            return Response::redirect($proxy_url);
        }
    

        $algo   = HTTP::get('algo', IMG_BICUBIC);
        $interpolation = self::INTERPOLATIONS[$algo] ?? (in_array($algo, array_values(self::INTERPOLATIONS)) ? $algo : IMG_BILINEAR_FIXED);

        //Set the default cache
        HTTP::setHeader('Cache-Control', "public, max-age=60, immutable");

        //TODO: REmove This
        //return null;

        //Check the cahce
        $key = 'proxy:'.md5(join(':', [self::CACHE_VERSION, $size, $url, $interpolation]));
        $cache = Kiss::$app->redis()->get($key);
        if (!$video && $cache) {
            //We do not cache the video since it handles its own internal cache
            ob_clean();
            return Response::image(base64_decode($cache), 'jpeg', HTTP::get('filename', false));
        }

        $data = null;
        if ($video) { 
            //Video data is cached and processed seperately
            $data = self::videoThumbnail($url);
         } else {
            //Regular images are processed normally
            $guzzle = new \GuzzleHttp\Client([
                'timeout' => KISS_DEBUG ? 10 : 2,
                'headers' => [
                    'Referer' => self::getReferer($url)
                ]
            ]);
            $response = $guzzle->request('GET', $url, []);
            $data = $response->getBody()->getContents();
        }

        //Scale the image
        if ($size > 0) { 
            $im = imagecreatefromstring($data);
            $width = imagesx($im);
            $height = imagesy($im);

            if ($width < $height) {
                $im = imagescale($im, $size, -1, $interpolation);
            } else {
                $aspect = $width / $height;
                $size_w = $aspect * $size;
                $im = imagescale($im, $size_w, $size, $interpolation);
            }
            
            //Output its data
            $imdata = null;
            ob_start();
                imagepng($im);
                imagedestroy($im);
                $imdata = ob_get_contents();
            ob_end_clean();
        } else {
            $imdata = $data;
        }
        
        //Set the cache
        if (!$video) {
            //We do not cache the video since it handles its own internal cache
            Kiss::$app->redis()->set($key, base64_encode($imdata));
            Kiss::$app->redis()->expire($key, self::CACHE_DURATION);
        }
        
        //Send
        ob_clean();
        return Response::image($imdata, 'png', HTTP::get('filename', false));
    }

    public static function generateImgproxyURL($url, $size,  $key, $salt, $ext = "jpg") {
        $keyBin = pack("H*" , $key);
        if(empty($keyBin)) {
            die('Key expected to be hex-encoded string');
        }
        
        $saltBin = pack("H*" , $salt);
        if(empty($saltBin)) {
            die('Salt expected to be hex-encoded string');
        }

        //Trim leading .
        $ext = Strings::trimStart($ext, ' .');

        $resize = 'fit';
        $width = $size;
        $height = $size;
        $gravity = 'no';
        $enlarge = 1;
        $extension = $ext;

        $encodedUrl = rtrim(strtr(base64_encode($url), '+/', '-_'), '=');
        $path = "/{$resize}/{$width}/{$height}/{$gravity}/{$enlarge}/{$encodedUrl}.{$extension}";
        $signature = rtrim(strtr(base64_encode(hash_hmac('sha256', $saltBin.$path, $keyBin, true)), '+/', '-_'), '=');
        return sprintf("/%s%s", $signature, $path);
    }

    /** Generates a thumbnail image for the video. 
     * @param string $url the url of the video
     * @param string $time the duration
     * @return mixed image data
    */
    private static function videoThumbnail($url, $time = 10, $duration = self::VIDEO_CACHE_DURATION) {
        $dataKey        = 'proxy:'.md5(join(':', [self::CACHE_VERSION, 'video', $url, $time]));
        $dataCache      = Kiss::$app->redis()->get($dataKey);
        if ($dataCache != null) return base64_decode($dataCache);

        $temp = tempnam(PUBLIC_DIR . "/cache", "vid");
        try {
            
            //https://github.com/PHP-FFMpeg/PHP-FFMpeg#extracting-image
            //Prepare the frame
            $ffmpeg = \FFMpeg\FFMpeg::create();
            $video = $ffmpeg->open($url);
            $frame = $video->frame(\FFMpeg\Coordinate\TimeCode::fromSeconds($time));
            
            //Save the temporary data
            $frame->save($temp);
            
            //Load into the cache
            $dataCache = file_get_contents($temp);
            Kiss::$app->redis()->set($dataKey, base64_encode($dataCache));
            Kiss::$app->redis()->expire($dataKey, $duration);

            //Save the result
            return $dataCache;
        } finally {
            //Finally clear the data
            unlink($temp);
        }

        return null;
    }

    private static function base64url_encode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
      }

    private static function getReferer($url) {
        return $url;
    }
}