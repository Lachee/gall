<?php

use app\models\Gallery;
use app\models\Image;
use app\models\Tag;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\helpers\StringHelper;

/** @var Gallery $gallery */
/** @var Image[] $images */

$tno = $gallery->favourites;
$k = $tno;
?>

<div class="columns is-flex-reversable">
    <div class="column is-one-third">

        <?php if (!empty($gallery->description)) : ?>
            <div class="tag-group">
                <div class="subtitle">Description</div>
                <?= $gallery->description ?>
            </div>
        <?php endif; ?>

        <div class="tag-group">
            <div class="subtitle">Artist</div>
            <?php foreach ($gallery->getArtist()->all() as $tag) : ?>
                <a href="<?= HTTP::url(['/gallery/search', 'tag' => $tag->name]) ?>"><span class="tag is-<?= $tag->bulmaStyle ?> is-medium"><?= $tag->name ?></span></a>
            <?php endforeach; ?>
        </div>

        <div class="tag-group">
            <div class="subtitle">Tags</div>
            <?php foreach ($gallery->getTags()->all() as $tag) : ?>
                <a href="<?= HTTP::url(['/gallery/search', 'tag' => $tag->name]) ?>"><span class="tag is-<?= $tag->bulmaStyle ?> is-medium"><?= $tag->name ?></span></a>
            <?php endforeach; ?>
            <a href="<?= HTTP::url(['/gallery/search', 'scraper' => $gallery->scraper]) ?>"><span class="tag is-info is-medium"><?= $gallery->scraper ?></span></a>
        </div>

        <div class="tag-group">
            <div class="subtitle">Source</div>
            <a href="<?= $gallery->url ?>" target="_blank"><?= $gallery->url ?></a>
        </div>

        
    </div>
    <div class="column">
        <div class="columns">
            <div class="column is-four-fifths">

                <p class="heading"><?= $gallery->title ?></p>
                <p class="heading">
                    <a class="button is-small expanding-artwork-control">
                        <span class="icon"><i class="fal fa-expand"></i></span>
                        <span class="expand-label">Expand</span>
                    </a>
                    <a href="<?= $gallery->url ?>" class="button is-small">
                        <span class="icon"><i class="fal fa-external-link"></i></span>
                        <span>View Source</span>
                    </a>
                </p>
            </div>
            <div class="column has-text-right">
                <p class="heading">Submitted by</p>
                <p class="subtitle"><a href="<?= HTTP::url(['/profile/:profile/', 'profile' => $gallery->founder->profileName]) ?>">@<?= $gallery->founder->displayName ?></a></p>
            </div>
        </div>

        <?php if (count($images) == 1) : ?>
            <?php foreach ($images as $image) : ?>
                <section class="artwork">
                    <figure class="image is-16by9 expanding-artwork" data-expanding-class="is-16by9">
                        <img style='object-fit: contain' src="<?= $image->url ?>">
                    </figure>
                </section>  
            <?php endforeach; ?>
        <?php else : ?>
            <section class="artwork has-lightbox">
                <div id="lightgallery">
                    <?php foreach ($images as $image) : ?>
                        <a href="<?= $image->url ?>"><img loading=lazy class="expanding-artwork lg-thumbnail" data-expanding-class="lg-thumbnail" src="<?= $image->getThumbnail(250, 'NEAREST_NEIGHBOUR') ?>"></a>
                    <?php endforeach; ?>
                </div>
            </section>
        <?php endif; ?>
        <br>

        <section class="level">
            <div class="level-item has-text-centered">
                <div>
                    <p class="heading">Views</p>
                    <p class="title"><?= StringHelper::shortNumber($gallery->views) ?></p>
                </div>
            </div>
            <div class="level-item has-text-centered">
                <div>
                    <p class="heading">Rating</p>
                    <p class="title">?</p>
                </div>
            </div>
            <div class="level-item has-text-centered">
                <div>
                    <p class="heading">Top Emote</p>
                    <p class="title">?</p>
                </div>
            </div>
            <div class="level-item has-text-centered">
                <div>
                    <p class="heading">Favourites</p>
                    <p class="title"><?= StringHelper::shortNumber(count($gallery->favourites)) ?></p>
                </div>
            </div>
        </section>

        <section class="favourited">
            <?php foreach((array) $gallery->favourites as $f): ?>
                <div class="avatar">
                    <img src="<?= $f->profile->avatarUrl ?>" alt="Avatar Picture">
                </div>
            <?php endforeach; ?>
            <?php foreach((array) $gallery->favourites as $f): ?>
                <div class="avatar">
                    <img src="<?= $f->profile->avatarUrl ?>" alt="Avatar Picture">
                </div>
            <?php endforeach; ?>
            <?php foreach((array) $gallery->favourites as $f): ?>
                <div class="avatar">
                    <img src="<?= $f->profile->avatarUrl ?>" alt="Avatar Picture">
                </div>
            <?php endforeach; ?>
        </section>
    </div>
</div>