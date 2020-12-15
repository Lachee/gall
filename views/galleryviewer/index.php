<?php

use app\models\Gallery;
use app\models\Image;
use app\models\Tag;
use app\widget\ProfileCard;
use app\widget\TagGroup;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\helpers\Strings;
use kiss\Kiss;

/** @var Gallery $gallery */
/** @var Image[] $images */

$tno = $gallery->favourites;
$msg = $gallery->messageLink;
$k = $tno;
?>
<div class="container">
    <section class="nav">
        <div class="columns">
            <div class="column is-three-fifths">
                <p class="subtitle"><?= $gallery->title ?></p>
            </div>
            <div class="column has-text-right">
                <p class="heading">Actions</p>
                
                <p class="heading">
                    <a class="button is-small button-bookmark" title="favourite">
                        <span class="icon"><i class="<?= GALL::$app->user->hasFavouritedGallery($gallery) ? 'fas' : 'fal' ?> fa-fire"></i></span>
                    </a>
                    <a class="button is-small expanding-artwork-control" title="expand/shrink image">
                        <span class="icon"><i class="fal fa-expand"></i></span>
                    </a>
                    <a href="<?= HTTP::url(['/gallery/:gallery/download', 'gallery' => $gallery ])?>" target="_BLANK" class="button is-small" title="download image">
                        <span class="icon"><i class="fal fa-cloud-download"></i></span>
                    </a>
                    
                    <?php if ($gallery->getMessageLink() != null): ?>
                        <a href="<?= $gallery->getMessageLink() ?>" target="_BLANK" class="button is-small" title="view discord message">
                            <span class="icon"><i class="fab fa-discord"></i></span>
                        </a>
                    <?php endif; ?>
                    
                    <a href="<?= $gallery->url ?>" class="button is-small" title="view source">
                        <span class="icon"><i class="fal fa-external-link"></i></span>
                    </a>
                </p>
            </div>
        </div>
    </section>
    <section class="gallery">
        <div class="columns is-flex-reversable">
            <div class="column is-one-fifth">
                
                <?php if ($gallery->hasCover()): ?>
                    <div class="cover-image">
                        <section class="card artwork">
                            <figure class="image expanding-artwork">
                                <img src="<?= $gallery->cover->url ?>">
                            </figure>
                        </section>  
                    </div>
                <?php endif; ?>
                
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

                <?php if (count($images) == 0) $images = [ $gallery->cover ];  // this hot fix just in case. Should aways have an image :\ ?>
                <?php if ($gallery->type != Gallery::TYPE_COMIC): //count($images) == 1) : ?>
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
                            <p class="title"><?= Strings::shortNumber($gallery->views) ?></p>
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
                            <p class="title"><?= Strings::shortNumber(count($gallery->favourites)) ?></p>
                        </div>
                    </div>
                </section>

                <section class="favourited">
                    <?php foreach((array) $gallery->favourites as $f): ?>
                        <a class="fav-profile" href="<?= HTTP::url(['/profile/:profile/', 'profile' => $f->profile->profileName ]); ?>" title="see <?= $f->profile->displayName ?>">
                            <div class="avatar">
                                <img src="<?= $f->profile->avatarUrl ?>" alt="Avatar Picture">
                            </div>
                        </a>
                    <?php endforeach; ?>
                </section>
            </div>
        </div>
    </section>
</div>