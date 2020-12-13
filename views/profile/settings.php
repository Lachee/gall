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
  
  <div class="field">
      <div class="control has-icons-left" >
          <span class="select"  style="width: 100%">
              <select name="event" id="event-selector">
              </select>
          </span>
          <span class="icon is-small is-left">
              <i class="fal fa-${Graph.getTypeIconName('event')}"></i>
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