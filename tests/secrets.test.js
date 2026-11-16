// Запуск: node tests/secrets.test.js. Без зависимостей; значения находок не печатаем.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');

function payload(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); }
  catch { return null; }
}

function entropy(value) {
  const counts = new Map();
  for (const c of value) counts.set(c, (counts.get(c) || 0) + 1);
  return [...counts.values()].reduce((sum, n) => sum - n / value.length * Math.log2(n / value.length), 0);
}

function scan(file, source) {
  const findings = [];
  const covered = [];
  function add(index, length, kind) {
    findings.push({ file, line: source.slice(0, index).split('\n').length, kind });
    covered.push([index, index + length]);
  }
  // Даже короткий пример с префиксом провайдера должен провалить проверку.
  for (const m of source.matchAll(/\bsk-or-[a-zA-Z0-9_-]+/g)) add(m.index, m[0].length, 'OpenRouter key');
  for (const m of source.matchAll(/\bsb_secret_[a-zA-Z0-9_-]+/g)) add(m.index, m[0].length, 'Supabase secret key');
  for (const m of source.matchAll(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g)) add(m.index, m[0].length, 'private key');

  // Исключение привязано к свойству supabaseKey, роли anon и одному файлу.
  const allowedAnon = new Set();
  if (file === 'config.js') {
    for (const m of source.matchAll(/\bsupabaseKey\s*:\s*(['"])([^'"\r\n]+)\1/g)) {
      if (payload(m[2])?.role === 'anon') allowedAnon.add(m.index + m[0].indexOf(m[2]));
    }
  }
  for (const m of source.matchAll(/\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g)) {
    const data = payload(m[0]);
    if (!data) continue;
    covered.push([m.index, m.index + m[0].length]);
    if (data.role === 'anon' && allowedAnon.has(m.index)) continue;
    add(m.index, m[0].length, data.role === 'service_role' ? 'service_role JWT' : 'JWT outside public anon config');
  }

  // Длинные непрозрачные токены: высокая энтропия, буквы и цифры.
  // Хеши, обычные идентификаторы и бинарные файлы не являются ключами.
  for (const m of source.matchAll(/[A-Za-z0-9_+-]{40,}={0,2}/g)) {
    if (covered.some(([start, end]) => m.index >= start && m.index < end)) continue;
    const token = m[0];
    if (/^[a-fA-F0-9]+$/.test(token)) continue;
    if (!/[a-zA-Z]/.test(token) || !/\d/.test(token) || entropy(token) < 4) continue;
    add(m.index, token.length, 'long opaque token');
  }
  return findings;
}

function selfTest() {
  // Синтетические значения собираем из частей: настоящих ключей в тесте нет.
  const router = ['sk', 'or', 'v1', 'test'].join('-');
  const jwt = role => [
    Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ role, iss: 'supabase', ref: 'test-project' })).toString('base64url'),
    Buffer.from('synthetic-signature-for-tests').toString('base64url')
  ].join('.');
  const opaque = Array.from({ length: 64 }, (_, i) => 'aB3dE6gH9jK2mN5pQ8sT1vW4yZ7cD0fG'[i % 32]).join('');
  assert(scan('new-file.txt', router).some(f => f.kind === 'OpenRouter key'));
  assert(scan('config.js', `supabaseKey: '${jwt('service_role')}'`).some(f => f.kind === 'service_role JWT'));
  assert.equal(scan('config.js', `supabaseKey: '${jwt('anon')}'`).length, 0);
  assert(scan('other.js', `supabaseKey: '${jwt('anon')}'`).length > 0);
  assert(scan('config.js', `otherKey: '${jwt('anon')}'`).length > 0);
  assert(scan('config.js', `supabaseKey: '${opaque}'`).length > 0);
  assert(scan('notes.md', opaque).some(f => f.kind === 'long opaque token'));
  assert.equal(scan('notes.md', '0123456789abcdef'.repeat(4)).length, 0);
  assert.equal(scan('notes.md', `example\n${router}`)[0].line, 2);
  assert(!JSON.stringify(scan('notes.md', router)).includes(router));
}

function main() {
  selfTest();
  // Включаем новые неигнорируемые файлы: локальная проверка работает ещё до git add.
  const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: ROOT, maxBuffer: 16 * 1024 * 1024
  }).toString('utf8').split('\0').filter(Boolean))].sort();
  const findings = [];
  for (const file of files) {
    const absolute = path.join(ROOT, file);
    if (!fs.existsSync(absolute) || !fs.lstatSync(absolute).isFile()) continue;
    const bytes = fs.readFileSync(absolute);
    const utf16 = (bytes[0] === 0xff && bytes[1] === 0xfe) || (bytes[0] === 0xfe && bytes[1] === 0xff);
    let source;
    if (utf16) {
      const body = Buffer.from(bytes.subarray(2));
      if (bytes[0] === 0xfe) body.swap16();
      source = body.toString('utf16le');
    } else {
      if (bytes.includes(0)) continue; // Бинарная графика, шрифты, PDF и т. п.
      source = bytes.toString('utf8');
    }
    findings.push(...scan(file, source));
  }
  for (const f of findings) console.error(`${f.file}:${f.line}: ${f.kind} (value hidden)`);
  console.log(findings.length ? `secrets: FAIL (${findings.length})` : `secrets: OK (${files.length} files)`);
  process.exitCode = findings.length ? 1 : 0;
}

if (require.main === module) main();
module.exports = { scan };
