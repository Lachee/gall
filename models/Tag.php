<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use kiss\db\ActiveRecord;

class Tag extends ActiveRecord {

    public static function tableName() { return '$tag_defs'; }

    public const TYPE_TAG = 'TAG';
    public const TYPE_CHARACTER = 'CHAR';
    public const TYPE_ARTIST = 'ARTIST';
    public const TYPE_LANGUAGE = 'LANG';

    protected $id;
    protected $name;
    protected $type;
    protected $alias_id;
    protected $founder_id;
    protected $cnt;
    protected $rating;

    /** @inheritdoc */
    protected function beforeSave()
    {
        //We are going to clear out hte name and make sure it is clean and valid.
        
        return parent::beforeSave();
    }

    public function getFounder() {
        return User::findByKey($this->founder_id)->limit(1);
    }

    public function getAlias() { 
        return Tag::findByKey($this->alias_id)->limit(1);
    }

    public function getId() {
        return empty($this->alias_id) ? $this->id : $this->alias_id;
    }

    /** @return int the total usage of the tag */
    public function getCount() { return $this->cnt; }

    public function getRating() { return $this->rating; }

    public function getBulmaStyle() {
        switch($this->type) {
            case self::TYPE_ARTIST:
                return 'primary';
            case self::TYPE_LANGUAGE:
                return 'info';
            case self::TYPE_CHARACTER:
                return 'success';
            default:       
                $ratings = [
                    '',         // Information
                    '',         // Lewd
                    'dark',     // NSFW  
                    'danger',   // NSFW or Talk (rape and loli)
                ];
                return $ratings[$this->rating];
        }
    }
}