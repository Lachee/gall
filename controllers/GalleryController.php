<?php namespace app\controllers;

use app\components\mixer\Mixer;
use app\models\Gallery;
use app\models\ScrapeData;
use app\models\Tag;
use kiss\exception\HttpException;
use kiss\helpers\HTTP;
use kiss\helpers\Response;
use kiss\models\BaseObject;
use app\models\User;
use Exception;
use GALL;
use kiss\exception\NotYetImplementedException;
use kiss\helpers\Strings;
use kiss\Kiss;
use Ramsey\Uuid\Uuid;

class GalleryController extends BaseController {

    function actionIndex() {
        /** @var User $user */
        $user = Kiss::$app->user;
        $limit = 10;

        $galleries = [
            'latest'            => Gallery::findByLatest()->limit($limit),
            'top_rated'         => Gallery::findByRating()->limit($limit),
            'submitted'         => [], 
            'favourites'        => [], 
            'recommendation'    => [],
        ];
        
        if ($user != null) {
            $galleries['submitted'] = $user->getGalleries()->limit($limit);
            $galleries['favourites'] = $user->getFavouriteGalleries();
            $galleries['recommendation'] = $user->searchRecommdendedGalleries(0, $limit);

            //Query and blacklist the galleries
            foreach($galleries as $k => $gallery) {
                if (!is_array($gallery))
                    $galleries[$k] = $user->applyGalleryBlacklist($gallery)->limit($limit)->all();
            }
        } else {
            
            //Query all the galleries
            foreach($galleries as $k => $gallery) {
                if (!is_array($gallery))
                    $galleries[$k] = $gallery->limit($limit)->all();
            }
        }

        return $this->render('index', $galleries);
    }

    function actionTest() {
        $tag = Tag::findByName('pokemon')->one();
        $query = Gallery::findByTag($tag);
        GALL::$app->user->applyGalleryBlacklist($query);
        $preview = $query->previewStatement();
        $results = $query->all();
        return $this->render('list', [
            'results'   => $results
        ]);
    }

    function actionQuery() {
        $query = HTTP::get('q', HTTP::get('gall-q', false));
        if ($query === false || empty($query))
            return Response::redirect(['/gallery/']);

        //Return to ourselves
        if (Strings::startsWith($query, '@me')) {
            if (!Kiss::$app->loggedIn()) Response::redirect(['/login']);
            $requests = explode(' ', $query);
            return Response::redirect(['/profile/' . join('/', $requests)]);
        }

        //If its an interger, probably a gallery
        if (is_numeric($query)) {
            $gallery = Gallery::findByKey($query)->fields(['id'])->one();
            if ($gallery) return Response::redirect(['/gallery/:gallery/', 'gallery' => $gallery]);
        }

        //If the query starts with HTTP then we want to find based of url
        if (($link = Strings::likeURL($query)) !== false) {        
            //If it exists, lets go to it
            $gallery = Gallery::findByUrl($link)->fields(['id'])->one();
            if ($gallery == null) {

                //See if we are trying to scrape ourseles
                $cleanURL = preg_replace("(^https?://)", "", $link );
                $cleanBase = preg_replace("(^https?://)", "", Kiss::$app->baseURL());
                if (Strings::startsWith($cleanURL, $cleanBase)) {
                    $fio = strpos($cleanURL, '/');
                    $cleanURL = substr($cleanURL, $fio);
                    if (preg_match('/\/gallery\/([0-9]*)\/?/', $cleanURL, $matches)) {
                        return Response::redirect(['/gallery/:gallery/', 'gallery' => $matches[1]]);                        
                    }

                    //Just give up
                    throw new Exception('Gallery does not exist');
                }

                // Verify we are logged in before we try to publish
                if (!Kiss::$app->loggedIn()) 
                    throw new HttpException(HTTP::UNAUTHORIZED, 'You need to be logged in to query');
                
                //It doesn't exist, so lets make a new post
                $scraped_data = GALL::$app->scraper->scrape($link);
                if (!($gallery = $scraped_data->publish(Kiss::$app->user))) {

                    //We failed to publish the gallery, oh dear :c
                    Kiss::$app->session->addNotification('Failed to create the gallery. ' . $scraped_data->errorSummary(), 'danger');
                    return Response::redirect(['/gallery/']);
                }
            }

            //Redirect to the gallery
            return Response::redirect(['/gallery/:gallery/', 'gallery' => $gallery]);
        }

        //Check to see if it is a profile?
        if (($profile = User::findByProfileName($query)->one()))
            return Response::redirect(['/profile/:profile/', 'profile' => $profile->profileName]);

        return Response::redirect([ 'search', 'q' => $query ]);
        throw new HttpException(HTTP::NO_CONTENT, 'There was nothing here at all');
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