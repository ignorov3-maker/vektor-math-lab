<?php
// API «Вектора»: вход по готовым логинам, прогресс на сервере, журнал событий, кабинет учителя.
// Вызов: /api/?r=<действие>, тело — JSON, сессия — заголовок Authorization: Bearer <токен>.
declare(strict_types=1);
require __DIR__ . '/lib.php';

try {
    migrate();
    $r = $_GET['r'] ?? '';
    $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($m !== 'GET' && $m !== 'POST') fail(405, 'method', 'Только GET и POST');

    switch ($r) {
        case 'ping':
            out(200, ['ok' => true]);

        /* ---------- Ученик ---------- */
        case 'login': {
            if ($m !== 'POST') fail(405, 'method', 'Нужен POST');
            $b = body();
            $login = norm_login((string) ($b['login'] ?? ''));
            if ($login === '' || preg_match('/[a-z]/', $login)) fail(400, 'layout', 'Логин пишется русскими буквами — смени язык клавиатуры');
            $st = db()->prepare('SELECT * FROM students WHERE login = ?');
            $st->execute([$login]);
            $row = $st->fetch() ?: null;
            check_login('students', $row, norm_password((string) ($b['password'] ?? '')));
            db()->prepare('UPDATE students SET last_seen = ? WHERE id = ?')->execute([time(), $row['id']]);
            out(200, [
                'token' => new_session('student', (int) $row['id']),
                'login' => $row['login'], 'label' => $row['label'],
                'state' => $row['state'] ? json_decode($row['state'], true) : null,
                'rev' => (int) $row['state_rev'],
            ]);
        }

        case 'logout': {
            $t = bearer();
            if ($t !== '') db()->prepare('DELETE FROM sessions WHERE token_hash = ?')->execute([hash('sha256', $t)]);
            out(200, ['ok' => true]);
        }

        case 'state': {
            $a = auth('student');
            $st = db()->prepare('SELECT login, label, state, state_rev FROM students WHERE id = ?');
            $st->execute([$a['uid']]);
            $row = $st->fetch();
            out(200, ['login' => $row['login'], 'label' => $row['label'],
                'state' => $row['state'] ? json_decode($row['state'], true) : null, 'rev' => (int) $row['state_rev']]);
        }

        // Сохранить прогресс и принять события. Повтор того же event_id дубля не создаёт (Ф-09).
        case 'sync': {
            if ($m !== 'POST') fail(405, 'method', 'Нужен POST');
            $a = auth('student');
            $b = body();
            $rev = null;
            if (isset($b['state']) && is_array($b['state'])) {
                $json = json_encode($b['state'], JSON_UNESCAPED_UNICODE);
                if (strlen($json) > MAX_STATE_BYTES) fail(413, 'too_large', 'Прогресс слишком большой');
                db()->prepare('UPDATE students SET state = ?, state_rev = state_rev + 1, last_seen = ? WHERE id = ?')
                    ->execute([$json, time(), $a['uid']]);
                $st = db()->prepare('SELECT state_rev FROM students WHERE id = ?');
                $st->execute([$a['uid']]);
                $rev = (int) $st->fetchColumn();
            }
            $events = is_array($b['events'] ?? null) ? array_slice($b['events'], 0, MAX_EVENTS_PER_CALL) : [];
            $ins = db()->prepare((is_mysql() ? 'INSERT IGNORE' : 'INSERT OR IGNORE') .
                ' INTO events (event_id, student_id, type, data, ts_client, ts_server) VALUES (?, ?, ?, ?, ?, ?)');
            $accepted = [];
            foreach ($events as $e) {
                $id = (string) ($e['id'] ?? '');
                $type = (string) ($e['type'] ?? '');
                if (!preg_match('/^[A-Za-z0-9_-]{8,64}$/', $id) || !preg_match('/^[a-z_]{2,32}$/', $type)) continue;
                $data = json_encode($e['data'] ?? null, JSON_UNESCAPED_UNICODE);
                if (strlen($data) > 4000) continue;
                $ins->execute([$id, $a['uid'], $type, $data, isset($e['ts']) ? (int) $e['ts'] : null, time()]);
                $accepted[] = $id; // и новые, и уже принятые ранее — клиент может их забыть
            }
            out(200, ['rev' => $rev, 'accepted' => $accepted]);
        }

        /* ---------- Учитель ---------- */
        case 'teacher_login': {
            if ($m !== 'POST') fail(405, 'method', 'Нужен POST');
            $b = body();
            $st = db()->prepare('SELECT * FROM teachers WHERE login = ?');
            $st->execute([mb_strtolower(trim((string) ($b['login'] ?? '')))]);
            $row = $st->fetch() ?: null;
            check_login('teachers', $row, (string) ($b['password'] ?? ''));
            out(200, ['token' => new_session('teacher', (int) $row['id']), 'name' => $row['name']]);
        }

        // Сводка по ученикам своих классов (зачаток кабинета, Ф-21, Ф-24)
        case 'teacher_class': {
            $a = auth('teacher');
            $st = db()->prepare('SELECT class_ids, is_admin FROM teachers WHERE id = ?');
            $st->execute([$a['uid']]);
            $t = $st->fetch();
            $ids = array_values(array_filter(array_map('intval', explode(',', $t['class_ids']))));
            if ($t['is_admin']) {
                $rows = db()->query('SELECT s.id, s.login, s.label, s.class_id, s.state, s.last_seen, c.name AS class_name
                    FROM students s LEFT JOIN classes c ON c.id = s.class_id ORDER BY s.id')->fetchAll();
            } elseif ($ids) {
                $in = implode(',', array_fill(0, count($ids), '?'));
                $st = db()->prepare("SELECT s.id, s.login, s.label, s.class_id, s.state, s.last_seen, c.name AS class_name
                    FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.class_id IN ($in) ORDER BY s.id");
                $st->execute($ids);
                $rows = $st->fetchAll();
            } else $rows = [];
            $list = array_map(function ($r) {
                $s = $r['state'] ? json_decode($r['state'], true) : [];
                $meta = is_array($s['meta'] ?? null) ? $s['meta'] : [];
                return [
                    'login' => $r['login'], 'label' => $r['label'], 'class' => $r['class_name'],
                    'last_seen' => (int) $r['last_seen'],
                    'progress' => is_array($s['progress'] ?? null) ? $s['progress'] : new stdClass(),
                    'mastered' => count(array_filter($meta, fn($m) => !empty($m['mastered']))),
                    'failed_checks' => array_sum(array_map(fn($m) => (int) ($m['failedChecks'] ?? 0), $meta)),
                    'answers' => (int) ($s['answers'] ?? 0),
                    'stars' => (int) ($s['game']['stars'] ?? 0),
                ];
            }, $rows);
            out(200, ['students' => $list]);
        }

        default:
            fail(404, 'unknown', 'Нет такого действия');
    }
} catch (Throwable $e) {
    error_log('vektor api: ' . $e->getMessage());
    fail(500, 'server', 'Ошибка сервера, попробуй ещё раз');
}
