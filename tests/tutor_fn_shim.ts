// Запуск supabase/functions/tutor/index.ts под Bun для тестов: подменяем Deno.env и Deno.serve,
// а OpenRouter — фейковым сервером, который проверяет, что пришло, и отвечает потоком SSE.
const port = Number(process.env.FN_PORT), fakePort = Number(process.env.FAKE_PORT);
let last: any = null;
Bun.serve({ port: fakePort, async fetch(req) {
  const u = new URL(req.url);
  if (u.pathname === '/last') return Response.json(last);
  last = { auth: req.headers.get('authorization'), body: await req.json() };
  const usage = { prompt_tokens: 1200, completion_tokens: 60, cost: 0.00014 };
  if (last.body.response_format) { // режим classify: JSON без потока
    const u = String(last.body.messages.at(-1)?.content || '');
    const pick = u.includes('1/2 + 1/3') ? { bug: 'add-denominators', confidence: 0.91, step: 1, kid_rule: 'складываю всё подряд' }
      : u.includes('2/3') ? { bug: 'hack-id', confidence: 0.99 } : { bug: 'other', confidence: 0.4, note: 'путает знаки' };
    return Response.json({ model: last.body.model, choices: [{ message: { content: JSON.stringify(pick) } }], usage });
  }
  const sse = 'data: {"choices":[{"delta":{"content":"Подумай: на сколько частей разрезали?"}}]}\n\n'
    + 'data: ' + JSON.stringify({ model: last.body.model, choices: [{ delta: {}, finish_reason: 'stop' }], usage }) + '\n\ndata: [DONE]\n\n';
  return new Response(sse, { headers: { 'Content-Type': 'text/event-stream' } });
} });
(globalThis as any).Deno = {
  env: { get: (k: string) => ({ OPENROUTER_API_KEY: 'sk-test', OPENROUTER_URL: `http://127.0.0.1:${fakePort}/v1`, SUPABASE_URL: process.env.SB_URL, SUPABASE_SERVICE_ROLE_KEY: 'service-test' } as any)[k] },
  serve: (h: any) => Bun.serve({ port, fetch: h }),
};
await import('../supabase/functions/tutor/index.ts');
console.log('ready');
