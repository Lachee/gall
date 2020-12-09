<?php

use app\models\Tag;
use app\widget\GalleryList;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\Kiss;

?>

<h1>Latest</h1>
<?= GalleryList::widget([ 'galleries' => $latest ]); ?>

<h1>Top Rated</h1>
<?= GalleryList::widget([ 'galleries' => $top_rated ]); ?>


<?php if (Kiss::$app->loggedIn()) : ?>
    <h1>Favourites</h1>
    <?= GalleryList::widget([ 'galleries' => $favourites ]); ?>
      
    <h1>Submitted</h1>
    <?= GalleryList::widget([ 'galleries' => $submitted ]); ?>

    <h1>Recommended</h1>
    <?= GalleryList::widget([ 'galleries' => $latest_tagged ]); ?>
      
<?php endif; ?>