<?php

use app\models\Tag;
use app\widget\GalleryList;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\Kiss;

?>

<div class="subtitle ml-4">Latest</div>
<?= GalleryList::widget([ 'galleries' => $latest ]); ?>

<!--
<div class="subtitle ml-4">Best</div>
 GalleryList::widget([ 'galleries' => $top_rated ]); 
-->

<?php if (Kiss::$app->loggedIn()) : ?>
    <?php if ($recommendation != null && count($recommendation) > 0): ?>
        <div class="subtitle ml-4">Recommended</div>
        <?= GalleryList::widget([ 'galleries' => $recommendation ]); ?>
    <?php endif; ?>

    <div class="subtitle ml-4">Favourites</div>
    <?= GalleryList::widget([ 'galleries' => $favourites ]); ?>
<?php else: ?>
    <div class="notification is-warning">
        You are currently not <strong>logged in</strong>!<br>
        We cannot provide you with your recommendations or favourited galleries. Please <a href="<?=HTTP::url(['/login'])?>">login</a> to get your personalised experience.
    </div>
<?php endif; ?>