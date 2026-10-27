// ИИ-наставник «Вектора» — серверная функция Supabase (Edge Function, Deno).
// Этап 3 ТЗ: ключ модели только здесь (секрет OPENROUTER_API_KEY), в браузер не попадает (Ф-15);
// пускает только вошедших учеников и считает лимиты (Ф-16); вырезает из текста ребёнка
// телефоны, почты, ссылки и длинные номера (И-02); имя ученика в модель не уходит (Д-06).
//
// Секреты (Supabase → Edge Functions → Secrets): OPENROUTER_API_KEY.
// SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY Supabase подставляет сам.

const MODELS = ['deepseek/deepseek-v4-flash', 'deepseek/deepseek-v4.1-flash', 'deepseek/deepseek-v4-pro', '~deepseek/deepseek-flash-latest'];
const MAX_TOKENS = 700, MAX_MESSAGES = 30, MAX_CHARS = 24000;
const FALLBACK = 'google/gemini-2.5-flash-lite'; // запасная модель, если основная недоступна (CL-8)
// цена за миллион токенов, если OpenRouter не прислал стоимость сам
const PRICE: Record<string, [number, number]> = { [FALLBACK]: [0.10, 0.40] };
const priceOf = (m: string) => PRICE[m] || [0.10, 0.30];
const CEIL: Record<string, number> = { classify: 120, explain_more: 300 };

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Max-Age': '86400',
};
const json = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code: status, type: code, message } }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// И-02: личные данные из текста ребёнка
export function scrub(s: string): string {
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[почта скрыта]')
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, '[ссылка скрыта]')
    .replace(/(?:\+?\d[\s()-]*){7,}/g, '[номер скрыт]')
    .replace(/(меня зовут|моё имя|мое имя|я живу|мой адрес)[^.!?\n]*/gi, '$1 [скрыто]');
}

// Ф-17: грубость и опасные темы — в модель не отправляем, ребёнку мягкий ответ, учителю сигнал
const BAD = /(х[уy][йеёяию]|пизд|еба[тнл]|ёба|бля[дт]?|сук[аи](?![а-яё])|муда[кч]|пидор|гандон|шлюх|убить|убью|суицид|покончить с собой|наркот|закладк|порн|секс|оружи[ея]|бомб[уаы])/i;
export function flagged(s: string): boolean { return BAD.test(s.replace(/ё/g, 'е').replace(/\s+/g, ' ')); }
const SOFT = 'Давай вернёмся к математике 🙂 Если тебе плохо или страшно — обязательно расскажи учителю или родителям.';

const LIMIT_SAY: Record<string, [number, string]> = {
  no_session: [401, 'Войди заново, чтобы спросить наставника.'],
  disabled: [503, 'Наставник с ИИ сейчас выключен — продолжим по конспекту.'],
  total_limit: [429, 'На сегодня вопросы к ИИ закончились — продолжим по конспекту.'],
  student_limit: [429, 'На сегодня твои 30 вопросов к ИИ закончились. Завтра будут новые — а пока продолжим по конспекту.'],
  budget: [503, 'Наставник с ИИ сегодня отдыхает — продолжим по конспекту.'],
};

/* ---------- Режимы CL-8: клиент присылает данные, промпт собирает сервер ---------- */
const CLASSIFY_SYS = `Ты — методист по математике. Определи, какое неверное правило применил школьник.
Тебе даны: тема, условие, верный ответ, строки решения ученика и значение каждой строки,
посчитанное программой (они точные, не пересчитывай), иногда — слова ученика,
и список известных ошибок темы в виде «id: описание».
Выбери одну ошибку из списка или other, если ни одна не объясняет строки.
Ответь только JSON:
{"bug":"<id или other>","confidence":<0..1>,"step":<номер строки с ошибкой>,
 "kid_rule":"<как думает ученик: одна фраза на «ты», до 15 слов>",
 "note":"<если other — какую ошибку ты видишь, до 20 слов>"}`;
