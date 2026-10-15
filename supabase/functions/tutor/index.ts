// ИИ-наставник «Вектора» — серверная функция Supabase (Edge Function, Deno).
// Этап 3 ТЗ: ключ модели только здесь (секрет OPENROUTER_API_KEY), в браузер не попадает (Ф-15);
// пускает только вошедших учеников и считает лимиты (Ф-16); вырезает из текста ребёнка
// телефоны, почты, ссылки и длинные номера (И-02); имя ученика в модель не уходит (Д-06).
//
// Секреты (Supabase → Edge Functions → Secrets): OPENROUTER_API_KEY.
// SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY Supabase подставляет сам.

const MODELS = ['deepseek/deepseek-v4-flash', 'deepseek/deepseek-v4.1-flash', 'deepseek/deepseek-v4-pro', '~deepseek/deepseek-flash-latest'];
const MAX_TOKENS = 700, MAX_MESSAGES = 30, MAX_CHARS = 24000;

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
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json(405, 'method', 'Only POST');

  const KEY = Deno.env.get('OPENROUTER_API_KEY');
  const SB = Deno.env.get('SUPABASE_URL'), SR = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SB || !SR) return json(500, 'config', 'Server is not configured');

  let body: any;
  try { body = await req.json(); } catch { return json(400, 'bad_json', 'Bad JSON'); }
  const token = String(body?.token || '');
  if (!Array.isArray(body?.messages) || !body.messages.length || body.messages.length > MAX_MESSAGES) return json(400, 'bad_messages', 'Bad messages');

  // сессия ученика и лимиты — в базе
  const take = await fetch(`${SB}/rest/v1/rpc/vk_ai_take`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: SR, Authorization: `Bearer ${SR}` },
    body: JSON.stringify({ p_token: token }),
  });
  const t = await take.json().catch(() => null);
  if (!take.ok || !t) return json(502, 'db', 'Не получилось проверить вход, попробуй ещё раз');
  if (!t.ok) { const [s, m] = LIMIT_SAY[t.reason] || [403, 'Нет доступа']; return json(s, t.reason, m); }
  const lastUser = [...body.messages].reverse().find((m: any) => m.role === 'user');
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

  const messages = body.messages.map((m: any) => {
    const role = m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user';
    let content = String(m.content || '').slice(0, 8000);
    if (role === 'user') content = scrub(content);
    if (role === 'system') content = content.replace(/,\s*его зовут[^.\n]*/g, ''); // Д-06
    return { role, content };
  });
  if (JSON.stringify(messages).length > MAX_CHARS) return json(413, 'too_long', 'Слишком длинный разговор — начни новый вопрос');

  const model = MODELS.includes(body.model) ? body.model : MODELS[0];
  const maxTokens = Math.min(Number(body.max_tokens) || 450, MAX_TOKENS);
  const UP = Deno.env.get('OPENROUTER_URL') || 'https://openrouter.ai/api/v1/chat/completions'; // для тестов
  const call = (reasoningOff: boolean) => fetch(UP, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-OpenRouter-Title': 'Vektor' },
    body: JSON.stringify({
      model, messages, stream: true, temperature: 0.4,
      max_tokens: reasoningOff ? maxTokens : maxTokens + 600,
      reasoning: reasoningOff ? { enabled: false } : { exclude: true },
      user: `s${t.student_id}`, // для модерации OpenRouter — без имени
    }),
  });
  let up = await call(true);
  if (up.status === 400) { const msg = await up.clone().text(); if (/reason|think/i.test(msg)) up = await call(false); }
  return new Response(up.body, {
    status: up.status,
    headers: { ...cors, 'Content-Type': up.headers.get('Content-Type') || 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
});
