<?php namespace app\widget;

use app\models\User;
use kiss\helpers\ArrayHelper;
use kiss\helpers\HTTP;
use kiss\helpers\StringHelper;
use kiss\widget\Widget;

class ProfileCard extends Widget {
    

    /** @var User $profile */
    public $profile;

    /** @var bool $small should it be a smaller version */
    public $small = false;

    public function init() {
        parent::init();
    }

    public function begin() {
        $html = '';

        $profile = $this->profile;
        $profileImageLink = $profile->profileImage ? $profile->profileImage->getThumbnail(350) : '';  
        $image = "<div class='card-image'><img src='{$profileImageLink}' alt='{$profileImageLink}'></div>";
        $score = '1.5K';

        if ($this->small) {
            $profileLink = HTTP::url(['/profile/:profile/', 'profile' => $profile->profileName ]);
$html = <<<HTML
    <div class="profile-card is-small">
        <div class="card">
            {$image}
            <div class="card-content">
                <div class="avatar">
                    <img src="{$profile->avatarUrl}" alt="Avatar Picture">
                </div>
                <div class="title"><a href="{$profileLink}" class="has-text-white">{$profile->username}</a></div>
                <div class="subtitle"><span class="icon"><i class="fal fa-coin"></i></span> {$score}</div>
            </div>
        </div>
    </div>
HTML;

        } else {
            $favs = StringHelper::shortNumber($profile->favouriteCount);
            $tags = join(' ', ArrayHelper::map($profile->favouriteTags, function($tag) { return '<a href="'.HTTP::url(['/gallery/search', 'tag' => $tag->name ]).'">'.$tag->name.' ( '.$tag->count.' )</a>'; }));
        
$html = <<<HTML
    <div class="profile-card">
        <div class="card">
            {$image}
            <div class="card-content">
                <div class="avatar">
                    <img src="{$profile->avatarUrl}" alt="Avatar Picture">
                </div>
                <div class="title">{$profile->username}</div>
                <div class="subtitle">@{$profile->displayName}</div>

                <div class="content">
                    <div class="metric"><span class="icon"><i class="fal fa-coin"></i></span> {$score}</div>
                    <div class="metric"><span class="icon"><i class="fal fa-bookmark"></i></span> {$favs}</div>
                </div>

                <div class="content">
                    <div class="tag-group">{$tags}</div>
                </div>
            </div>
        </div>
    </div>
HTML;
        }

        echo $html;
    }
}