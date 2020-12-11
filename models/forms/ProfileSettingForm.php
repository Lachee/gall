<?php namespace app\models\forms;

use kiss\models\BaseObject;
use app\models\User;
use kiss\exception\InvalidOperationException;
use kiss\models\forms\Form;
use kiss\schema\StringProperty;

class ProfileSettingForm extends Form {
    
    /** @var User $profile */
    protected $profile;

    public $profile_name;

    protected function init()
    {
        parent::init();

        if ($this->profile == null)
            throw new InvalidOperationException('profile cannot be null');

        $this->profile_name = $this->profile->profile_name;
    }

    public static function getSchemaProperties($options = [])
    {
        return [
            'profile_name' => new StringProperty('Identifier for the profile page', 'cooldude69', [ 'title' => 'Page Name', 'readOnly' => true ]),
        ];
    }

    /** @inheritdoc */
    public function validate()
    {
        if (!parent::validate()) 
            return false;

        if ($this->profile_name != $this->profile->profileName) {
            $pn = User::findByProfileName($this->profile_name)->one();
            if ($pn != null) {
                $this->addError('Profile name is already in use');
                return false;
            }
        }

        return true;
    }

}