<?php namespace app\controllers\api;

use GALL;
use Throwable;
use app\models\Gallery;
use app\models\Guild;
use app\models\ScrapeData;
use app\models\User;
use kiss\exception\HttpException;
use kiss\helpers\Arrays;
use kiss\helpers\HTTP;
use kiss\helpers\Response;

class BaseGalleryRoute extends BaseApiRoute {
    use \kiss\controllers\api\Actions;


    const DEFAULT_PAGE_SIZE = 1;
    const MAX_PAGE_SIZE = 5;

    protected static function route() { return "/gallery"; }

    /** @inheritdoc */
    public function scopes() {
        switch(HTTP::method()) {
            default:            return null; //[ 'ctrl:allow_users', 'gallery.search' ];
            case HTTP::POST:    return [ 'gallery.publish' ];
        }
    }

    public function get() {
        $term           = HTTP::get('term', HTTP::get('q', ''));
        $id             = HTTP::get('id', false);
        $page           = intval(HTTP::get('page', 1));
        $pageLimit      = HTTP::get('limit', self::DEFAULT_PAGE_SIZE);
        $asSelect2      = HTTP::get('select2', false, FILTER_VALIDATE_BOOLEAN);
        $tags           = HTTP::get('tags', HTTP::get('t', ''));

        //They probably actually meant page 1
        if ($page == 0)  $page = 1;

        if ($pageLimit > self::MAX_PAGE_SIZE)
            throw new HttpException(HTTP::BAD_REQUEST, "Cannot request more than " . self::MAX_PAGE_SIZE . " items");

        /** @var ActiveQuery $query */
        $query = null;
        
        if ($id !== false) {   
            //Specifically looking for a specific item
            $query = Gallery::findByKey($id);
        } else {

            //General searching
            if (!empty($tags)) {
                $query = Gallery::search($tags, $this->actingUser);
            } else {
                $query = Gallery::search('*', $this->actingUser);
            }

            //Filter the results by the terms
            if (!empty($term)) {
                $query = $query->where([ 'title', 'like', "%{$term}%"])
                                            ->orWhere(['channel_snowflake', $term])
                                            ->orWhere(['message_snowflake', $term])
                                            ->orWhere([ 'description', 'like', "%{$term}%"]);
            }
        }

        if (HTTP::get('preview', false, FILTER_VALIDATE_BOOLEAN) == true)
            return $query->previewStatement();
    
        $results = $query->limit($pageLimit, ($page-1) * $pageLimit)->all();
        if (!$asSelect2) return $results;
        $results = Arrays::map($results, function($t) { 
            return [
                'id'        => $t->id,
                'text'      => $t->name,
                'name'      => $t->name,
                'guild_id'  => $t->guild_id,
                'animated'  => $t->animated,
                'url'       => $t->url,
            ]; 
        });
            
        return new Response(HTTP::OK, [], [
            'results'   => $results,
            'pagination' => [
                'count' => count($results),
                'more'  => count($results) == $pageLimit
            ]
        ], HTTP::CONTENT_APPLICATION_JSON);
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

        $title = $data['title'] ?? null;
        if ($title != null && !is_string($title)) throw new HttpException(HTTP::BAD_REQUEST, '"title" must be a string if provided');
        
        $individual = $data['individual'] ?? false;
        if (!is_bool($individual)) throw new HttpException(HTTP::BAD_REQUEST, '"individual" must be a boolean');
        


        if (!empty($guild_id)) {
            $guild = Guild::findByKey($guild_id)->orWhere(['snowflake', $guild_id])->one();
            $guild_id = $guild == null ? null : $guild->getKey();
        }

        if (!empty($message_snowflake) && (empty($guild_id) || empty($channel_snowflake)))
            throw new HttpException(HTTP::BAD_REQUEST, 'Message Snowflake must have channel and guild given too');

        if (isset($data['url']) || isset($data['urls'])) {
            
            /** @var Gallery $baseGallery */
            $baseGallery    = null; // This is the gallery we will merge all the scrapped data into
            
            //Scrape the URLS and save them
            $results        = [];
            $urls           = $data['urls'] ?? $data['url'];   
            if (!is_array($urls)) $urls = [ $urls ];
            
            foreach($urls as $url) {
                try {
                    //Make sure we dont have a matching gallery first
                    $gallery = Gallery::findByUrl($url)->one();
                    if ($gallery != null) {
                        $results[$url] = $gallery;
                    }  else {
                        //Otherwise, we have to scrape the URL
                        $scrapedData = GALL::$app->scraper->scrape($url);
                        if ($scrapedData !== false) {
                            
                            if (count($scrapedData->images) > 1 || $individual || $baseGallery == null) {
                                    
                                $gallery = $scrapedData->publish($user);
                                if ($gallery !== false) {

                                    //Store the base gallery. We will add to this with individual images
                                    if ($baseGallery == null)
                                        $gallery = $baseGallery;

                                    //set the origin message, but only if thsi is a new record
                                    if ($scrapedData->hasPublishedNewGallery()) {
                                        $needSaving = false;
                                        if (!empty($guild_id)) {
                                            $gallery->guild_id = $guild_id;
                                            $needSaving = true;
                                        }
                                        if (!empty($channel_snowflake)) {
                                            $gallery->channel_snowflake = $channel_snowflake;
                                            $needSaving = true;
                                        }
                                        if (!empty($message_snowflake)) {
                                            $gallery->message_snowflake = $message_snowflake;
                                            $needSaving = true;
                                        }
                                        if (!empty($title)) {
                                            $gallery->title = $title;
                                            $needSaving = true;
                                        }
                                        
                                        if ($needSaving)
                                            $gallery->save(false, [ 'title', 'guild_id', 'channel_snowflake', 'message_snowflake' ]);
                                    }
                                    
                                    //Pre-Proxy the url
                                    //$url = Kiss::$app->baseURL() . substr($gallery->cover->proxyUrl, 1);
                                    //file_get_contents($url);

                                    //Store results
                                    $results[$url] = $gallery;
                                } else {
                                    //Store error
                                    $results[$url] = $scrapedData->errorSummary();
                                }
                            } else {
                                //We need to add it to the base gallery
                                assert($baseGallery instanceof Gallery, 'base gallery has been set');
                                $scrapedData->publishTo($user, $baseGallery);
                                $results[$url] = $gallery;
                            }
                        } else {
                            //Store generic error
                            $results[$url] = 'Failed to scrape';
                        }
                    }
                }catch(Throwable $e) {
                    //Store exception
                    $results[$url] = $e->getMessage();
                }
            }

            return $results;
        } else {

            //Store the scraped data directly

            //Prepare the scraped data and load it up
            $scrapedData = new ScrapeData();
            if (!$scrapedData->load($data))
                throw new HttpException(HTTP::BAD_REQUEST, $scrapedData->errors());

            //Attempt to publish it
            $gallery = $scrapedData->publish($user);
            if ($gallery == false) throw new HttpException(HTTP::BAD_REQUEST, $scrapedData->errors());
            return $gallery; 
        }
    }
}