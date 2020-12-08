<?php namespace kiss\exception;

use Throwable;

class SQLException extends QueryException {

    /** @var string SQL */
    public $sql;

    /** {@inheritdoc}
     * @param string $SQL
     */
    public function __construct($query, $sql, $message = '', $code = 0, Throwable $previous = null) {
        parent::__construct($query, $message, $code, $previous);
        $this->sql = $sql;
    }
}