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
<div id="grid" class="grid" style="width: 75%">
</div>

<button id="next-page" class="next-page">Next Page</button>

<div id="grid-viewer">
</div>

<button id="test" class="button">Tool Tip</button>

<!--
<div class="grid">
    <div><img src="https://source.unsplash.com/t3DHojIo-08" alt=""></div>
    <div><img src="https://source.unsplash.com/Imc-IoZDMXc" alt=""></div>
    <div><img src="https://source.unsplash.com/SOZWHqeXcPQ" alt=""></div>
    <div><img src="https://source.unsplash.com/bkdzvgBB7rQ" alt=""></div>
    <div><img src="https://source.unsplash.com/Aruugw_rJCM" alt=""></div>
</div>
-->