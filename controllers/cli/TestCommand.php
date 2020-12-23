<?php namespace app\controllers\cli;

use kiss\controllers\cli\Command;

class TestCommand extends Command {
    public function cmdDefault() {
        echo 'default';
    }
    public function cmdApple() {
        echo 'test';
        return 'd';
    }
}