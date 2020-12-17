<?php

use app\models\Gallery;
use app\models\Tag;
use kiss\helpers\Arrays;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\helpers\Strings;
use kiss\Kiss;

$user = Kiss::$app->getUser();

try {
    $terms = [ 'search tag or scrape site...' ];
    $scrapers = Arrays::map(Gallery::findByRandomUniqueScraper()->fields(['url'])->flush()->ttl(120)->all(true), function($gallery) { return $gallery['url']; });
    $tags = Arrays::map(Tag::find()->orderByAsc('RAND()')->limit(10)->fields(['name'])->ttl(120)->all(true), function($tag) { return $tag['name']; });
    $searchPlaceholderTerms = Arrays::zipMerge(Arrays::zipMerge($tags, $scrapers), $terms);
}catch(Throwable $e) {
    //Provide fallback functionality
    $searchPlaceholderTerms = [ 'search tags or sites', 'http://bestsiteever.com', 'best tag', 'bestsiteever'];
}
?>

<!-- START NAV -->
<nav class="navbar">
    <div class="container">
        <!-- BRAND -->
        <div class="navbar-brand is-justify-content-space-evenly">
            <a class="navbar-item brand-text" href="<?= HTTP::url('/')?>"><img src="<?= Kiss::$app->logo ?>" /></a>   
            <a class="navbar-item has-icon is-tab <?= !Strings::startsWith(HTTP::route(), '/gallery/') ?: 'is-active' ?>" title="Gallery" href="<?= HTTP::url('/gallery/')?>"><i class="fal fa-images"></i></a>
         
            <?php if ($user): ?>
                <a class="navbar-item has-icon is-tab <?= !Strings::startsWith(HTTP::route(), '/profile/@me/favourites') ?: 'is-active' ?>" title="Favourites" href="<?= HTTP::url('/profile/@me/favourites')?>"><i class="fal fa-fire"></i></a>
                <a class="navbar-item has-icon is-tab <?= !Strings::startsWith(HTTP::route(), '/profile/@me/submissions') ?: 'is-active' ?>" title="Submissions" href="<?= HTTP::url('/profile/@me/submissions')?>"><i class="fal fa-books-medical"></i></a>
                <?php endif; ?>
                <a class="navbar-item has-icon is-tab <?= !Strings::endsWith(HTTP::route(), '/profile/@me/') ?: 'is-active' ?>" title="Submissions" href="<?= HTTP::url('/profile/@me/')?>"><i class="fal fa-user"></i></a>
        </div>

        <div class="navbar-center">
            <div class="navbar-item is-fullwidth">
                <form method='GET' action='<?= HTTP::url('/gallery/query') ?>'>
                    <div class="field has-addons  is-fullwidth">
                        <div class="control has-icons-left is-expanded">
                            <span class="icon is-small is-left">
                                <i class="fas fa-search"></i>
                            </span>
                            <input id="navbar-search" name="q" autocomplete="off" class="input has-placeholder-transition" type="text" placeholder="" value="<?= HTTP::get('q', '') ?>" data-placeholders="<?= join('|', $searchPlaceholderTerms) ?>">
                        </div>
                        <div class="control">
                            <button id="navbar-submit" class="button " type="submit">
                                <i class="fal fa-search is-hidden-desktop"></i>
                                <span class="is-hidden-touch">Search</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>

        <!-- ITEMS -->
        <div id="navMenu" class="navbar-menu is-hidden-touch is-hidden">
            <div class="navbar-start">
                <?php if ($user): ?>
                    <a class="navbar-item has-icon is-tab <?= !Strings::startsWith(HTTP::route(), '/gallery/') ?: 'is-active' ?>" title="Gallery" href="<?= HTTP::url('/gallery/')?>"><i class="fal fa-images"></i></a>
                    <a class="navbar-item has-icon is-tab <?= !Strings::startsWith(HTTP::route(), '/profile/@me/favourites') ?: 'is-active' ?>" title="Favourites" href="<?= HTTP::url('/profile/@me/favourites')?>"><i class="fal fa-fire"></i></a>
                    <a class="navbar-item has-icon is-tab <?= !Strings::startsWith(HTTP::route(), '/profile/@me/submissions') ?: 'is-active' ?>" title="Submissions" href="<?= HTTP::url('/profile/@me/submissions')?>"><i class="fal fa-books-medical"></i></a>
                <?php endif;  ?>
            </div>
        </div>

        <!-- RHS ITEMS -->
        <div id="navMenu" class="navbar-end  is-hidden-touch">
            <div class="navbar-start">
                <div class="navbar-item">
                    <?php if ($user): ?>
                        <div class="field has-addons"> 
                            <p class="control">
                                <a class="button" id="login-button" href="<?= HTTP::url(['/profile/@me/']); ?>" >
                                    <span class="icon"><i class="fab fa-discord"></i></span>
                                    <span><?= HTML::encode($user->username) ?></span>
                                </a>
                            </p>
                            <p class="control">
                                <a class="button" href="<?= HTTP::url(['/logout']); ?>">
                                    <span class="icon"><i class="fal fa-sign-out"></i></span>
                                </a>
                            </p>
                        </div>
                    <?php else: ?>
                        <p class="control">
                            <a class="button" id="login-button" href="<?= HTTP::url(['/login' ]); ?>" >
                                <span class="icon"><i class="fab fa-discord"></i></span>
                                <span>Login</span>
                            </a>
                        </p>
                    <?php endif; ?>
                </div>
            </div>
        </div>

    </div>
</nav>
<!-- END NAV -->