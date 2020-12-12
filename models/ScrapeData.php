<?php namespace app\models;

use kiss\models\Identity;
use GALL;
use kiss\db\ActiveRecord;
use kiss\exception\ArgumentException;
use kiss\Kiss;
use kiss\models\BaseObject;
use kiss\schema\ArrayProperty;
use kiss\schema\EnumProperty;
use kiss\schema\IntegerProperty;
use kiss\schema\StringProperty;

class ScrapeData extends BaseObject {

    protected $id;
    protected $scraper;
    protected $type;
    protected $title;
    protected $description;
    protected $artist;
    protected $tags;
    protected $languages;
    protected $url;
    protected $images;
    protected $thumbnail;
    protected $pages;

    public static function getSchemaProperties($options = [])
    {
        return [
            'id'            => new StringProperty('Identifier of the post', null),
            'scraper'       => new StringProperty('The scraper used'),
            'type'          => new EnumProperty('Type of work', [ 'artwork', 'comic' ]),
            'title'         => new StringProperty('The title of the artwork'),
            'url'           => new StringProperty('URL to source material'),
            'tags'          => new ArrayProperty(new StringProperty('Tag name')),
            'images'        => new ArrayProperty(new StringProperty('Image URL'), [ 'min' => 1 ]),
            'thumbnail'     => new StringProperty('URL to thumbnail'),

            'pages'         => new IntegerProperty('Number of pages', 1, ['required' => false]),
            'description'   => new StringProperty('Description of artwork', null, ['required' => false]),
            'artist'        => new ArrayProperty(new StringProperty('Artist name'), [ 'required' => false ]),
            'languages'     => new ArrayProperty(new StringProperty('Languages'), [ 'required' => false ]),
        ];
    }

    /** Publishes the data to the site. Throws exception if unable. */
    public function publish($publisher) {
        if (!($publisher instanceof User)) 
            throw new ArgumentException('Publisher must be a user');

        //Prepare a list of tags
        $tags = [];
        $missingTags = [];

        //Search tags, artist and languages
        if (!empty($this->tags))
            foreach($this->tags as $name) {
                $tag = Tag::find()->where(['name', $name])->andWhere([ 'type', Tag::TYPE_TAG ])->one();
                if ($tag == null) $missingTags[] = [ 'name' => $name, 'type' => Tag::TYPE_TAG ];
                else $tags[] = $tag;
            }     

        if (!empty($this->artist))
            foreach($this->artist as $name) {
                $tag = Tag::find()->where(['name', $name])->andWhere([ 'type', Tag::TYPE_ARTIST ])->one();
                if ($tag == null) $missingTags[] = [ 'name' => $name, 'type' => Tag::TYPE_ARTIST ];
                else $tags[] = $tag;
            }        

        if (!empty($this->languages))
            foreach($this->languages as $name) {
                $tag = Tag::find()->where(['name', $name])->andWhere([ 'type', Tag::TYPE_LANGUAGE ])->one();
                if ($tag == null) $missingTags[] = [ 'name' => $name, 'type' => Tag::TYPE_LANGUAGE ];
                else $tags[] = $tag;
            }

        //Create the gallery
        $gallery = new Gallery([
            'founder_id'    => $publisher->getKey(),
            'identifier'    => $this->id,
            'title'         => $this->title,
            'description'   => $this->description,
            'type'          => $this->type,
            'scraper'       => $this->scraper,
            'url'           => $this->url,
        ]);

        //Save the gallery
        if (!$gallery->save()) {
            $this->addError($gallery->errors());
            return false;
        }

        //Create the missing tags
        foreach($missingTags as $missing) {
            $tag = new Tag([
                'name' => $missing['name'],
                'type'  => $missing['type'],
                'founder_id' => $publisher->getKey(),
            ]);
            if (!$tag->save()) {
                $this->addError($tag->errors());
                Kiss::$app->db()->rollBack();
                return false;
            }
            $tags[] = $tag;
        }

        //Start the transaction
        Kiss::$app->db()->beginTransaction();
        {
            //Assign the tags
            $assignedids = [];
            foreach($tags as $tag) {
                if (in_array($tag->getKey(), $assignedids)) continue;
                $assignedids[] = $tag->getKey();
                $gallery->addTag($tag, $publisher);
            }

            //Insert the images
            foreach($this->images as $img) {
                $image = new Image([
                    'origin'        => $img,
                    'founder_id'    => $publisher->getKey(),
                    'gallery_id'    => $gallery->getKey(),
                    'scraper'       => $this->scraper,
                ]);

                //Save the gallery and abort otherwise
                if (!$image->save()) {
                    $this->addError($image->errors());
                    Kiss::$app->db()->rollBack();
                    return false;
                }
            }
        }
        Kiss::$app->db()->commit();

        //Finally, set the galleries thumbnail
        $thumbnail = Image::findByOrigin($this->thumbnail)->one();
        if ($thumbnail == null) {
            $thumbnail = new Image([
                'origin' => $this->thumbnail,
                'founder_id'    => $publisher->getKey(),
                'gallery_id'    => $gallery->getKey(),
                'scraper'       => $this->scraper,
            ]);
            $thumbnail->save();
        }

        if ($thumbnail != null) {
            $gallery->thumbnail_id = $thumbnail->getKey(); 
            $gallery->save();
        }

        return $gallery;
    }
}