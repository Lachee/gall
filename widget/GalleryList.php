<?php namespace app\widget;

use app\models\Gallery;
use kiss\helpers\Arrays;
use kiss\helpers\HTTP;
use kiss\widget\Widget;

class GalleryList extends Widget {
    

    /** @var Gallery[] $galleries */
    public $galleries;

    /** @var bool $grid draw the gallery list as a grid instead? */
    public $grid = false;

    public function init() {
        parent::init();
    }

    public function begin() {
        echo '<div class="flexcard">';
        echo '<section class="card-list '.($this->grid ? 'is-grid' : '').'">';

        foreach($this->galleries as $gallery) { 
            if ($gallery == null) continue;
            echo self::card($gallery);
        }
        echo '</section>';
        echo '</div>';
    }

    /** Renders a specific gallery as ac ard */
    public static function card($gallery) {
        if ($gallery->cover == null) return '';

        $profileLink    = HTTP::url(['/profile/:profile/', 'profile' => $gallery->founder->profileName ]);
        $galleryLink    = HTTP::url(['/gallery/:id/', 'id' => $gallery->id ]);
        $avatarLink     = $gallery->founder->avatarUrl;
        $thumbnailLink  = $gallery->cover->getThumbnail(250);
        $tags = join(' ', Arrays::map($gallery->topTags, function($tag) { return '<a href="'.HTTP::url(['/gallery/search', 'q' => $tag->name ]).'">'.$tag->name.' ( '.$tag->count.' )</a>'; }));

$card = <<<HTML
<div id="gallery-{$gallery->id}" class="card smart-link" loading=lazy style="background-image: url({$thumbnailLink});" data-href="{$galleryLink}" data-src="{$thumbnailLink}">
    <header class="card-header"> </header>
    <div class="card-bottom">
        <div class="card-author">
            <a class="author-avatar" href="{$profileLink}">
                <img src="{$avatarLink}" />
            </a>
            <div class="author-name">
                <a href="{$galleryLink}">
                    <div class="author-name-prefix">{$gallery->shortTitle}</div>
                    {$gallery->founder->name}
                </a>
            </div>
        </div>
        <div class="tags">{$tags}</div>
    </div>
</div>
HTML;
        echo $card;
    }
}