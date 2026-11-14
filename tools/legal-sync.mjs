// Формирует SQL для владельца. Ничего не применяет и не открывает регистрацию.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const version = process.argv[2];
if (!version || !/^[a-zA-Z0-9._-]{1,60}$/.test(version)) throw Error('Укажите версию согласия: node tools/legal-sync.mjs VERSION');
const consent = readFileSync(new URL('../legal/consent.md', import.meta.url),'utf8');
const privacy = readFileSync(new URL('../legal/privacy.md', import.meta.url),'utf8');
if ([consent,privacy].some(t => t.trim().length < 100 || /текст готовит юрист/i.test(t))) throw Error('Нужны утверждённые тексты юриста');
const hash = t => createHash('sha256').update(t).digest('hex');
console.log(`update vk_settings set value = '${JSON.stringify({version,sha256:hash(consent),privacy_sha256:hash(privacy)})}'::jsonb where key='consent';`);
