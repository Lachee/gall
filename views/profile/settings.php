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

<form method='POST'>
  <?= $model->render(); ?>

    <div class="field ">
        <label class="label">API Key</label>
        <div class="field has-addons is-fullwidth">
            <div class="control" style="flex: 1">
                <input class="input" name="profile_name" placeholder="cooldude69" value="<?= $key ?>" type="text" readonly>
            </div>  
            <div class="control"><a href="<?= HTTP::url(['settings', 'regen' => true]) ?>" class="button" type="submit">Regenerate</a></div>
        </div>
        <p class="help">Used to access the API</p>
    </div>
    
    
    <div class="field">
        <label class="label">Blacklisted Labels</label>
        <div class="control has-icons-left" >
          <span class="select"  style="width: 100%">
              <select name="event" id="event-selector" multiple>
              </select>
          </span>
          <span class="icon is-small is-left">
              <i class="fal fa-tag"></i>
          </span>
        </div>
    </div>

  <button class="button" type="submit">Submit</button>
</form>

<script>
$('#event-selector').select2({
    width: '100%',
    ajax: {
        url: '/api/tags',
        data: (params) => new Object({ q: params.term, page: params.page || 1, select2: true })
    }
});
</script>