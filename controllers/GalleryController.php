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

            //Search contains HTTP, so lets publish it instead.
            if (Strings::startsWith($query, 'http') && Kiss::$app->user != null) {
                $scrapedData = ScrapeData::scrape($query);
                $scrapedData->publish(Kiss::$app->user);
                return Response::redirect(['/gallery/:gallery/', 'gallery' => $gallery]);
            }

            //Otherwise lets assume its a tag.
            $search = [ 'tag' => $query ];
        }

        $results = Gallery::search($search, $page, $limit);
        return $this->render('list', [
            'results'   => $results
        ]);
    }

    function actionRecache() {
        //GALL::$app->scraper->cacheImage('https://i1.wp.com/hentaicomicsfree.com/wp-content/uploads/2018/12/Overwatch-BdsmMaker-014-630x1024.jpg');

        GALL::$app->scraper->recache();
        //return $this->actionIndex();
    }

}