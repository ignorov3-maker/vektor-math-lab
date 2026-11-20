// Методичка тем для серверной функции tutor: системный промпт собирает сервер, браузер его не присылает.
// Запуск: node tools/tutor-method.mjs        — пересобрать supabase/functions/tutor/method.ts
//         node tools/tutor-method.mjs --check — проверить, что файл совпадает с content/fractions.js (для тестов)
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('..', import.meta.url);
const ctx = { window: {}, console };
vm.createContext(ctx);
for (const f of ['content/visuals.js', 'content/fractions.js', 'content/geometry.js']) vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f });
const plain = html => String(html || '')
  .replace(/<span class="frac"><span>([^<]*)<\/span><span>([^<]*)<\/span><\/span>/g, '$1/$2')
  .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const out = {};
for (const t of [...ctx.window.VEKTOR_FRACTIONS.topics, ...ctx.window.VEKTOR_GEOMETRY.topics]) {
  const e = t.explain;
  out[t.id] = {
    title: t.title,
    text: [
      `Тема: «${t.title}» (раздел «${t.section === 'Геометрия' ? 'Наглядная геометрия' : 'Обыкновенные дроби'}», ${t.grade || 5} класс).`,
      `Цель: ${t.goal}`,
      `Наглядная модель: ${plain(e.model)}`,
      `Правило: ${plain(e.rule)}`,
      ...e.examples.map((x, k) => `Пример ${k + 1}: ${plain(x.q)} Решение: ${x.steps.map(plain).join(' ')}`),
      `Типичные ошибки: ${t.mistakes.map(m => `${plain(m.title)} — ${plain(m.say)}`).join('; ')}`,
    ].join('\n'),
    mistakes: Object.fromEntries(t.mistakes.map(m => [m.id, plain(m.title)])),
  };
}
const file = `// Сгенерировано: node tools/tutor-method.mjs — не править руками. Источник: content/fractions.js, content/geometry.js\n` +
  `export const METHOD: Record<string, { title: string; text: string; mistakes: Record<string, string> }> = ${JSON.stringify(out, null, 1)};\n`;
const path = new URL('supabase/functions/tutor/method.ts', root);
if (process.argv.includes('--check')) {
  let cur = ''; try { cur = readFileSync(path, 'utf8'); } catch {}
  if (cur !== file) { console.log('FAIL method.ts устарел: node tools/tutor-method.mjs'); process.exit(1); }
  console.log('OK method.ts совпадает с content/fractions.js и geometry.js');
} else { writeFileSync(path, file); console.log('записано', Object.keys(out).length, 'тем'); }
