<?php namespace app\models\forms;

use app\models\Tag;
use kiss\exception\InvalidOperationException;
use kiss\helpers\HTML;
use kiss\models\forms\Form;
use kiss\schema\ArrayProperty;
use kiss\schema\StringProperty;

class TagManagementForm extends Form {

    public $tag_alias_from = [];
    public $tag_alias_to = [];

    protected function init()
    {
        parent::init();

        $query = Tag::find()->fields(['id', 'alias_id'])->where(['alias_id', 'IS NOT', null])->ttl(0);
        $aliasedTags = $query->all(true);
        foreach($aliasedTags as $at) {
            $this->tag_alias_from[] = $at['id'];
            $this->tag_alias_to[] = $at['alias_id'];
        }
    }

    public static function getSchemaProperties($options = [])
    {
        return [
            'tag_alias_from'   => new ArrayProperty(new StringProperty('Tags from'), [ 'title' => 'Tag Alias', 'description' => 'Tag aliases']),
            'tag_alias_too'   => new ArrayProperty(new StringProperty('Tags too')),
        ];
    }

    protected function beforeLoad($data)
    {
        $this->blacklist = [];
        $this->reaction_emotes = [];
        $this->reaction_tags = [];
    }

    protected function fieldTag_alias_to($name, $scheme, $options) { return ''; }
    protected function fieldTag_alias_from($name, $scheme, $options) {
        $tagNameCache = [];

$rowTemplate = <<<HTML
<td>
    <div class="field">
        <div class="control" >
            <span class="select"  style="width: 100%">
                <select name="tag_alias_from[]" class="tag-selector"><option value="{fromKey}">{fromName}</option></select>
            </span>
        </div>
    </div>
</td>
<td>
    <div class="field">
        <div class="control has-icons-left" >
            <span class="select"  style="width: 100%">
                <select name="tag_alias_to[]" class="tag-selector"><option value="{toKey}">{toName}</option></select>
            </span>
            <span class="icon is-small is-left"><i class="fal fa-tag"></i></span>
        </div>
    </div>
</td>
HTML;

        $html = HTML::comment('complicated tables woo');
        $html .= HTML::begin('table', ['class' => 'table is-fullwidth']); {
            $html .= HTML::begin('thead tr'); {
                $html .= HTML::tag('th', 'Emote', [ 'width' => '25%']);
                $html .= HTML::tag('th', 'Tag');
            } $html .= HTML::end('thead tr');
            $html .= HTML::begin('tbody'); {
                foreach($this->tag_alias_from as $index => $fromKey) {

                    //Make sure the from isnt null
                    if (empty($fromKey)) continue;              

                    //Make sure the to isnt null
                    $toKey = $this->tag_alias_to[$index];
                    if (empty($toKey)) continue;

                    //Fetch the names
                    $toName = $tagNameCache[$toKey] ?? ($tagNameCache[$toKey] = Tag::findByKey($toKey)->fields(['name'])->one(true)['name']);
                    $fromName = $tagNameCache[$fromKey] ?? ($tagNameCache[$fromKey] = Tag::findByKey($fromKey)->fields(['name'])->one(true)['name']);
                    
                    $html .= HTML::begin('tr');      
                    $html .= str_replace(
                                [ '{fromKey}', '{fromName}', '{toKey}', '{toName}'], 
                                [ $fromKey, $fromName, $toKey, $toName ], 
                                $rowTemplate
                            );
                    $html .= HTML::end('tr');
                }

                //Add an extra empty row
                $html .= str_replace([ '{fromKey}', '{fromName}', '{toKey}', '{toName}' ], '', $rowTemplate);
            } $html .= HTML::end('tbody');
        } $html .= HTML::end('table');
        return $html;
    }

    /** @inheritdoc */
    public function validate()
    {
        if (!parent::validate()) 
            return false;


        return true;
    }


    public function save($validate = false) {

        //Failed to load
        if ($validate && !$this->validate()) {
            return false;
        }


        return true;
    }

}