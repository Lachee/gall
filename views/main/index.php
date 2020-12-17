<?php

use app\models\Gallery;
use app\widget\GalleryList;
use app\widget\ProfileCard;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\Kiss;

?>


<section class="hero is-medium is-dark is-bold is-fullheight-with-navbar">
    <div class="hero-body">
        <div class="container">
            <div class="columns">
                <div class="column is-one-fifth"></div>
                <div class="column" id="site-heading">
                    <h1 class="title is-size-1">GALL</h1>
                    <h2 class="subtitle is-size-3">Socially share images in Discord</h2>
                    <a class="button is-primary is-inverted is-outlined is-large" id="login-button" href="<?= HTTP::url([Kiss::$app->loggedIn() ? '/gallery/' : '/login']); ?>">
                        <span class="icon"><i class="fal fa-share"></i></span>
                        <span>Start Sharing</span>
                    </a>
                    <a class="button is-primary is-inverted is-outlined is-large" id="invite-button" href="<?= GALL::$app->serverInvite ?>">
                        <span class="icon"><i class="fab fa-discord"></i></span>
                        <span>Join Server</span>
                    </a>
                </div>
                <div class="column is-one-third">
                    <?php if (Kiss::$app->loggedIn()): ?>                        
                        <?= ProfileCard::widget(['profile' => Kiss::$app->user ]); ?>
                    <?php else: ?>
                        <?= GalleryList::widget([ 'galleries' => Gallery::findByRating()->limit(1)->all(), 'grid' => true]) ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>
</section>