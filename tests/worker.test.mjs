// Запуск: node tests/worker.test.mjs — проверка прокси без сети (fetch подменён)
import worker from '../server/openrouter-worker.js';
let sent = null;
globalThis.fetch = async (url, init) => { sent = { url, body: JSON.parse(init.body), auth: init.headers.Authorization }; return new Response('data: [DONE]\n\n', { status: 200, headers: { 'Content-Type': 'text/event-stream' } }); };
const env = { OPENROUTER_API_KEY: 'sk-or-secret', ALLOWED_ORIGINS: 'https://ignorov3-maker.github.io', ALLOWED_MODELS: 'deepseek/deepseek-v4-flash,deepseek/deepseek-v4-pro', MAX_TOKENS: '500' };
const req = (origin, body, method = 'POST') => new Request('https://w.dev/', { method, headers: { Origin: origin, 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify(body) : undefined });
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
let r = await worker.fetch(req('https://evil.example', { messages: [{ role: 'user', content: 'hi' }] }), env);
ok(r.status === 403, 'foreign origin blocked');
r = await worker.fetch(req('https://ignorov3-maker.github.io', { model: 'openai/gpt-x', max_tokens: 5000, messages: [{ role: 'system', content: 's' }, { role: 'user', content: 'hi' }] }), env);
ok(r.status === 200 && sent.body.model === 'deepseek/deepseek-v4-flash' && sent.body.max_tokens === 500 && sent.auth === 'Bearer sk-or-secret', 'model allowlist, token cap, key added');
ok(r.headers.get('Access-Control-Allow-Origin') === 'https://ignorov3-maker.github.io', 'cors header');
r = await worker.fetch(req('https://ignorov3-maker.github.io', null, 'OPTIONS'), env);
ok(r.status === 204, 'preflight');
r = await worker.fetch(req('https://ignorov3-maker.github.io', { messages: [] }), env);
ok(r.status === 400, 'empty messages rejected');
console.log(fails ? `ошибок: ${fails}` : 'worker tests: ok'); process.exit(fails ? 1 : 0);
