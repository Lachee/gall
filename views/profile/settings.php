<?php

use app\models\Gallery;
use app\models\Image;
use app\models\Tag;
use app\widget\GalleryList;
use app\widget\ProfileCard;
use Formr\Formr;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\models\BaseObject;

/** @var User $profile */
/** @var Form $model */

/*
$form = new Formr('bulma');
$rules = [
    'username' => ['Username', 'required|min[3]|max[16]|slug'],
    'password' => ['Password', 'required|hash']
];
$form->fastForm($rules);
*/

?>

<style>
</style>

<form method='POST'>
    <?= $model->render(); ?>
    <button class="button" type="submit">
        <span class="icon"><i class="fal fa-save"></i></span>
        <span>Save</span>
    </button>
    <hr>
    <div class="field ">
        <label class="label">API Key</label>
        <div class="field has-addons is-fullwidth">
            <div class="control" style="flex: 1">
                <input class="input" name="api_key" placeholder="cooldude69" value="<?= $key ?>" type="text" readonly>
            </div>  
            <div class="control"><a href="<?= HTTP::url(['settings', 'regen' => true]) ?>" class="button" type="submit">Regenerate</a></div>
        </div>
        <p class="help">Used to access the API</p>
    </div>
</form>
