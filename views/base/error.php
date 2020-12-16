<?php

use kiss\exception\HttpException;
use kiss\helpers\Dump;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\helpers\Strings;

?>


<style>
    section.bulma404 {
        position: fixed;
        bottom: 0;
        width: 34%;
        right: 0%;
    }
</style>

<section class="notification hero has-gradient is-danger welcome is-small">
    <div class="hero-body">
        <div class="container">
            <h1 class="title">Woops!</h1>
            <h2 class="subtitle">
                Something went wrong while trying to serve you that page.
            </h2>
        </div>
    </div>
</section>

<section  class="section">
    <div class="container">
        <div class="columns">
            <div class='column is-one-third'>
            
                <div class="card">
                    <div class="card-content">
                        <p class="title">HTTP <?= $exception->getStatus() ?></p>
                        <p class="subtitle"><?= HTTP::status($exception->getStatus()); ?> </p>                        
                        <?= $exception->getMessage() ?>
                    </div>
                    <footer class="card-footer">
                        <p class="card-footer-item">
                        <span>  Go <a onclick="window.history.back();">Back</a> </span>
                        </p>
                        <p class="card-footer-item">
                        <span> View on <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/<?= $exception->getStatus() ?>">MDN</a></span>
                        </p>
                    </footer>
                </div>
            </div>
            <div class='column is-two-thirds'>
                <?php
                if(KISS_DEBUG && $exception->getStatus() == 500):
                    $innerException = $exception->getInnerException();                    
                    if ($innerException != null):
                ?>

                                
                    <div class="card">
                        <header class="card-header">
                            <p class="card-header-title">Dump</p>
                            <a style="z-index: 1000;" href="#collapsible-vardump" data-action="collapse" class="card-header-icon is-hidden-fullscreen" aria-label="more options">
                                <span class="icon">
                                    <i class="fas fa-angle-down" aria-hidden="true"></i>
                                </span>
                            </a>
                        </header>
                        <div id="collapsible-vardump" class="is-collapsible is-active">
                            <div class="card-content">
                                <?= Dump::debug($innerException); ?>
                            </div>
                        </div>
                    </div>
                    <div class="card">
                        <header class="card-header">
                            <p class="card-header-title">Stacktrace</p>                           
                        </header>
                        <div id="collapsible-stacktrace" class="">
                            <div class="card-content stacktrace">
                                <?php foreach($innerException->getTrace() as $i => $trace):
                                        $trace['class'] = empty($trace['class']) ? '(closure)' : $trace['class'];
                                        $trace['type'] = empty($trace['type']) ? '::' : $trace['type'];
                                    ?>
                                    <div class='trace <?= Strings::startsWith($trace['class'], 'kiss') || Strings::startsWith($trace['class'], '(closure)') ? '' : 'is-important' ?>'>
                                        <div class='target'><span class='class'><?= $trace['class'] ?></span><span class='type'><?= $trace['type'] ?></span><span class='func'><?= $trace['function'] ?>()</span></div>
                                        <div class='file'><a href="<?= HTTP::url(['vscode://file/:file', 'file' => urlencode(($trace['file']?:'').':' . ($trace['line']?:''))]) ?>"><span class='path'><?= $trace['file'] ?: ''?></span><span class='line'><?= $trace['line'] ?: '' ?></span></a></div>
                                        <a href="#collapsible-args-<?= $i ?>" data-action="collapse">Hide / Show Arguments</a>
                                        <div id="collapsible-args-<?= $i ?>"  class='args is-collapsible'><pre><?= var_dump($trace['args']) ?></pre></div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                    </div>

                    <?php
                    else:
                        //Dont have an inner exception, so just log it out normally
                        var_dump($exception);
                    endif;
                endif;
                ?>
            </div>
        </div>
    </div>
</section>


<section class="bulma404">
    <img src="images/bulma.png">
</section>