// ЗАГЛУШКА Claude (CL-0). Экраны делает Codex по docs/contracts.md (CX-5, CX-6).
(function (root) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const RANK = { novice: 'Новичок', tracker: 'Следопыт', catcher: 'Ловец', master: 'Мастер жучков' };
  function renderBugs(el, { bugs = [], rank = 'novice' } = {}) {
    const art = root.VEKTOR_ART;
    el.innerHTML = `<h3>Мои жучки · ${RANK[rank] || RANK.novice}</h3>`
      + (bugs.length ? '<ul class="bug-list">' + bugs.map(b => `<li data-key="${esc(b.key)}" data-status="${esc(b.status)}">${art ? art.bug(b.key, { size: 40, status: b.status }) : ''} <b>${esc(b.kidName)}</b> — ${esc(b.title)}</li>`).join('') + '</ul>'
        : '<p>Пока ни одного жучка. Решай задачи — Дробик поможет их поймать.</p>');
  }
  function renderWorkshop(el, { stars = 0, owned = [], equipped = {}, onBuy, onEquip } = {}) {
    const items = (root.VEKTOR_DROBIK && root.VEKTOR_DROBIK.COSMETICS) || [];
    el.innerHTML = `<h3>Мастерская · ★ ${stars}</h3>` + (items.length ? '' : '<p>Скоро здесь появятся шапки и антенны для Дробика.</p>');
    items.forEach(it => {
      const b = document.createElement('button');
      const has = owned.includes(it.id);
      b.textContent = `${it.name} ${has ? (equipped[it.slot] === it.id ? '✓' : '') : '★' + it.price}`;
      b.onclick = () => (has ? onEquip && onEquip(it.slot, it.id) : onBuy && onBuy(it.id));
      el.appendChild(b);
    });
  }
  root.VEKTOR_COLLECTION = { renderBugs, renderWorkshop, stub: true };
})(typeof window !== 'undefined' ? window : globalThis);
