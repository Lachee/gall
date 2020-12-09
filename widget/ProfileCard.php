<?php namespace app\widget;

use app\models\User;
use kiss\helpers\ArrayHelper;
use kiss\helpers\HTTP;
use kiss\widget\Widget;

class ProfileCard extends Widget {
    

    /** @var User $profile */
    public $profile;

    public function init() {
        parent::init();
    }

    public function begin() {
        $profile = $this->profile;
        $profileImageLink = $profile->profileImage ? $profile->profileImage->getThumbnail(350) : '';        
        $tags = join(' ', ArrayHelper::map($profile->favouriteTags, function($tag) { return '<a href="'.HTTP::url(['/gallery/search', 'tag' => $tag->name ]).'">'.$tag->name.' ( '.$tag->count.' )</a>'; }));

$html = <<<HTML
        <div class="profile-card">
        <div class="card">
            <div class="card-image">
                <img src="{$profileImageLink}" alt="{$profileImageLink}">
            </div>
            <div class="card-content">
                <div class="avatar">
                    <img src="{$profile->avatarUrl}" alt="Avatar Picture">
                </div>
                <div class="title">{$profile->username}</div>
                <div class="subtitle">@{$profile->displayName}</div>

                <div class="content">
                    <div class="metric"><span class="icon"><i class="fal fa-coin"></i></span> 1,502</div>
                    <div class="metric"><span class="icon"><i class="fal fa-bookmark"></i></span> 15</div>
                </div>

                <div class="content">
                    <div class="tag-group">{$tags}</div>
                </div>
            </div>
        </div>
    </div>
HTML;
        echo $html;
    }
}