<?php namespace app\widget;

use app\models\Gallery;
use app\models\Tag;
use kiss\db\ActiveQuery;
use kiss\helpers\ArrayHelper;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\widget\Widget;

class TagGroup extends Widget {
    

    /** @var Tag[]|string[]|ActiveQuery $tags */
    public $tags;

    /** @var string $title */
    public $title = null;

    /** @var string $defaultStyle */
    public $defaultStyle = null;

    public function init() {
        parent::init();
        
    }

    public function begin() {
        echo HTML::begin('div', [ 'class' => 'tag-group' ]);

        if (!empty($this->title))
            echo HTML::tag('div', $this->title, [ 'class' => 'subtitle' ]);
        
        if ($this->tags != null) {
            $tags = $this->tags instanceof ActiveQuery ? $this->tags->all() : $this->tags;
            foreach($this->tags as $tag) {
                $style  = $this->defaultStyle;
                $name   = '';
                $route  = null;

                if (is_string($tag)) $name = $tag;
                if ($tag instanceof Tag) {
                    $name = $tag->name;
                    $style = $tag->getBulmaStyle();
                    $route = ['/gallery/search', 'tag' => $name ];
                }
                    
                echo self::tag($route, $name, $style);
            }
        }
    }

    public function end() {
        echo HTML::end('div');
    }

    /** Creates a tag
     * @param array $route the route the button goes to
     * @param Tag|string $tag the tag
     * @param string $style additional styling
     * @return string the HTML tag
     */
    public static function tag($route, $tag, $style = '') {
        $name = $tag;
        if ($tag instanceof Tag) {
            $name = $tag->name;
        }

        if (!empty($style))
            $style = 'is-' . $style;

        return HTML::a($route, HTML::tag('span', $name, ['class' => 'tag is-small ' . $style ]));
    }
}