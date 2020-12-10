<?php namespace app\models;

use kiss\db\ActiveQuery;
use kiss\db\ActiveRecord;
use kiss\schema\IntegerProperty;
use kiss\schema\RefProperty;

class Favourite extends ActiveRecord {
    
    public static function tableName() { return '$favourites'; }
    public static function tableKey() { return ['gallery_id', 'user_id']; }

    protected $gallery_id;
    protected $user_id;

    
    public static function getSchemaProperties($options = [])
    {
        return [
            'gallery_id'    => new IntegerProperty('ID of the gallery'),
            'profile'       => new RefProperty(User::class, 'the user that found it'),
        ];
    }


    /** @return ActiveQuery|Gallery gets the linked gallery */
    public function getGallery() {
        return Gallery::findByKey($this->gallery_id)->limit(1);
    } 

    /** @return ActiveQuery|User gets the linked profile */
    public function getProfile() {
        return User::findByKey($this->user_id)->limit(1);
    }

    /** @return ActiveQuery finds the favourites of a user */
    public static function findByProfile($user) {
        return self::find()->where(['user_id', $user ]);
    }

    /** @return ActiveQuery finds the favourites of a gallery */
    public static function findByGallery($gallery) {
        return self::find()->where(['gallery_id', $gallery]);
    }
}