<?php

use app\models\Tag;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\Kiss;

?>

<h1>Latest</h1>
<div class="flexcard">
    <section class="card-list">
        <?php foreach ($latest as $gallery) : ?>
            <div id="gallery-<?=$gallery->id?>" class="card smart-link" style="background-image: url(<?= $gallery->thumbnail->getThumbnail(250) ?>);" data-href="<?= HTTP::url(['/gallery/:id/', 'id' => $gallery->id ]) ?>">
                <header class="card-header"> </header>
                <div class="card-bottom">
                    <div class="card-author">
                        <a class="author-avatar" href="<?= HTTP::url(['/profile/:profile/', 'profile' => $gallery->founder->profileName ]) ?>">
                            <img src="https://d.lu.je/avatar/<?= $gallery->founder->snowflake ?>" />
                        </a>
                        <svg class="half-circle" viewBox="0 0 106 57">
                            <path d="M102 4c0 27.1-21.9 49-49 49S4 31.1 4 4"></path>
                        </svg>
                        <div class="author-name">
                            <a href="<?= HTTP::url(['/gallery/:id/', 'id' => $gallery->id ]) ?>">
                                <div class="author-name-prefix"><?= $gallery->shortTitle ?></div>
                                <?= $gallery->founder->name ?>
                            </a>
                        </div>
                    </div>
                    <div class="tags">
                        <?php foreach ((array) $gallery->topTags as $tag) : ?>
                            <a href="<?= HTTP::url(['search', 'tag' => $tag->name ])?>"><?= $tag->name ?> ( <?= $tag->count ?> )</a>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    </section>
</div>

<h1>Top Rated</h1>
<div class="flexcard">
    <section class="card-list">
        <?php foreach ($top_rated as $gallery) : ?>
            <div id="gallery-<?=$gallery->id?>" class="card smart-link" style="background-image: url(<?= $gallery->thumbnail->getThumbnail(250) ?>);" data-href="<?= HTTP::url(['/gallery/:id/', 'id' => $gallery->id ]) ?>">
                <header class="card-header"> </header>
                <div class="card-bottom">
                    <div class="card-author">
                        <a class="author-avatar" href="<?= HTTP::url(['/profile/:profile/', 'profile' => $gallery->founder->profileName ]) ?>">
                            <img src="https://d.lu.je/avatar/<?= $gallery->founder->snowflake ?>" />
                        </a>
                        <svg class="half-circle" viewBox="0 0 106 57">
                            <path d="M102 4c0 27.1-21.9 49-49 49S4 31.1 4 4"></path>
                        </svg>
                        <div class="author-name">
                            <a href="<?= HTTP::url(['/gallery/:id/', 'id' => $gallery->id ]) ?>">
                                <div class="author-name-prefix"><?= $gallery->shortTitle ?></div>
                                <?= $gallery->founder->name ?>
                            </a>
                        </div>
                    </div>
                    <div class="tags">
                        <?php foreach ((array) $gallery->topTags as $tag) : ?>
                            <a href="<?= HTTP::url(['search', 'tag' => $tag->name ])?>"><?= $tag->name ?> ( <?= $tag->count ?> )</a>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
        <?php endforeach; ?>
    </section>
</div>

