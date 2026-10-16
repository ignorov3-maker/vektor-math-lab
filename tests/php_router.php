<?php
// Роутер встроенного сервера PHP для тестов: пустой config.js (без Supabase), остальное — как есть.
if (parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) === '/config.js') {
    header('Content-Type: text/javascript'); echo 'window.VEKTOR_CONFIG = {};'; return true;
}
return false;
