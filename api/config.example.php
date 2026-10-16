<?php
// Скопируйте в config.local.php и впишите данные базы из панели Бегета («MySQL»).
// config.local.php в git не попадает.
return [
    'dsn' => 'mysql:host=localhost;dbname=ЛОГИН_ИМЯБАЗЫ;charset=utf8mb4',
    'user' => 'ЛОГИН_ИМЯБАЗЫ',
    'password' => 'ПАРОЛЬ_БАЗЫ',
];
