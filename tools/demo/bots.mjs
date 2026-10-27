#!/usr/bin/env node
/* «Вектор»: живой демо-класс (CL-10). 25 ботов входят как ученики класса «Демо»,
   решают задачи через те же серверные функции, что и настоящие дети, делают типичные
   ошибки (Пульс оживает) и отвечают на «задачу от учителя» через 5–15 секунд.

   Запуск (Node 18+), сначала select vk_demo_seed('пароль') в Supabase:
     DEMO_PASSWORD=пароль node tools/demo/bots.mjs              # 30 минут, адрес и ключ — из config.js
     DEMO_PASSWORD=пароль node tools/demo/bots.mjs --minutes 5 --bots 25
     SB_URL=https://xxx.supabase.co SB_KEY=публичный-ключ DEMO_PASSWORD=… node tools/demo/bots.mjs
   --fast — всё в 10 раз быстрее (для автотеста). Ctrl+C — остановить. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const arg = (name, def) => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : def; };
const FAST = process.argv.includes('--fast');
const MINUTES = +arg('minutes', 30), BOTS = Math.min(25, +arg('bots', 25));
const PASSWORD = process.env.DEMO_PASSWORD;
let URL_ = process.env.SB_URL, KEY = process.env.SB_KEY;
if (!URL_ || !KEY) {
  const cfg = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../config.js'), 'utf8');
  URL_ = URL_ || (cfg.match(/supabaseUrl:\s*['"]([^'"]+)/) || [])[1];
  KEY = KEY || (cfg.match(/supabaseKey:\s*['"]([^'"]+)/) || [])[1];
}
if (!URL_ || !KEY || !PASSWORD) { console.error('Нужны DEMO_PASSWORD и адрес Supabase (config.js или SB_URL/SB_KEY)'); process.exit(1); }
URL_ = URL_.replace(/\/+$/, '');

const T = ms => (FAST ? ms / 10 : ms);
const sleep = ms => new Promise(r => setTimeout(r, T(ms)));
const rnd = (a, b) => a + Math.random() * (b - a);
const id = () => Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
async function rpc(fn, args) {
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY }, body: JSON.stringify(args) });
  const j = await r.json().catch(() => null);
  if (!r.ok || (j && j.error)) throw new Error(`${fn}: ${(j && (j.message || j.error)) || r.status}`);
  return j;
}

/* Сценарий класса как в разделе 10.1: шестеро складывают знаменатели, трое — прилипалы,
   двое — хвастуны знаменателем, остальные решают без жучков. */
const PLAN = k => (k <= 6 ? { bug: 'add-diff:add-denominators', topic: 'add-diff', skill: 0.55 }
  : k <= 9 ? { bug: 'mixed:add-whole-to-numerator', topic: 'mixed', skill: 0.6 }
  : k <= 11 ? { bug: 'compare:bigger-denominator-bigger', topic: 'compare', skill: 0.65 }
  : { bug: null, topic: ['concept', 'reduce', 'add-same', 'add-diff', 'mult'][k % 5], skill: k % 3 ? 0.9 : 0.75 });

const stop = Date.now() + T(MINUTES * 60000);
let alive = true; process.on('SIGINT', () => { alive = false; console.log('\nостанавливаем ботов…'); });
const stats = { attempts: 0, bugs: 0, pushes: 0, errors: 0 };

async function bot(k) {
  const login = 'демо' + k, plan = PLAN(k);
  let token;
  for (let t = 0; t < 3 && !token; t++) { try { token = (await rpc('vektor_login', { p_login: login, p_password: PASSWORD })).token; } catch (e) { stats.errors++; await sleep(2000); } }
  if (!token) { console.error(`${login}: не вошёл`); return; }
  const state = { meta: { [plan.topic]: { practice: 0, mastered: false } }, answers: 0, bugs: {}, settings: { grade: 5 } };
  const out = [];
  const ev = (type, data) => out.push({ id: id(), type, data, ts: Date.now() });
  const flush = async () => { const events = out.splice(0); try { await rpc('vektor_sync', { p_token: token, p_state: state, p_events: events }); } catch { stats.errors++; out.unshift(...events); } };
  await sleep(rnd(0, 8000)); // приходят в класс не одновременно
  let found = false, handled = new Set();
  while (alive && Date.now() < stop) {
    // задача от учителя — отвечаем через 5–15 секунд, как живой ребёнок
    try {
      const r = await rpc('vektor_push_get', { p_token: token });
      if (r && r.push && !handled.has(r.push.id)) {
        handled.add(r.push.id); await sleep(rnd(5000, 15000));
        const ok = Math.random() < (plan.bug === r.push.bug ? 0.75 : 0.95);
        ev('push_done', { push: r.push.id, ok }); stats.pushes++;
        if (ok && state.bugs[r.push.bug]) { state.bugs[r.push.bug].status = 'healing'; ev('bug_step', { bug: r.push.bug, step: 'twin', ok: true }); }
        await flush(); continue;
      }
    } catch { stats.errors++; }
    // обычная задача
    // «жучковые» боты ошибаются сразу — Пульс оживает в первую минуту демо
    const ok = plan.bug && !found ? false : Math.random() < plan.skill || (found && Math.random() < 0.5);
    const m = state.meta[plan.topic]; state.answers++;
    if (ok) m.practice++;
    ev('attempt', { topic: plan.topic, mode: 'practice', level: 2, ok, try: 1, hints: ok ? 0 : 1, sec: Math.round(rnd(20, 90)),
      mistake: !ok && plan.bug ? plan.bug.split(':')[1] : null });
    stats.attempts++;
    if (!ok && plan.bug && !found) {
      found = true; stats.bugs++;
      ev('draft', { topic: plan.topic, lines: 2, ok: false, step: 1 });
      ev('bug_found', { bug: plan.bug, topic: plan.topic, level: 2, step: 1 });
      state.bugs[plan.bug] = { topic: plan.topic, status: 'caught', found: new Date().toISOString().slice(0, 10), stage: 0, cycles: 0, conflict: 0 };
    }
    await flush();
    await sleep(rnd(6000, 15000));
  }
}

console.log(`Живой класс: ${BOTS} ботов, ${MINUTES} мин${FAST ? ' (ускорено)' : ''} → ${URL_}`);
const timer = setInterval(() => console.log(`задач ${stats.attempts} · жучков ${stats.bugs} · ответов учителю ${stats.pushes}${stats.errors ? ' · сбоев ' + stats.errors : ''}`), T(30000));
await Promise.all(Array.from({ length: BOTS }, (_, i) => bot(i + 1)));
clearInterval(timer);
console.log(`готово: задач ${stats.attempts}, жучков ${stats.bugs}, ответов учителю ${stats.pushes}`);
