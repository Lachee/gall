<?php

use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\Kiss;
$user = Kiss::$app->getUser();
?>
<!-- START NAV -->
<nav class="navbar">
    <div class="container">
        <div class="navbar-brand">
            <a class="navbar-item brand-text" href="<?= HTTP::url('/')?>"><img src="<?= Kiss::$app->logo ?>" /></a>
            <div class="navbar-burger burger" data-target="navMenu">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
        <div id="navMenu" class="navbar-menu">
            <div class="navbar-start">
                <?php if ($user): ?>
                    <a class="navbar-item" href="<?= HTTP::url('/gallery/')?>">Gallery</a>
                <?php endif;  ?>
            </div>
        </div>
        <div id="navMenu" class="navbar-end">
            <div class="navbar-start">
                <div class="navbar-item">
                    <?php if ($user): ?>
                        <div class="field has-addons"> 
                            <p class="control">
                                <a class="button" id="login-button" href="#" >
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