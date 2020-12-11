<?php
namespace kiss\models\forms;

use JsonSerializable;
use kiss\exception\ArgumentException;
use kiss\exception\InvalidOperationException;
use kiss\helpers\HTML;
use kiss\helpers\HTTP;
use kiss\helpers\StringHelper;
use kiss\models\BaseObject;
use kiss\schema\ArrayProperty;
use kiss\schema\BooleanProperty;
use kiss\schema\EnumProperty;
use kiss\schema\IntegerProperty;
use kiss\schema\NumberProperty;
use kiss\schema\ObjectProperty;
use kiss\schema\Property;
use kiss\schema\RefProperty;
use kiss\schema\SchemaInterface;
use kiss\schema\StringProperty;

class Form extends BaseObject {
    
    /** Renders the form
     * @return string HTML form
     */
    public function render($options = []) {
        $schema = get_called_class()::getSchemaProperties(['serializer' => 'form']);
        $html = HTTP::CSRF();
        foreach($schema as $property => $scheme) {
            $html .= $this->renderScheme($property, $scheme, $options);
        }
        return $html;
    }

    /** Renders a scheme
     * @param string $name the property name
     * @param Property $scheme
     * @return string
    */
    protected function renderScheme($name, $scheme, $options = []) {
        if (!($scheme instanceof Property)) throw new ArgumentException('$scheme has to be a property');

        $propertyType = $scheme->type;
        $renderer = "input{$propertyType}";
        if (!method_exists($this, $renderer)) 
            throw new ArgumentException('Form does not have a ' . $propertyType . ' renderer');
        
        $field = HTML::begin('div', [ 'class' => 'field' ]); 
        {
            if (!empty($scheme->title))
                $field .= HTML::tag('label', $scheme->title, [ 'class' => 'label' ]);

            $field .= HTML::begin('div', ['class' => 'control']);
            {
                $field .= $this->{$renderer}($name, $scheme, $options);
            }
            $field .= HTML::end('div');

            if (!empty($scheme->description))
                $field .= HTML::tag('p', $scheme->description, [ 'class' => 'help' ]);
                
        }
        $field .= HTML::end('div');
        return $field;
    }

    /** Renders a text field
     * @param string $name the property name
     * @param StringProperty $scheme
     * @return string
    */
    protected function inputString($name, $scheme, $options = []) {
        return HTML::tag('input', '', [ 
            'class'         => 'input',
            'type'          => 'text',
            'name'          => $name,
            'placeholder'   => $scheme->default,
            'value'         => $this->getValue($name, '')
        ]);
    }

    /** Gets the value, otherwise the default */
    protected function getValue($field, $default = '') {
        $v = $this->{$field};
        return $v == null ? $default : $v;
    }

    /** @inheritdoc */
    public function load($data = null)
    {
        // Validate the CSFR
        if (!HTTP::checkCSRF()) {
            $this->addError('Invalid CSFR. Your request may have been forged.');
            return false;
        }

        return parent::load($data);
    }
}