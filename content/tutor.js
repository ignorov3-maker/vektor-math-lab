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

  const { f, figure, figureFromTag } = window.VEKTOR_VISUALS;
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
  function loadCfg() { try { return { ...DEFAULT_CFG, ...JSON.parse(localStorage.getItem(CFG_KEY) || '{}') }; } catch { return { ...DEFAULT_CFG }; } }
  function saveCfg(c) { try { localStorage.setItem(CFG_KEY, JSON.stringify(c)); } catch {} }
  const ready = c => (c.mode === 'key' && /^sk-or-/.test(c.key.trim())) || (c.mode === 'proxy' && /^https:\/\//.test(c.proxy.trim()));

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
    steps: 'Ученик выбрал стиль «коротко и по шагам».',
    visual: 'Ученик выбрал стиль «через наглядные примеры»: почти в каждом объяснении показывай картинку.',
  };

  function methodText(t) {
    const e = t.explain;
    return [
      `Тема: «${t.title}» (раздел «Обыкновенные дроби», 5 класс).`,
      `Цель: ${t.goal}`,
      `Наглядная модель: ${plain(e.model)}`,
      `Правило: ${plain(e.rule)}`,
      ...e.examples.map((x, k) => `Пример ${k + 1}: ${plain(x.q)} Решение: ${x.steps.map(plain).join(' ')}`),
      `Типичные ошибки: ${t.mistakes.map(m => `${m.title} — ${m.say}`).join('; ')}`,
    ].join('\n');
  }

  function systemPrompt({ topic, mode, task, attempts = [], mistake, pace = 'normal', style = 'steps', name }) {
    const common = `Ты — добрый и терпеливый наставник по математике в учебном приложении «Вектор». Твой ученик — школьник 5–6 класса (10–12 лет)${name ? `, его зовут ${name}` : ''}.

Как ты пишешь:
- По-русски, просто и дружелюбно, на «ты». 2–4 коротких предложения в одном сообщении, одна мысль за раз.
- Опирайся только на методичку ниже. Не придумывай других правил и обозначений.
- Дроби пиши как 3/5. Никакого LaTeX, формул в долларах и таблиц.
- Чтобы показать картинку, вставь на отдельной строке один тег: [[полоска 3/5]], [[круг 3/8]], [[прямая 3/4]], [[сравнить 1/3 1/5]], [[прямоугольник 2/3 3/4]] (для умножения 2/3 · 3/4), [[смешанное 2 1/3]]. Знаменатель не больше 12. Не больше одной картинки в сообщении.
- Не проси и не запоминай личные данные (адрес, школу, телефон, фото).
- Если вопрос не про учёбу — коротко и по-доброму верни к теме. Если ученик пишет, что ему плохо, страшно или его обижают, мягко посоветуй рассказать об этом взрослому, которому он доверяет, и не продолжай эту тему сам.
- ${PACE_SAY[pace] || PACE_SAY.normal} ${STYLE_SAY[style] || STYLE_SAY.steps}

Методичка темы:
${methodText(topic)}`;

    if (mode === 'lesson') {
      return `${common}

Сейчас ты ведёшь урок по этой теме. План (один шаг — одно сообщение):
1) Скажи, чему научимся, и задай лёгкий вопрос-разминку из жизни.
2) Покажи наглядную модель с картинкой.
3) Сформулируй правило своими словами.
4) Разбери пример по шагам вместе с учеником: задай ему вопрос на каждом шаге.
5) Дай одну короткую задачу на понимание (свою, не из методички) и дождись ответа.
6) Предупреди о типичной ошибке.
7) Похвали и напиши отдельной строкой тег [[готово]] — это кнопка перехода к тренировке.
Каждое сообщение заканчивай вопросом или просьбой нажать «Дальше». Если ученик ошибся или пишет «не понял» — объясни иначе, проще и с картинкой, не переходи к следующему шагу. Если отвечает верно и быстро — можно объединять шаги. Проверяй ответы ученика внимательно: сначала посчитай сам.`;
    }
    const tries = attempts.length ? `Ответы ученика на эту задачу: ${attempts.map(a => `«${a}»`).join(', ')}.` : 'Ученик ещё не отвечал.';
    return `${common}

Сейчас ученик решает задачу в тренировке:
${plain(task.story)} ${plain(task.question)}
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

  async function stream(cfg, messages, onText, { maxTokens = 450, signal } = {}) {
    const proxy = cfg.mode === 'proxy';
    const url = proxy ? cfg.proxy.trim() : OPENROUTER_URL;
    const headers = { 'Content-Type': 'application/json' };
    if (!proxy) {
      headers.Authorization = `Bearer ${cfg.key.trim()}`;
      headers['HTTP-Referer'] = location.origin && location.origin !== 'null' ? location.origin : 'https://github.com/ignorov3-maker/vektor-math-lab';
      headers['X-OpenRouter-Title'] = 'Vektor';
    }
    const body = { model: cfg.model || DEFAULT_CFG.model, messages, stream: true, max_tokens: maxTokens, temperature: 0.4, reasoning: { enabled: false } };
    let res;
    try { res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal }); }
    catch (e) { if (e.name === 'AbortError') throw e; throw new TutorError('Нет связи с сервером ИИ. Проверь интернет или адрес прокси.'); }
    if (!res.ok) { let t = ''; try { t = (await res.json()).error?.message || ''; } catch {} throw new TutorError(errorFor(res.status, t)); }
    if (!res.body) throw new TutorError('Браузер не поддерживает потоковые ответы.');

    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '', text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line.startsWith('data:')) continue; // комментарии вида ": OPENROUTER PROCESSING"
        const data = line.slice(5).trim();
        if (data === '[DONE]') return text;
        let obj; try { obj = JSON.parse(data); } catch { continue; }
        if (obj.error) throw new TutorError(errorFor(obj.error.code || 500, obj.error.message));
        const piece = obj.choices?.[0]?.delta?.content;
        if (piece) { text += piece; onText(text); }
      }
    }
    return text;
  }

  async function testConnection(cfg) {
    const t = await stream(cfg, [{ role: 'user', content: 'Ответь одним словом: готово' }], () => {}, { maxTokens: 10 });
    if (!t.trim()) throw new TutorError('Модель ответила пустым сообщением. Попробуй другую модель.');
    return t.trim();
  }

  /* ---------- Отрисовка ответа наставника ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function inline(s) {
    return esc(s)
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[^\d/])(\d{1,3})\s*\/\s*(\d{1,3})(?![\d/])/g, (m, pre, a, b) => `${pre}${f(a, b)}`);
  }
  // → { html, done } ; done = наставник поставил [[готово]]
  function render(text, { streaming = false } = {}) {
    let t = String(text)
      .replace(/\\d?frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2').replace(/\\cdot/g, '·').replace(/\\times/g, '×')
      .replace(/\$\$?/g, '').replace(/\\[()[\]]/g, '');
    if (streaming) t = t.replace(/\[\[[^\]]*$/, '');
    let done = false;
    const parts = t.split(/(\[\[[^\]]{1,40}\]\])/g);
    let html = '';
    for (const part of parts) {
      const m = part.match(/^\[\[([^\]]+)\]\]$/);
      if (m) {
        if (/^\s*готово\s*$/i.test(m[1])) { done = true; continue; }
        const fig = figureFromTag(m[1]);
        if (fig) html += figure(fig);
        continue;
      }
      const paras = part.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
      html += paras.map(p => `<p>${p.split('\n').map(l => inline(l.replace(/^\s*[-•*]\s+/, '• '))).join('<br>')}</p>`).join('');
    }
    return { html, done };
  }

  /* ---------- Офлайн-наставник по методичке ---------- */
  // Сценарий урока: шаги показываются по кнопке «Дальше»
  function lessonBeats(t, makeTask) {
    const e = t.explain, beats = [];
    beats.push({ html: `<p>Привет! Сегодня тема «${t.title}».</p><p>Чему научимся: ${t.goal.charAt(0).toLowerCase() + t.goal.slice(1)}</p>` });
    beats.push({ html: `<p>${e.model}</p>${figure(e.figure)}<p class="figure-caption">${e.figureCaption}</p>` });
    beats.push({ html: '<p>Попробуй сам: в «Лаборатории дробей» рядом с уроком меняй числа и смотри, как меняется дробь на полоске, круге и прямой.</p>' });
    beats.push({ html: `<p><b>Правило.</b> ${e.rule}</p>` });
    e.examples.forEach((x, k) => {
      beats.push({ html: `<p><b>Пример ${k + 1}.</b> ${x.q}</p><p>Подумай, с чего начать. Нажми «Дальше», чтобы увидеть решение.</p>` });
      beats.push({ html: `<ol>${x.steps.map(s => `<li>${s}</li>`).join('')}</ol>` });
    });
    beats.push({ task: makeTask() });
    beats.push({ html: `<p><b>Осторожно, частые ошибки:</b></p><ul>${t.mistakes.map(m => `<li><b>${m.title}.</b> ${m.say}</li>`).join('')}</ul>` });
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
    if (/правил|как (складыв|вычит|умнож|дел|сокращ|сравн|перевод)/.test(s)) return { html: `<p><b>Правило.</b> ${e.rule}</p>` };
    if (/пример/.test(s)) { const x = e.examples[Math.floor(Math.random() * e.examples.length)]; return { html: `<p>${x.q}</p><ol>${x.steps.map(st => `<li>${st}</li>`).join('')}</ol>` }; }
    if (/картин|покажи|нарис|как выгляд/.test(s)) return { html: `${figure(e.figure)}<p class="figure-caption">${e.figureCaption}</p>` };
    if (/ошиб|почему не|неправильн/.test(s)) return { html: `<ul>${t.mistakes.map(m => `<li><b>${m.title}.</b> ${m.say}</li>`).join('')}</ul>` };
    if (/числител|знаменател|что такое|зачем|почему/.test(s)) return { html: `<p>${e.model}</p>${figure(e.figure)}` };
    return { html: `<p>Сейчас я работаю без ИИ и отвечаю только по конспекту. Спроси про <b>правило</b>, попроси <b>пример</b>, <b>картинку</b> или <b>подсказку</b>.</p><p class="small muted">Чтобы задавать любые вопросы, подключи ИИ в настройках.</p>` };
  }

  window.VEKTOR_TUTOR = { MODELS, DEFAULT_CFG, loadCfg, saveCfg, ready, systemPrompt, stream, testConnection, render, lessonBeats, localAnswer, plain, TutorError };
})();
