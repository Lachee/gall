<?php namespace app\components\scraper;

use app\models\Gallery;
use app\models\Image;
use app\models\Tag;
use GALL;
use kiss\helpers\HTTP;
use kiss\models\BaseObject;

class Scraper extends BaseObject {
    /** @var string Directory that contains all the JSON data */
    public $directory;

    /** @var string relative cache directory */
    public $cacheDirectory = '/cache';

    /** Checks the directory for the current cache */
    public function checkCache() {

        //Load up the hash of files
        $hash = '';
        if (file_exists($this->directory . '/.hash')) {
            $hash = file_get_contents($this->directory . '/.hash');
        }

        //Get all the files
        $newHash = $this->getHash();
        if ($hash != $newHash) $this->recache();
    }

    public function recache() {

        $files = scandir($this->directory);
        foreach($files as $filename) {
            if (stripos($filename, '.') === 0) continue;
            if (strripos($filename, '.json') === false) continue;
            $this->cache($filename);
        }

        //Store the new hash 
        file_put_contents($this->directory . '/.hash', $this->getHash());
    }

    public function cache($filename) {
        if (strripos($filename, '.json') === false) return false;

        $gallery = Gallery::find()->where(['filename',  $filename])->one();
        if ($gallery == null) $gallery = new Gallery([]);

        $contents               = file_get_contents($this->directory . '/' . $filename);
        $json                   = json_decode($contents, true);
        $gallery->scraper       = $json['scraper'];
        $gallery->filename      = $filename;
        $gallery->title         = $json['data']['title'];
        $gallery->description   = $json['data']['description'];
        $gallery->source        = $json['data']['url'];
        $gallery->hash          = md5($contents);
        $gallery->cover         = $this->cacheThumbnail($json['data']['cover'] ?? $json['data']['images'][0]);


        if ($gallery->save()) {

            //Create its tags
            if (!$gallery->isNewRecord())  Tag::clearByGallery($gallery)->execute();
            foreach($json['data']['tags'] as $tag) 
                Tag::create($gallery, $tag);

            //Create its images
            foreach($json['data']['images'] as $url) {
                $image = new Image([ 'gallery_id' => $gallery->getKey(), 'source' => $url ]);
                $image->save();
            }

            return true;
        }

        return false;
    }

    public function cacheImage($url, $recache = false) {
        $filename = md5($url) . '.jpg';
        $filepath = GALL::$app->baseDir() . '/public' . $this->cacheDirectory . '/' . $filename;
        $selfurl = HTTP::url([$this->cacheDirectory . '/' . $filename ]);
        if (!$recache && file_exists($filepath)) return $selfurl;

        $guzzle = new \GuzzleHttp\Client();
        $guzzle->request('GET', $url, [ 'sink' => $filepath ]);
        return $selfurl;
    }   
    
    public function cacheThumbnail($url, $recache = false) {
        
        //Cache the main image first
        $this->cacheImage($url, $recache);

        //NNow get the path of the cached image
        $cache_filename = md5($url) . '.jpg';
        $cache_filepath = GALL::$app->baseDir() . '/public' . $this->cacheDirectory . '/' . $cache_filename;
        
        //Now get the path for the thumbnail
        $filename = md5($url) . '.thumbnail.jpg';
        $filepath = GALL::$app->baseDir() . '/public' . $this->cacheDirectory . '/' . $filename;
        $selfurl = HTTP::url([$this->cacheDirectory . '/' . $filename ]);
        if (!$recache && file_exists($filepath)) return $selfurl;
        
        self::createThumbnail($cache_filepath, $filepath, 300);

        //Now generate the thumbnail
        return $selfurl;
    }


    private function getHash() {        
        $files = scandir($this->directory);
        return md5(join(';', $files));
    }

        
    // Link image type to correct image loader and saver
    // - makes it easier to add additional types later on
    // - makes the function easier to read
    const IMAGE_HANDLERS = [
        IMAGETYPE_JPEG => [
            'load' => 'imagecreatefromjpeg',
            'save' => 'imagejpeg',
            'quality' => 100
        ],
        IMAGETYPE_PNG => [
            'load' => 'imagecreatefrompng',
            'save' => 'imagepng',
            'quality' => 0
        ],
        IMAGETYPE_GIF => [
            'load' => 'imagecreatefromgif',
            'save' => 'imagegif'
        ]
    ];

    /**
     * @param $src - a valid file location
     * @param $dest - a valid file target
     * @param $targetWidth - desired output width
     * @param $targetHeight - desired output height or null
     */
    private static function createThumbnail($src, $dest, $targetWidth, $targetHeight = null) {

        // 1. Load the image from the given $src
        // - see if the file actually exists
        // - check if it's of a valid image type
        // - load the image resource

        // get the type of the image
        // we need the type to determine the correct loader
        $type = exif_imagetype($src);

        // if no valid type or no handler found -> exit
        if (!$type || !self::IMAGE_HANDLERS[$type]) {
            return null;
        }

        // load the image with the correct loader
        $image = call_user_func(self::IMAGE_HANDLERS[$type]['load'], $src);

        // no image found at supplied location -> exit
        if (!$image) {
            return null;
        }


        // 2. Create a thumbnail and resize the loaded $image
        // - get the image dimensions
        // - define the output size appropriately
        // - create a thumbnail based on that size
        // - set alpha transparency for GIFs and PNGs
        // - draw the final thumbnail

        // get original image width and height
        $width = imagesx($image);
        $height = imagesy($image);

        // maintain aspect ratio when no height set
        if ($targetHeight == null) {

            // get width to height ratio
            $ratio = $width / $height;

            // if is portrait
            // use ratio to scale height to fit in square
            if ($width > $height) {
                $targetHeight = floor($targetWidth / $ratio);
            }
            // if is landscape
            // use ratio to scale width to fit in square
            else {
                $targetHeight = $targetWidth;
                $targetWidth = floor($targetWidth * $ratio);
            }
        }

        // create duplicate image based on calculated target size
        $thumbnail = imagecreatetruecolor($targetWidth, $targetHeight);

        // set transparency options for GIFs and PNGs
        if ($type == IMAGETYPE_GIF || $type == IMAGETYPE_PNG) {

            // make image transparent
            imagecolortransparent(
                $thumbnail,
                imagecolorallocate($thumbnail, 0, 0, 0)
            );

            // additional settings for PNGs
            if ($type == IMAGETYPE_PNG) {
                imagealphablending($thumbnail, false);
                imagesavealpha($thumbnail, true);
            }
        }

        // copy entire source image to duplicate image and resize
        imagecopyresampled(
            $thumbnail,
            $image,
            0, 0, 0, 0,
            $targetWidth, $targetHeight,
            $width, $height
        );


        // 3. Save the $thumbnail to disk
        // - call the correct save method
        // - set the correct quality level

        // save the duplicate version of the image to disk
        return call_user_func(
            self::IMAGE_HANDLERS[$type]['save'],
            $thumbnail,
            $dest,
            self::IMAGE_HANDLERS[$type]['quality']
        );
    }
}