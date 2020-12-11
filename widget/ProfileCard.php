<?php namespace app\widget;

use app\models\User;
use kiss\helpers\Arrays;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\helpers\Strings;
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
        $profile = $this->profile;
        
        //Prepare the toolbar
        $toolbaritems = [];
        if ($profile->isMe()) {
            $toolbaritems[] = [ 'route' => ['/profile/:profile/settings', 'profile' => $profile->profileName ], 'icon' => 'fa-pencil' ];
            //if ($this->small) {                
            //    $toolbaritems[] = [ 'call' => 'app.api.pin().then(() => setTimeout(() => window.location.reload(), 1000))', 'icon' => 'fa-map-pin' ];
            //}
        } else {
            $toolbaritems[] = [ 'route' => ['/profile/:profile/', 'profile' => $profile->profileName ], 'icon' => 'fa-book-spells' ];
        }
        
        //Prepare the HTML
        $html = '';

        $image = '';
        if ($profile->profileImage) {
            $profileImageLink = $profile->profileImage->getThumbnail(350);  
            $image = "<div class='card-image'><img src='{$profileImageLink}' alt='{$profileImageLink}'></div>";
        }

        $score = '1.5K';
        $toolbar = self::toolbar($toolbaritems);

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
            {$toolbar}
        </div>
    </div>
HTML;

        } else {
            $favs = Strings::shortNumber($profile->favouriteCount);

            $tags = $profile->getFavouriteTags()->limit(5)->all();
            if (count($tags) == 0) $tags = $profile->getFavouriteTagsSubmitted()->limit(5)->all();
            $tagsLinks = join(' ', Arrays::map($tags, function($tag) { return '<a href="'.HTTP::url(['/gallery/search', 'tag' => $tag->name ]).'">'.$tag->name.' ( '.$tag->count.' )</a>'; }));
            
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
                    <div class="tag-group">{$tagsLinks}</div>
                </div>
            </div>
            {$toolbar}
        </div>
    </div>
HTML;
        }

        echo $html;
    }

    private static function toolbar($items) {
        if (count($items) == 0) return '';
        $bar = HTML::begin('div', ['class' => 'toolbar']);
        foreach($items as $item) {
            $bar .= HTML::begin('div', ['class' => 'toolbar-item']);
            if (!empty($item['route'])) 
                $bar .= HTML::a($item['route'], HTML::tag('i', '', [ 'class' => 'fal ' . $item['icon'] ]));
            if (!empty($item['call']))
                $bar .= HTML::tag('a', HTML::tag('i', '', [ 'class' => 'fal ' . $item['icon'] ]), [ 'onclick' => $item['call'] ]);

            $bar .= HTML::end('div');
        }
        $bar .= HTML::end('div');
        return $bar;
    }
}