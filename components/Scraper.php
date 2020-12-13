<?php namespace app\components;

use app\models\ScrapeData;
use Exception;
use kiss\exception\InvalidOperationException;
use kiss\models\BaseObject;

class Scraper extends BaseObject {

    public $baseUrl = "";
    private $client;

    protected function init()
    {
        parent::init();
        $this->client = new \GuzzleHttp\Client([
            'base_uri' => $this->baseUrl
        ]);
    }

    /**
     * Scrapes the image data in the given url
     * @param string $url the url to scrape
     * @return ScrapeData the scraped data
     * @throws InvalidOperationException 
     */
    public function scrape($url) {
        $query = '?' . http_build_query([ 'url' => $url ]);
        $url = '/scrape' . $query;
        $response = $this->client->request('GET', 'scrape' . $query);
        
        $jsonstr = $response->getBody()->getContents();
        $json = json_decode($jsonstr, true);
        $data = new ScrapeData($json);

        if ($data->validate()) 
            throw new Exception('Unable to validate the scraped data. ' . $data->errorSummary());

        return $data;        
    }
}