<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use kiss\db\ActiveRecord;
use kiss\helpers\Arrays;
use kiss\helpers\Strings;
use kiss\Kiss;
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
        $emotes = Emote::findByGuild($this)->all();
        $existing_snowflakes = Arrays::map($emotes, function($emote) { return $emote->snowflake; });
        $new_snowflakes = Arrays::mapArray($discord_emotes, function($demote) { return [ $demote['id'], $demote ]; });

        $removing_snowflakes = array_diff($existing_snowflakes, array_keys($new_snowflakes));
        $adding_snowflakes = array_diff(array_keys($new_snowflakes), $existing_snowflakes);

        //Remove old snowflakes
        if (count($removing_snowflakes) > 0) 
            Kiss::$app->db()->createQuery()
                            ->delete('$emotes')
                            ->where(['snowflake', array_keys($removing_snowflakes) ])
                            ->andWhere(['guild_id', $this->getKey()])
                            ->execute();

        //Add missing snowflakes
        foreach($adding_snowflakes as $snowflake) {
            $demote = $new_snowflakes[$snowflake];
            (new Emote([
                'guild_id'      => $this->id,
                'snowflake'     => $demote['id'],
                'name'          => $demote['name'],
                'animated'      => $demote['animated'],
            ]))->save();
        }

        //Update changes
        $updated_snowflakes = array_intersect($existing_snowflakes, array_keys($new_snowflakes));
        foreach($updated_snowflakes as $snowflake) {
            $demote = $new_snowflakes[$snowflake];
            Kiss::$app->db()->createQuery()
                            ->update([ 
                                'name' => $demote['name'],
                                'animated' => $demote['animated']
                            ], '$emotes')
                            ->where(['snowflake', $snowflake])
                            ->execute();
        }

        return $this;
    }

    /** @return \kiss\db\ActiveQuery|Guild[] tags with the matching name*/
    public static function findByName($name) {
        return self::find()->where(['name', Strings::toLowerCase($name) ]);
    }

    /** @return \kiss\db\ActiveQuery|Guild[] tags with the matching name*/
    public static function findBySnowflake($name) {
        return self::find()->where(['snowflake', Strings::toLowerCase($name) ]);
    }
}