// اجزای مشترک رابط: آیکون‌ها، پیام‌های شناور (toast)، تم روشن/تاریره
const ICO: any = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14c2.2.6 3.5 2.6 3.5 6"/>',
  clip: '<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4h6v3H9zM8.5 12h7M8.5 16h5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  cloud: '<path d="M7 18a4 4 0 010-8 5.5 5.5 0 0110.6 1.2A3.4 3.4 0 0117 18z"/>',
  tool: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  up: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  chat: '<path d="M4 5h16v11H10l-4 4v-4H4z"/>',
  bell: '<path d="M6 17v-6a6 6 0 1112 0v6l1.5 2h-15z"/><path d="M10 21a2 2 0 004 0"/>',
};
export const ic = (k: string) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[k] || ''}</svg>`;
export function toast(m: string) {
  const box = document.getElementById('toasts'); if (!box) return;
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; box.appendChild(t);
  setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3600);
}
export function setTheme(t: string) { document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('ss_theme', t); } catch (e) { /* ignore */ } }
export function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(cur === 'dark' ? 'light' : 'dark');
}
export function initUi() {
  try { const t = localStorage.getItem('ss_theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) { /* ignore */ }
  (window as any).alert = (m: any) => toast(String(m));
  (window as any).toggleTheme = toggleTheme;
  initJP();
}

/* ---------- اطلاعیه‌ها: انواع، تاریخ شمسی، کارت ---------- */
const esc_ = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const n_ = (v: number) => Math.round(v).toLocaleString('fa-IR');
export const ANN: any = {
  exam: { t: 'آزمون', c: '#e11d48', i: '📝' }, general: { t: 'اطلاعیه', c: '#3b82f6', i: '📢' }, exempt: { t: 'معافیت', c: '#10b981', i: '🏖️' },
  meeting: { t: 'جلسه', c: '#8b5cf6', i: '👥' }, deadline: { t: 'مهلت', c: '#f59e0b', i: '⏰' }, holiday: { t: 'تعطیلی', c: '#64748b', i: '🏫' },
};
export const latin = (t: string) => t.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
export function j2g(jy: number, jm: number, jd: number) {
  jy += 1595; let days = -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097); days %= 146097;
  if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
  gy += 4 * Math.floor(days / 1461); days %= 1461;
  if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  let gd = days + 1; const sal = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]; let gm = 0;
  for (gm = 0; gm < 13 && gd > sal[gm]; gm++) gd -= sal[gm];
  return [gy, gm, gd];
}
export function j2iso(s: string): string | null {
  const m = latin(s.trim()).match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/); if (!m) return null;
  const jy = +m[1], jm = +m[2], jd = +m[3]; if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  const [g, mm, dd] = j2g(jy, jm, jd); return `${g}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}
