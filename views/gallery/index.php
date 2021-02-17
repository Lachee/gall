<?php

use app\models\Tag;
use app\widget\GalleryList;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\Kiss;

?>


<?php if (GALL::$app->loggedIn() && GALL::$app->user->getAutoTags()->execute() == null): ?>
<div class="container">
    <div class="notification is-info">
        <div class="title">No <strong>Auto-Tags</strong>?</div>
        <div class="subtitle">We noticed you havn't set up any auto-tags yet. Why not <a href="<?=HTTP::url(['/profile/@me/settings'])?>">set some up now</a>!</div>
        <p><strong>Auto-Tags</strong> are a special rules that allow you to automatically tag artwork when you <strong>react</strong> to them in <strong>Discord</strong>.<br>
        Quickly and easily categorise artwork, allowing for better browsing and blacklisting.</p><br>

        <a class="button is-white is-outlined" href="<?=HTTP::url(['/profile/@me/settings'])?>">
            <span class="icon">
            <i class="fal fa-cog"></i>
            </span>
            <span>Configure Auto-Tags</span>
        </a>       
    </div>
</div>
<?php endif; ?>

<div class="subtitle ml-4">Latest</div>
<?= GalleryList::widget([ 'galleries' => $latest ]); ?>

<!--
<div class="subtitle ml-4">Best</div>
 GalleryList::widget([ 'galleries' => $top_rated ]); 
-->

<?php if (GALL::$app->loggedIn()) : ?>

    <?php if ($recommendation != null && count($recommendation) > 0): ?>
        <div class="subtitle ml-4">Recommended</div>
        <?= GalleryList::widget([ 'galleries' => $recommendation ]); ?>
    <?php endif; ?>

    <div class="subtitle ml-4">Submitted</div>
    <?= GalleryList::widget([ 'galleries' => $submitted ]); ?>

    <div class="subtitle ml-4">Favourites</div>
    <?= GalleryList::widget([ 'galleries' => $favourites ]); ?>




<?php else: ?>
    <div class="notification is-warning">
        You are currently not <strong>logged in</strong>!<br>
        We cannot provide you with your recommendations or favourited galleries. Please <a href="<?=HTTP::url(['/login'])?>">login</a> to get your personalised experience.
    </div>
<?php endif; ?>