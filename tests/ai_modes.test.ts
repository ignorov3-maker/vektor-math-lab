// Запуск: bun tests/ai_modes.test.ts — режимы ИИ серверной функции (CL-8): промпты и проверка ответа модели
const env: Record<string,string> = { ALLOWED_ORIGINS: 'https://vektor.example', PREVIEW_ORIGIN_RE: 'https://vektor-[a-z0-9-]+-team\\.vercel\\.app' };
(globalThis as any).Deno = { env: { get: (k: string) => env[k] }, serve: () => {} };
const M = await import('../supabase/functions/tutor/index.ts');
let fails = 0; const ok = (c: boolean, m: string) => { if (!c) { fails++; console.log('FAIL', m); } };
const bugs = [{ id: 'add-denominators', title: 'Складывает числители и знаменатели' }, { id: 'forgot-scale-numerators', title: 'Не домножил числители' }];
const ids = bugs.map(b => b.id);
const c = M.buildMode('classify', { topic: 'add-diff', cond: '1/2 + 1/3', answer: '5/6', lines: [{ t: '= 2/5', v: '2/5' }], bugs, kid: 'мой тел 89161234567' })!;
ok(c.json && c.messages[0].role === 'system' && c.messages[0].content.includes('Ответь только JSON'), 'classify: системный промпт первым');
ok(c.messages[1].content.includes('add-denominators: Складывает'), 'classify: каталог темы — стабильная часть до задачи');
ok(c.messages[2].content.includes('[значение: 2/5]') && !c.messages[2].content.includes('89161234567'), 'classify: значения от движка, телефон вырезан');
ok(M.buildMode('classify', { topic: 'x', lines: [], bugs }) === null && M.buildMode('classify', { lines: [{ t: '1' }], bugs: [{ id: 'DROP TABLE' }] }) === null, 'classify: без строк или с кривыми id — отказ');
ok(M.buildMode('explain_more', { title: 'Складывает', fix: 'общий знаменатель', step: 'контрпример', task: '1/2+1/3' })!.json === false, 'explain_more: поток');
ok(M.buildMode('chat', {}) === null && M.buildMode('explain_more', {}) === null, 'неизвестный режим или пустые данные');
const v = (raw: string) => M.validClassify(raw, ids);
ok(v('{"bug":"add-denominators","confidence":0.92,"step":1,"kid_rule":"складываю всё"}').bug === 'add-denominators', 'верный ответ модели принят');
ok(v('```json\n{"bug":"add-denominators","confidence":0.9}\n```').bug === 'add-denominators', 'ответ в ```json``` принят');
ok(v('{"bug":"add-denominators","confidence":0.5}').bug === 'other', 'уверенность ниже 0,7 → other');
ok(v('{"bug":"rm -rf","confidence":0.99}').bug === 'other', 'id не из списка → other');
ok(v('не JSON вовсе').bug === 'other' && v('{"bug":"other","note":"путает знак"}').note === 'путает знак', 'мусор → other; заметка other сохраняется');
ok(M.allowedOrigin('https://vektor.example') && M.allowedOrigin('https://vektor-pr23-team.vercel.app'), 'CORS: сайт и предпросмотр');
ok(!M.allowedOrigin('https://evil.example') && !M.allowedOrigin(null) && !M.allowedOrigin('https://vektor-pr23-team.vercel.app.evil.example'), 'CORS: чужой, пустой и поддельный адрес запрещены');
let calls = 0;
globalThis.fetch = (async () => { calls++; throw Error('must not call'); }) as any;
for (const origin of [null, 'https://evil.example']) {
  const r = await M.handle(new Request('https://edge.example', { method: 'POST', headers: origin ? { Origin: origin } : {}, body: '{}' }));
  ok(r.status === 403 && r.headers.get('Vary') === 'Origin', 'CORS: 403 до базы и модели');
}
ok(calls === 0, 'чужой Origin не списывает лимит');
const preflight = await M.handle(new Request('https://edge.example', { method: 'OPTIONS', headers: { Origin: 'https://vektor.example' } }));
ok(preflight.status === 204 && preflight.headers.get('Access-Control-Allow-Origin') === 'https://vektor.example', 'CORS: точный Origin в ответе');
env.SUPABASE_URL = 'https://db.example'; env.SUPABASE_SERVICE_ROLE_KEY = 'service-test'; env.OPENROUTER_API_KEY = 'model-test';
let spends: any[] = [];
globalThis.fetch = (async (url: string, options: any) => {
  if (String(url).endsWith('vk_ai_take')) return Response.json({ ok: true, student_id: 1 });
  if (String(url).endsWith('vk_ai_spend')) { spends.push(JSON.parse(options.body)); return Response.json(null); }
  let piece = 0;
  return new Response(new ReadableStream({ pull(ctrl) {
    if (piece++ === 0) ctrl.enqueue(new TextEncoder().encode('data: '+JSON.stringify({choices:[{delta:{content:'Частичный ответ'}}],usage:{prompt_tokens:10,completion_tokens:4,cost:0.01}})+'\n\n'));
    else ctrl.error(new Error('upstream interrupted'));
  } }));
}) as any;
const interrupted = await M.handle(new Request('https://edge.example', { method: 'POST', headers: { Origin: 'https://vektor.example','Content-Type':'application/json' }, body: JSON.stringify({token:'test',messages:[{role:'user',content:'1+1'}]}) }));
try { await interrupted.text(); } catch {}
await new Promise(r => setTimeout(r, 20));
ok(spends.length === 1 && spends[0].p_usd === 0.01, 'CX-13: usage учтён после обрыва потока');
console.log(fails ? `ai_modes: ${fails} FAIL` : 'ai_modes: OK'); process.exit(fails ? 1 : 0);
