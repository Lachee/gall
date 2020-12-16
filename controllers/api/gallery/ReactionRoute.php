<?php namespace app\controllers\api\gallery;

use app\models\Emote;
use app\models\Gallery;
use app\models\User;
use GALL;
use kiss\exception\HttpException;
use kiss\exception\NotYetImplementedException;
use kiss\helpers\HTTP;
use kiss\Kiss;
use kiss\router\Route;

class ReactionRoute extends GalleryRoute {

    protected $gallery_id;
    
    //We are going to return our routing. Any segment that starts with : is a property.
    // Note that more explicit routes get higher priority. So /example/apple will take priority over /example/:fish
    protected static function route() { return parent::route() . "/reactions"; }

    /** @inheritdoc */
    public function scopes() { return [ 'gallery.reaction' ]; }

    
    /** Gets all reactions for the post */
    public function get() { 
        return $this->gallery->getReactions()->execute();
    }
    
    /** Adds a reaction as the current user */
    public function post($data) {
        
        //Get the user and the gallery
        $gallery    = $this->gallery;
        $user       = $this->actingUser;
        if ($user == null) throw new HttpException(HTTP::UNAUTHORIZED, 'Cannot reaction without an active user');        
        
        //Get the emote, make sure it exists
        $emote      = Emote::findByKey($data['id'])->orWhere(['snowflake', $data['id']])->one();
        if ($emote == null) {
            $emote = new Emote([
                'guild_id'      => null,
                'snowflake'     => $data['id'],
                'name'          => $data['name'],
                'animated'      => $data['animated'],
                'founder_id'    => $user->getKey(),
            ]);
            
            if (!$emote->save()) 
                throw new HttpException(HTTP::BAD_REQUEST, $emote->errors());
        }

        //Tell the user to add the reaction
        $user->addReaction($gallery, $emote);
        return true;
    }    

    /** Deletes a user's reaction */
    public function delete() { 
        $reaction_id  = HTTP::get('id', null);
        if (empty($reaction_id)) throw new HttpException(HTTP::BAD_REQUEST, 'id of the emote must be given in query parameter');

        //Get the user and the gallery
        $gallery    = $this->gallery;
        $user       = $this->actingUser;
        if ($user == null) throw new HttpException(HTTP::UNAUTHORIZED, 'Cannot reaction without an active user');        
        
        //Find the emote
        $emote      = Emote::findByKey($reaction_id)->orWhere(['snowflake', $reaction_id ])->one();
        if ($emote == null) throw new HttpException(HTTP::BAD_REQUEST, 'emote not found');

        //Tell the user to add the reaction
        $user->removeReaction($gallery, $emote);
        return true;
    }

    
    public function options() { throw new HttpException(HTTP::METHOD_NOT_ALLOWED); }
    public function put($data) { throw new HttpException(HTTP::METHOD_NOT_ALLOWED); }    
}