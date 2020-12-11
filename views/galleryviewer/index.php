<?php

use app\models\Gallery;
use app\models\Image;
use app\models\Tag;
use app\widget\ProfileCard;
use app\widget\TagGroup;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\helpers\StringHelper;
use kiss\Kiss;

/** @var Gallery $gallery */
/** @var Image[] $images */

$tno = $gallery->favourites;
$k = $tno;
?>
<section class="nav">
    <div class="columns">
        <div class="column is-three-fifths">
            <p class="subtitle"><?= $gallery->title ?></p>
        </div>
        <div class="column has-text-right">
            <p class="heading">Actions</p>
            
            <p class="heading">
                <a class="button is-small button-bookmark">
                    <span class="icon"><i class="<?= GALL::$app->user->hasFavouritedGallery($gallery) ? 'fas' : 'fal' ?> fa-bookmark"></i></span>
                </a>
                <a class="button is-small expanding-artwork-control">
                    <span class="icon"><i class="fal fa-expand"></i></span>
                    <span class="expand-label">Expand</span>
                </a>
                <a href="<?= $gallery->url ?>" class="button is-small">
                    <span class="icon"><i class="fal fa-external-link"></i></span>
                    <span>View Source</span>
                </a>
                <a href="<?= $gallery->url ?>" class="button is-small">
                    <span class="icon"><i class="fal fa-cloud-download"></i></span>
                </a>
            </p>
        </div>
    </div>
</section>
<section class="gallery">
    <div class="columns is-flex-reversable">
        <div class="column is-one-fifth">
            <?= ProfileCard::widget(['profile' => $gallery->founder, 'small' => true ]); ?>
            <?php if (!empty($gallery->description)) : ?>
                <div class="tag-group">
                    <div class="subtitle">Description</div>
                    <?= $gallery->description ?>
                </div>
            <?php endif; ?>

            <?= TagGroup::widgetBegin(['title' => 'Tags', 'tags' => $gallery->getAllTags()->all() ]); ?>
                <?= TagGroup::tag(['/gallery/search', 'scraper' => $gallery->scraper ], $gallery->scraper, 'info'); ?>
            <?= TagGroup::widgetEnd(); ?>

        </div>
        <div class="column">

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
</section>
