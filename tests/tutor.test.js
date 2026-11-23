// Запуск: node tests/tutor.test.js — проверка отрисовки ответов наставника, тегов картинок и адаптивного темпа
globalThis.window = globalThis;
globalThis.localStorage = { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); } };
require('../content/check.js'); require('../content/visuals.js'); require('../content/fractions.js'); require('../content/adaptive.js'); require('../content/tutor.js');
require('../content/tutor-visuals.js'); require('../content/tutor-constructor.js'); require('../content/tutor-visual-art.js');
const T = window.VEKTOR_TUTOR, V = window.VEKTOR_VISUALS, A = window.VEKTOR_ADAPTIVE;
let fails = 0; const ok = (c, msg) => { if (!c) { fails++; console.log('FAIL', msg); } };

// теги картинок
ok(V.figureFromTag('полоска 3/5')?.type === 'bar', 'bar tag');
ok(V.figureFromTag('Круг 3/8')?.parts === 8, 'circle tag');
ok(V.figureFromTag('сравнить 1/3 1/5')?.type === 'pair', 'pair tag');
ok(V.figureFromTag('прямоугольник 2/3 3/4')?.rows === 3, 'grid tag');
ok(V.figureFromTag('смешанное 2 1/3')?.whole === 2, 'mixed tag');
ok(V.figureFromTag('прямая 7/4')?.type === 'line', 'line >1');
{ const g = V.figureFromTag('полоска 9/5'); ok(g && g.type === 'mixed' && g.whole === 1 && g.n === 4 && g.d === 5, 'дробь больше единицы на полоске → смешанное число'); }
{ const g = V.figureFromTag('пицца 7/5'); ok(g && g.type === 'mixed' && g.whole === 1 && g.n === 2, 'пицца 7/5 → 1 целая и 2/5 (раньше пропадала)'); }
ok(V.figureFromTag('пицца 300/2') === null, 'слишком много целых — не рисуем');
ok(V.figureFromTag('круг 1/500') === null, 'reject huge denominator');
ok(V.figureFromTag('<script>') === null, 'reject junk');

// отрисовка ответа
let r = T.render('Смотри: 3/5 — это три пятых.\n[[полоска 3/5]]\n**Правило:** числители складываем.');
ok(r.html.includes('class="frac"') && r.html.includes('<svg') && r.html.includes('<b>Правило:</b>'), 'render basics');
r = T.render('<img src=x onerror=alert(1)> [[готово]]');
ok(!r.html.includes('<img') && r.done, 'escape html + done tag');
r = T.render('Ответ \\frac{2}{3} и $1/2$');
ok(!r.html.includes('frac{') && !r.html.includes('$'), 'latex cleanup');
r = T.render('Сейчас нарисую [[поло', { streaming: true });
ok(!r.html.includes('[['), 'partial tag hidden while streaming');

// картинка совпадает с текстом
r = T.render('Слева пицца разделена на 8 частей, закрашены 4 — это 4/8. Справа 1/2.\n[[круг 3/8]]\nЗначит, 4/8 и 1/2 — одно и то же.');
ok(r.html.includes('Две полоски: 4 из 8 и 1 из 2') && !r.html.includes('Круг из 8'), 'mismatched tag → pair from text');
r = T.render('Закрашено 3 из 5, то есть 3/5.\n[[круг 3/8]]');
ok(r.html.includes('Круг из 5 частей'), 'mismatched single → same type, numbers from text');
r = T.render('Посмотри на картинку.\n[[полоска 2/7]]');
ok(r.html.includes('Полоска из 7'), 'no fractions in text → keep tag');
r = T.render('Это 2/3.\n[[полоска 2/3]]\n[[круг 2/3]]');
ok((r.html.match(/<svg/g) || []).length === 1, 'only one picture per message');
r = T.render('Вот две одинаковые пиццы. Первую разрезали на 4 куска, ты взял 2. Вторую — на 8, ты взял 4.\n[[пицца 2/4]]\nДроби 2/4 и 4/8 равны.');
ok((r.html.match(/<svg/g) || []).length === 1 && r.html.includes('4 кусков, есть 2') && r.html.includes('8 кусков, есть 4'), 'две пиццы в тексте → две пиццы на картинке');
r = T.render('Ты съел 3/8 шоколадки.\n[[шоколадка съел 3/8]]');
ok(r.html.includes('5 на месте'), 'съел 3/8 → 5 долек на месте, 3 зачёркнуты');
r = T.render('Сравни 2/3 и 4/6.\n[[шоколадка 2/3 4/6]]');
ok(r.html.includes('Две одинаковые шоколадки'), 'две шоколадки тегом');
r = T.render('пицца 2 1/3\nНа картинке 2 целые пиццы и ещё 1/3.');
ok((r.html.match(/<svg/g) || []).length === 1 && !r.html.includes('пицца 2'), 'тег без скобок отдельной строкой → картинка');
r = T.render('Возьми пицца 3/8 и посмотри.');
ok(!r.html.includes('<svg'), 'слово «пицца» внутри фразы — не картинка');
ok(!T.systemPrompt({ topic: window.VEKTOR_FRACTIONS.topics[0], mode: 'lesson' }).includes('[[круг 3/8]]'), 'prompt has no copyable concrete tag');

