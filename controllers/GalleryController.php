<?php namespace app\controllers;

use app\components\mixer\Mixer;
use app\models\Gallery;
use app\models\ScrapeData;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\models\BaseObject;
use app\models\User;
use GALL;
use kiss\helpers\Strings;
use kiss\Kiss;
use Ramsey\Uuid\Uuid;

class GalleryController extends BaseController {

    function actionIndex() {
        /** @var User $user */
        $user = Kiss::$app->user;
        $limit = 10;

        return $this->render('index', [
            'latest'        => Gallery::findByLatest()->limit($limit)->all(),
            'top_rated'     => Gallery::findByRating()->limit($limit)->all(),
            'submitted'     => $user->getGalleries()->limit($limit)->all(),
            'favourites'    =>  $user->getFavouriteGalleries()->limit($limit)->all(),
            'recommendation' => $user->searchRecommdendedGalleries(0, $limit),
        ]);
    }

    function actionTest() {
        $otherQuery = Kiss::$app->db()->createQuery()->select('$blacklist')->where(['user_id', '<>', Kiss::$app->user->id ])->execute();
        
        $query = Gallery::findByLatest()->andWhere(['id', 'NOT', ]);
        return $this->render('list', [
            'results'   => $query->ttl(0)->all()
        ]);
    }

    function actionSearch() {
        //Check to see if we have an alternative version of Q.
        // This is used to prevent chrome autofill
        // (not required as chrome now respects autocomplete rules)
        //if (HTTP::get('q', false) === false) {
        //    $q =  HTTP::get('gall-q', false);
        //    if ($q !== false) 
        //        return Response::redirect(['/gallery/search', 'q' => $q]);
        //}

        $page       = HTTP::get('page', 0);
        $limit      = HTTP::get('limit', 10);
        $query      = HTTP::get('q', HTTP::get('gall-q', false));
        /*
        //This is what the new pipe operator would look like. Interesting.
        $query = false
            |> HTTP::get('gall-q', $$)
            |> HTTP::get('q', $$)
        */

        $search     = HTTP::get();
        $results    = [];
        if ($query !== false) {

            $query = trim($query);

            //Search contains HTTP, so lets publish it instead.
            if (Strings::startsWith($query, 'http') && Kiss::$app->user != null) {
                //Quick check if we have the URL already
                $gallery = Gallery::findByUrl($query)->fields(['id'])->one();
                if ($gallery != null)
                    return Response::redirect(['/gallery/:gallery/', 'gallery' => $gallery]);

                //Scrape the data and check again if it already exists
                //Try to publish the gallery, otherwise error out.
                $scrapedData = GALL::$app->scraper->scrape($query);
                if (($gallery = $scrapedData->publish(Kiss::$app->user, false)) !== false) {
                    return Response::redirect(['/gallery/:gallery/', 'gallery' => $gallery]);
                } else {
                    Kiss::$app->session->addNotification('Failed to create post. ' . $scrapedData->errorSummary(), 'danger');
                }
            }

            //Otherwise lets assume its a tag.
            $search = [ 'tag' => $query ];
        }

        $results = Gallery::search($search, $page, $limit);
        return $this->render('list', [
            'results'   => $results
        ]);
    }
}