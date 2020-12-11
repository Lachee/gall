<?php
namespace kiss\schema;


class StringProperty extends Property {

    /** {@inheritdoc} */
    public $type = 'string';


    /** {@inheritdoc} */
    public function __construct($description, $default = null, $properties = [])
    {
        parent::__construct($properties);
        $this->description = $description;
        $this->default = $default;
    }

    /** @inheritdoc */
    public function validate($value)
    {
        if (!is_string($value)) 
            return "Expected a string.";
        return true;
    }
}