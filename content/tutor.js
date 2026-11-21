/* =========================================================
   ИИ-наставник «Вектора».
   • Через OpenRouter (модели DeepSeek) — напрямую с ключом
     или через свой сервер-прокси (server/openrouter-worker.js).
   • Без подключения — офлайн-наставник по методичке.
   Верность ответов в задачах всегда проверяет код (check.js),
   наставник объясняет и задаёт наводящие вопросы.
   ========================================================= */
(function () {
  'use strict';

  const { f, figure, figureFromTag, describe } = window.VEKTOR_VISUALS;
  const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

  const MODELS = [
    { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek V4 Flash — быстрый и дешёвый (рекомендуем)' },
    { id: 'deepseek/deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash — новее, чуть дороже' },
    { id: 'deepseek/deepseek-v4-pro', name: 'DeepSeek V4 Pro — умнее, заметно дороже' },
    { id: '~deepseek/deepseek-flash-latest', name: 'DeepSeek Flash (всегда последняя версия)' },
  ];
  const DEFAULT_CFG = { mode: 'off', key: '', proxy: '', model: MODELS[0].id };

  /* ---------- Настройки подключения (хранятся только в этом браузере) ---------- */
  const CFG_KEY = 'vektor-ai';
  // Ученик вошёл через сервер «Вектора» — наставник идёт через серверную функцию, ключ там (этап 3)
  const serverAI = () => !!(window.VEKTOR_SYNC && window.VEKTOR_CONFIG && window.VEKTOR_CONFIG.supabaseUrl);
  function loadCfg() {
    let c; try { c = { ...DEFAULT_CFG, ...JSON.parse(localStorage.getItem(CFG_KEY) || '{}') }; } catch { c = { ...DEFAULT_CFG }; }
    if (serverAI()) c = { ...c, mode: 'vektor' };
    return c;
  }
  function saveCfg(c) { try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch {} }
  const ready = c => (c.mode === 'vektor' && serverAI()) || (c.mode === 'key' && /^sk-or-/.test(c.key.trim())) || (c.mode === 'proxy' && /^https:\/\//.test(c.proxy.trim()));

  /* ---------- HTML → обычный текст (для промпта) ---------- */
  function plain(html) {
    return String(html || '')
      .replace(/<span class="frac"><span>([^<]*)<\/span><span>([^<]*)<\/span><\/span>/g, '$1/$2')
      .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ---------- Системный промпт ---------- */
  const PACE_SAY = {
    fast: 'Ученик схватывает быстро: можно объединять шаги и давать задачи чуть сложнее.',
    normal: 'Ученик идёт в обычном темпе.',
    slow: 'Ученику нужно больше времени: объясняй очень просто, маленькими шагами, чаще хвали за усилия и используй картинки.',
  };
  const STYLE_SAY = {
    steps: 'Объясняй коротко и по шагам, но всегда на примере из жизни.',
    visual: 'Объясняй через наглядные примеры из жизни: почти в каждом объяснении показывай картинку настоящей вещи.',
  };

  function methodText(t) {
    const e = t.explain;
    return [
      `Тема: «${t.title}» (раздел «${t.strand && t.strand !== 'Дроби' ? t.strand : 'Обыкновенные дроби'}», ${(t.grade || 5) < 5 ? 'повторение начальной школы' : (t.grade || 5) + ' класс'}).`,
      `Цель: ${t.goal}`,
      `Наглядная модель: ${plain(e.model)}`,
      `Правило: ${plain(e.rule)}`,
      ...e.examples.map((x, k) => `Пример ${k + 1}: ${plain(x.q)} Решение: ${x.steps.map(plain).join(' ')}`),
      `Типичные ошибки: ${t.mistakes.map(m => `${m.title} — ${m.say}`).join('; ')}`,
    ].join('\n');
  }

  function systemPrompt({ topic, mode, task, attempts = [], mistake, pace = 'normal', style = 'steps', name }) {
    const common = `Ты — добрый и терпеливый наставник по математике в учебном приложении «Вектор». Твой ученик — школьник 5–6 класса (10–12 лет).

Как ты учишь (это главное):
- Один маленький шаг за сообщение: покажи первый шаг и попроси ученика сделать следующий самому.
- Начинай с маленьких чисел: сокращай по шагам — на 2, потом на 3, на 5, а не сразу на большое число. Общий знаменатель ищи перебором, без формул.
- Опирайся на то, что ученик написал: сначала скажи, что верно, потом покажи одну ошибку.
- «Не понял» — объясни по-другому и проще, не повторяй те же слова.
- Заканчивай коротким вопросом, на который можно ответить одним числом или словом.

Как ты пишешь:
- По-русски, просто и дружелюбно, на «ты». 2–4 коротких предложения в одном сообщении (не больше 70 слов), одна мысль за раз. Всегда заканчивай мысль — не обрывай слова и фразы.
- Опирайся только на методичку ниже. Не придумывай других правил и обозначений.
- Дроби пиши как 3/5. Никакого LaTeX, формул в долларах и таблиц.
- Не склеивай запись дроби с пояснением в одну строку (плохо: «Дробь a/b: b — на сколько частей…» — читается как одно выражение). Пиши каждую часть с новой строки, через «•»:
  Дробь 3/5 — «три пятых».
  • 5 — знаменатель (нижнее число): на сколько равных частей разделили целое.
  • 3 — числитель (верхнее число): сколько частей взяли.
- Буквы (a/b) можно, но после общего правила всегда дай пример на числах.
- Деление пиши знаком «:», умножение — «·».
- Картинку можно вставить тегом на отдельной строке (вместо a/b подставь СВОИ числа — те же, что в тексте сообщения):
  [[подпиши a/b]] — дробь с подписями «числитель» и «знаменатель»;
  [[пицца a/b]], [[торт a/b]] или [[шоколадка a/b]] — настоящая вещь: b равных кусков (долек), на месте a. Бери их в первую очередь — ребёнку нужна живая картинка, а не схема;
  [[полоска a/b]] или [[круг a/b]] — схема, только если вещь не подходит;
  [[прямая a/b]] — точка на числовой прямой;
  [[сравнить a/b c/d]] — ДВЕ полоски одна под другой (для сравнения и равных дробей);
  [[прямоугольник a/b c/d]] — для умножения a/b · c/d;
  [[смешанное n a/b]] — n целых кругов и ещё a/b;
  [[шоколадка съел a/b]] — съели a из b, съеденные дольки пустые; [[пицца a/b c/d]] — две пиццы рядом (говоришь про две вещи — рисуй обе).
- Не больше одной картинки в сообщении, знаменатель не больше 12. Описывай ровно то, что на картинке: если нужны две дроби — бери [[сравнить …]] и пиши «верхняя полоска… нижняя полоска…»; не пиши «слева/справа» и не придумывай фигур, которых нет.
- Не проси и не запоминай личные данные (адрес, школу, телефон, фото).
- Если вопрос не про учёбу — коротко и по-доброму верни к теме. Если ученик пишет, что ему плохо, страшно или его обижают, мягко посоветуй рассказать об этом взрослому, которому он доверяет, и не продолжай эту тему сам.
- ${PACE_SAY[pace] || PACE_SAY.normal} ${STYLE_SAY[style] || STYLE_SAY.steps}

Методичка темы:
${methodText(topic)}`;

    if (mode === 'lesson') {
      return `${common}

Сейчас идёт урок по этой теме. Урок ведёт приложение: шаги, картинки и вопросы ты видишь в истории как свои сообщения. Ученик сам написал тебе или нажал кнопку («не понял», «покажи на картинке», «ещё пример»).
- Ответь именно на это: проще, чем в уроке, на примере из жизни (пицца, торт, шоколадка, ребята в классе) и с картинкой-тегом настоящей вещи.
- Если просит ещё пример — дай пример и спроси ответ, но не решай его за ученика.
- Не начинай урок заново, не пересказывай следующие шаги и не ставь тег [[готово]].
- Закончи предложением нажать «Дальше», когда станет понятно.`;
    }
    const tries = attempts.length ? `Ответы ученика на эту задачу: ${attempts.map(a => `«${a}»`).join(', ')}.` : 'Ученик ещё не отвечал.';
    return `${common}

Сейчас ученик решает задачу в тренировке:
${plain(task.story)} ${plain(task.question)}
${task.figure ? 'Описание рисунка: ' + window.VEKTOR_VISUALS.describe(task.figure) : ''}
Правильный ответ (ученику его НЕ называй): ${task.answer}. Решение: ${plain(task.solution)}
${tries}${mistake ? ` Похоже на типичную ошибку: ${mistake.title}.` : ''}

Помогай наводящими вопросами и подсказками, не называй готовый ответ. Если ученик уже дважды просил ответ и пробовал решить — покажи решение по шагам. Ответ ученика проверяет приложение, поэтому не говори «верно» или «неверно» про ответы, которые он не прислал тебе в чат.`;
  }

  /* ---------- Запрос к OpenRouter со стримингом ---------- */
  class TutorError extends Error {}
  function errorFor(status, body) {
    if (status === 401) return 'Ключ OpenRouter не подошёл. Проверь его в настройках.';
    if (status === 402) return 'На счёте OpenRouter закончились средства. Пополни баланс или подними лимит ключа.';
    if (status === 403) return 'Запрос отклонён: модель недоступна для этого ключа или сработала модерация.';
    if (status === 404) return 'Модель не найдена. Выбери другую модель в настройках.';
    if (status === 429) return 'Слишком много запросов. Подожди минуту и спроси ещё раз.';
    if (status >= 500) return 'Сервер ИИ сейчас не отвечает. Попробуй чуть позже.';
    return `Ошибка подключения (${status}). ${body ? String(body).slice(0, 120) : ''}`;
  }

  // payload — запрос к серверу «Вектора»: только режим, тема, данные задачи и реплики. Промпт, модель и лимиты сервер берёт сам.
  async function stream(cfg, messages, onText, { maxTokens = 600, signal, onFinish, mode, data, payload } = {}) {
    const own = cfg.mode === 'vektor', proxy = cfg.mode === 'proxy';
    const SBC = window.VEKTOR_CONFIG || {};
    const url = own ? SBC.supabaseUrl.replace(/\/+$/, '') + '/functions/v1/tutor' : proxy ? cfg.proxy.trim() : OPENROUTER_URL;
    const headers = { 'Content-Type': 'application/json' };
    let token = '';
    if (own) {
      headers.apikey = SBC.supabaseKey; headers.Authorization = 'Bearer ' + SBC.supabaseKey;
      try { token = (JSON.parse(localStorage.getItem('vektor-session')) || {}).token || ''; } catch {}
    } else if (!proxy) {
      headers.Authorization = `Bearer ${cfg.key.trim()}`;
      headers['HTTP-Referer'] = location.origin && location.origin !== 'null' ? location.origin : 'https://github.com/ignorov3-maker/vektor-math-lab';
      headers['X-OpenRouter-Title'] = 'Vektor';
    }
    // Рассуждения модели выключаем: наставнику нужен быстрый короткий ответ.
    // Если модель не умеет выключать рассуждения (400), повторяем запрос без этого параметра.
    const send = async withReasoningOff => {
      // сервер «Вектора»: никаких модели, токенов и системного промпта в запросе
      if (own) return fetchOrFail({ token, ...(mode ? { mode, data } : payload) });
      const body = { model: cfg.model || DEFAULT_CFG.model, messages, stream: true, max_tokens: withReasoningOff ? maxTokens : maxTokens + 600, temperature: 0.4 };
      if (withReasoningOff) body.reasoning = { enabled: false }; else body.reasoning = { exclude: true };
      return fetchOrFail(body);
    };
    const fetchOrFail = async body => {
      try { return await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal }); }
      catch (e) { if (e.name === 'AbortError') throw e; throw new TutorError('Нет связи с сервером ИИ. Мешать может слабый интернет, VPN или блокировщик рекламы.'); }
    };
    let res = await send(true);
    if (res.status === 400 && !own) {
      let msg = ''; try { msg = (await res.clone().json()).error?.message || ''; } catch {}
      if (/reason|think/i.test(msg)) res = await send(false);
    }
    if (!res.ok) {
      let t = ''; try { t = (await res.json()).error?.message || ''; } catch {}
      const err = new TutorError(own && t && res.status !== 402 ? t : errorFor(res.status, t));
      // П-03: на сервере «Вектора» ИИ выключен или нет ключа — тихо работаем по конспекту, без сообщений об ошибке
      if (own && (res.status === 503 || res.status === 402)) err.quiet = true;
      // сессия закончилась (вошли с другого устройства и сменили пароль, учитель или родитель выдал новый) — говорим прямо
      if (own && res.status === 401) { err.session = true; err.message = 'Ты вошёл в «Вектор» на другом устройстве или сменил пароль — войди здесь снова, и я отвечу.'; }
      throw err;
    }
    if (!res.body) throw new TutorError('Браузер не поддерживает потоковые ответы.');

    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '', text = '', finish = null;
    const handle = line => {
      line = line.trim();
      if (!line.startsWith('data:')) return false; // комментарии вида ": OPENROUTER PROCESSING"
      const data = line.slice(5).trim();
      if (data === '[DONE]') return true;
      let obj; try { obj = JSON.parse(data); } catch { return false; }
      // ошибка посреди потока приходит со статусом 200 и полем error
      if (obj.error) throw new TutorError(errorFor(Number(obj.error.code) || 500, obj.error.message));
      const ch = obj.choices?.[0], piece = ch?.delta?.content;
      if (ch?.finish_reason) finish = ch.finish_reason;
      if (piece) { text += piece; onText(text); }
      return false;
    };
    let finished = false;
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) { if (buf) handle(buf); break; }
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
        if (handle(line)) { finished = true; break; }
      }
    }
    if (finished) { try { reader.cancel(); } catch {} }
    if (!text.trim()) throw new TutorError('Наставник прислал пустой ответ. Попробуй спросить ещё раз или выбери другую модель в настройках.');
    // ответ упёрся в лимит длины — обрезаем до конца последнего предложения, чтобы не было «дроб…»
    if (finish === 'length') {
      const cut = Math.max(text.lastIndexOf('. '), text.lastIndexOf('! '), text.lastIndexOf('? '), text.lastIndexOf('\n'), text.lastIndexOf('.'), text.lastIndexOf('?'), text.lastIndexOf('!'));
      if (cut > text.length * 0.4) text = text.slice(0, cut + 1).trimEnd();
      else text = text.replace(/\s+\S*$/, '') + '…';
      text = text.replace(/\[\[[^\]]*$/, '');
    }
    if (onFinish) onFinish(finish);
    return text;
  }

  async function testConnection(cfg) {
    const t = await stream(cfg, [{ role: 'user', content: 'Ответь одним словом: готово' }], () => {}, { maxTokens: 20 });
    return t.trim();
  }

  /* ---------- Отрисовка ответа наставника ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^\d/])(\d{1,3})\s*\/\s*(\d{1,3})(?![\d/])/g, (m, pre, a, b) => `${pre}${f(a, b)}`);
  }
  // Картинка не должна спорить с текстом: числа в теге сверяем с дробями из сообщения
  const figFracs = g => ({ pizza: [[g.have, g.parts]], cake: [[g.have, g.parts]], choco: [[g.have, g.parts]], labeled: [[g.n, g.d]], line: [[g.n, g.d]], bar: [[g.shaded, g.parts]], circle: [[g.shaded, g.parts]], pair: [g.a, g.b], grid: [[g.r, g.rows], [g.c, g.cols]], mixed: [[g.n, g.d]], pizzas: (g.items || []).map(x => [x.have, x.parts]), chocopair: [g.a, g.b] }[g.type] || []);
  function reconcile(fig, said) {
    if (!said.length) return fig; // в тексте дробей нет — сверять не с чем
    const has = ([n, d]) => said.some(([a, b]) => a === n && b === d);
    if (figFracs(fig).every(has)) return fig;
    // «съел 3 из 8»: в тексте съеденная часть, на картинке — оставшаяся
    if (fig.eaten && has([fig.parts - fig.have, fig.parts])) return fig;
    // две вещи рядом: хватает, что в тексте есть хотя бы одна из дробей
    if ((fig.type === 'pizzas' || fig.type === 'chocopair') && figFracs(fig).some(has)) return fig;
    // смешанное число совпадает и с «7/5», и с «1 2/5» в тексте
    if (fig.type === 'mixed' && (has([fig.whole * fig.d + fig.n, fig.d]) || has([fig.n, fig.d]))) return fig;
    const proper = said.filter(([a, b]) => b >= 1 && b <= 12 && a <= b);
    if (proper.length >= 2) return { type: 'pair', a: proper[0], b: proper[1] };
    if (proper.length === 1) {
      const [n, d] = proper[0];
      if (fig.type === 'circle' || fig.type === 'bar') return { type: fig.type, parts: d, shaded: n };
      if (['pizza', 'cake', 'choco'].includes(fig.type)) return { type: fig.type, parts: d, have: n };
      if (fig.type === 'line') return { type: 'line', n, d };
      return { type: 'labeled', n, d };
    }
    const improper = said.filter(([a, b]) => b > 1 && b <= 12 && a > b && a / b < 10);
    if (improper.length) { const [n, d] = improper[0]; return { type: 'mixed', whole: Math.floor(n / d), n: n % d, d }; }
    return null; // непонятно, что рисовать, — лучше без картинки, чем с неверной
  }
  function fracsIn(t) {
    const out = [];
    t.replace(/\[\[[^\]]*\]\]/g, ' ').replace(/(^|[^\d/])(\d{1,2})\s*\/\s*(\d{1,2})(?![\d/])/g, (m, pre, a, b) => {
      if (!out.some(([x, y]) => x === +a && y === +b)) out.push([+a, +b]);
      return m;
    });
    return out;
  }
  // → { html, done } ; done = наставник поставил [[готово]]
  function render(text, { streaming = false } = {}) {
    let t = String(text)
      .replace(/\\d?frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2').replace(/\\cdot/g, '·').replace(/\\times/g, '×')
      .replace(/\$\$?/g, '').replace(/\\[()[\]]/g, '');
    if (streaming) t = t.replace(/\[\[[^\]]*$/, '');
    // модель иногда пишет тег без скобок отдельной строкой («пицца 7/3») — это тоже картинка, а не текст
    t = t.replace(/^[ \t]*((?:пицца|торт|шоколадка|полоска|круг|смешанное|сравнить|подпиши|прямая)(?:\s+(?:съел|съела|съели))?(?:\s+\d{1,2}(?:\s*\/\s*\d{1,2})?){1,3})[ \t.]*$/gim, '[[$1]]');
    let done = false;
    const parts = t.split(/(\[\[[^\]]{1,40}\]\])/g), said = fracsIn(t);
    let html = '', figs = 0, words = 0, lastFig = null;
    for (const part of parts) {
      const m = part.match(/^\[\[([^\]]+)\]\]$/);
      if (m) {
        if (/^\s*готово\s*$/i.test(m[1])) { done = true; continue; }
        const fig = figs < 1 && figureFromTag(m[1]);
        let fixed = fig && reconcile(fig, said);
        // в тексте две вещи («вторую пиццу разрезали на 8»), а тег один — рисуем обе рядом, чтобы картинка не спорила с текстом
        if (fixed && ['pizza', 'cake', 'choco'].includes(fixed.type) && !fixed.eaten && /втор|две |два |обе |оба /i.test(t)) {
          const two = said.filter(([a, b]) => b >= 2 && b <= 12 && a <= b).slice(0, 2);
          if (two.length === 2) fixed = fixed.type === 'choco'
            ? { type: 'chocopair', a: two[0], b: two[1], la: `${two[0][0]} из ${two[0][1]}`, lb: `${two[1][0]} из ${two[1][1]}` }
            : { type: 'pizzas', food: fixed.type, items: two.map(([a, b]) => ({ parts: b, have: a, label: `${a}/${b}` })) };
        }
        if (fixed) { html += figure(fixed); figs++; lastFig = fixed; }
        continue;
      }
      const paras = part.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
      words += paras.length;
      html += paras.map(p => `<p>${p.split('\n').map(l => inline(l.replace(/^\s*[-•*]\s+/, '• '))).join('<br>')}</p>`).join('');
    }
    // Ответ пришёл одной картинкой без слов — подписываем её сами, чтобы ребёнок понял, что видит
    if (!streaming && lastFig && !words && typeof describe === 'function') {
      const d = describe(lastFig);
      if (d) html += `<p class="figure-caption">На картинке ${d}.</p>`;
    }
    return { html, done };
  }

  /* ---------- Офлайн-наставник по методичке ---------- */
  const PLAY = {
    concept: { n: 5, d: 8, say: 'Собери на пицце 5/8 — тыкай в куски.' },
    reduce: { n: 2, d: 3, say: 'Собери 2/3 пиццы. Потом нажми «+» и нарежь её на 6 кусков — сколько кусков теперь та же часть?' },
    'add-same': { n: 4, d: 6, say: 'Сложи на пицце 1/6 и 3/6: возьми сначала один кусок, потом ещё три.' },
    'add-diff': { n: 1, d: 3, say: 'Собери 1/3 пиццы. Потом нажимай «+», пока кусков не станет 12, — сколько это двенадцатых?' },
  };
  // Сценарий урока: шаги показываются по кнопке «Дальше»
  function lessonBeats(t, makeTask) {
    const e = t.explain, beats = [];
    beats.push({ html: `<p>Привет! Сегодня тема «${t.title}».</p><p>Чему научимся: ${t.goal.charAt(0).toLowerCase() + t.goal.slice(1)}</p>` });
    beats.push({ html: `<p>${e.model}</p>${figure(e.figure)}<p class="figure-caption">${e.figureCaption}</p>` });
    // лаборатория видна только на компьютере — на телефоне не отправляем ребёнка искать то, чего нет на экране
    const wide = typeof matchMedia !== 'function' || matchMedia('(min-width: 761px)').matches;
    if (wide) beats.push({ html: '<p>Попробуй сам: в «Лаборатории дробей» рядом с уроком меняй числа и смотри, как меняется дробь на полоске, круге и прямой.</p>' });
    // пицца, которую можно резать и собирать, — только там, где она про саму тему, один раз за урок
    const play = PLAY[t.id];
    if (play) beats.push({ html: `<p><b>Попробуй руками.</b> ${play.say}</p>`, play: { n: play.n, d: play.d } });
    beats.push({ html: `<p><b>Правило</b></p><div class="rule-body">${e.rule}</div>` });
    // пример — это вопрос: ребёнок выбирает ответ сам, разбор показываем после
    e.examples.forEach((x, k) => {
      if (Array.isArray(x.choices)) beats.push({ html: `<p><b>${k ? 'Ещё задачка' : 'Твоя очередь!'}</b> ${x.q}</p>${x.fig ? figure(x.fig) : ''}`, ask: { choices: x.choices, correct: x.correct, wrong: x.wrong || {}, steps: x.steps, after: x.after || null } });
      else {
        beats.push({ html: `<p><b>Пример ${k + 1}.</b> ${x.q}</p>${x.fig ? figure(x.fig) : ''}` });
        beats.push({ html: `<ol>${x.steps.map(s => `<li>${s}</li>`).join('')}</ol>` });
      }
    });
    beats.push({ task: makeTask() });
    beats.push({ html: '<p>Отлично поработали! Теперь потренируемся на задачах — они каждый раз новые.</p>', done: true });
    return beats;
  }

  // Ответ на свободный вопрос без ИИ: ищем подходящий кусок методички
  function localAnswer(t, q, task, hintIndex) {
    const s = q.toLowerCase().replace(/ё/g, 'е');
    const e = t.explain;
    if (task && /ответ|скажи|реши за|не знаю|помоги|подскаж|как решить|как реш/.test(s)) {
      const h = task.hints[Math.min(hintIndex, task.hints.length - 1)];
      return { html: `<p>Давай не ответ, а подсказку:</p><p>${h}</p>`, usedHint: true };
    }
    if (/правил|как (складыв|вычит|умнож|дел|сокращ|сравн|перевод)/.test(s)) return { html: `<p><b>Правило</b></p><div class="rule-body">${e.rule}</div>` };
    if (/пример/.test(s)) { const x = e.examples[Math.floor(Math.random() * e.examples.length)]; return { html: `<p>${x.q}</p><ol>${x.steps.map(st => `<li>${st}</li>`).join('')}</ol>` }; }
    if (/картин|покажи|нарис|как выгляд/.test(s)) {
      if (task && task.figure && !task.figureIsHint) return { html: `<p>Вот картинка к этой задаче:</p>${figure(task.figure)}<p>${task.story}</p>` };
      return { html: `<p>Картинка из конспекта (числа там другие, чем в задаче):</p>${figure(e.figure)}<p class="figure-caption">${e.figureCaption}</p>` };
    }
    if (/ошиб|почему не|неправильн/.test(s)) return { html: `<ul>${t.mistakes.map(m => `<li><b>${m.title}.</b> ${m.say}</li>`).join('')}</ul>` };
    if (/числител|знаменател|что такое|зачем|почему/.test(s)) return { html: `<p>${e.model}</p>${figure(e.figure)}` };
    return { html: `<p>Сейчас я работаю без ИИ и отвечаю только по конспекту. Спроси про <b>правило</b>, попроси <b>пример</b>, <b>картинку</b> или <b>подсказку</b>.</p>${window.VEKTOR_SYNC ? '' : '<p class="small muted">Чтобы задавать любые вопросы, подключи ИИ в настройках.</p>'}` };
  }

  /* ---------- Режимы ИИ на сервере «Вектора» (CL-8) — только при входе через сервер ---------- */
  const serverReady = () => serverAI() && navigator.onLine !== false;
  // Классификатор незнакомой ошибки → { bug, confidence, step, kid_rule, note } или null (ИИ недоступен)
  async function classify(data, { signal, timeoutMs = 8000 } = {}) {
    if (!serverReady()) return null;
    const SBC = window.VEKTOR_CONFIG; let token = '';
    try { token = (JSON.parse(localStorage.getItem('vektor-session')) || {}).token || ''; } catch {}
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), timeoutMs);
    if (signal) signal.addEventListener('abort', () => ctl.abort());
    try {
      const r = await fetch(SBC.supabaseUrl.replace(/\/+$/, '') + '/functions/v1/tutor', { method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', apikey: SBC.supabaseKey, Authorization: 'Bearer ' + SBC.supabaseKey },
        body: JSON.stringify({ mode: 'classify', token, data }) });
      if (!r.ok) return null;
      const j = await r.json(); return j && typeof j.bug === 'string' ? j : null;
    } catch { return null; } finally { clearTimeout(tm); }
  }
  // «Объясни иначе» — потоком, как обычный ответ наставника
  function explainMore(data, onText, opts = {}) {
    if (!serverReady()) return Promise.reject(new TutorError('Наставник с ИИ сейчас недоступен.'));
    return stream({ mode: 'vektor' }, [{ role: 'user', content: '.' }], onText, { ...opts, maxTokens: 300, mode: 'explain_more', data });
  }

  // Запрос разговора к серверу «Вектора»: только то, что нужно, с обрезкой длины. Имени и логина ученика здесь нет (Д-06).
  function serverPayload({ topic, mode, task, attempts = [], mistake, pace = 'normal', style = 'visual', history = [] }) {
    const cut = (v, n) => String(v == null ? '' : v).slice(0, n);
    return {
      mode: mode === 'lesson' ? 'lesson' : 'task', topic: topic.id, pace, style,
      task: task ? { text: cut(plain(`${task.story} ${task.question}`), 400), figure: task.figure ? cut(window.VEKTOR_VISUALS.describe(task.figure), 200) : '',
        answer: cut(task.answer, 40), solution: cut(plain(task.solution), 400) } : null,
      attempts: attempts.slice(-6).map(a => cut(a, 40)), mistake: mistake || null,
      history: history.filter(m => m.role === 'user' || m.role === 'assistant').slice(-14).map(m => ({ role: m.role, content: cut(m.content, m.role === 'user' ? 600 : 1500) })),
    };
  }

  window.VEKTOR_TUTOR = { serverPayload, MODELS, DEFAULT_CFG, loadCfg, saveCfg, ready, systemPrompt, stream, testConnection, render, lessonBeats, localAnswer, plain, TutorError, classify, explainMore, serverReady };
})();
