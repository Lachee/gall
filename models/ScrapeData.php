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
    protected $cover;
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
            'cover'         => new StringProperty('URL to cover image'),

            'pages'         => new IntegerProperty('Number of pages', 1, ['required' => false]),
            'description'   => new StringProperty('Description of artwork', null, ['required' => false]),
            'artist'        => new ArrayProperty(new StringProperty('Artist name'), [ 'required' => false ]),
            'languages'     => new ArrayProperty(new StringProperty('Languages'), [ 'required' => false ]),
        ];
    }

    /** Finds any existing galleries that match this scraped data
     * @return Gallery|null returns the matching gallery
     */
    public function findExistingGallery() {
        $gallery = Gallery::findByIdentifier($this->scraper, $this->id)->ttl(0)->one();
        if ($gallery != null) return $gallery;

        $gallery = Gallery::findByUrl($this->url)->ttl(0)->one();
        if ($gallery != null) return $gallery;

        return null;
    }

    /** Publish the data to the server. It will return the appropriate gallery.
     * If the gallery already exists, it will return that unless told otherwise to ignore the check
     * @param User $publisher the user that is publishing the gallery. Rewards will be created for this user.
     * @param boolean $asNewGallery skips the existing gallery check and will create a new one. Default is false.
     * @return Gallery returns the gallery associated with the data. This may or may not be a newly created gallery.
    */
    public function publish($publisher, $asNewGallery = false) {
        if (!($publisher instanceof User)) 
            throw new ArgumentException('Publisher must be a user');

        //Check it doesnt already exist. This is relied on by the search function
        if (!$asNewGallery) {
            $existingGallery = $this->findExistingGallery();
            if ($existingGallery != null) return $existingGallery;
        }

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

        $lastUploadedImage = null;

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
                $lastUploadedImage = $image = new Image([
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

        //Finally, set the galleries cover, first by finding it in the list, then otherwise by including it directly.
        // We only want to set the cover if we dont have an appropriate one already.
        if (!empty($this->cover)) {
            $cover = Image::findByOrigin($this->cover)->one();
            if ($cover == null) {
                $cover = new Image([
                    'origin'        => $this->cover,
                    'founder_id'    => $publisher->getKey(),
                    'gallery_id'    => $gallery->getKey(),
                    'scraper'       => $this->scraper,
                    'is_cover'      => true,
                ]);

                //Set the cover.
                if ($cover->save()) {
                    $gallery->cover_id = $cover->id;
                    if (!$gallery->save([ 'cover_id' ])) {                    
                        $error = $cover->errorSummary();
                        $e = $error;
                    }
                } else {
                    $error = $cover->errorSummary();
                    $e = $error;
                }
            } else {
                $gallery->cover_id = $cover->id;
                $gallery->save([ 'cover_id' ]);
            }
        } else {
            $cover = null;
        }


        //Update the user's new pin
        //$publisher->profileImage = $cover ?: $lastUploadedImage;
        //$s = $publisher->save();
        return $gallery;
    }
}