const EXPLAIN_SYS = `Ты — добрый наставник по математике для школьника. Ученик не понял объяснение ошибки.
Объясни ЭТОТ ЖЕ шаг иначе: другим примером из жизни или картинкой-тегом, 2–4 коротких предложения, на «ты».
Не давай ответ на задачу. Можно вставить одну картинку тегом: [[полоска a/b]], [[круг a/b]], [[сравнить a/b c/d]], [[прямая a/b]].`;
const str = (v: unknown, n: number) => scrub(String(v ?? '')).slice(0, n);
export function buildMode(mode: string, d: any): { messages: { role: string; content: string }[]; json: boolean } | null {
  if (!d || typeof d !== 'object') return null;
  if (mode === 'classify') {
    const bugs = Array.isArray(d.bugs) ? d.bugs.slice(0, 12).filter((b: any) => /^[a-z-]{2,60}$/.test(String(b?.id))) : [];
    const lines = Array.isArray(d.lines) ? d.lines.slice(0, 6) : [];
    if (!bugs.length || !lines.length) return null;
    // стабильная часть — первой (провайдеры кэшируют начало), изменчивая — в конце
    const catalog = 'Тема: ' + str(d.topic, 40) + '\nИзвестные ошибки:\n' + bugs.map((b: any) => `${b.id}: ${str(b.title, 120)}`).join('\n');
    const task = `Условие: ${str(d.cond, 120)}\nВерный ответ: ${str(d.answer, 40)}\nСтроки ученика:\n` +
      lines.map((l: any, k: number) => `${k + 1}) ${str(l?.t, 80)}   [значение: ${str(l?.v, 30)}]`).join('\n') +
      (d.kid ? `\nСлова ученика: ${str(d.kid, 300)}` : '');
    return { json: true, messages: [{ role: 'system', content: CLASSIFY_SYS }, { role: 'system', content: catalog }, { role: 'user', content: task }] };
  }
  if (mode === 'explain_more') {
    if (!d.title) return null;
    const ctx = `Ошибка ученика: ${str(d.title, 120)}. Верная идея: ${str(d.fix, 200)}.\nШаг разбора: ${str(d.step, 40)}. Задача: ${str(d.task, 160)}.`;
    return { json: false, messages: [{ role: 'system', content: EXPLAIN_SYS }, { role: 'user', content: ctx }] };
  }
  return null;
}
// Ответ модели всегда проверяем: id не из списка или уверенность ниже 0,7 → other
export function validClassify(raw: string, ids: string[]) {
  let j: any = null; try { j = JSON.parse(String(raw).replace(/^```(?:json)?|```$/g, '').trim()); } catch {}
  const ok = j && typeof j === 'object' && (ids.includes(j.bug) || j.bug === 'other');
  const conf = ok ? Math.max(0, Math.min(1, Number(j.confidence) || 0)) : 0;
  const bug = ok && j.bug !== 'other' && conf >= 0.7 ? j.bug : 'other';
  return { bug, confidence: conf, step: ok ? Math.max(0, Math.min(10, parseInt(j.step) || 0)) : 0,
    kid_rule: ok ? String(j.kid_rule || '').slice(0, 120) : '', note: ok ? String(j.note || '').slice(0, 160) : '' };
}
async function sha256(s: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json(405, 'method', 'Only POST');

  const KEY = Deno.env.get('OPENROUTER_API_KEY');
  const SB = Deno.env.get('SUPABASE_URL'), SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SB || !SR) return json(500, 'config', 'Server is not configured');

  let body: any;
  try { body = await req.json(); } catch { return json(400, 'bad_json', 'Bad JSON'); }
  const token = String(body?.token || '');
  const mode = ['classify', 'explain_more'].includes(body?.mode) ? body.mode : 'chat';
  const built = mode === 'chat' ? null : buildMode(mode, body?.data);
  if (mode !== 'chat' && !built) return json(400, 'bad_data', 'Bad data');
  if (mode === 'chat' && (!Array.isArray(body?.messages) || !body.messages.length || body.messages.length > MAX_MESSAGES)) return json(400, 'bad_messages', 'Bad messages');
  const db = (fn: string, args: unknown) => fetch(`${SB}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SR, Authorization: `Bearer ${SR}` }, body: JSON.stringify(args) });

  // кэш классификаций: попадание не тратит лимит ребёнка
  let cacheKey = '';
  if (mode === 'classify') {
    const d = body.data, norm = (x: unknown) => String(x ?? '').replace(/\s+/g, '').toLowerCase();
    cacheKey = 'classify:' + await sha256(JSON.stringify([d.topic, norm(d.cond), (d.lines || []).map((l: any) => norm(l?.t)), norm(d.kid)]));
    const c = await (await db('vk_ai_cache_get', { p_token: token, p_key: cacheKey })).json().catch(() => null);
    if (!c) return json(502, 'db', 'Не получилось проверить вход, попробуй ещё раз');
    if (!c.ok) { const [s, m] = LIMIT_SAY[c.reason] || [403, 'Нет доступа']; return json(s, c.reason, m); }
    if (c.value) return new Response(JSON.stringify({ ...c.value, cached: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // сессия ученика и лимиты — в базе
  const take = await db('vk_ai_take', { p_token: token });
  const t = await take.json().catch(() => null);
  if (!take.ok || !t) return json(502, 'db', 'Не получилось проверить вход, попробуй ещё раз');
  if (!t.ok) { const [s, m] = LIMIT_SAY[t.reason] || [403, 'Нет доступа']; return json(s, t.reason, m); }
  const spend = (u: any, model: string) => {
    if (!u) return;
    const pin = Number(u.prompt_tokens) || 0, pout = Number(u.completion_tokens) || 0, [a, b] = priceOf(model);
    const usd = Number.isFinite(Number(u.cost)) && u.cost != null ? Number(u.cost) : (pin * a + pout * b) / 1e6;
    return db('vk_ai_spend', { p_student: t.student_id, p_in: pin, p_out: pout, p_usd: usd }).catch(() => {});
  };
  const lastUser = mode === 'chat' ? [...body.messages].reverse().find((m: any) => m.role === 'user')
    : { content: [body.data?.kid, body.data?.task].filter(Boolean).join(' ') };
  if (lastUser && flagged(String(lastUser.content || ''))) {
    await fetch(`${SB}/rest/v1/vk_events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SR, Authorization: `Bearer ${SR}`, Prefer: 'return=minimal' },
      body: JSON.stringify({ event_id: 'flag-' + crypto.randomUUID(), student_id: t.student_id, type: 'ai_flag',
        data: { text: scrub(String(lastUser.content)).slice(0, 300) } }),
    }).catch(() => {});
    const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: SOFT } }] })}\n\ndata: [DONE]\n\n`;
    return new Response(sse, { headers: { ...cors, 'Content-Type': 'text/event-stream' } });
  }

  if (!KEY) return json(503, 'no_key', 'Наставник с ИИ ещё не подключён — продолжим по конспекту.');

  const messages = built ? built.messages : body.messages.map((m: any) => {
    const role = m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user';
    let content = String(m.content || '').slice(0, 8000);
    if (role === 'user') content = scrub(content);
    if (role === 'system') content = content.replace(/,\s*его зовут[^.\n]*/g, ''); // Д-06
    return { role, content };
  });
  if (JSON.stringify(messages).length > MAX_CHARS) return json(413, 'too_long', 'Слишком длинный разговор — начни новый вопрос');

  const model = MODELS.includes(body.model) ? body.model : MODELS[0];
  const maxTokens = mode === 'chat' ? Math.min(Number(body.max_tokens) || 450, MAX_TOKENS) : CEIL[mode];
  const isJson = !!(built && built.json);
  const UP = Deno.env.get('OPENROUTER_URL') || 'https://openrouter.ai/api/v1/chat/completions'; // для тестов
  const call = (reasoningOff: boolean) => fetch(UP, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-OpenRouter-Title': 'Vektor' },
    body: JSON.stringify({
      model, models: [model, FALLBACK], provider: { sort: 'price' }, // самый дешёвый провайдер и запасная модель
      messages, stream: !isJson, temperature: isJson ? 0 : 0.4,
      max_tokens: reasoningOff ? maxTokens : maxTokens + 600,
      reasoning: reasoningOff ? { enabled: false } : { exclude: true },
      usage: { include: true },
      ...(isJson ? { response_format: { type: 'json_object' } } : {}),
      user: `s${t.student_id}`, // для модерации OpenRouter — без имени
    }),
  });
  let up = await call(true);
  if (up.status === 400) { const msg = await up.clone().text(); if (/reason|think/i.test(msg)) up = await call(false); }

  if (isJson) {
    const ids = (body.data.bugs || []).map((b: any) => String(b?.id));
    if (!up.ok) return json(up.status, 'upstream', 'ИИ сейчас не ответил');
    const j = await up.json().catch(() => null);
    await spend(j?.usage, j?.model || model);
    const out = validClassify(j?.choices?.[0]?.message?.content || '', ids);
    await db('vk_ai_cache_put', { p_key: cacheKey, p_value: out }).catch(() => {});
    return new Response(JSON.stringify(out), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // поток идёт ребёнку как есть, а из последнего куска берём usage — фактические токены и стоимость
  let tail = '';
  const tap = new TransformStream({
    transform(chunk, ctrl) { ctrl.enqueue(chunk); tail = (tail + new TextDecoder().decode(chunk)).slice(-4000); },
    async flush() {
      const m = tail.match(/data:\s*(\{[^\n]*"usage"[^\n]*\})\s*$/m) || tail.match(/data:\s*(\{[^\n]*"usage"[^\n]*\})/);
      if (m) { try { const o = JSON.parse(m[1]); await spend(o.usage, o.model || model); } catch {} }
    },
  });
  return new Response(up.ok && up.body ? up.body.pipeThrough(tap) : up.body, {
    status: up.status,
    headers: { ...cors, 'Content-Type': up.headers.get('Content-Type') || 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
});
