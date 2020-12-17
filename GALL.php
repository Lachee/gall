<?php

use kiss\Kiss;

/**
 * @property GALL $app
 * @property \app\components\discord\Discord $discord Discord API instance
 * @property \app\components\Scraper $scraper content scraper
 * @property \app\models\User $user current user
 * @method \app\models\User getUser() gets the currently signed in user 
 * 
 */
class GALL extends Kiss {

    public $serverInvite = '';

    protected function init() {
        parent::init();

    }
    
} 