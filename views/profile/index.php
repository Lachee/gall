<?php

use app\models\Gallery;
use app\models\Image;
use app\models\Tag;
use app\widget\GalleryList;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;

/** @var User $profile */

?>


<div class="columns">
    <div class="column is-one-fifth">
        <div class="card">
            <?php if ($profile->profileImage != null): ?>
            <div class="card-image">
                <figure class="image is-4by3">
                    <img style="object-fit: cover" src="<?= $profile->profileImage->getThumbnail(350) ?>" alt="<?= $profile->profileImage->origin ?>">
                </figure>
            </div>
            <?php endif; ?>
            <div class="card-content">
                <div class="media">
                    <div class="media-left">
                        <figure class="image is-48x48">
                            <img src="<?= $profile->avatarUrl ?>" alt="Placeholder image">
                        </figure>
                    </div>
                    <div class="media-content">
                        <p class="title is-4"><?= $profile->username ?></p>       
                         <p class="subtitle is-6"><a href="<?= HTTP::url(['/profile/:profile/', 'profile' => $profile->profileName]) ?>">@<?= $profile->displayName ?></a></p>
      
                    </div>
                </div>

                <div class="content">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    Phasellus nec iaculis mauris. <a>@bulmaio</a>.
                    <a href="#">#css</a> <a href="#">#responsive</a>
                    <br>
                    <time datetime="2016-1-1">11:09 PM - 1 Jan 2016</time>
                </div>
            </div>
        </div>
    </div>
    <div class="column">
        <div class="tabs"><ul><li>Best</li></ul></div>
        <?= GalleryList::widget(['galleries' => $submissions, 'grid' => false]); ?>
        
        <div class="tabs"><ul><li>Favourites</li></ul></div>        
        <?= GalleryList::widget(['galleries' => $submissions, 'grid' => count($submissions) <= 3 || count($submissions) > 10]); ?>
    </div>
</div>