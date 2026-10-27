// ЗАГЛУШКА Claude (CL-0). Реализацию делает Codex по docs/contracts.md (CX-2).
(function (root) {
  'use strict';
  const STATES = ['idle', 'happy', 'thinking', 'confused', 'proud', 'shy', 'catching', 'celebrate', 'sleep'];
  const FACE = { idle: '•‿•', happy: '^‿^', thinking: '•_•', confused: '?', proud: '★‿★', shy: '•﹏•', catching: '>‿<', celebrate: '^o^', sleep: '-_-' };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function mount(el, { state = 'idle', size = 96, cosmetics = {}, charge = { done: 0, goal: 5 }, age = 'junior' } = {}) {
    const box = document.createElement('div');
    box.className = 'drobik-stub'; box.dataset.age = age;
    box.style.cssText = `display:inline-flex;flex-direction:column;align-items:center;gap:4px;font:600 ${Math.round(size / 5)}px system-ui`;
    el.appendChild(box);
    let st = state, ch = { ...charge }, bubble = '';
    const draw = () => {
      box.dataset.state = st;
      box.innerHTML = `${bubble ? `<div style="background:#fff;border:1px solid #ccc;border-radius:10px;padding:4px 8px;font-size:14px;font-weight:400">${esc(bubble)}</div>` : ''}`
        + `<div style="width:${size}px;height:${size}px;border-radius:30%;background:#1E7358;color:#fff;display:grid;place-items:center">${FACE[st] || FACE.idle}</div>`
        + `<div style="font-size:12px;color:#1E7358">${ch.done}/${ch.goal}</div>`;
    };
    draw();
    return {
      setState(name) { st = STATES.includes(name) ? name : 'idle'; draw(); },
      setCharge(done, goal) { ch = { done, goal: Math.min(10, Math.max(3, goal)) }; draw(); },
      setCosmetics(map) { cosmetics = { ...map }; },
      say(text, { voice = false } = {}) {
        bubble = text || ''; draw();
        if (voice && root.speechSynthesis && text) { const u = new SpeechSynthesisUtterance(text); u.lang = 'ru-RU'; root.speechSynthesis.speak(u); }
      },
      destroy() { box.remove(); },
    };
  }
  root.VEKTOR_DROBIK = { STATES, COSMETICS: [], mount, stub: true };
})(typeof window !== 'undefined' ? window : globalThis);
