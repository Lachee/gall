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
    
    <label class="label">Reaction Tags</label>    
    <table class="table is-fullwidth">
        <thead>
            <tr>
                <th width="250px">Emote</th>
                <th width="500px">Tags</th>
            </tr>
        </thead>
        <tbody>
            <?php for($i = 0; $i < 10; $i++): ?>
            <tr>
                <td>
                    <div class="field">
                        <div class="control" >
                            <span class="select"  style="width: 100%">
                                <select name="event" class="emote-selector">
                                </select>
                            </span>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="field">
                        <div class="control has-icons-left" >
                            <span class="select"  style="width: 100%">
                                <select name="event" class="tag-selector" multiple>
                                </select>
                            </span>
                            <span class="icon is-small is-left"><i class="fal fa-tag"></i></span>
                        </div>
                    </div>
                </td>
            </tr>
            <?php endfor; ?>
        </tbody>
    </table>


  <button class="button" type="submit">Submit</button>
</form>