// промпт
const topic = window.VEKTOR_FRACTIONS.topics[3];
const task = topic.generate(1);
const sp = T.systemPrompt({ topic, mode: 'task', task, attempts: ['5/12'], pace: 'slow', style: 'visual', name: 'Саша' });
ok(sp.includes(task.answer) && sp.includes('НЕ называй') && !sp.includes('<span'), 'task prompt has hidden answer, no html');
ok(T.systemPrompt({ topic, mode: 'lesson' }).includes('[[готово]]'), 'lesson prompt plan');

// офлайн-урок
const beats = T.lessonBeats(topic, () => topic.generate(1));
ok(beats.some(b => b.task) && beats.at(-1).done, 'lesson beats');
ok(T.localAnswer(topic, 'скажи ответ', task, 0).usedHint, 'local answer gives hint not answer');

// адаптивность
const m = {}; let ev = [];
for (let k = 0; k < 2; k++) ev = ev.concat(A.afterAttempt(m, { solved: true, firstTry: true, hints: 0, sec: 20 }, 'normal'));
ok(m.level === 3 && ev.some(e => e.type === 'level-up'), 'level up after 2 clean fast');
ev = []; for (let k = 0; k < 2; k++) ev = ev.concat(A.afterAttempt(m, { solved: false, firstTry: false, hints: 1, sec: 0, mistake: 'add-denominators' }, 'normal'));
ok(m.level === 2 && ev.some(e => e.type === 'level-down') && ev.some(e => e.type === 'same-mistake'), 'level down + same mistake');
ok(A.pace(Array(10).fill({ firstTry: true, hints: 0, sec: 20 })) === 'fast', 'pace fast');
ok(A.pace(Array(10).fill({ firstTry: false, hints: 1, sec: 90 })) === 'slow', 'pace slow');
ok(A.pace([{ firstTry: true, hints: 0, sec: 20 }]) === 'normal', 'pace default with little data');
ok(A.need('slow') > A.need('normal') && A.need('normal') > A.need('fast'), 'need by pace');

