<?php namespace app\controllers\api;

use app\models\Guild;
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
        if (empty($data))
            throw new HttpException(HTTP::BAD_REQUEST, 'Missing data');

        $message_snowflake = $data['message_id'] ?? null;
        $channel_snowflake = $data['channel_id'] ?? null;
        $guild_id = $data['guild_id'] ?? null;
            
        if (!empty($guild_id)) {
            $guild = Guild::findByKey($guild_id)->orWhere(['snowflake', $guild_id])->one();
            $guild_id = $guild == null ? null : $guild->getKey();
        }

        if (!empty($message_snowflake) && (empty($guild_id) || empty($channel_snowflake)))
            throw new HttpException(HTTP::BAD_REQUEST, 'Message Snowflake must have channel and guild given too');

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
                            
                            if (!empty($guild_id))
                                $gallery->guild_id = $guild_id;

                            if (!empty($channel_snowflake))
                                $gallery->channel_snowflake = $channel_snowflake;

                            if (!empty($message_snowflake))
                                $gallery->message_snowflake = $message_snowflake;

                            $gallery->save(false, [ 'guild_id', 'channel_snowflake', 'message_snowflake' ]);
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