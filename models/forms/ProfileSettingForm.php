<?php namespace app\models\forms;

use app\models\Tag;
use kiss\models\BaseObject;
use app\models\User;
use kiss\exception\InvalidOperationException;
use kiss\helpers\Arrays;
use kiss\helpers\HTML;
use kiss\Kiss;
use kiss\models\forms\Form;
use kiss\schema\ArrayProperty;
use kiss\schema\StringProperty;

class ProfileSettingForm extends Form {
    
    /** @var User $profile */
    protected $profile;

    public $profile_name;
    public $blacklist = [ ];

    protected function init()
    {
        parent::init();

        if ($this->profile == null)
            throw new InvalidOperationException('profile cannot be null');

        $this->profile_name = $this->profile->profile_name;
        $this->blacklist = Arrays::map($this->profile->getBlacklist()->fields(['tag_id'])->ttl(0)->execute(), function($t) { return $t['tag_id']; });
    }

    public static function getSchemaProperties($options = [])
    {
        return [
            'profile_name'      => new StringProperty('Identifier for the profile page', 'cooldude69', [ 'title' => 'Page Name' ]),
            'blacklist'         => new ArrayProperty(new StringProperty('Tag name'), [ 'title' => 'Tag Blacklist', 'description' => 'Tags that will be hidden in recommendations']),
            //'api_key'       => new StringProperty('Authorization Token for the API', '', [ 'title' => 'API Key', 'required' => false, 'readOnly' => true ]),
        ];
    }
    

    protected function fieldBlacklist($name, $scheme, $options) {
        $values = $this->getProperty($name, []);
        $html = HTML::comment('select2 input');
        $html .= HTML::begin('span', [  'class' => 'select' ]);
        {
            $html .= HTML::begin('select', [ 'name' => $name . '[]', 'multiple' => true, 'class' => 'tag-selector']);
            {
                foreach($values as $key) {
                    $value = Tag::findByKey($key)->fields(['name'])->one();
                    $html .= HTML::tag('option', $value->name, [ 'value' => $key, 'selected' => true ]);
                }
            }
            $html .= HTML::end('select');
        }
        $html .= HTML::end('span');
        return $html;
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


    public function save($validate = false) {

        //Failed to load
        if ($validate && !$this->validate()) {
            return false;
        }

        //Update the profile information
        $this->profile->profile_name = $this->profile_name;
        if (!$this->profile->save()) return false;

        //Prepare a list of blacklist items we did have
        $current_blacklist =  Arrays::map($this->profile->getBlacklist()->fields(['tag_id'])->ttl(0)->execute(), function($t) { return $t['tag_id']; });
       
        //Bulk remove all the tags we dont want
        $remove_list = array_diff($current_blacklist, $this->blacklist);
        if (count($remove_list) > 0)
            Kiss::$app->db()->createQuery()
                            ->delete('$blacklist')
                            ->where(['user_id', $this->profile->getKey()])
                            ->andWhere(['tag_id', array_values($remove_list)])
                            ->execute();
        
        //Add all the items we do want (have to do it once at a time)
        $add_list = array_diff($this->blacklist, $current_blacklist);
        foreach($add_list as $id) $this->profile->addBlacklist($id);
        return true;
    }

}