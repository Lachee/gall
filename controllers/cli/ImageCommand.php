<?php namespace app\controllers\cli;

use app\models\Image;
use GALL;
use kiss\controllers\cli\Command;

class ImageCommand extends Command {
    public function cmdDelete() {
        /** @var Image[] $images */
        $images = Image::find()
                            ->where(['gallery_id', ''])
                            ->orWhere(['gallery_id', 'IS', NULL])
                            ->ttl(0)
                            ->all();

        //Create a instance to the upload client
        $guzzle = new \GuzzleHttp\Client([
            'timeout' => 5
        ]);

        //Upload all the iamges
        self::print("Processing ".count($images)." images...");
        foreach($images as $image) {
            self::print("Deleting {$image->origin}");

            //Skip items without a delete url.
            if (empty($image->delete_url)) {
                self::print("- Skipped POST Request");
            } else {
                self::print("+ Sending POST Request");

                //Send the delete request
                $key = GALL::$app->awooRocksUploadKey;
                $response = $guzzle->request('GET', $image->delete_url . '&key=' . $key);
            }
            
            //Finally, delete the record
            if ($image->delete()) {
                self::print("+ Deleted");
            } else {
                self::print("- Failed to delete");
            }
        }
        
        self::print("DONE");
    }

    public function cmdUpload() {
        /** @var Image[] $images */
        $images = Image::find()
                            ->where(['url', ''])
                            ->orWhere(['url', 'IS', NULL])
                            ->ttl(0)
                            //->limit(1)
                            ->all();

        //Create a instance to the upload client
        $guzzle = new \GuzzleHttp\Client([]);

        //Upload all the iamges
        self::print("Processing ".count($images)." images...");
        foreach($images as $image) {
            self::print("Downloading {$image->origin}");
            
            try {
                $key = GALL::$app->awooRocksUploadKey;
                $ext = $image->getOriginExtension();
                $data = $image->downloadOriginData();
                self::print("+ Downloaded");

                $response = $guzzle->request('POST', 'https://awoo.rocks/gall/upload.php', [
                    'multipart' => [
                        [
                            'name'      => 'key',
                            'contents'  => $key,
                        ],
                        [
                            'name'      => 'd',
                            'contents'  => $data,
                            'filename'  => $image->id . $ext
                        ]
                    ]
                ]);

                $respContent = $response->getBody()->getContents();
                $json = json_decode($respContent, true);
                self::print("+ Uploaded");
                
                if (isset($json['file'])) {
                    $image->url         = $json['file']['URL'];
                    $image->delete_url  = $json['file']['DELURL'];
                    if ($image->save(false, ['url', 'delete_url'])) {
                        self::print("+ Saved");
                    } else {
                        self::print("- Failed to save");
                    }
                } else {
                    self::print("- Failed to upload");
                }
            }catch(\Throwable $e) {
                self::print('- Failed. ' . $e->getMessage());
            }
        }
        
        self::print("DONE");
    }
}