<?php namespace app\widget;

use app\models\Gallery;
use kiss\helpers\ArrayHelper;
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
            if ($gallery->thumbnail == null) continue;

            $profileLink    = HTTP::url(['/profile/:profile/', 'profile' => $gallery->founder->profileName ]);
            $galleryLink    = HTTP::url(['/gallery/:id/', 'id' => $gallery->id ]);
            $avatarLink     = $gallery->founder->avatarUrl;
            $thumbnailLink  = $gallery->thumbnail->getThumbnail(250);
            $tags = join(' ', ArrayHelper::map($gallery->topTags, function($tag) { return '<a href="'.HTTP::url(['/gallery/search', 'tag' => $tag->name ]).'">'.$tag->name.' ( '.$tag->count.' )</a>'; }));

$card = <<<HTML
    <div id="gallery-{$gallery->id}" class="card smart-link" loading=lazy style="background-image: url({$thumbnailLink});" data-href="{$galleryLink}">
        <header class="card-header"> </header>
        <div class="card-bottom">
            <div class="card-author">
                <a class="author-avatar" href="{$profileLink}">
                    <img src="{$avatarLink}" />
                </a>
                <svg class="half-circle" viewBox="0 0 106 57">
                    <path d="M102 4c0 27.1-21.9 49-49 49S4 31.1 4 4"></path>
                </svg>
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
        echo '</section>';
        echo '</div>';


    }
}