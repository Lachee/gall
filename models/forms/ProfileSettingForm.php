<?php namespace app\models\forms;

use kiss\models\BaseObject;
use app\models\User;
use kiss\exception\InvalidOperationException;
use kiss\models\forms\Form;
use kiss\schema\StringProperty;

class ProfileSettingForm extends Form {
    
    /** @var User $profile */
    protected $profile;

    public $profileName;

    protected function init()
    {
        parent::init();

        if ($this->profile == null)
            throw new InvalidOperationException('profile cannot be null');

        $this->profileName = $this->profile->profile_name;
    }

    public static function getSchemaProperties($options = [])
    {
        return [
            'profileName' => new StringProperty('Identifier for the profile page', 'cooldude69', [ 'title' => 'Page Name' ]),
        ];
    }


}