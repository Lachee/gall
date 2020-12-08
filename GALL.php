<?php

use kiss\Kiss;

/**
 * @property GALL $app
 * @property \app\components\discord\Discord $discord Discord API instance
 * @property \app\components\scraper\Scraper $scraper;
 * @property \app\models\User $user current user
 * @method \app\models\User getUser() gets the currently signed in user 
 * 
 */
class GALL extends Kiss {
    protected function init() {
        parent::init();

    }
    
} 