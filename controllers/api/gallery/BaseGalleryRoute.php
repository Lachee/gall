<?php namespace app\controllers\api;

use app\models\ScrapeData;
use app\models\User;
use GALL;
use kiss\controllers\api\ApiRoute;
use kiss\exception\HttpException;
use kiss\exception\NotYetImplementedException;
use kiss\helpers\HTTP;
use kiss\Kiss;
use kiss\models\BaseObject;
use kiss\router\Route;
use kiss\router\RouteFactory;
use Ramsey\Uuid\Uuid;
use Throwable;

class BaseGalleryRoute extends BaseApiRoute {

    protected static function route() { return "/gallery"; }

    /** @inheritdoc */
    public function scopes() {
        return [ 'gallery.publish' ];
    }

    /** @inheritdoc
     * Scrapes the data
     */
    public function post($data) {
        
        /** @var User $user */
        $user = $this->actingUser;
        if ($user == null) 
            throw new HttpException(HTTP::UNAUTHORIZED, 'No available user');

        //We need the json
        if (empty($json))
            throw new HttpException(HTTP::BAD_REQUEST, 'Missing data');

            
        if (isset($data['url']) || isset($data['urls'])) {

            //Scrape the URLS and save them
            $urls = $data['urls'] ?? [ $data['url'] ];            
            $results = [];
            foreach($urls as $url) {
                try {
                    $scrapedData = GALL::$app->scraper->scrape($url);
                    if ($scrapedData !== false) {
                        $gallery = $scrapedData->publish($user);
                        if ($gallery !== false) {
                            $results[$url] = $gallery;
                        } else {
                            $results[$url] = $scrapedData->errorSummary();
                        }
                    } else {
                        $results[$url] = 'Failed to scrape';
                    }
                }catch(Throwable $e) {
                    $results[$url] = $e->getMessage();
                }
            }

            return $results;
        } else {

            //Store the scraped data directly

            //Prepare the scraped data and load it up
            $scrapedData = new ScrapeData();
            if (!$scrapedData->load($json))
                throw new HttpException(HTTP::BAD_REQUEST, $scrapedData->errors());

            //Attempt to publish it
            $gallery = $scrapedData->publish($user);
            if ($gallery == false) throw new HttpException(HTTP::BAD_REQUEST, $scrapedData->errors());
            return $gallery; 
        }
    }
}