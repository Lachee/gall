<?php namespace app\components\discord\interaction;

use kiss\models\BaseObject;

class Interaction extends BaseObject {
    const RESPONSE_TYPE_PONG = 1;
    const RESPONSE_TYPE_ACKNOWLEDGE = 2;
    const RESPONSE_TYPE_CHANNEL_MESSAGE = 3;
    const RESPONSE_TYPE_CHANNEL_MESSAGE_WITH_SOURCE = 4;
    const RESPONSE_TYPE_ACKNOWLEDGE_WITH_SOURCE = 5;

    const REQUEST_TYPE_PING = 1;
    const REQUEST_TYPE_APPLICATION_COMMAND = 2;

    const RESPONSE_FLAG_EPHEMERAL = 1 << 6;

    public $discord;

    public $type;
    public $token;
    public $member;
    
    public $id;
    public $guild_id;
    public $channel_id;
    
    public $data;

    public function respond() {
        
    }
}