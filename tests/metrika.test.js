// Метрика (блокер 4): Вебвизор выключен, карта кликов — только на лендинге и в демо, секреты не попадают в адрес.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../content/metrika.js', 'utf8');

function run(href, session, referrer = '') {
  const calls = [], listeners = {};
  const u = new URL(href);
  const store = { 'vektor-session': session ? JSON.stringify(session) : null };
  const ctx = {
    URL, JSON, console,
    location: { href, protocol: u.protocol, hostname: u.hostname, pathname: u.pathname, origin: u.origin, hash: u.hash },
    navigator: { webdriver: false }, localStorage: { getItem: k => store[k] ?? null },
    document: { referrer, readyState: 'complete', createElement: () => ({}), head: { appendChild() {} }, documentElement: {}, querySelectorAll: () => [], addEventListener() {} },
    addEventListener: (t, f) => { listeners[t] = f; }, MutationObserver: function () { this.observe = () => {}; },
  };
  ctx.window = ctx; ctx.window.VEKTOR_CONFIG = { metrikaId: '123' };
  ctx.ym = (...a) => calls.push(a);
  vm.runInNewContext(src, ctx);
  return { calls, ctx, listeners };
}
const init = r => r.calls.find(c => c[1] === 'init')[2];

// лендинг: карта кликов есть, Вебвизора нет
let r = run('https://vektorstudy.ru/', null);
assert.strictEqual(init(r).webvisor, false); assert.strictEqual(init(r).clickmap, true); assert.strictEqual(init(r).trackHash, false);
// вход по QR: ключ не уходит
r = run('https://vektorstudy.ru/#k=0123456789abcdef0123456789abcdef', null);
assert.strictEqual(init(r).url, 'https://vektorstudy.ru/');
// токен почты/сброса и параметры — тоже
r = run('https://vektorstudy.ru/parent.html?student=1#student_reset=secret-token', null, 'https://vektorstudy.ru/report.html?t=abc#x=1');
assert.strictEqual(init(r).url, 'https://vektorstudy.ru/parent.html');
assert.strictEqual(init(r).referrer, 'https://vektorstudy.ru/report.html');
assert.strictEqual(init(r).clickmap, false, 'кабинеты — без карты кликов');
// ученик (не демо) на главной: без карты кликов
r = run('https://vektorstudy.ru/#home', { login: '5а-7' });
assert.strictEqual(init(r).clickmap, false); assert.strictEqual(init(r).url, 'https://vektorstudy.ru/#home');
// демо-ученик: можно
r = run('https://vektorstudy.ru/#home', { login: 'демо3' });
assert.strictEqual(init(r).clickmap, true);
// учитель
r = run('https://vektorstudy.ru/teacher.html', null);
assert.strictEqual(init(r).clickmap, false); assert.strictEqual(init(r).webvisor, false);
// переходы по экранам: чистый маршрут уходит, секретный хеш — нет
r = run('https://vektorstudy.ru/#home', { login: '5а-7' });
r.ctx.location.href = 'https://vektorstudy.ru/#lesson/12/check'; r.listeners.hashchange();
r.ctx.location.href = 'https://vektorstudy.ru/#k=0123456789abcdef0123456789abcdef'; r.listeners.hashchange();
const hits = r.calls.filter(c => c[1] === 'hit').map(c => c[2]);
assert.deepStrictEqual(hits, ['https://vektorstudy.ru/#lesson/12/check', 'https://vektorstudy.ru/']);
// цели: текст ответа и имя не проходят
r = run('https://vektorstudy.ru/#home', { login: '5а-7' });
r.ctx.VEKTOR_METRIKA.goal('answer', { topic: 'reduce', answer: '3/4', name: 'Маша', text: 'привет', ok: true });
const g = r.calls.find(c => c[1] === 'reachGoal');
assert.deepStrictEqual(JSON.parse(JSON.stringify(g[3])), { topic: 'reduce', ok: true });
console.log('metrika: OK');
