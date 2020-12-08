<?php
namespace kiss\schema;


class NumberProperty extends Property {

    /** {@inheritdoc} */
    public $type = 'number';


    /** {@inheritdoc} */
    public function __construct($description, $default = null, $properties = [])
    {
        parent::__construct($properties);
        $this->description = $description;
        $this->default = $default;
    }
}