export function iso2j(iso: string) {
  const p = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso + 'T12:00:00'));
  const g = (t: string) => p.find((x) => x.type === t)!.value; return `${g('year')}/${g('month')}/${g('day')}`;
}
export const isoToday = () => { const t = new Date(), p = (x: number) => String(x).padStart(2, '0'); return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`; };
export const daysLeft = (iso: string) => Math.round((new Date(iso + 'T12:00:00').getTime() - new Date(isoToday() + 'T12:00:00').getTime()) / 86400000);
export function annHtml(a: any, extra = '') {
  const t = ANN[a.type] || ANN.general, dl = daysLeft(a.exp);
  return `<div class="ann" style="--ac2:${t.c}"><div class="ai">${t.i}</div><div class="ab"><div><b>${esc_(a.title)}</b>${a.pin ? ' 📌' : ''}</div><span class="tag" style="background:${t.c}22;border-color:${t.c}55;color:${t.c}">${t.t}</span>${a.ev ? ` <span class="tag">📅 ${esc_(a.ev)}</span>` : ''}${a.cls && a.cls !== 'all' ? ` <span class="tag">${esc_(a.cls)}</span>` : ''}${a.body ? `<p>${esc_(a.body)}</p>` : ''}<div class="m">${a.starts && daysLeft(a.starts) > 0 ? `⏳ از ${iso2j(a.starts)} نمایش داده می‌شود` : dl < 0 ? 'منقضی شده' : dl === 0 ? 'امروز آخرین روز نمایش است' : `${n_(dl)} روز دیگر نمایش داده می‌شود`}${a.starts && daysLeft(a.starts) <= 0 && a.starts !== a.exp ? ` · از ${iso2j(a.starts)}` : ''}</div>${extra}</div></div>`;
}

/* ---------- تقویم شمسی کوچک برای انتخاب تاریخ ---------- */
const JM = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const p2 = (x: number) => String(x).padStart(2, '0');
const jiso = (y: number, m: number, d: number) => { const [g, mm, dd] = j2g(y, m, d); return `${g}-${p2(mm)}-${p2(dd)}`; };
export const jlen = (y: number, m: number) => m < 7 ? 31 : m < 12 ? 30 : (Math.round((new Date(jiso(y + 1, 1, 1) + 'T12:00:00').getTime() - new Date(jiso(y, 12, 29) + 'T12:00:00').getTime()) / 864e5) === 2 ? 30 : 29);
export const jfirst = (y: number, m: number) => (new Date(jiso(y, m, 1) + 'T12:00:00').getDay() + 1) % 7; // شنبه = ۰
let JP: any = { id: '', y: 0, m: 0, min: '', cb: null };
function jpRender() {
  const box = document.getElementById('jpb')!, inp = document.getElementById(JP.id) as HTMLInputElement, { y, m } = JP;
  const sel = j2iso(inp.value || ''), today = isoToday(), off = jfirst(y, m); let cells = '';
  for (let i = 0; i < off; i++) cells += '<i></i>';
  for (let d = 1; d <= jlen(y, m); d++) { const iso = jiso(y, m, d), dis = JP.min && iso < JP.min; cells += `<button class="jd${iso === sel ? ' sel' : ''}${iso === today ? ' tod' : ''}${(off + d - 1) % 7 === 6 ? ' fri' : ''}" ${dis ? 'disabled' : ''} onclick="jpPick(${d})">${d.toLocaleString('fa-IR')}</button>`; }
  box.innerHTML = `<div class="jh"><button onclick="jpNav(-1)">▶</button><b>${JM[m - 1]} ${String(y).replace(/\d/g, (c) => '۰۱۲۳۴۵۶۷۸۹'[+c])}</b><button onclick="jpNav(1)">◀</button></div><div class="jw">${['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((x) => `<span>${x}</span>`).join('')}</div><div class="jg">${cells}</div><div class="jf"><button onclick="jpToday()">امروز</button><button onclick="jpClear()">پاک‌کردن</button><button onclick="jpClose()">بستن</button></div>`;
}
export function openJP(id: string, opts: any = {}) {
  let el = document.getElementById('jp');
  if (!el) { el = document.createElement('div'); el.id = 'jp'; el.innerHTML = '<div id="jpb"></div>'; el.addEventListener('click', (e: any) => { if (e.target.id === 'jp') jpClose(); }); document.body.appendChild(el); }
  const inp = document.getElementById(id) as HTMLInputElement, [y, m] = iso2j(j2iso(inp.value || '') || isoToday()).split('/').map(Number);
  JP = { id, y, m, min: opts.min === false ? '' : isoToday(), cb: opts.cb || null }; jpRender(); el.classList.add('on');
}
const jpClose = () => document.getElementById('jp')?.classList.remove('on');
function jpSet(v: string) { (document.getElementById(JP.id) as HTMLInputElement).value = v; if (JP.cb) JP.cb(v); jpClose(); }
export function initJP() {
  const W: any = window;
  W.openJP = openJP; W.jpClose = jpClose;
  W.jpNav = (k: number) => { JP.m += k; if (JP.m > 12) { JP.m = 1; JP.y++; } if (JP.m < 1) { JP.m = 12; JP.y--; } jpRender(); };
  W.jpPick = (d: number) => jpSet(`${JP.y}/${p2(JP.m)}/${p2(d)}`);
  W.jpToday = () => jpSet(iso2j(isoToday()));
  W.jpClear = () => jpSet('');
}
