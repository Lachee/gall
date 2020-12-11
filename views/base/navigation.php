<?php

use app\models\Gallery;
use app\models\Tag;
use kiss\helpers\ArrayHelper;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\Kiss;

$user = Kiss::$app->getUser();

try {
    $terms = [ 'search tag or scrape site...' ];
    $scrapers = ArrayHelper::map(Gallery::findByRandomUniqueScraper()->fields(['url'])->flush()->ttl(120)->all(true), function($gallery) { return $gallery['url']; });
    $tags = ArrayHelper::map(Tag::find()->orderByAsc('RAND()')->limit(10)->fields(['name'])->ttl(120)->all(true), function($tag) { return $tag['name']; });
    $searchPlaceholderTerms = ArrayHelper::zipMerge(ArrayHelper::zipMerge($tags, $scrapers), $terms);
}catch(Throwable $e) {
    //Provide fallback functionality
    $searchPlaceholderTerms = [ 'search tags or sites', 'http://bestsiteever.com', 'best tag', 'bestsiteever'];
}
?>

<!-- START NAV -->
<nav class="navbar">
    <div class="container">
        <!-- BRAND -->
        <div class="navbar-brand">
            <a class="navbar-item brand-text" href="<?= HTTP::url('/')?>"><img src="<?= Kiss::$app->logo ?>" /></a>
            <div class="navbar-burger burger" data-target="navMenu">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>

        <!-- ITEMS -->
        <div id="navMenu" class="navbar-menu">
            <div class="navbar-start">
                    <a class="navbar-item" href="<?= HTTP::url('/')?>">Home</a>
                <?php if ($user): ?>
                    <a class="navbar-item" href="<?= HTTP::url('/gallery/')?>">Gallery</a>
                    
                    <div class="navbar-item">
                        <div class="control has-icons-left">
                            <span class="icon is-small is-left">
                                <i class="fas fa-search"></i>
                            </span>
                            <input class="input has-placeholder-transition" type="text" placeholder="" data-placeholders="<?= join('|', $searchPlaceholderTerms) ?>">
                        </div>
                    </div>
                    
                <?php endif;  ?>
            </div>
        </div>

        <!-- RHS ITEMS -->
        <div id="navMenu" class="navbar-end">
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
                            <a class="button" id="login-button" href="<?= HTTP::url(['/login']); ?>" >
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