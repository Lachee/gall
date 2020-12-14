<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use kiss\db\ActiveRecord;
use kiss\helpers\Strings;
use kiss\schema\BooleanProperty;
use kiss\schema\IntegerProperty;
use kiss\schema\StringProperty;

class Emote extends ActiveRecord {

    public static function tableName() { return '$emotes'; }

    protected $id;
    protected $guild_id;
    protected $snowflake;
    protected $name;
    protected $animated;

    /** @inheritdoc */
    public static function getSchemaProperties($options = []) {
        return [
            'id'            => new IntegerProperty('Internal ID of the emote'),
            'snowflake'     => new StringProperty('Discords ID'),
            'guild_id'      => new StringProperty('ID of the guild it belongs to'),
            'name'          => new StringProperty('Name of the emote'),
            'animated'      => new BooleanProperty('If the emote is animated'),
            'url'           => new StringProperty('URL of the emote'),
        ];
    }

    /** @return string the URL of the emoji */
    public function getUrl() { 
        return 'https://cdn.discordapp.com/emojis/' . $this->snowflake . ($this->animated ? '.gif' : '.png');
    }

    /** @param Guild|string $guild
     * @return \kiss\db\ActiveQuery|Guild[] matching guild */
    public static function findByGuild($guild) {
        return self::find()->where(['guild_id', $guild ]);
    }

    /** @return \kiss\db\ActiveQuery|Emote[] matching name*/
    public static function findByName($name) {
        return self::find()->where(['name', Strings::toLowerCase($name) ]);
    }

    /** @return \kiss\db\ActiveQuery|Emote[] matching snowflake*/
    public static function findBySnowflake($name) {
        return self::find()->where(['name', Strings::toLowerCase($name) ]);
    }
}