<?php namespace app\controllers\api\guild;

use app\controllers\api\BaseApiRoute;
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

class BaseGuildRoute extends BaseApiRoute {
    use \kiss\controllers\api\Actions;


    protected static function route() { return "/guild"; }

    /** @inheritdoc */
    public function scopes() {
        return [ 'ctrl:allow_users', 'guild.publish' ];
    }

    public function get() {
        $guild = GALL::$app->discord->getGuild('758965163176230932');
        return $guild;
        return 'shit';
    }
    

    /** @inheritdoc
     * Scrapes the data
     */
    public function post($data) {
        
        /** @var User $user */
        $user = $this->actingUser;
        if ($user == null) 
            throw new HttpException(HTTP::UNAUTHORIZED, 'No available user');

        //Verify the guild id
        if (empty($data['guild_id'])) 
            throw new HttpException(HTTP::BAD_REQUEST, 'Missing guild_id');
 
        $guild_id = $data['guild_id'];
        $existingGuild = Guild::findBySnowflake($guild_id)->one();
        if ($existingGuild != null) 
            throw new HttpException(HTTP::BAD_REQUEST, 'Guild already exists, did you mean PUT?');

        //Create a new guild object
        $discordGuild = GALL::$app->discord->getGuild($guild_id);
        $guild = new Guild([ 
            'snowflake' => $guild_id,
            'name'      => $discordGuild['name']
        ]);

        if (!$guild->save())
            throw new HttpException(HTTP::BAD_REQUEST, $guild->errors());

        //Update it's emotes
        $guild->updateDiscordEmotes($discordGuild['emojis']);
        return $guild;
    }
}