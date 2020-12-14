<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use kiss\db\ActiveRecord;
use kiss\helpers\Strings;
use kiss\schema\IntegerProperty;
use kiss\schema\StringProperty;

class Guild extends ActiveRecord {

    public static function tableName() { return '$guilds'; }

    protected $id;
    protected $snowflake;
    protected $name;

    /** @inheritdoc */
    public static function getSchemaProperties($options = []) {
        return [
            'id'            => new IntegerProperty('Internal ID of the guild'),
            'snowflake'     => new StringProperty('Discord Snowflake'),
            'name'          => new StringProperty('Name of the guild'),
        ];
    }

    /** @return ActiveQuery|Emote[] all the emotes this guild has */
    public function getEmotes() {
        return Emote::findByGuild($this);
    }

    /**
     * Updates the emotes from this server, removing, adding and modifying
     * @param array $discord_emotes 
     * @return $this 
     */
    public function updateDiscordEmotes($discord_emotes) {

        //TODO: Map these

        Emote::findByGuild($this)->delete();
        foreach($discord_emotes as $emoteData) {
            (new Emote([
                'guild_id'      => $this->id,
                'snowflake'     => $emoteData['id'],
                'name'          => $emoteData['name'],
                'animated'      => $emoteData['animated'],
            ]))->save();
        }
        return $this;
    }

    /** @return \kiss\db\ActiveQuery|Guild[] tags with the matching name*/
    public static function findByName($name) {
        return self::find()->where(['name', Strings::toLowerCase($name) ]);
    }

    /** @return \kiss\db\ActiveQuery|Guild[] tags with the matching name*/
    public static function findBySnowflake($name) {
        return self::find()->where(['name', Strings::toLowerCase($name) ]);
    }
}