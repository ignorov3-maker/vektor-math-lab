// Методичка тем для серверной функции tutor: системный промпт собирает сервер, браузер его не присылает.
// Запуск: node tools/tutor-method.mjs        — пересобрать supabase/functions/tutor/method.ts
//         node tools/tutor-method.mjs --check — проверить, что файл совпадает с исходными темами
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('..', import.meta.url);
const ctx = { window: {}, console };
vm.createContext(ctx);
const courseDir = new URL('content/courses/', root);
const courses = existsSync(courseDir) ? readdirSync(courseDir).filter(f => f.endsWith('.js')).sort().map(f => 'content/courses/' + f) : [];
for (const f of ['content/check.js', 'content/rational.js', 'content/tone.js', 'content/visuals.js', 'content/bugs.js', 'content/fractions.js', 'content/kit.js', 'content/tutor-visuals.js', 'content/tutor-constructor.js', ...courses]) vm.runInContext(readFileSync(new URL(f, root), 'utf8'), ctx, { filename: f });
const plain = html => String(html || '')
  .replace(/<span class="frac"><span>([^<]*)<\/span><span>([^<]*)<\/span><\/span>/g, '$1/$2')
  .replace(/<\/?[a-z][^>]*>/gi, '').replace(/&nbsp;/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const out = {};
for (const t of [...ctx.window.VEKTOR_FRACTIONS.topics, ...ctx.window.VEKTOR_KIT.topics.filter(t => t.course)]) {
  const e = t.explain;
  out[t.id] = {
    title: t.title,
    grade: t.grade || 5,
    visuals: ctx.window.VEKTOR_TUTOR_VISUALS.forTopic(t.id).map(({ tag, title, note }) => tag + ' ' + title + '. ' + note),
    text: [
      `Тема: «${t.title}» (раздел «${t.strand || 'Обыкновенные дроби'}», ${(t.grade || 5) < 5 ? 'повторение начальной школы' : (t.grade || 5) + ' класс'}).`,
      `Цель: ${t.goal}`,
      `Наглядная модель: ${plain(e.model)}`,
      `Правило: ${plain(e.rule)}`,
      ...e.examples.map((x, k) => `Пример ${k + 1}: ${plain(x.q)} Решение: ${x.steps.map(plain).join(' ')}`),
      `Типичные ошибки: ${t.mistakes.map(m => `${plain(m.title)} — ${plain(m.say)}`).join('; ')}`,
    ].join('\n'),
    mistakes: Object.fromEntries(t.mistakes.map(m => [m.id, plain(m.title)])),
  };
}
for (const diagram of ctx.window.VEKTOR_TUTOR_VISUALS.entries) {
  for (const id of diagram.topics) {
    if (!Object.hasOwn(out, id)) throw new Error('Неизвестная тема у схемы ' + diagram.id + ' — ' + id);
  }
}
const file = `// Сгенерировано: node tools/tutor-method.mjs — не править руками. Источник: учебные темы и content/tutor-visuals.js\n` +
  `export const VISUAL_CONSTRUCTOR_GUIDE = ${JSON.stringify(ctx.window.VEKTOR_TUTOR_CONSTRUCTOR.guide)};\n` +
  `export const METHOD: Record<string, { title: string; grade: number; visuals: string[]; text: string; mistakes: Record<string, string> }> = ${JSON.stringify(out, null, 1)};\n`;
const path = new URL('supabase/functions/tutor/method.ts', root);
if (process.argv.includes('--check')) {
  let cur = ''; try { cur = readFileSync(path, 'utf8'); } catch {}
  if (cur !== file) { console.log('FAIL method.ts устарел: node tools/tutor-method.mjs'); process.exit(1); }
  console.log('OK method.ts совпадает с content/fractions.js и content/courses');
} else { writeFileSync(path, file); console.log('записано', Object.keys(out).length, 'тем'); }
