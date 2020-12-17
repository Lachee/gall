<?php namespace app\controllers;

use app\components\mixer\Mixer;

use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\models\BaseObject;
use app\models\User;
use GALL;
use kiss\Kiss;
use Ramsey\Uuid\Uuid;

class MainController extends BaseController {
    public static function route() { return "/main"; }

    /** Checks the authorization of the user
     * @return bool true if they are allowed here. False if they should be redirected to login first.
     * You can also throw exceptions here if requried to tell the user off.
     */
    public function authorize($action) { return true; }

    function actionIndex() {
        return $this->render('index', [
            'fullWidth' => true,
            'wrapContents' => false,
        ]);
    }

    /** View the JWT */
    function actionJWT() {
        return $this->render('jwt', [
            'key' => Kiss::$app->jwtProvider->publicKey,
            'fullWidth' => true,
            'wrapContents' => false,
        ]);
    }

    /** Logs In */
    function actionLogin() {
        Kiss::$app->session->set('LOGIN_REFERAL', HTTP::referal());
        return GALL::$app->discord->redirect();
    }

    /** Logs Out */
    function actionLogout() {
        if (($user = Kiss::$app->getUser()))  $user->logout();
        return Response::redirect('/');
    }

    /** Authorizes */
    function actionAuth() {
        try 
        { 
            //Get the tokens.
            $tokens = GALL::$app->discord->handleRequest();
            if ($tokens === false) return $this->actionLogin();

            //Get the discord user
            $duser  = GALL::$app->discord->identify($tokens);
            
            //Get the user, otherwise create one.
            /** @var User $user */
            $user = User::findBySnowflake($duser->id)->one();
            if ($user == null) {
                $user = new User([
                    'uuid' => Uuid::uuid1(GALL::$app->uuidNodeProvider->getNode()),
                    'username' => $duser->username,
                    'snowflake' => $duser->id,
                ]);
                GALL::$app->session->addNotification('Your account has been created');
            }

            //Store the tokens
            GALL::$app->discord->getStorage($user->uuid)->setTokens($tokens);
            
            //Update our name and save
            $user->username = $duser->username;
            $user->save();

            //Actually login
            if (!$user->login()) {         
                Kiss::$app->session->addNotification('Failed to login for some reason', 'danger');
            }
        } 
        catch(\Exception $e) 
        {
            GALL::$app->session->addNotification('Woops, something went wrong while trying to perform that action! ' . (KISS_DEBUG ? $e->getMessage() : ''), 'danger');
        }         
        
        $referal = Kiss::$app->session->get('LOGIN_REFERAL', HTTP::referal());
        return Response::redirect($referal ?? [ '/gallery/']);
    }
}