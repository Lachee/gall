<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use kiss\db\ActiveRecord;
use kiss\helpers\Arrays;
use kiss\helpers\Strings;
use kiss\Kiss;
use kiss\schema\IntegerProperty;
use kiss\schema\RefProperty;
use kiss\schema\StringProperty;

class Sparkle extends ActiveRecord {

/* [ ] */    public const SCORE_POSTED                   = 500;  //Posted artwork
/* [ ] */    public const SCORE_FAVOURITED               = 250;  //Someone favourited your artwork
/* [ ] */    public const SCORE_FAVOURITE                = 20;   //You favourited an artwork
/* [X] */    public const SCORE_VIEWS_1000               = 250;  //Someone viewed your artwork for the 1000th time
/* [X] */    public const SCORE_REACTION                 = 25;   //Someone reacted to your artwork
/* [X] */    public const SCORE_TAG                      = 50;   //You taged someones artwork
/* [ ] */    public const SCORE_LINKED                   = 300;  //Your artwork was linked again in chat.
/* [ ] */    public const SCORE_FAVOURITE_REFERAL        = 250;  //Someone favourited a piece from your profile page.
/* [ ] */    public const SCORE_LINKED_REFERAL           = 250;  //Someone logged into the site for the first time after visiting one of your galleries
/* [ ] */    public const SCORE_UPVOTE                   = 100;  //Your artwork was up voted
/* [ ] */    public const SCORE_NO_TAGS                  = -250; //You posted artwork that had no tags
/* [ ] */    public const SCORE_STARRED                  = 50;   //A message you sent was starred in a server

    public static function tableName() { return '$sparkles'; }

    protected $id;
    protected $user_id;
    protected $gallery_id;
    protected $type;
    protected $score;
    protected $resource;
    protected $date_created;

    /** @inheritdoc */
    public static function getSchemaProperties($options = []) {
        return [
            'id'            => new IntegerProperty('Internal ID of the guild'),
            'user'          => new RefProperty(User::class, 'User'),
            'gallery'       => new RefProperty(Gallery::class, 'The gallery'),
            'type'          => new StringProperty('Name of the guild'),
            'score'         => new IntegerProperty('Score to give'),
            'resource'      => new StringProperty('Identifier of some resource its linked to (like a gallery id)'),
            'date_created'  => new StringProperty('Date the score was recieved'),
        ];
    }


}