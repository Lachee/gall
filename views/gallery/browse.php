<?php

use app\models\Tag;
use app\widget\GalleryList;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\Kiss;

?>

<style>
    .grid-image-container {
        width: 300px;
    }
</style>


<h1>Browse</h1>
<div id="grid" class="grid" style="width: 75%"></div>
<div id="grid-loader" class="separator">loading</div>
<div id="grid-viewer"></div>

<!--
<div class="grid">
    <div><img src="https://source.unsplash.com/t3DHojIo-08" alt=""></div>
    <div><img src="https://source.unsplash.com/Imc-IoZDMXc" alt=""></div>
    <div><img src="https://source.unsplash.com/SOZWHqeXcPQ" alt=""></div>
    <div><img src="https://source.unsplash.com/bkdzvgBB7rQ" alt=""></div>
    <div><img src="https://source.unsplash.com/Aruugw_rJCM" alt=""></div>
</div>
-->