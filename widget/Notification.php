<?php
namespace app\widget;

use kiss\helpers\HTML;
use kiss\Kiss;
use kiss\widget\Widget;

class Notification extends Widget {

    
    /** {@inheritdoc} */
    public function begin() {
        $notifications = Kiss::$app->session->consumeNotifications();
        echo '<section class="notifications content">';
        foreach($notifications as $notification) {
            $content = $notification['content'];
            $type = $notification['type'];
            if (isset($notification['html']) && $notification['html'] == true) 
                $content = $notification['raw'];

            echo "<div class='notification is-{$type}'>";
            echo '<button class="delete"></button>';
            echo $content;
            echo "</div>";
        }
        echo '</section>';
    }

}