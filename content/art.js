// ЗАГЛУШКА Claude (CL-0). Рисунки делает Codex по docs/contracts.md (CX-3, CX-4).
(function (root) {
  'use strict';
  const COLOR = { caught: '#E46A5E', healing: '#E0B300', beaten: '#1E7358' };
  const INTERESTS = ['football', 'games', 'animals', 'space', 'cooking', 'music', 'drawing', 'cars', 'dance', 'robots', 'nature', 'sport'];
  const bug = (key, { size = 64, status = 'caught' } = {}) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" data-bug="${String(key).replace(/"/g, '')}" data-status="${status}">`
    + `<ellipse cx="32" cy="36" rx="18" ry="20" fill="${COLOR[status] || COLOR.caught}"/><circle cx="32" cy="14" r="9" fill="${COLOR[status] || COLOR.caught}"/>`
    + `<circle cx="28" cy="13" r="2" fill="#fff"/><circle cx="36" cy="13" r="2" fill="#fff"/></svg>`;
  const interest = (id, { size = 32 } = {}) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" data-interest="${INTERESTS.includes(id) ? id : 'unknown'}">`
    + `<circle cx="16" cy="16" r="14" fill="#1E7358"/><text x="16" y="21" font-size="14" text-anchor="middle" fill="#fff">${(id || '?')[0].toUpperCase()}</text></svg>`;
  root.VEKTOR_ART = { bug, interest, INTERESTS, stub: true };
})(typeof window !== 'undefined' ? window : globalThis);
