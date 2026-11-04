// موتور مشترک نمودار خطی برنامه (پنل مدیر و پنل دانش‌آموز).
// ✔ محور زمان همیشه چپ ← راست است (قدیمی‌ترین آزمون چپ، تازه‌ترین راست)؛ پس خطی که بالا می‌رود یعنی واقعاً بهتر شده، حتی در صفحه‌ی راست‌به‌چپ.
// ✔ تعاملی: با ماوس روی نمودار بروید (یا با انگشت لمس کنید) تا جزئیات همان آزمون در یک کادر نشان داده شود.
export interface Ser { name?: string; c: string; v: (number | null)[]; w?: number; dash?: boolean; area?: boolean; dots?: boolean; lab?: 'all' | 'ends' }
export interface ChartOpts {
  h?: number; invert?: boolean; /** گردکردنِ بازه‌ی محور (مثلاً ۵۰۰ برای تراز) */ step?: number;
  fmt?: (x: number) => string; ref?: { v: number; c?: string; name: string };
  /** جزئیات اضافه‌ی هر نقطه در کادر (HTML امن)، به‌ازای شماره‌ی نقطه */ extra?: (i: number) => string;
}
const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const fa = (x: number) => (Math.round(x * 10) / 10).toLocaleString('fa-IR');
/** تغییر نسبت به قبل: فلشِ سبز ▲ = بهتر شد، فلشِ قرمز ▼ = بدتر شد؛ better = 'up' یعنی بیشتر شدن خوب است، 'down' یعنی کمتر شدن (مثل رتبه) */
export function chg(d: number | null | undefined, better: 'up' | 'down' = 'up', fmt: (x: number) => string = fa): string {
  if (d == null || !isFinite(d)) return '';
  if (d === 0) return '<span style="opacity:.7">＝ بدون تغییر</span>';
  const good = better === 'up' ? d > 0 : d < 0;
  return `<span style="color:var(${good ? '--ok' : '--bad'});font-weight:700">${good ? '▲' : '▼'} ${fmt(Math.abs(d))}</span>`;
}

