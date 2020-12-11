<?php

use app\models\Gallery;
use kiss\helpers\ArrayHelper;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\Kiss;

$user = Kiss::$app->getUser();

$placeholders = join('|', ArrayHelper::map(Gallery::findByRandomUniqueScraper()->fields(['url'])->flush()->ttl(60)->all(true), function($gallery) { return $gallery['url']; }));
?>

<style>
    .has-placeholder-transition::placeholder {
        transition: color 0.5s;
    }

    .has-placeholder-transition.is-transitioning::placeholder {
        color: transparent;
    }
</style>

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
                            <input class="input has-placeholder-transition" type="text" placeholder="http://danbooru.com/post?204" data-placeholders="<?= $placeholders ?>">
                            <script>
                                const PLACEHOLDER_TRANSITION_TIME = 0.5;
                                const PLACEHOLDER_TRANSITION_DELAY = 2;
                                setInterval( () => {
                                    const doc = document.querySelector('.has-placeholder-transition');
                                    doc.classList.add('is-transitioning');
                                    setTimeout(() => {
                                        let placeholders = doc.getAttribute('data-placeholders').split('|');
                                        let placeholder = undefined;
                                        while (placeholder == undefined || placeholder == doc.placeholder) {
                                            placeholder = placeholders[Math.floor(Math.random()*placeholders.length)];
                                        }
                                        doc.placeholder = placeholder;
                                        doc.classList.remove('is-transitioning');
                                    }, PLACEHOLDER_TRANSITION_TIME * 1000);
                                }, (PLACEHOLDER_TRANSITION_DELAY + (PLACEHOLDER_TRANSITION_TIME * 2)) * 1000);
                            </script>
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