<?php namespace app\controllers;

use app\components\mixer\Mixer;
use app\models\forms\ProfileSettingForm;
use app\models\Gallery;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\models\BaseObject;
use app\models\User;
use app\widget\Notification;
use GALL;
use kiss\helpers\HTML;
use kiss\Kiss;
use Ramsey\Uuid\Uuid;

/**
 * @property User $profile
 */
class ProfileController extends BaseController {
    /** SCopes while debugging */
    public const DEBUG_SCOPES = [
        'emote.update', 'emote.publish', 'emote.remove',
        'guild', 'guild.publish', 'guild.remove', 'guild.update', 
        'gallery', 'gallery.favourite', 'gallery.pin', 'gallery.publish', 'gallery.search', 'gallery.update', 'gallery.reaction',
        'bot.impersonate'
    ];

    /** Scopes to give to normal users */
    public const SCOPES = [
        'gallery', 'gallery.favourite', 'gallery.pin', 'gallery.publish', 'gallery.search', 'gallery.update', 'gallery.reaction',
    ];

    public $profile_name;
    public static function route() { return "/profile/:profile_name"; }

    function actionIndex() {
        /** @var User $profile */
        $profile = $this->profile;
        return $this->render('index', [
            'profile'       => $profile,
            'submissions'   => $profile->getBestGalleries()->limit(4)->all(),
            'favourites'    => $profile->getFavouriteGalleries()->all()
        ]);
    }

    function actionFavourites() {
        $galleries = $this->profile->getFavouriteGalleries()->all();
        return $this->render('browse', [
            'title'     => 'Favourites',
            'profile'   => $this->profile,
            'galleries' => $galleries
        ]);
    }

    function actionSubmissions() {
        $galleries = $this->profile->getGalleries()->all();
        return $this->render('browse', [
            'title'     => 'Submissions',
            'profile'   => $this->profile,
            'galleries' => $galleries
        ]);
    }

    function actionSettings() {
        /** @var User $profile */
        if ($this->profile->id != Kiss::$app->user->id) throw new HttpException(HTTP::FORBIDDEN, 'Can only edit your own settings');
        
        //Regenerate the API key if we are told to
        if (HTTP::get('regen', false, FILTER_VALIDATE_BOOLEAN)) {
            if ($this->profile->regenerateApiKey()) {
                Kiss::$app->session->addNotification('Regenerated your API key', 'success');
            } else {
                Kiss::$app->session->addNotification('Failed to regenerate your API key', 'danger');
            }
            return Response::refresh();
        }
    
        $form = new ProfileSettingForm([ 'profile' => $this->profile ]);
        if (HTTP::hasPost()) {
        
            //Force the profile to recaculate its sparkles
            $this->profile->recalculateSparkles();

            if ($form->load(HTTP::post()) && $form->save()) {
                Kiss::$app->session->addNotification('Updated profile settings', 'success');
                return Response::redirect(['/profile/:profile/settings', 'profile' => $this->profile->profileName ]);
            } else {                
                Kiss::$app->session->addNotification('Failed to load: ' . $form->errorSummary(), 'danger');
            }
        }

        //Setup the scopes
        $scopes = self::SCOPES;
        if (KISS_DEBUG || $this->profile->snowflake == '130973321683533824') 
            $scopes = self::DEBUG_SCOPES;

        //Render the page
        return $this->render('settings', [
            'profile'       => $this->profile,
            'model'         => $form,
            'key'           => $this->api_key = $this->profile->apiToken([ 'scopes' => $scopes ])
        ]);
    }

    private $_profile;
    public function getProfile() {
        if ($this->_profile != null) return $this->_profile;        
        $this->_profile = User::findByProfileName($this->profile_name)->ttl(false)->one();
        if ($this->_profile == null) throw new HttpException(HTTP::NOT_FOUND, 'Profile doesn\'t exist');
        return $this->_profile;
    }
}