<?php if (Kiss::$app->loggedIn()) : ?>
    <h1>Submitted</h1>
    <div class="flexcard">
        <section class="card-list">
            <?php foreach ($submitted as $gallery) : ?>
            <div id="gallery-<?=$gallery->id?>" class="card smart-link" style="background-image: url(<?= $gallery->thumbnail->getThumbnail(250) ?>);" data-href="<?= HTTP::url(['/gallery/:id/', 'id' => $gallery->id ]) ?>">
                <header class="card-header"> </header>
                <div class="card-bottom">
                    <div class="card-author">
                        <a class="author-avatar" href="<?= HTTP::url(['/profile/:profile/', 'profile' => $gallery->founder->profileName ]) ?>">
                            <img src="https://d.lu.je/avatar/<?= $gallery->founder->snowflake ?>" />
                        </a>
                        <svg class="half-circle" viewBox="0 0 106 57">
                            <path d="M102 4c0 27.1-21.9 49-49 49S4 31.1 4 4"></path>
                        </svg>
                        <div class="author-name">
                            <a href="<?= HTTP::url(['/gallery/:id/', 'id' => $gallery->id ]) ?>">
                                <div class="author-name-prefix"><?= $gallery->shortTitle ?></div>
                                <?= $gallery->founder->name ?>
                            </a>
                        </div>
                    </div>
                    <div class="tags">
                        <?php foreach ((array) $gallery->topTags as $tag) : ?>
                            <a href="<?= HTTP::url(['search', 'tag' => $tag->name ])?>"><?= $tag->name ?> ( <?= $tag->count ?> )</a>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </section>
    </div>

    <h1>Favourites</h1>
    <div class="flexcard">
        <section class="card-list">
            <?php foreach ($favourites as $gallery) : ?>
            <div id="gallery-<?=$gallery->id?>" class="card smart-link" style="background-image: url(<?= $gallery->thumbnail->getThumbnail(250) ?>);" data-href="<?= HTTP::url(['/gallery/:id/', 'id' => $gallery->id ]) ?>">
                <header class="card-header"> </header>
                <div class="card-bottom">
                    <div class="card-author">
                        <a class="author-avatar" href="<?= HTTP::url(['/profile/:profile/', 'profile' => $gallery->founder->profileName ]) ?>">
                            <img src="https://d.lu.je/avatar/<?= $gallery->founder->snowflake ?>" />
                        </a>
                        <svg class="half-circle" viewBox="0 0 106 57">
                            <path d="M102 4c0 27.1-21.9 49-49 49S4 31.1 4 4"></path>
                        </svg>
                        <div class="author-name">
                            <a href="<?= HTTP::url(['/gallery/:id/', 'id' => $gallery->id ]) ?>">
                                <div class="author-name-prefix"><?= $gallery->shortTitle ?></div>
                                <?= $gallery->founder->name ?>
                            </a>
                        </div>
                    </div>
                    <div class="tags">
                        <?php foreach ((array) $gallery->topTags as $tag) : ?>
                            <a href="<?= HTTP::url(['search', 'tag' => $tag->name ])?>"><?= $tag->name ?> ( <?= $tag->count ?> )</a>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </section>
    </div>

    <h1>Tags</h1>
    <div class="flexcard">
        <section class="card-list">
            <?php foreach ($latest_tagged as $gallery) : ?>
            <div id="gallery-<?=$gallery->id?>" class="card smart-link" style="background-image: url(<?= $gallery->thumbnail->getThumbnail(250) ?>);" data-href="<?= HTTP::url(['/gallery/:id/', 'id' => $gallery->id ]) ?>">
                <header class="card-header"> </header>
                <div class="card-bottom">
                    <div class="card-author">
                        <a class="author-avatar" href="<?= HTTP::url(['/profile/:profile/', 'profile' =>  $gallery->founder->profileName ]) ?>">
                            <img src="https://d.lu.je/avatar/<?= $gallery->founder->snowflake ?>" />
                        </a>
                        <svg class="half-circle" viewBox="0 0 106 57">
                            <path d="M102 4c0 27.1-21.9 49-49 49S4 31.1 4 4"></path>
                        </svg>
                        <div class="author-name">
                            <a href="<?= HTTP::url(['/gallery/:id/', 'id' => $gallery->id ]) ?>">
                                <div class="author-name-prefix"><?= $gallery->shortTitle ?></div>
                                <?= $gallery->founder->name ?>
                            </a>
                        </div>
                    </div>
                    <div class="tags">
                        <?php foreach ((array) $gallery->topTags as $tag) : ?>
                            <a href="<?= HTTP::url(['search', 'tag' => $tag->name ])?>"><?= $tag->name ?> ( <?= $tag->count ?> )</a>
                        <?php endforeach; ?>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </section>
    </div>
<?php endif; ?>