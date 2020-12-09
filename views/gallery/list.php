<?php

use app\models\Tag;
use app\widget\GalleryList;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\Kiss;

?>

<h1>Search Results</h1>
<?= GalleryList::widget([ 'galleries' => $results, 'grid' => true ]); ?>