export function lineChart(labels: string[], series: Ser[], o: ChartOpts = {}): string {
  const W = 640, H = o.h || 250, pl = 56, pr = 16, pt = 22, pb = 34, N = labels.length, fmt = o.fmt || fa;
  const vals = series.flatMap((s) => s.v).filter((x): x is number => x != null && isFinite(x));
  if (!vals.length) return '<p class="m">داده‌ای نیست</p>';
  let lo = Math.min(...vals), hi = Math.max(...vals); if (o.ref) { lo = Math.min(lo, o.ref.v); hi = Math.max(hi, o.ref.v); }
  if (o.step) { lo = Math.floor(lo / o.step) * o.step; hi = Math.ceil(hi / o.step) * o.step || lo + o.step; } else { const pad = (hi - lo) * 0.14 || Math.abs(hi) * 0.06 || 1; lo -= pad; hi += pad; }
  // زمان: قدیمی‌ترین (اندیس ۰) سمت چپ، تازه‌ترین سمت راست
  const ins = 22; // فاصله‌ی نقطه‌ها از لبه‌ها تا برچسب عددشان با اعداد محور قاطی نشود
  const X = (i: number) => (N < 2 ? (pl + W - pr) / 2 : pl + ins + ((W - pl - pr - 2 * ins) * i) / (N - 1));
  const Y = (v: number) => { const t = (v - lo) / (hi - lo || 1); return o.invert ? pt + (H - pt - pb) * t : pt + (H - pt - pb) * (1 - t); };
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" direction="ltr">`;
  const k0 = o.step ? Math.round((hi - lo) / o.step) : 0, dv = k0 >= 1 && k0 <= 6 ? k0 : 4; // محورِ تراز: خط‌ها روی عددهای گرد
  for (let k = 0; k <= dv; k++) { const v = lo + ((hi - lo) * k) / dv, y = Y(v); s += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="var(--bd)"/><text x="${pl - 7}" y="${y + 4}" text-anchor="end">${fmt(v)}</text>`; }
  const st = Math.ceil(N / 8); labels.forEach((l, i) => { if (i % st === 0 || i === N - 1) s += `<text x="${X(i).toFixed(1)}" y="${H - 12}" text-anchor="middle">${esc(l)}</text>`; });
  if (o.ref) { const y = Y(o.ref.v); s += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="${o.ref.c || '#888'}" stroke-dasharray="2 5" opacity=".75"/>`; }
  s += `<line class="ch-g" x1="0" x2="0" y1="${pt}" y2="${H - pb}" opacity="0"/>`;
  series.forEach((se) => {
    const pts = se.v.map((v, i) => (v == null || !isFinite(v) ? null : [X(i), Y(v), v, i])).filter(Boolean) as number[][];
    if (!pts.length) return;
    const d = pts.map((p, j) => (j ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    if (se.area && !o.invert) s += `<path d="${d} L${pts[pts.length - 1][0].toFixed(1)} ${H - pb} L${pts[0][0].toFixed(1)} ${H - pb} Z" fill="${se.c}" opacity=".13"/>`;
    s += `<path d="${d}" fill="none" stroke="${se.c}" stroke-width="${se.w || 2.6}" ${se.dash ? 'stroke-dasharray="6 5"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
    if (se.dots !== false) pts.forEach((p) => { s += `<circle class="ch-d" data-i="${p[3]}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${se.dash ? 2.6 : 4}" fill="${se.c}"/>`; });
    if (se.lab) pts.forEach((p, j) => { if (se.lab === 'all' || j === 0 || j === pts.length - 1) s += `<text x="${p[0].toFixed(1)}" y="${(p[1] + (o.invert ? 17 : -9)).toFixed(1)}" text-anchor="middle" style="fill:${se.c};font-weight:700">${fmt(p[2])}</text>`; });
  });
  s += '</svg>';
  // کادر جزئیات هر نقطه
  const xs: number[] = [], ys: number[] = [], tips: string[] = [];
  for (let i = 0; i < N; i++) {
    xs.push(+X(i).toFixed(1));
    const first = series.find((se) => se.v[i] != null && isFinite(se.v[i] as number)); ys.push(first ? +Y(first.v[i] as number).toFixed(1) : (pt + H - pb) / 2);
    const rows = series.filter((se) => se.v[i] != null && isFinite(se.v[i] as number)).map((se) => `<div><i style="color:${se.c}">${se.dash ? '┅' : '●'}</i> ${se.name ? esc(se.name) + ': ' : ''}<b>${fmt(se.v[i] as number)}</b></div>`).join('');
    tips.push(`<div class="cht-h">${esc(labels[i])}</div>${rows}${o.extra ? `<div class="cht-x">${o.extra(i) || ''}</div>` : ''}`);
  }
  const leg = series.filter((x) => x.name).map((x) => `<span><b style="color:${x.c}">${x.dash ? '┅' : '●'}</b> ${esc(x.name)}</span>`).join('') + (o.ref ? `<span><b style="color:${o.ref.c || '#888'}">┈</b> ${esc(o.ref.name)}</span>` : '');
  const data = esc(JSON.stringify({ W, H, xs, ys, tips }));
  return `<div class="ich" data-ch="${data}">${s}<div class="cht" hidden></div></div>` + (leg && series.filter((x) => x.name).length + (o.ref ? 1 : 0) > 1 ? `<div class="m" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:4px">${leg}</div>` : '');
}

/* ---------- تعامل (یک بار برای کل برنامه) ---------- */
let cur: HTMLElement | null = null;
function hide() {
  if (!cur) return;
  const t = cur.querySelector('.cht') as HTMLElement | null; if (t) t.hidden = true;
  cur.querySelector('.ch-g')?.setAttribute('opacity', '0'); cur.querySelectorAll('.ch-d.on').forEach((e) => e.classList.remove('on')); cur = null;
}
function show(box: HTMLElement, cx: number) {
  let d = (box as any)._d; if (!d) { try { d = JSON.parse(box.dataset.ch || ''); } catch (e) { return; } (box as any)._d = d; }
  const svg = box.querySelector('svg') as SVGElement | null, tip = box.querySelector('.cht') as HTMLElement | null; if (!svg || !tip) return;
  const r = svg.getBoundingClientRect(); if (!r.width) return;
  const xv = ((cx - r.left) / r.width) * d.W; let k = 0, best = 1e9; (d.xs as number[]).forEach((x, i) => { const dd = Math.abs(x - xv); if (dd < best) { best = dd; k = i; } });
  if (cur && cur !== box) hide(); cur = box;
  const g = box.querySelector('.ch-g'); if (g) { g.setAttribute('x1', d.xs[k]); g.setAttribute('x2', d.xs[k]); g.setAttribute('opacity', '.8'); }
  box.querySelectorAll('.ch-d').forEach((el) => el.classList.toggle('on', el.getAttribute('data-i') === String(k)));
  tip.innerHTML = d.tips[k]; tip.hidden = false; tip.style.left = '0px'; tip.style.top = '0px';
  const bx = box.getBoundingClientRect(), px = r.left - bx.left + (d.xs[k] / d.W) * r.width, py = r.top - bx.top + (d.ys[k] / d.H) * r.height, tw = tip.offsetWidth, th = tip.offsetHeight;
  tip.style.left = Math.max(2, Math.min(px - tw / 2, box.clientWidth - tw - 2)) + 'px';
  tip.style.top = (py - th - 12 >= -44 ? py - th - 12 : py + 14) + 'px'; // بالای نقطه؛ اگر جا نبود، پایین
}
if (typeof document !== 'undefined' && !(window as any).__ichInstalled) {
  (window as any).__ichInstalled = true;
  const on = (e: PointerEvent) => { const b = (e.target as Element | null)?.closest?.('.ich') as HTMLElement | null; if (b) show(b, e.clientX); else hide(); };
  document.addEventListener('pointermove', on); document.addEventListener('pointerdown', on);
  document.addEventListener('scroll', hide, true); document.documentElement.addEventListener('mouseleave', hide);
}
