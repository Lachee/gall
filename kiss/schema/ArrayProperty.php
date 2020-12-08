<?php
namespace kiss\schema;


class ArrayProperty extends Property {

    /** {@inheritdoc} */
    public $type = 'array';

    /** {@inheritdoc} */
    public $format = 'table';

    /** @var Property Items in the array */
    public $items =  null;

    /** @var int|null max items in the array */
    public $maxItems = null;

    /** @var int|null min items in the array */
    public $minItems = null;

    /** {@inheritdoc}
     * @param Property|Property[] $items
     */
    public function __construct($items, $properties = [])
    {
        parent::__construct($properties);

        $this->items = $items;
        //if (!is_array($this->items))
        //    $this->items = $this->items;
    }
}