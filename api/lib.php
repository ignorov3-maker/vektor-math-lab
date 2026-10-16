<?php
// Общие функции API «Вектора». PHP 8.1+, PDO (MySQL на Бегете или SQLite для тестов).
declare(strict_types=1);

const SESSION_HOURS = 12;          // сессия ученика (Ф-07)
const MAX_FAILS = 5;               // ошибок входа подряд (Ф-03)
const LOCK_SECONDS = 300;          // блокировка на 5 минут
const MAX_STATE_BYTES = 400000;    // потолок размера прогресса
const MAX_EVENTS_PER_CALL = 200;

function cfg(): array {
    static $c = null;
    if ($c !== null) return $c;
    $file = getenv('VEKTOR_CONFIG') ?: __DIR__ . '/config.local.php';
    if (!is_file($file)) throw new RuntimeException('Нет api/config.local.php — скопируйте config.example.php');
    return $c = require $file;
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = cfg();
    $pdo = new PDO($c['dsn'], $c['user'] ?? null, $c['password'] ?? null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    if (is_mysql()) $pdo->exec("SET NAMES utf8mb4");
    return $pdo;
}

function is_mysql(): bool { return str_starts_with(cfg()['dsn'], 'mysql:'); }

function migrate(): void {
    $my = is_mysql();
    $id = $my ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $txt = $my ? 'MEDIUMTEXT' : 'TEXT';
    $tail = $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4' : '';
    $q = [
        "CREATE TABLE IF NOT EXISTS classes (id $id, name VARCHAR(40) NOT NULL, grp VARCHAR(12) NOT NULL DEFAULT 'pilot')$tail",
        "CREATE TABLE IF NOT EXISTS students (id $id, login VARCHAR(40) NOT NULL UNIQUE, pass_hash VARCHAR(255) NOT NULL,
            class_id INT NULL, label VARCHAR(40) NULL, state $txt NULL, state_rev INT NOT NULL DEFAULT 0,
            fails INT NOT NULL DEFAULT 0, locked_until INT NOT NULL DEFAULT 0, last_seen INT NOT NULL DEFAULT 0)$tail",
        "CREATE TABLE IF NOT EXISTS teachers (id $id, login VARCHAR(80) NOT NULL UNIQUE, pass_hash VARCHAR(255) NOT NULL,
            name VARCHAR(80) NOT NULL DEFAULT '', class_ids VARCHAR(255) NOT NULL DEFAULT '', is_admin INT NOT NULL DEFAULT 0,
            fails INT NOT NULL DEFAULT 0, locked_until INT NOT NULL DEFAULT 0)$tail",
        "CREATE TABLE IF NOT EXISTS sessions (token_hash CHAR(64) PRIMARY KEY, role VARCHAR(10) NOT NULL, user_id INT NOT NULL,
            expires INT NOT NULL)$tail",
        "CREATE TABLE IF NOT EXISTS events (event_id VARCHAR(64) PRIMARY KEY, student_id INT NOT NULL, type VARCHAR(32) NOT NULL,
            data TEXT NULL, ts_client BIGINT NULL, ts_server INT NOT NULL)$tail",
    ];
    foreach ($q as $sql) db()->exec($sql);
}

/* ---------- HTTP ---------- */

function out(int $status, array $body): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($body, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(int $status, string $code, string $message): never { out($status, ['error' => $code, 'message' => $message]); }

function body(): array {
    $raw = file_get_contents('php://input') ?: '';
    if (strlen($raw) > MAX_STATE_BYTES + 200000) fail(413, 'too_large', 'Слишком большой запрос');
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}

/* ---------- Логины и пароли ---------- */

// «Ученик1», «  УЧЕНИК1 », «ученик 1» → «ученик1»; ё → е
function norm_login(string $s): string {
    $s = mb_strtolower(trim($s), 'UTF-8');
    $s = str_replace(['ё', ' '], ['е', ''], $s);
    return $s;
}

function norm_password(string $s): string { return str_replace('ё', 'е', mb_strtolower(trim($s), 'UTF-8')); }

// Простые и безобидные слова для паролей (Ф-02)
const WORDS = ['зоолог', 'компас', 'ракета', 'дельфин', 'радуга', 'глобус', 'кактус', 'маяк', 'пингвин', 'вулкан',
    'фонарь', 'жираф', 'облако', 'планета', 'тюльпан', 'самокат', 'карандаш', 'медуза', 'кенгуру', 'черника',
    'парус', 'енот', 'комета', 'бублик', 'панда', 'секвойя', 'коала', 'лимон', 'капибара', 'носорог',
    'гитара', 'батут', 'звезда', 'орбита', 'кристалл', 'тигренок', 'арбуз', 'барсук', 'фламинго', 'лабиринт',
    'горизонт', 'ромашка', 'хомяк', 'изумруд', 'спутник', 'мандарин', 'бегемот', 'колибри', 'телескоп', 'аквариум'];

function gen_password(array &$used): string {
    do { $p = WORDS[random_int(0, count(WORDS) - 1)] . str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT); }
    while (isset($used[$p]));
    $used[$p] = true;
    return $p;
}

/* ---------- Сессии ---------- */

function new_session(string $role, int $uid): string {
    $token = bin2hex(random_bytes(32));
    db()->prepare('DELETE FROM sessions WHERE expires < ?')->execute([time()]);
    db()->prepare('INSERT INTO sessions (token_hash, role, user_id, expires) VALUES (?, ?, ?, ?)')
        ->execute([hash('sha256', $token), $role, $uid, time() + SESSION_HOURS * 3600]);
    return $token;
}

function bearer(): string {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? $_SERVER['HTTP_X_VEKTOR_TOKEN'] ?? '';
    if (stripos($h, 'Bearer ') === 0) $h = substr($h, 7);
    return trim($h);
}

function auth(string $role): array {
    $t = bearer();
    if ($t === '') fail(401, 'no_session', 'Нужно войти');
    $st = db()->prepare('SELECT role, user_id, expires FROM sessions WHERE token_hash = ?');
    $st->execute([hash('sha256', $t)]);
    $s = $st->fetch();
    if (!$s || $s['expires'] < time()) fail(401, 'no_session', 'Сессия закончилась, войди заново');
    if ($s['role'] !== $role) fail(403, 'forbidden', 'Нет доступа');
    return ['uid' => (int) $s['user_id'], 'token_hash' => hash('sha256', $t)];
}

// Общая проверка пароля с блокировкой после 5 ошибок (Ф-03)
function check_login(string $table, ?array $row, string $password): void {
    $now = time();
    if (!$row) { usleep(300000); fail(401, 'bad_login', 'Неверный логин или пароль'); }
    if ($row['locked_until'] > $now) {
        $min = (int) ceil(($row['locked_until'] - $now) / 60);
        fail(429, 'locked', "Слишком много ошибок. Попробуй через $min мин. или попроси учителя сбросить пароль");
    }
    if (!password_verify($password, $row['pass_hash'])) {
        $fails = $row['fails'] + 1;
        $lock = $fails >= MAX_FAILS ? $now + LOCK_SECONDS : 0;
        db()->prepare("UPDATE $table SET fails = ?, locked_until = ? WHERE id = ?")
            ->execute([$lock ? 0 : $fails, $lock, $row['id']]);
        fail(401, 'bad_login', 'Неверный логин или пароль');
    }
    db()->prepare("UPDATE $table SET fails = 0, locked_until = 0 WHERE id = ?")->execute([$row['id']]);
}
