<?php
define('BASE_URL', 'http://xve.local:81/');

$config = function() {
    return [
        '$class'            => \kiss\Kiss::class,
        'title'             => 'Kiss',
        'logo'              => '/images/kiss.png',
        'mainController'    => \app\controllers\base\MainController::class,
        'baseUrl'           => BASE_URL,
        'db' => [
            '$assoc'    => true,
            'dsn'       => 'mysql:dbname=database;host=localhost',
            'user'      => 'username',
            'pass'      => 'password',
            'prefix'    => 'xve_',
        ],
        'redis'         => new \Predis\Client([], ['prefix' => 'XVE:']),
		'jwtProvider'	=> [ 
            '$class'	    => \kiss\models\JWTProvider::class,
            'algo'          => \kiss\models\JWTProvider::ALGO_RS512,
			'privateKey'    => file_get_contents(__DIR__ . "/jwt-private.key"),
			'publicKey'     => file_get_contents(__DIR__ . "/jwt-public.key"),
		],
        'components'    => [
            '$assoc' => true,
            'discord' => [
                '$class'        => \app\components\discord\Discord::class,
                'clientId'      => '<client-id>',    // The client ID assigned to you by the provider
                'clientSecret'  => '<client-secret>',                                                  // The client password assigned to you by the provider
                'scopes'        => [
                    'identify',
                    'email',
                ]
            ],
            'nodes' => [
                '$class'        => \app\components\nodes\Manager::class
            ]
        ]
    ];
};
