<?php
// Создать профили учеников и бумажки для печати (Ф-02, Ф-04). Только из командной строки.
//
//   php api/tools/seed.php --count=80 --site=https://vektor.example.ru
//   php api/tools/seed.php --count=80 --classes="5А:1-28,5Б:29-56,5В:57-80"
//   php api/tools/seed.php --teacher=uchitel --teacher-name="Мария Ивановна" --teacher-classes="5А,5Б"
//   php api/tools/seed.php --admin=admin
//   php api/tools/seed.php --reset=ученик17          — новый пароль одному ученику (Ф-06)
//
// Пароли видны только в момент создания: в базе хранится хеш. Файлы со списком — в api/tools/out/
// (каталог закрыт от браузера и не попадает в git). Распечатайте slips.html и удалите файлы с сервера.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__ . '/../lib.php';

$o = getopt('', ['count:', 'site:', 'classes:', 'teacher:', 'teacher-name:', 'teacher-classes:', 'admin:', 'reset:']);
migrate();
$outDir = __DIR__ . '/out';
@mkdir($outDir, 0700, true);
$site = rtrim($o['site'] ?? '', '/');

function class_id(string $name, string $grp = 'pilot'): int {
    $st = db()->prepare('SELECT id FROM classes WHERE name = ?');
    $st->execute([$name]);
    if ($id = $st->fetchColumn()) return (int) $id;
    db()->prepare('INSERT INTO classes (name, grp) VALUES (?, ?)')->execute([$name, $grp]);
    return (int) db()->lastInsertId();
}

function teacher_password(): string { $u = []; return gen_password($u) . '-' . bin2hex(random_bytes(2)); }

$created = [];

if (isset($o['count'])) {
    $n = max(1, min(500, (int) $o['count']));
    $used = [];
    $ins = db()->prepare('INSERT INTO students (login, pass_hash) VALUES (?, ?)');
    for ($k = 1; $k <= $n; $k++) {
        $login = "ученик$k";
        $st = db()->prepare('SELECT 1 FROM students WHERE login = ?');
        $st->execute([$login]);
        if ($st->fetchColumn()) continue; // уже есть — пароль не трогаем
        $p = gen_password($used);
        $ins->execute([$login, password_hash($p, PASSWORD_DEFAULT)]);
        $created[] = [$login, $p, ''];
    }
    echo 'Создано профилей: ' . count($created) . " (уже были: " . ($n - count($created)) . ")\n";
}

if (isset($o['classes'])) {
    foreach (explode(',', $o['classes']) as $part) {
        if (!preg_match('/^\s*(.+?):(\d+)-(\d+)\s*$/u', $part, $mm)) { fwrite(STDERR, "Не понял «{$part}»\n"); exit(1); }
        $cid = class_id($mm[1]);
        $up = db()->prepare('UPDATE students SET class_id = ? WHERE login = ?');
        for ($k = (int) $mm[2]; $k <= (int) $mm[3]; $k++) $up->execute([$cid, "ученик$k"]);
        echo "Класс {$mm[1]}: ученик{$mm[2]}…ученик{$mm[3]}\n";
    }
    foreach ($created as &$c) {
        $st = db()->prepare('SELECT c.name FROM students s JOIN classes c ON c.id = s.class_id WHERE s.login = ?');
        $st->execute([$c[0]]);
        $c[2] = (string) $st->fetchColumn();
    }
    unset($c);
}

if (isset($o['reset'])) {
    $login = norm_login($o['reset']);
    $used = [];
    $p = gen_password($used);
    $st = db()->prepare('UPDATE students SET pass_hash = ?, fails = 0, locked_until = 0 WHERE login = ?');
    $st->execute([password_hash($p, PASSWORD_DEFAULT), $login]);
    if (!$st->rowCount()) { fwrite(STDERR, "Нет ученика $login\n"); exit(1); }
    db()->prepare("DELETE FROM sessions WHERE role = 'student' AND user_id = (SELECT id FROM students WHERE login = ?)")->execute([$login]);
    echo "Новый пароль $login: $p (прогресс сохранён)\n";
    $created[] = [$login, $p, ''];
}

foreach (['teacher' => 0, 'admin' => 1] as $key => $isAdmin) {
    if (!isset($o[$key])) continue;
    $login = mb_strtolower(trim($o[$key]));
    $p = teacher_password();
    $ids = [];
    foreach (array_filter(array_map('trim', explode(',', $o['teacher-classes'] ?? ''))) as $cn) $ids[] = class_id($cn);
    $st = db()->prepare('SELECT id FROM teachers WHERE login = ?');
    $st->execute([$login]);
    if ($id = $st->fetchColumn()) {
        db()->prepare('UPDATE teachers SET pass_hash = ?, name = ?, class_ids = ?, is_admin = ?, fails = 0, locked_until = 0 WHERE id = ?')
            ->execute([password_hash($p, PASSWORD_DEFAULT), $o['teacher-name'] ?? '', implode(',', $ids), $isAdmin, $id]);
    } else {
        db()->prepare('INSERT INTO teachers (login, pass_hash, name, class_ids, is_admin) VALUES (?, ?, ?, ?, ?)')
            ->execute([$login, password_hash($p, PASSWORD_DEFAULT), $o['teacher-name'] ?? '', implode(',', $ids), $isAdmin]);
    }
    echo ($isAdmin ? 'Администратор' : 'Учитель') . " $login, пароль: $p\n";
}

if (!$created) exit(0);

// CSV для учителя и лист бумажек: 12 на A4, линии отреза (Ф-04)
$stamp = date('Y-m-d_His');
$f = fopen("$outDir/logins_$stamp.csv", 'w');
fwrite($f, "\xEF\xBB\xBF"); // Excel откроет кириллицу без искажений
fputcsv($f, ['Логин', 'Пароль', 'Класс', 'Кому выдан (заполняет учитель)'], ';');
foreach ($created as $c) fputcsv($f, [$c[0], $c[1], $c[2], ''], ';');
fclose($f);

$h = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES);
$cards = '';
foreach ($created as $c) {
    $cards .= '<div class="card"><div class="brand">Вектор · математика</div>'
        . ($c[2] !== '' ? '<div class="cls">' . $h($c[2]) . '</div>' : '')
        . '<div class="row"><span>Логин</span><b>' . $h($c[0]) . '</b></div>'
        . '<div class="row"><span>Пароль</span><b>' . $h($c[1]) . '</b></div>'
        . ($site !== '' ? '<div class="site">' . $h($site) . '</div>' : '') . '</div>';
}
file_put_contents("$outDir/slips_$stamp.html", <<<HTML
<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Логины «Вектора»</title><style>
@page{size:A4;margin:8mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#000}
.grid{display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:calc((297mm - 16mm) / 6)}
.card{border:1px dashed #888;padding:6mm 7mm;display:flex;flex-direction:column;justify-content:center;gap:2.5mm;break-inside:avoid}
.brand{font-size:11pt;color:#444}.cls{font-size:11pt;font-weight:bold}
.row{display:flex;gap:4mm;align-items:baseline}.row span{width:20mm;font-size:12pt;color:#444}.row b{font-size:20pt;letter-spacing:.5px}
.site{font-size:11pt;color:#444}
</style></head><body><div class="grid">$cards</div></body></html>
HTML);
echo "Файлы для печати: $outDir/slips_$stamp.html и logins_$stamp.csv\n";
