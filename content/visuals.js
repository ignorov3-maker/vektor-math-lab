/* =========================================================
   Наглядные модели дробей: полоска, круг, пара полосок,
   числовая прямая, прямоугольник для умножения, смешанное число.
   Используются в методичках, задачах, чате наставника и лаборатории.
   ========================================================= */
(function () {
  'use strict';

  const f = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
  const W = 300;

  function barSvg(parts, shaded, { split = null, crossed = 0, y = 0, h = 44, label = null, width = W } = {}) {
    const w = width / parts;
    let s = '';
    for (let k = 0; k < parts; k++) {
      const cls = k < shaded ? (split != null && k >= split ? 'fig-on2' : 'fig-on') : (k >= parts - crossed ? 'fig-x' : 'fig-off');
      s += `<rect class="${cls}" x="${k * w + 1}" y="${y + 1}" width="${Math.max(1, w - 2)}" height="${h - 2}" rx="3"/>`;
    }
    if (crossed) for (let k = parts - crossed; k < parts; k++) s += `<path class="fig-cross" d="M${k * w + 6} ${y + 6}L${(k + 1) * w - 6} ${y + h - 6}"/>`;
    if (label) s += `<text class="fig-label" x="${width / 2}" y="${y - 8}" text-anchor="middle">${label}</text>`;
    return s;
  }

  function circleSvg(parts, on, cx, cy, r, { emptyIsEaten = false } = {}) {
    if (parts === 1) return `<circle class="${on ? 'slice' : 'slice eaten'}" cx="${cx}" cy="${cy}" r="${r}"/>`;
    return Array.from({ length: parts }, (_, k) => {
      const a1 = (k / parts) * 2 * Math.PI - Math.PI / 2, a2 = ((k + 1) / parts) * 2 * Math.PI - Math.PI / 2;
      const p = a => `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
      const filled = emptyIsEaten ? k >= on : k < on;
      return `<path class="slice${filled ? '' : ' eaten'}" d="M${cx},${cy} L${p(a1)} A${r},${r} 0 0 1 ${p(a2)} Z"/>`;
    }).join('');
  }

  function lineSvg(n, d, { width = W, max = Math.max(1, Math.ceil(n / d)) } = {}) {
    const x0 = 16, x1 = width - 16, y = 34, X = v => x0 + (x1 - x0) * v / max;
    let s = `<line class="fig-axis" x1="${x0}" y1="${y}" x2="${x1}" y2="${y}"/>`;
    for (let k = 0; k <= d * max; k++) {
      const whole = k % d === 0;
      s += `<line class="fig-tick" x1="${X(k / d)}" y1="${y - (whole ? 10 : 6)}" x2="${X(k / d)}" y2="${y + (whole ? 10 : 6)}"/>`;
      if (whole) s += `<text class="fig-label" x="${X(k / d)}" y="${y + 28}" text-anchor="middle">${k / d}</text>`;
    }
    s += `<line class="fig-span" x1="${X(0)}" y1="${y}" x2="${X(n / d)}" y2="${y}"/><circle class="fig-point" cx="${X(n / d)}" cy="${y}" r="7"/>`;
    return s;
  }

  // Рисунок по описанию { type, ... } → HTML
  function figure(fig) {
    if (!fig) return '';
    const wrap = (vw, vh, label, inner) => `<div class="figure"><svg viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}" role="img" aria-label="${label}">${inner}</svg></div>`;
    switch (fig.type) {
      case 'circle':
        return wrap(180, 180, `Круг из ${fig.parts} частей, ${fig.empty ?? fig.parts - fig.shaded} пустые`,
          fig.empty != null ? circleSvg(fig.parts, fig.empty, 90, 90, 80, { emptyIsEaten: true }) : circleSvg(fig.parts, fig.shaded, 90, 90, 80));
      case 'bar': {
        const h = fig.label ? 70 : 46;
        return wrap(W, h, `Полоска из ${fig.parts} частей, закрашено ${fig.shaded}`, barSvg(fig.parts, fig.shaded, { split: fig.split, crossed: fig.crossed, y: fig.label ? 24 : 0, label: fig.label }));
      }
      case 'pair':
        return wrap(W, 108, `Две полоски: ${fig.a[0]} из ${fig.a[1]} и ${fig.b[0]} из ${fig.b[1]}`, barSvg(fig.a[1], fig.a[0]) + barSvg(fig.b[1], fig.b[0], { y: 60 }));
      case 'line':
        return wrap(W, 72, `Числовая прямая, точка ${fig.n}/${fig.d}`, lineSvg(fig.n, fig.d));
      case 'mixed': {
        const r = 34, gap = 16, cnt = fig.whole + 1, vw = cnt * (2 * r + gap) - gap + 8;
        const inner = Array.from({ length: cnt }, (_, j) => circleSvg(fig.d, j < fig.whole ? fig.d : fig.n, r + 4 + j * (2 * r + gap), r + 4, r)).join('');
        return wrap(vw, 2 * r + 8, `${fig.whole} целых круга и ещё ${fig.n} из ${fig.d}`, inner);
      }
      case 'grid': {
        const cw = 50, chh = 34, h = fig.rows * chh + 2;
        let s = '';
        for (let r = 0; r < fig.rows; r++) for (let c = 0; c < fig.cols; c++) {
          const cls = r < fig.r && c < fig.c ? 'fig-on' : (r < fig.r || c < fig.c) ? 'fig-half' : 'fig-off';
          s += `<rect class="${cls}" x="${c * cw + 1}" y="${r * chh + 1}" width="${cw - 2}" height="${chh - 2}" rx="3"/>`;
        }
        return wrap(fig.cols * cw, h, `Прямоугольник ${fig.rows} на ${fig.cols}, закрашено ${fig.r * fig.c} клеток`, s);
      }
    }
    return '';
  }

  /* ---------- Теги рисунков в ответах наставника ----------
     [[полоска 3/5]]  [[круг 3/8]]  [[прямая 3/4]]
     [[сравнить 1/3 1/5]]  [[прямоугольник 2/3 3/4]]  [[смешанное 2 1/3]]       */
  const FR = '(\\d{1,2})\\s*\\/\\s*(\\d{1,2})';
  const ok = (n, d, maxD = 24) => d >= 1 && d <= maxD && n >= 0 && n <= d * 4;
  function figureFromTag(tag) {
    const t = tag.trim().toLowerCase().replace(/ё/g, 'е');
    let m;
    if ((m = t.match(new RegExp(`^(полоска|bar)\\s+${FR}$`))) && ok(+m[2], +m[3]) && +m[2] <= +m[3]) return { type: 'bar', parts: +m[3], shaded: +m[2] };
    if ((m = t.match(new RegExp(`^(круг|пицца|circle)\\s+${FR}$`))) && ok(+m[2], +m[3], 16) && +m[2] <= +m[3]) return { type: 'circle', parts: +m[3], shaded: +m[2] };
    if ((m = t.match(new RegExp(`^(прямая|line)\\s+${FR}$`))) && ok(+m[2], +m[3], 16)) return { type: 'line', n: +m[2], d: +m[3] };
    if ((m = t.match(new RegExp(`^(сравнить|compare)\\s+${FR}\\s+${FR}$`))) && ok(+m[2], +m[3]) && ok(+m[4], +m[5]) && +m[2] <= +m[3] && +m[4] <= +m[5]) return { type: 'pair', a: [+m[2], +m[3]], b: [+m[4], +m[5]] };
    if ((m = t.match(new RegExp(`^(прямоугольник|умножение|grid)\\s+${FR}\\s+${FR}$`))) && +m[3] <= 8 && +m[5] <= 8 && +m[2] <= +m[3] && +m[4] <= +m[5]) return { type: 'grid', rows: +m[3], cols: +m[5], r: +m[2], c: +m[4] };
    if ((m = t.match(new RegExp(`^(смешанное|mixed)\\s+(\\d)\\s+${FR}$`))) && +m[3] < +m[4] && +m[4] <= 12) return { type: 'mixed', whole: +m[2], n: +m[3], d: +m[4] };
    return null;
  }

  /* ---------- Лаборатория дробей ---------- */
  function labHtml(id, start = { n: 3, d: 5, k: 1 }) {
    return `<div class="lab" id="${id}" data-n="${start.n}" data-d="${start.d}" data-k="${start.k}">
      <div class="lab-controls">
        <div class="stepper"><span>Взяли частей</span><button type="button" data-act="n-" aria-label="Меньше частей">−</button><output data-out="n">${start.n}</output><button type="button" data-act="n+" aria-label="Больше частей">+</button></div>
        <div class="stepper"><span>Разделили на</span><button type="button" data-act="d-" aria-label="Меньше долей">−</button><output data-out="d">${start.d}</output><button type="button" data-act="d+" aria-label="Больше долей">+</button></div>
        <div class="stepper"><span>Разрезать каждую долю ещё на</span><button type="button" data-act="k-" aria-label="Меньше">−</button><output data-out="k">${start.k}</output><button type="button" data-act="k+" aria-label="Больше">+</button></div>
      </div>
      <div class="lab-view" aria-live="polite"></div>
    </div>`;
  }
  function labRender(el) {
    const n = +el.dataset.n, d = +el.dataset.d, k = +el.dataset.k, N = n * k, D = d * k;
    el.querySelector('[data-out="n"]').textContent = n;
    el.querySelector('[data-out="d"]').textContent = d;
    el.querySelector('[data-out="k"]').textContent = k;
    const view = el.querySelector('.lab-view');
    const whole = n >= d;
    view.innerHTML = `
      <div class="lab-big">${k > 1 ? `${f(n, d)} = ${f(N, D)}` : f(n, d)}</div>
      <div class="lab-figs">
        <svg viewBox="0 0 ${W} 46" width="${W}" height="46" role="img" aria-label="Полоска: ${N} из ${D}">${barSvg(D, Math.min(N, D))}</svg>
        <svg viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Круг: ${N} из ${D}">${circleSvg(D, Math.min(N, D), 60, 60, 54)}</svg>
        <svg viewBox="0 0 ${W} 72" width="${W}" height="72" role="img" aria-label="Числовая прямая">${lineSvg(n, d, { max: whole ? 2 : 1 })}</svg>
      </div>
      <p class="lab-say">${n === 0 ? 'Не взяли ни одной доли — это ноль.' : n === d ? 'Взяли все доли — это одно целое.' : n > d ? `Долей больше, чем в одном целом: это ${Math.floor(n / d)} целых${n % d ? ` и ещё ${f(n % d, d)}` : ''}.` : `Целое разделили на ${d} равных частей и взяли ${n}.`}
      ${k > 1 ? ` Каждую долю разрезали на ${k}: долей стало в ${k} раза больше, но закрашено столько же.` : ''}</p>`;
  }
  function labBind(root) {
    root.querySelectorAll('.lab:not([data-bound])').forEach(el => {
      el.dataset.bound = '1';
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        let n = +el.dataset.n, d = +el.dataset.d, k = +el.dataset.k;
        ({ 'n-': () => n = Math.max(0, n - 1), 'n+': () => n = Math.min(2 * d, n + 1), 'd-': () => { d = Math.max(1, d - 1); n = Math.min(n, 2 * d); }, 'd+': () => d = Math.min(12, d + 1), 'k-': () => k = Math.max(1, k - 1), 'k+': () => k = Math.min(4, k + 1) })[b.dataset.act]();
        Object.assign(el.dataset, { n, d, k });
        labRender(el);
      });
      labRender(el);
    });
  }

  window.VEKTOR_VISUALS = { f, figure, figureFromTag, labHtml, labBind };
})();
