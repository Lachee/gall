<?php

use app\models\Gallery;
use app\models\Image;
use app\models\Tag;
use app\widget\GalleryList;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;

/** @var User $profile */

?>

<h2><?= $profile->displayName ?></h2>
<?= GalleryList::widget([ 'galleries' => $submissions ]); ?>