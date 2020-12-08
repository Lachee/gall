<?php namespace app\controllers\api;

use app\models\ScrapeData;
use app\models\User;
use GALL;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\Kiss;
use kiss\models\BaseObject;
use kiss\router\Route;
use kiss\router\RouteFactory;
use Ramsey\Uuid\Uuid;

class PublishRoute extends Route {

    protected static function route() { return "/publish"; }

    public function post() {
        $json = HTTP::json(true);
        
        /** @var User $user */
        $user = GALL::$app->getUser();
        if (HTTP::header('Author', false) !== false) {

            //Setup the snowflake
            $snowflake = HTTP::header('Author', null);
            if (!preg_match('/^\\d{10,}$/', $snowflake))
                throw new HttpException(HTTP::BAD_REQUEST, 'Invalid author. Must be a snowflake.');

            //Fetch teh user.
            $user = User::findBySnowflake($snowflake)->one();
            if ($user == null) {

                //We didnt find one, so setup the discord user
                $duser = GALL::$app->discord->getUser($snowflake);
                if ($duser == null) throw new HttpException(HTTP::BAD_REQUEST, 'User does not exist.');

                //Create a new user
                $user = new User([
                    'uuid' => Uuid::uuid1(GALL::$app->uuidNodeProvider->getNode()),
                    'username' => $duser->username,
                    'snowflake' => $duser->id,
                ]);

                //We failed to save so abort
                if (!$user->save()) 
                    throw new HttpException(HTTP::INTERNAL_SERVER_ERROR, 'Failed to create author account. ' . join('. ', $user->errors()));
            }
        }

        if ($user == null) 
            throw new HttpException(HTTP::UNAUTHORIZED, 'Missing author');

        if (empty($json))
            throw new HttpException(HTTP::BAD_REQUEST, 'Missing data');

        //Load up the scrapped data
        $obj = new ScrapeData();
        if (!$obj->load($json))
            throw new HttpException(HTTP::BAD_REQUEST, $obj->errors());

        //Publish the data
        $gallery = $obj->publish($user);
        if ($gallery == false) throw new HttpException(HTTP::BAD_REQUEST, $obj->errors());
        return $gallery; 
    }
}