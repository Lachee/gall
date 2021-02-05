
<?php namespace app\components;

use app\models\ScrapeData;
use Exception;
use kiss\exception\InvalidOperationException;
use kiss\helpers\Strings;
use kiss\Kiss;
use kiss\models\BaseObject;

class Scraper extends BaseObject {

    public $regions = [];
    private $client;

    protected function init()
    {
        parent::init();
        $this->client = new \GuzzleHttp\Client([ ]);
    }

    /**
     * Scrapes the image data in the given url
     * @param string $url the url to scrape
     * @return ScrapeData the scraped data
     * @throws InvalidOperationException 
     */
    public function scrape($url) {
        $cleanURL = preg_replace("(^https?://)", "", $url );
        $cleanBase = preg_replace("(^https?://)", "", Kiss::$app->baseURL());
        if (Strings::startsWith($cleanURL, $cleanBase))
            throw new Exception('Cannot scrape our own site');

        $query = '?' . http_build_query([ 'url' => $url ]);
        $url = '/scrape' . $query;
        $response = $this->client->request('GET', 'scrape' . $query);
        
        $jsonstr = $response->getBody()->getContents();
        $json = json_decode($jsonstr, true);
        $data = new ScrapeData($json);

        if (!$data->validate()) 
            throw new Exception('Unable to validate the scraped data. ' . $data->errorSummary());

        return $data;        
    }
}