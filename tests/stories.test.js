// Запуск: node tests/stories.test.js — задачи про интересы (CL-9)
globalThis.window = globalThis;
['check', 'visuals', 'fractions', 'stories'].forEach(f => require(`../content/${f}.js`));
const S = window.VEKTOR_STORIES, topics = window.VEKTOR_FRACTIONS.topics;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; if (fails < 30) console.log('FAIL', m); } };
const errs = S.check(); ok(!errs.length, 'банк: ' + errs.slice(0, 5).join('; '));
ok(S.INTERESTS.length === 12, '12 интересов');
const pl = (k, a, b, c) => (k % 10 === 1 && k % 100 !== 11 ? a : [2, 3, 4].includes(k % 10) && ![12, 13, 14].includes(k % 100) ? b : c);
const nums = html => (String(html).replace(/<span class="frac"><span>(\d+)<\/span><span>(\d+)<\/span><\/span>/g, ' $1/$2 ').replace(/<[^>]+>/g, '').match(/\d+(\/\d+)?/g) || []).sort();
let stories = 0, total = 0, foot = 0;
const { check, parse } = window.VEKTOR_CHECK;
for (let i = 0; i < 10000; i++) {
  const t = topics[i % topics.length], base = t.generate(1 + (i % 3));
  if (!base.p) continue;
  total++;
  const task = S.apply(base, ['football']);
  if (task === base) continue;
  stories++; foot++;
  const txt = task.story + ' ' + task.question;
  ok(!/undefined|NaN|\{/.test(txt), 'метка не заменена: ' + txt);
  ok(task.answer === base.answer && task.misc === base.misc && task.accept === base.accept, 'ответ и проверка не меняются');
  const p = base.p, want = (p.kind === 'left' || p.kind === 'shaded') ? [String(p.n), String(p.k)]
    : p.kind === 'part' ? [String(p.N), `${p.a}/${p.b}`] : p.kind === 'whole' ? [String(p.M), `${p.a}/${p.b}`] : [`${p.x[0]}/${p.x[1]}`, `${p.y[0]}/${p.y[1]}`];
  const got = nums(txt);
  ok(want.every(w => got.includes(w)) && got.length === want.length, `числа в тексте ≠ числам движка: ${got} vs ${want} — ${txt}`);
  const r = check(base.answer, task); ok(r.ok, 'свой ответ принимается');
}
ok(stories > total * 0.4 && stories < total * 0.6, `про интересы примерно половина: ${stories} из ${total}`);
// склонения: подставим «неудобные» числа
for (const n of [1, 2, 5, 11, 12, 21, 22, 25, 101, 111]) {
  const out = S.fill({ s: '{n} {n|удар|удара|ударов}', q: '?' }, { kind: 'left', n, k: 0 });
  ok(out.story === `${n} ${pl(n, 'удар', 'удара', 'ударов')}`, `склонение ${n}: ${out.story}`);
}
ok(S.apply({ p: { kind: 'left', n: 5, k: 2 }, story: 'x' }, []).story === 'x', 'без интересов — обычная задача');
ok(S.apply({ story: 'x' }, ['football'], () => 0).story === 'x', 'задача без чисел для сюжета — без изменений');
// сумма больше целого — только сюжеты про количества
for (let i = 0; i < 200; i++) {
  const t = S.apply({ p: { kind: 'sum', x: [2, 3], y: [3, 4] }, story: 's', question: 'q', answer: '17/12' }, ['football', 'cooking', 'music'], Math.random);
  if (t.interest) ok(['cooking', 'music'].includes(t.interest) || false, 'сумма > 1 — только «литры/часы»: ' + t.interest);
}
console.log(fails ? `stories: ${fails} FAIL` : `stories: OK (${stories} сюжетов на ${total} задач)`); process.exit(fails ? 1 : 0);
