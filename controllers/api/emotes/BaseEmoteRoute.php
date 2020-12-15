<?php namespace app\controllers\api\emotes;

use app\controllers\api\BaseApiRoute;
use app\models\Emote;
use app\models\Guild;
use app\models\Tag;
use kiss\controllers\api\ApiRoute;
use kiss\exception\HttpException;
use kiss\helpers\Arrays;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\router\Route;
use kiss\router\RouteFactory;

class BaseEmoteRoute extends BaseApiRoute {

    const DEFAULT_PAGE_SIZE = 10;
    const MAX_PAGE_SIZE = 150;

    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return "/emotes"; }

    /** @inheritdoc */
    protected function scopes() { 
        switch(HTTP::method()) {        
            default: return [ 'jwt:src:user'  ];
            case HTTP::POST: return [ 'emote.publish' ];
        }
    }

    /** Searches emote */
    public function get() {
        $term           = HTTP::get('term', HTTP::get('q', ''));
        $id             = HTTP::get('id', false);
        $page           = HTTP::get('page', 1);
        $pageLimit      = HTTP::get('limit', self::DEFAULT_PAGE_SIZE);
        $asSelect2      = HTTP::get('select2', false, FILTER_VALIDATE_BOOLEAN);

        //They probably actually meant page 1
        if ($page == 0)  $page = 1;

        if ($pageLimit > self::MAX_PAGE_SIZE)
            throw new HttpException(HTTP::BAD_REQUEST, "Cannot request more than " . self::MAX_PAGE_SIZE . " items");

        if ($id === false) {
            $query = Emote::find()->where([ 'name', 'like', "%{$term}%"]);
        } else {
            $query = Emote::find()->where(['id', $id]);
        }
    
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

    /** Posts a new emote */
    public function post($data) {
        if (empty($data['guild_id']))   throw new HttpException(HTTP::BAD_REQUEST, 'Missing guild_id');
        if (empty($data['id']))         throw new HttpException(HTTP::BAD_REQUEST, 'Missing id');

        //Setup the guild
        $guild = Guild::findByKey($data['guild_id'])->orWhere(['snowflake', $data['guild_id']])->one();
        if ($guild == null) throw new HttpException(HTTP::BAD_REQUEST, 'Invalid guild');

        //Check its unique
        $emote = Emote::findBySnowflake($data['id'])->one();
        if ($emote != null) throw new HttpException(HTTP::BAD_REQUEST, 'Emote already exists');

        //Create the emtoe
        $emote = new Emote([
            'guild_id'  => $guild->getKey(),
            'snowflake' => $data['id'],
            'name'      => $data['name'],
            'animated'  => $data['animated'],
        ]);

        if (!$emote->save()) 
            throw new HttpException(HTTP::BAD_REQUEST, $emote->errors());

        return $emote;
    }
}