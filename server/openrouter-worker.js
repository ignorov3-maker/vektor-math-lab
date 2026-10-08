/**
 * Прокси ИИ-наставника «Вектора» для Cloudflare Workers.
 *
 * Зачем: на GitHub Pages нельзя хранить ключ OpenRouter — страница публичная.
 * Этот воркер держит ключ у себя (секрет OPENROUTER_API_KEY), принимает запросы
 * только с вашего сайта и пропускает только разрешённые модели DeepSeek.
 *
 * Переменные (wrangler.toml / панель Cloudflare):
 *   OPENROUTER_API_KEY — секрет: `npx wrangler secret put OPENROUTER_API_KEY`
 *   ALLOWED_ORIGINS    — через запятую, например https://ignorov3-maker.github.io
 *   ALLOWED_MODELS     — через запятую; первая — модель по умолчанию
 *   MAX_TOKENS         — потолок длины ответа (по умолчанию 500)
 */
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': okOrigin ? origin : allowed[0] || 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const json = (status, message) => new Response(JSON.stringify({ error: { code: status, message } }), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { status: okOrigin ? 204 : 403, headers: cors });
    if (request.method !== 'POST') return json(405, 'Only POST');
    if (!okOrigin) return json(403, 'Origin not allowed');
    if (!env.OPENROUTER_API_KEY) return json(500, 'OPENROUTER_API_KEY is not set');

    let body;
    try { body = await request.json(); } catch { return json(400, 'Bad JSON'); }
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 30) return json(400, 'Bad messages');
    const size = JSON.stringify(body.messages).length;
    if (size > 24000) return json(413, 'Conversation is too long');

    const models = (env.ALLOWED_MODELS || 'deepseek/deepseek-v4-flash').split(',').map(s => s.trim()).filter(Boolean);
    const model = models.includes(body.model) ? body.model : models[0];
    const maxTokens = Math.min(Number(body.max_tokens) || 450, Number(env.MAX_TOKENS) || 500);

    const call = reasoningOff => fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': origin,
        'X-OpenRouter-Title': 'Vektor',
      },
      body: JSON.stringify({
        model,
        messages: body.messages.map(m => ({ role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 8000) })),
        stream: true,
        max_tokens: reasoningOff ? maxTokens : maxTokens + 600,
        temperature: typeof body.temperature === 'number' ? Math.min(1, Math.max(0, body.temperature)) : 0.4,
        reasoning: reasoningOff ? { enabled: false } : { exclude: true },
      }),
    });
    let upstream = await call(true);
    if (upstream.status === 400) {
      const msg = await upstream.clone().text();
      if (/reason|think/i.test(msg)) upstream = await call(false); // модель не умеет выключать рассуждения
    }

    // Поток пересылаем как есть (SSE)
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'Content-Type': upstream.headers.get('Content-Type') || 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  },
};
