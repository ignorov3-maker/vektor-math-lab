// CX-18. Только серверный вызов из БД. Не публикует CORS-доступ браузеру.
export async function handle(req: Request): Promise<Response> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return new Response('Forbidden', { status: 403 });
  if (req.method !== 'POST') return new Response('Only POST', { status: 405 });
  let body: any; try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400 }); }
  const d = body?.data || {};
  if (body.action === 'captcha') {
    const key = Deno.env.get('CAPTCHA_SERVER_KEY');
    if (!key || typeof d.token !== 'string' || !d.token || d.token.length > 8192) return Response.json({ ok: false });
    try {
      const r = await fetch('https://smartcaptcha.cloud.yandex.ru/validate', { method: 'POST',
        body: new URLSearchParams({ secret: key, token: d.token }), signal: AbortSignal.timeout(5000) });
      const j = await r.json();
      const site = Deno.env.get('SITE_URL');
      return Response.json({ ok: r.ok && j.status === 'ok' && !!site && j.host === new URL(site).hostname });
    } catch { return Response.json({ ok: false }); }
  }
  if (body.action !== 'send' || !['confirm', 'reset'].includes(d.kind) || typeof d.to !== 'string'
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.to) || d.to.length > 254) return new Response('Bad data', { status: 400 });
  let url: URL;
  try { url = new URL(d.url); if (url.protocol !== 'https:' || url.origin !== new URL(Deno.env.get('SITE_URL') || '').origin) throw Error(); }
  catch { return new Response('Bad link', { status: 400 }); }
  const subject = d.kind === 'reset' ? 'Вектор: сброс пароля' : 'Вектор: подтвердите почту';
  const text = `${subject}\n\nОткройте ссылку: ${url.href}\n\nЕсли вы не отправляли запрос, просто проигнорируйте письмо.`;
  const key = Deno.env.get('UNISENDER_KEY');
  if (!key) {
    if (Deno.env.get('MAIL_TEST_MODE') !== 'true') return new Response('Mail not configured', { status: 503 });
    console.log(JSON.stringify({ test_mail: true, to: d.to, subject, text }));
    return Response.json({ ok: true, test: true });
  }
  const sender = Deno.env.get('MAIL_FROM');
  if (!sender) return new Response('Sender not configured', { status: 503 });
  try {
    const r = await fetch('https://goapi.unisender.ru/ru/transactional/api/v1/email/send.json', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': key }, signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ message: { recipients: [{ email: d.to }], subject, from_email: sender, from_name: 'Вектор',
        body: { plaintext: text }, track_links: 0, track_read: 0 } }) });
    const result = await r.json();
    return r.ok && result.status === 'success' ? Response.json({ ok: true }) : new Response('Mail unavailable', { status: 502 });
  } catch { return new Response('Mail unavailable', { status: 502 }); }
}
Deno.serve(handle);
