<?php namespace app\controllers\api\image;

use app\controllers\api\BaseApiRoute;
use app\models\Gallery;
use app\models\Guild;
use app\models\Image;
use GALL;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\router\Route;

class ImageRoute extends BaseApiRoute {
    use \kiss\controllers\api\Actions;


    protected $image_id;
    private $_image = null;

    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return "/image/:image_id"; }

    protected function scopes() {
        switch(HTTP::method()) {
            default:  return [ ];
        }
    }

    /** Gets a guild object */
    public function get() {
        return $this->image;
    }
    
    /**
     * Finds a project
     * @return Guild|null
     * @throws HttpException 
     */
    public function getImage() {
        if ($this->_image) return $this->_image;
        $query = Image::findByKey($this->image_id)->orWhere(['url', $this->image_id])->orWhere(['origin', $this->image_id])->limit(1);
        $this->_image = $query->one();
        if ($this->_image == null) throw new HttpException(HTTP::NOT_FOUND, 'Could not find image');
        return $this->_image;
    }

    
}