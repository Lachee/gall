<?php

use app\models\Gallery;
use app\models\Image;
use app\models\Tag;
use app\widget\GalleryList;
use app\widget\ProfileCard;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;

/** @var User $profile */

?>


<div class="columns">
    <div class="column is-one-fifth">
       <?= ProfileCard::widget(['profile' => $profile ]); ?>

    </div>
    <div class="column">
        <div class="title">Best Submissions</div>
        <?= GalleryList::widget(['galleries' => $submissions, 'grid' => false]); ?>
        
        <div class="title">Favourites</div>   
        <?= GalleryList::widget(['galleries' => $favourites, 'grid' => count($submissions) <= 3 || count($submissions) > 10]); ?>
    </div>
</div>