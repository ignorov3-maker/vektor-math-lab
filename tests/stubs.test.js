// Запуск: node tests/stubs.test.js — интерфейсы модулей Codex по docs/contracts.md
globalThis.window = globalThis;
require('../content/drobik.js'); require('../content/art.js'); require('../content/collection.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const D = window.VEKTOR_DROBIK, A = window.VEKTOR_ART, C = window.VEKTOR_COLLECTION;
ok(D && Array.isArray(D.STATES) && Array.isArray(D.COSMETICS) && typeof D.mount === 'function', 'VEKTOR_DROBIK');
['idle','happy','thinking','confused','proud','shy','catching','celebrate','sleep'].forEach(s => ok(D.STATES.includes(s), 'состояние ' + s));
D.COSMETICS.forEach(c => ok(c.id && ['screen','antenna','hat','net'].includes(c.slot) && typeof c.price === 'number', 'косметика ' + c.id));
ok(A && typeof A.bug === 'function' && typeof A.interest === 'function', 'VEKTOR_ART');
ok(/<svg/.test(A.bug('add-same:add-denominators')) && /<svg/.test(A.bug('нет:такого', { status: 'beaten' })), 'bug() → svg, неизвестный ключ тоже');
['football','games','animals','space','cooking','music','drawing','cars','dance','robots','nature','sport'].forEach(i => ok(/<svg/.test(A.interest(i)), 'интерес ' + i));
ok(C && typeof C.renderBugs === 'function' && typeof C.renderWorkshop === 'function', 'VEKTOR_COLLECTION');
console.log(fails ? `stubs: ${fails} FAIL` : 'stubs: OK'); process.exit(fails ? 1 : 0);
