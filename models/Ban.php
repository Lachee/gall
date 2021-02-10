<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use InvalidArgumentException;
use kiss\db\ActiveQuery;
use kiss\db\ActiveRecord;
use kiss\db\Query;
use kiss\exception\ArgumentException;
use kiss\exception\InvalidOperationException;
use kiss\exception\SQLDuplicateException;
use kiss\helpers\Arrays;
use kiss\helpers\Strings;
use kiss\Kiss;
use kiss\schema\BooleanProperty;
use kiss\schema\EnumProperty;
use kiss\schema\IntegerProperty;
use kiss\schema\RefProperty;
use kiss\schema\StringProperty;

/**
 * @property User $founder
 * @package app\models
 */
class Ban extends ActiveRecord {
    protected $snowflake;
    protected $reason;

    public static function getSchemaProperties($options = [])
    {
        return [
            'snowflake'     => new StringProperty('Snowflake of the discord user'),
            'reason'        => new StringProperty('Reason of the ban'),
        ];
    }

    /** @param string|int $snowflake 
     * @return ActiveQuery|Ban finds the galleries base of the founder */
    public static function findBySnowflake($snowflake) {
        return Ban::find()->where(['snowflake', $snowflake]);
    }
}