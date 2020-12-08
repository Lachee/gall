<?php
namespace kiss\schema;


class BooleanProperty extends Property {

    /** {@inheritdoc} */
    public $type = 'boolean';


    /** {@inheritdoc} */
    public function __construct($description, $default = null, $properties = [])
    {
        parent::__construct($properties);
        $this->description = $description;
        $this->default = $default;
    }
}