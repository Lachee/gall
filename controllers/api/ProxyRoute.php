<?php namespace app\controllers\api;

use app\models\ScrapeData;
use app\models\User;
use GALL;
use kiss\controllers\api\ApiRoute;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\Kiss;
use kiss\models\BaseObject;
use kiss\router\Route;
use kiss\router\RouteFactory;
use Ramsey\Uuid\Uuid;

class ProxyRoute extends BaseApiRoute {

    public const CACHE_DURATION = 60 * 60 * 24 * 7;
    public const CACHE_VERSION = 9;
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

        $size   = HTTP::get('size', 0);
        $url    = HTTP::get('url');
        $algo   = HTTP::get('algo', IMG_BICUBIC);

        $interpolation = self::INTERPOLATIONS[$algo] ?? (in_array($algo, array_values(self::INTERPOLATIONS)) ? $algo : IMG_BILINEAR_FIXED);

        //Set the default cache
        HTTP::setHeader('Cache-Control', "public, max-age=60, immutable");

        //TODO: REmove This
        //return null;

        //Check the cahce
        $key = 'proxy:'.md5(join(':', [self::CACHE_VERSION, $size, $url, $interpolation]));
        $cache = Kiss::$app->redis()->get($key);
        if ($cache) {
            ob_clean();
            return Response::image(base64_decode($cache), 'jpeg', HTTP::get('filename', false));
        }

        //Open a temporary 
        $guzzle = new \GuzzleHttp\Client([
            'headers' => [
                'Referer' => self::getReferer($url)
            ]
        ]);
        $response = $guzzle->request('GET', $url, []);
        $data = $response->getBody()->getContents();


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
                imagejpeg($im);
                imagedestroy($im);
                $imdata = ob_get_contents();
            ob_end_clean();
        } else {
            $imdata = $data;
        }
        
        //Set the cache
        Kiss::$app->redis()->set($key, base64_encode($imdata));
        Kiss::$app->redis()->expire($key, self::CACHE_DURATION);
        
        //Send
        ob_clean();
        return Response::image($imdata, 'jpeg', HTTP::get('filename', false));
    }


    private static function getReferer($url) {
        return $url;
    }
}