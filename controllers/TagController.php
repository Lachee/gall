<?php namespace app\controllers;

use app\components\mixer\Mixer;
use app\models\forms\ProfileSettingForm;
use app\models\forms\TagManagementForm;
use app\models\Gallery;
use app\models\Tag;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\models\BaseObject;
use app\models\User;
use app\widget\Notification;
use GALL;
use kiss\exception\NotYetImplementedException;
use kiss\Kiss;
use Ramsey\Uuid\Uuid;

class TagController extends BaseController {

    function actionIndex() {
        throw new NotYetImplementedException('TODO: Show all tags');
    }

    function actionManage() {
        //Verified they are logged in
        if (!GALL::$app->loggedIn())
            throw new HttpException(HTTP::UNAUTHORIZED, 'Need to be logged in to manage tags.');
    
        $form = new TagManagementForm();
        return $this->render('manage', [
            'model' => $form,
            'fullwidth' => false,
        ]);
    }

    function actionEdit() {
        $tag = null;
        if (HTTP::get('name', false) !== false) $tag = Tag::findByName(HTTP::get('name'))->one();
        if (HTTP::get('id', false) !== false) $tag = Tag::findByKey(HTTP::get('id'))->one();
        if ($tag == null) throw new HttpException(HTTP::NOT_FOUND, 'Tag does not exist');
        
        throw new NotYetImplementedException('TODO: Provide a tag editor');
    }
}