// обрыв по лимиту длины не оставляет «дроб…»
globalThis.location = { origin: 'https://example.github.io' };
const sseBody = parts => parts.map(p => 'data: ' + JSON.stringify(p) + '\n\n').join('') + 'data: [DONE]\n\n';
(async () => {
  globalThis.fetch = async () => new Response(sseBody([
    { choices: [{ delta: { content: 'Сложим дроби. Числители складываем, а знаменатель остаётся. Получится дроб' } }] },
    { choices: [{ delta: {}, finish_reason: 'length' }] }]), { status: 200 });
  let fin = null;
  const testKey = ['sk', 'or', 'v1', 'x'].join('-');
  const txt = await T.stream({ mode: 'key', key: testKey, model: 'm' }, [], () => {}, { onFinish: r => fin = r });
  ok(fin === 'length' && !/дроб$/.test(txt) && txt.endsWith('остаётся.'), 'обрыв по лимиту обрезается до конца предложения: ' + txt);
  globalThis.fetch = async () => new Response('data: ' + JSON.stringify({ choices: [{ delta: { content: 'При' } }] }) + '\n\ndata: ' + JSON.stringify({ choices: [{ delta: { content: 'вет! 3/5' } }] }) + '\n\ndata: [DONE]\n\n', { status: 200 });
  ok(await T.stream({ mode: 'key', key: testKey, model: 'm' }, [], () => {}) === 'Привет! 3/5', 'склейка кусков потока');
  ok(V.figureFromTag('дробь 2/7')?.type === 'bar' && V.figureFromTag('торт 3/8')?.type === 'cake' && V.figureFromTag('пицца 5/8')?.type === 'pizza', 'синонимы тегов');
  // сервер «Вектора»: в запросе нет модели, токенов и системного промпта — только тема, задача и реплики
  let sent = null; globalThis.window.VEKTOR_CONFIG = { supabaseUrl: 'https://db.example', supabaseKey: 'anon' };
  globalThis.fetch = async (u, o) => { sent = JSON.parse(o.body); return new Response('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Ок' } }] }) + '\n\ndata: [DONE]\n\n', { status: 200 }); };
  const topic = window.VEKTOR_FRACTIONS.topics[0], task = topic.generate(1);
  const pl = T.serverPayload({ topic, mode: 'task', task, attempts: ['1/2'], mistake: 'flipped', history: [{ role: 'system', content: 'x' }, { role: 'user', content: 'помоги' }] });
  await T.stream({ mode: 'vektor' }, [{ role: 'system', content: 'СЕКРЕТНЫЙ ПРОМПТ' }], () => {}, { maxTokens: 999, payload: pl });
  ok(sent && !('model' in sent) && !('max_tokens' in sent) && !('messages' in sent) && !('reasoning' in sent) && !JSON.stringify(sent).includes('СЕКРЕТНЫЙ ПРОМПТ'), 'сервер: в запросе нет модели, лимита токенов и промпта');
  ok(sent.topic === topic.id && sent.mode === 'task' && sent.history.length === 1 && sent.history[0].role === 'user' && sent.task.answer === task.answer, 'сервер: тема, задача и только реплики ученика/Бипыча');
  const catalog = window.VEKTOR_TUTOR_VISUALS.entries, artwork = new Set(), gradientIds = new Set();
  for (const entry of catalog) {
    const drawing = T.render(entry.tag, { topic: entry.topics[0] }).html.match(/<svg [^>]*>.*?<\/svg>/s);
    ok(drawing && !/NaN|Infinity|undefined/.test(drawing[0]), 'SVG для тега ' + entry.id);
    ok(T.render(entry.tag, { topic: 'unrelated-topic' }).html === '', 'тег другой темы: ' + entry.id);
    if (drawing) {
      const ids = [...drawing[0].matchAll(/<linearGradient id="([^"]+)"/g)].map(match => match[1]);
      for (const id of ids) {
        ok(!gradientIds.has(id), 'у градиента уникальный идентификатор ' + id);
        gradientIds.add(id);
      }
      for (const ref of drawing[0].matchAll(/url\(#([^)]+)\)/g)) ok(ids.includes(ref[1]), 'градиент входит в SVG ' + entry.id);
      artwork.add(drawing[0].replace(/<defs>.*?<\/defs>|<title>.*?<\/title>|<text[^>]*>.*?<\/text>| (?:aria-label|stroke|fill)="[^"]*"/gs, ''));
    }
  }
  ok(new Set(catalog.map(entry => entry.tag)).size === catalog.length, 'теги схем уникальны');
  ok(artwork.size >= 100, 'не менее 100 разных композиций SVG, кроме цвета и подписи: ' + artwork.size);
  ok(T.render('[[схема unknown-reference]]').html === '', 'неизвестный тег не отрисовывается');
  const constructor = window.VEKTOR_TUTOR_CONSTRUCTOR;
  for (const type of constructor.types) {
    const spec = constructor.compile(type.id+' '+type.example);
    const html = spec.tag && T.render(spec.tag).html;
    ok(spec.parts?.length === 1 && html.includes('<svg') && !/NaN|Infinity|undefined/.test(html), 'конструктор рисует ' + type.id);
  }
  const composite = constructor.compile('доли : "Две ленты" 3/8 5/8 | график 2:0 q:1:0:-2 h:4 @3:6:P | предметы яблоки 9/24');
  const assembled = T.render('Две ленты.\\n' + composite.tag).html;
  ok(composite.parts?.length === 3 && (assembled.match(/<svg /g)||[]).length === 1 &&
    assembled.includes('Две ленты') && assembled.includes('clipPath') && assembled.includes('9 из 24'),
    'цветной рисунок собирается из трёх частей в одном теге');
  const far = T.render('[[конструктор график 7:12 @24:180]]').html;
  ok(!far, 'не рисует точку за пределами допустимых значений');
  ok(T.render('[[конструктор график 7:12 @14:100]]').html.includes('100'), 'оси подстраиваются под точки и функции');
  ok(T.render('[[конструктор столбцы "А:0" "Б:0"]]').html.includes('<svg'), 'диаграмма с нулевыми данными');
  for (const spec of ['доли 10/2','прямая 0 2 3','предметы яблоки 1/0','таблица "А;Б" "1"',
    'угол 180','машины попутно -1 80 20','машины туда 50 70 120','угол 60 | доли 1/2 | круги 5 2 | сетка 5x6 3x3','сетка 5x4 6x2','график h:0','отрезок 0 5 -1 2',
    'доли : "<img src=x>" 1/3','ветви "А;Б "В;Г"']){
    ok(!!constructor.compile(spec).error && T.render('[[конструктор '+spec+']]').html === '', 'отказ на некорректных данных ' + spec);
  }
  ok(!T.render('[[конструктор '+ 'я'.repeat(350) +']]').html.includes('<svg'),'длинный тег не рисуется');
  for (const direction of ['навстречу','попутно','вразъезд']) {
    const driving = T.render('[[конструктор машины '+direction+' 47 83 126]]').html;
    ok(driving.includes('47 км/ч') && driving.includes('83 км/ч') && driving.includes('126 км'),
      'сцена движения рисует нестандартные скорости и расстояние '+direction);
  }
  ok(T.render('[[конструктор машины вразъезд 50 70 0]]').html.includes('Одна точка старта'),
    'сцена движения допускает старт из одной точки');

  console.log(fails ? `ошибок: ${fails}` : 'tutor tests: ok'); process.exit(fails ? 1 : 0);
})();
