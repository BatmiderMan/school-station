// نقشه‌ی راه آزمون‌های ماز: مسیر پیچ‌درپیچ ایستگاه‌ها + برگه‌ی جزئیات بودجه‌بندی هر آزمون
import { j2iso, daysLeft, isoToday } from './ui';
import { MAZE_SEED } from './mazedata';

export interface MPart { l: string; t: string; opts?: { l: string; t: string }[] }
export interface MSec { s: string; q: number; book?: number; parts: MPart[] }
export interface MStage { id: string; no: number; date: string; dateText?: string; zone?: string; zoneSub?: string; phase?: string; kind: string; title?: string; bars?: string[]; secs: MSec[]; note?: string; none?: string[] }
export interface MazePlan { v: number; info: any; tracks: { riazi: MStage[]; tajrobi: MStage[] }; prem: { riazi: MStage[]; tajrobi: MStage[] } }

export const seedMaze = (): MazePlan => JSON.parse(JSON.stringify(MAZE_SEED));
export const TRACKS: Record<string, { t: string; c: string }> = { tajrobi: { t: 'تجربی', c: '#16a34a' }, riazi: { t: 'ریاضی', c: '#4560b4' } };
export const trackOf = (cls: string): string => (/ریاضی/.test(cls || '') ? 'riazi' : /تجربی/.test(cls || '') ? 'tajrobi' : '');
const BOOK = ['', 'دفترچه‌ی اول', 'دفترچه‌ی دوم', 'دفترچه‌ی سوم'];
const KIND: Record<string, { i: string; t: string }> = { exam: { i: '', t: 'آزمون' }, review: { i: '🏁', t: 'ایستگاه جمع‌بندی و جبران' }, choice: { i: '🔀', t: 'آزمون انتخابی' }, sim: { i: '🏆', t: 'جامع شبیه‌ساز' }, prem: { i: '👑', t: 'پریمیوم' } };
const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const iso = (s: MStage) => (s.date ? j2iso(s.date) || '' : '');
export const stageLeft = (s: MStage) => { const i = iso(s); return i ? daysLeft(i) : null; };

export interface MView { track: string; lane: string; subj: string; open: string | null; set: string; esc: (s: any) => string; n: (v: any) => string; admin?: boolean }

function stagesOf(M: MazePlan, o: MView): MStage[] { return ((o.lane === 'prem' ? M.prem : M.tracks) as any)[o.track] || []; }
export function nextStage(M: MazePlan | null | undefined, track: string, lane = 'main'): MStage | null {
  if (!M || !track) return null; const L = ((lane === 'prem' ? M.prem : M.tracks) as any)[track] || [];
  return L.find((s: MStage) => { const d = stageLeft(s); return d != null && d >= 0; }) || null;
}
const fd = (x: any) => String(x).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
export const stageTitle = (s: MStage) => s.title || (s.kind === 'prem' ? `آزمون پریمیوم ${fd(s.no)}` : `آزمون ${fd(s.no)}`);

function fmtDate(s: MStage) {
  const i = iso(s); if (!i) return { day: '؟', mon: s.dateText || '', wd: '', full: s.dateText || 'به‌زودی' };
  const d = new Date(i + 'T12:00:00');
  return { day: d.toLocaleDateString('fa-IR', { day: 'numeric' }), mon: d.toLocaleDateString('fa-IR', { month: 'long' }), wd: d.toLocaleDateString('fa-IR', { weekday: 'long' }), full: d.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }) };
}
const leftText = (s: MStage, n: (v: any) => string) => { const d = stageLeft(s); return d == null ? '' : d < 0 ? 'برگزار شد' : d === 0 ? 'امروز' : d === 1 ? 'فردا' : `${n(d)} روز دیگر`; };

/* ---- مسیر پیچ‌درپیچ: نقاط ایستگاه‌ها ---- */
const ROW = 150, XL = 24, XR = 76;
function bez(p0: number[], p1: number[], p2: number[], p3: number[], t: number) { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]; }
function split(p0: number[], p1: number[], p2: number[], p3: number[], t: number) { // de Casteljau: بخش اول منحنی تا t
  const l = (a: number[], b: number[]) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], a = l(p0, p1), b = l(p1, p2), c = l(p2, p3), d = l(a, b), e = l(b, c), f = l(d, e); return [p0, a, d, f];
}

export function mazeView(M: MazePlan | null | undefined, o: MView): string {
  const { esc, n } = o;
  if (!M) return `<div class="c m" style="text-align:center;padding:30px">🗺 نقشه‌ی راه آزمون‌های ماز هنوز منتشر نشده است.</div>`;
  const tk = TRACKS[o.track] ? o.track : 'tajrobi', oo = { ...o, track: tk }, list = stagesOf(M, oo), isPrem = o.lane === 'prem';
  const set = (k: string, v: string) => `${o.set}('${k}','${v}')`;
  const nx = nextStage(M, tk, o.lane), allDated = list.filter((s) => stageLeft(s) != null), doneN = allDated.filter((s) => (stageLeft(s) as number) < 0).length;
  const subjects = [...new Set(list.flatMap((s) => s.secs.map((c) => c.s)))];

  /* بالای صفحه: انتخاب رشته/مسیر + کارت پیشرفت */
  const ctl = `<div class="mzctl"><div class="seg" style="margin:0">${Object.keys(TRACKS).map((k) => `<button class="${tk === k ? 'on' : ''}" onclick="${set('track', k)}">${TRACKS[k].t}</button>`).join('')}</div>
    <div class="seg" style="margin:0"><button class="${!isPrem ? 'on' : ''}" onclick="${set('lane', 'main')}">🗺 آزمون اصلی</button><button class="${isPrem ? 'on' : ''}" onclick="${set('lane', 'prem')}">👑 پریمیوم</button></div></div>`;
  const ring = (() => { const C = 2 * Math.PI * 28, fr = allDated.length ? doneN / allDated.length : 0; return `<div class="mzring"><svg width="74" height="74" viewBox="0 0 74 74"><circle cx="37" cy="37" r="28" fill="none" stroke="#ffffff30" stroke-width="7"/><circle cx="37" cy="37" r="28" fill="none" stroke="#7ee07a" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - fr)}" transform="rotate(-90 37 37)"/></svg><b>${n(doneN)}<small>/${n(allDated.length)}</small></b></div>`; })();
  const hero = `<div class="mzhero"><div class="mzhl"><small>${isPrem ? '👑 آزمون‌های پریمیوم ماز' : 'برنامه‌ی آزمون‌های ماز'} · ${esc(M.info?.year || '')} · ${TRACKS[tk].t}</small>
      ${nx ? `<h2>${esc(stageTitle(nx))}</h2><div class="mzhd">📅 ${esc(fmtDate(nx).full)}</div><button class="mzcta" onclick="${set('open', nx.id)}">بودجه‌بندی این آزمون ←</button>` : `<h2>آزمون پیش‌رویی در برنامه نیست</h2><div class="mzhd">همه‌ی ایستگاه‌ها گذشته‌اند.</div>`}</div>
    <div class="mzhr">${nx ? `<div class="mzcount"><b>${stageLeft(nx) === 0 ? 'امروز' : n(stageLeft(nx))}</b><span>${stageLeft(nx) === 0 ? 'روز آزمون' : 'روز مانده'}</span></div>` : ''}${ring}</div></div>`;
  const chips = subjects.length ? `<div class="mzsub"><button class="${!o.subj || o.subj === 'all' ? 'on' : ''}" onclick="${set('subj', 'all')}">همه‌ی دروس</button>${subjects.map((s) => `<button class="${o.subj === s ? 'on' : ''}" style="--h:${hue(s)}" onclick="${set('subj', s)}">${esc(s)}</button>`).join('')}</div>` : '';

  /* مسیر */
  const pts: { s: MStage; x: number; y: number; ban?: string; rib?: string; bh?: number; rh?: number }[] = []; let y = 76, lastZone = '', lastPhase = '';
  list.forEach((s) => {
    let ban = '', rib = '', bh = 0, rh = 0;
    if ((s.zone || '') !== lastZone) { ban = `<div class="mzban"><b>${esc(s.zone || '')}</b>${s.zoneSub ? `<span>${esc(s.zoneSub)}</span>` : ''}</div>`; bh = (s.zoneSub || '').length > 100 ? 142 : (s.zoneSub || '').length > 50 ? 122 : 98; y += bh; lastZone = s.zone || ''; lastPhase = ''; }
    if ((s.phase || '') !== lastPhase && s.phase) { rib = `<div class="mzrib"><span>${esc(s.phase)}</span></div>`; rh = (s.phase || '').length > 44 ? 80 : 58; y += rh; lastPhase = s.phase || ''; }
    pts.push({ s, x: pts.length % 2 ? XL : XR, y: y + 40, ban, rib, bh, rh }); y += ROW;
  });
  const H = y + 30;
  // موقعیت «شما اینجایید»: بین ایستگاه‌ها بر اساس تاریخ
  let me: { x: number; y: number; seg: number; t: number } | null = null;
  const dl = pts.map((p) => stageLeft(p.s));
  const firstFuture = dl.findIndex((d) => d != null && d >= 0);
  if (firstFuture === 0) me = { x: pts[0].x, y: pts[0].y - 70, seg: -1, t: 0 };
  else if (firstFuture > 0) { const a = pts[firstFuture - 1], b = pts[firstFuture], da = dl[firstFuture - 1] as number, db = dl[firstFuture] as number, t = Math.min(0.82, Math.max(0.22, da === db ? 0.5 : (0 - da) / (db - da)));
    const P0 = [a.x, a.y], P1 = [a.x, a.y + ROW * 0.55], P2 = [b.x, b.y - ROW * 0.55], P3 = [b.x, b.y], pos = bez(P0, P1, P2, P3, t); me = { x: pos[0], y: pos[1], seg: firstFuture - 1, t }; }
  else if (pts.length && dl.every((d) => d != null)) me = { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y + 60, seg: pts.length - 1, t: 1 };
  let road = '', done = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], P0 = [a.x, a.y], P1 = [a.x, a.y + (b.y - a.y) * 0.55], P2 = [b.x, b.y - (b.y - a.y) * 0.55], P3 = [b.x, b.y];
    const d0 = `M${a.x} ${a.y} C${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]} ${b.x} ${b.y}`; road += (i === 0 ? '' : ' ') + d0;
    if (me && i < me.seg) done += ` ${d0}`;
    else if (me && i === me.seg) { const q = split(P0, P1, P2, P3, me.t); done += ` M${q[0][0]} ${q[0][1]} C${q[1][0]} ${q[1][1]} ${q[2][0]} ${q[2][1]} ${q[3][0]} ${q[3][1]}`; }
  }
  const nodes = pts.map((p, i) => {
    const s = p.s, d = dl[i], st = d == null ? 'soon' : d < 0 ? 'past' : nx && nx.id === s.id ? 'next' : 'soon', K = KIND[s.kind] || KIND.exam, F = fmtDate(s), side = p.x === XR ? 'r' : 'l';
    const bars = (s.bars || []).slice(0, 2).map((b) => `<span class="mzbar">${b.split('').map((c) => `<i class="${c}"></i>`).join('')}</span>`).join('');
    let line = '';
    if (o.subj && o.subj !== 'all') {
      const sec = s.secs.find((c) => c.s === o.subj);
      line = sec && sec.parts.length ? `<div class="mzsl">${sec.parts.map((q) => `<span><b>${esc(q.l)}</b> ${esc((q.t || (q.opts && q.opts[0]?.t) || '').split('\n').filter((x) => !/^صفحه/.test(x)).slice(0, 2).join(' · '))}</span>`).join('')}</div>` : `<div class="mzsl none">این درس در این آزمون نیست</div>`;
    }
    const sub = '';
    return `${p.ban ? `<div class="mzbanw" style="top:${p.y - 40 - (p.bh || 0) - (p.rh || 0) + 14}px">${p.ban}</div>` : ''}${p.rib ? `<div class="mzribw" style="top:${p.y - 40 - (p.rh || 0) + 8}px">${p.rib}</div>` : ''}
      <button class="mznode ${st} ${s.kind}" style="left:${p.x}%;top:${p.y}px" onclick="${set('open', s.id)}" aria-label="${esc(stageTitle(s))}">${st === 'past' ? '✓' : K.i && s.kind !== 'prem' ? K.i : esc(n(s.no))}</button>
      <button class="mzlab ${side} ${st}" style="top:${p.y - 44}px" onclick="${set('open', s.id)}"><div class="mzld"><b>${esc(F.day)}</b><span>${esc(F.mon)}</span></div><div class="mzlt"><strong>${esc(stageTitle(s))}</strong><em>${esc(F.wd)}${leftText(s, n) ? ' · ' + esc(leftText(s, n)) : ''}</em>${sub}${line || (bars ? `<div class="mzbars">${bars}</div>` : '')}</div></button>`;
  }).join('');
  const meHtml = me ? `<div class="mzme" style="left:${me.x}%;top:${me.y}px"><span>🚀</span><i>شما اینجایید</i></div>` : '';
  const road_ = `<div class="mzroad" style="height:${H}px"><svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" width="100%" height="${H}"><path class="mzr0" d="${road}"/><path class="mzr1" d="${road}"/>${done ? `<path class="mzr2" d="${done}"/>` : ''}<path class="mzr3" d="${road}"/></svg>${nodes}${meHtml}</div>`;

  /* راهنماها */
  const info = M.info || {};
  const guide = `<div class="mzinfo"><details open><summary>⏰ برنامه‌ی روز آزمون (جمعه‌ها)</summary><div class="mzday">${(info.day || []).map((x: any) => `<div><b>${esc(x.t)}</b><span>${esc(x.l)}</span></div>`).join('')}</div></details>
    ${isPrem ? `<details open><summary>👑 شرایط شرکت در پریمیوم</summary><p>${esc(info.prem?.intro || '')}</p><ul>${(info.prem?.items || []).map((x: string) => `<li>${esc(x)}</li>`).join('')}</ul><p><b>${esc(info.prem?.start || '')}</b></p><p><b>شرایط:</b></p><ul>${(info.prem?.cond || []).map((x: string) => `<li>${esc(x)}</li>`).join('')}</ul><p>${esc(info.prem?.time || '')}</p><p class="m">${esc(info.prem?.note || '')}</p></details>`
    : `<details><summary>🚀 روند پیشروی آزمون ماز</summary><ul>${(info.progress || []).map((x: string) => `<li>${esc(x)}</li>`).join('')}</ul></details><details><summary>✨ ویژگی‌های آزمون‌های ماز</summary><ul>${(info.feats || []).map((x: string) => `<li>${esc(x)}</li>`).join('')}</ul></details>`}
    <div class="mzwarn">⚠ ${esc(info.hard || '')}</div></div>`;

  /* برگه‌ی جزئیات */
  const sheet = (() => { const s = list.find((x) => x.id === o.open); if (!s) return ''; const F = fmtDate(s), K = KIND[s.kind] || KIND.exam, d = stageLeft(s);
    const bars = (s.bars || []).map((b) => `<div class="mzgb"><span class="mzbar big">${b.split('').map((c) => `<i class="${c}"></i>`).join('')}</span></div>`).join('');
    const books = [...new Set(s.secs.map((c) => c.book || 0))].sort();
    const part = (p: MPart) => { const body = (t: string) => { const ls = t.split('\n').filter(Boolean), pg = ls.filter((x) => /^صفحه/.test(x)), rest = ls.filter((x) => !/^صفحه/.test(x));
        return `<div class="mzpt">${rest.map((x, i) => `<div class="${i === 0 ? 'h' : ''}">${esc(x)}</div>`).join('')}${pg.map((x) => `<span class="mzpg">📄 ${esc(x)}</span>`).join('')}</div>`; };
      return `<div class="mzpart">${p.l ? `<span class="mzpl">${esc(p.l)}</span>` : ''}${p.t ? body(p.t) : ''}${(p.opts || []).map((q) => `<div class="mzopt"><em>${esc(q.l)}</em>${body(q.t)}</div>`).join('')}</div>`; };
    const secCard = (c: MSec) => `<div class="mzsec ${o.subj === c.s ? 'hl' : ''}" style="--h:${hue(c.s)}"><div class="mzsh"><b>${esc(c.s)}</b><span>${esc(n(c.q))} سؤال</span></div>${c.parts.length ? c.parts.map(part).join('') : '<div class="m" style="padding:6px 2px">در این آزمون از این درس سؤالی نیست</div>'}</div>`;
    const sec = s.secs.filter((c) => !o.subj || o.subj === 'all' || c.s === o.subj);
    const total = s.secs.reduce((t, c) => t + (c.parts.length ? c.q : 0), 0);
    const body = s.secs.length ? books.map((b) => `${b ? `<h4 class="mzbk">📘 ${BOOK[b] || 'دفترچه'}</h4>` : ''}<div class="mzsg">${sec.filter((c) => (c.book || 0) === b).map(secCard).join('')}</div>`).join('') : `<div class="c m" style="text-align:center">${esc(s.note || 'بودجه‌بندی این آزمون پس از اعلام، اینجا قرار می‌گیرد.')}</div>`;
    return `<style>body{overflow:hidden}</style><div class="mzov" onclick="${set('open', '')}"></div><div class="mzshc"><div class="mzgrab"></div><div class="mzsht"><div class="mzsd"><b>${esc(F.day)}</b><span>${esc(F.mon)}</span></div><div style="flex:1;min-width:0"><div class="mzk">${K.i} ${esc(isPrem ? 'پریمیوم' : TRACKS[tk].t)} · ${esc(K.t)}</div><h3>${esc(stageTitle(s))}</h3><div class="mzmeta">${esc(F.full)}${leftText(s, n) ? ` · <b class="st${d != null && d < 0 ? 'p' : ''}">${esc(leftText(s, n))}</b>` : ''}</div></div><button class="btn" onclick="${set('open', '')}">✕</button></div>
      ${s.phase ? `<div class="mzph">🧭 ${esc(s.phase)}</div>` : ''}
      ${bars ? `<div class="mzgoal"><div class="mzgt">هدف‌گذاری آزمون <small>(هر مربع یک بخش از مسیر پیشرفت؛ ■ تازه، ◧ مرور)</small></div>${(s.bars || []).map((b, i) => `<div class="mzgr"><span class="mzbar big">${b.split('').map((c) => `<i class="${c}"></i>`).join('')}</span><em>${i === 0 ? (s.kind === 'review' ? 'مرور' : 'نیم‌سال دوازدهم') : 'پایه'}</em></div>`).join('')}</div>` : ''}
      ${total ? `<div class="mzkpi"><span>📝 مجموع <b>${esc(n(total))}</b> سؤال</span><span>📘 <b>${esc(n(books.filter(Boolean).length))}</b> دفترچه</span><span>🧪 <b>${esc(n(s.secs.filter((c) => c.parts.length).length))}</b> درس</span></div>` : ''}
      ${s.kind === 'choice' ? `<div class="mzwarn">${esc(M.info?.choice || '')}</div>` : ''}
      ${body}${s.note && s.secs.length ? `<div class="c m" style="margin-top:8px">${esc(s.note)}</div>` : ''}${o.admin ? `<div class="tb" style="margin-top:12px"><button class="btn p" onclick="MZ_edit('${s.id}')">✎ ویرایش تاریخ و بودجه‌بندی</button></div>` : ''}</div>`; })();
  return `${hero}${ctl}${chips}${road_}${guide}${sheet}`;
}

/* ---- ویرایش مدیر ---- */
export function mkMazeAdmin(A: any) {
  const esc = A.esc, U = A.U, val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
  const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const M = (): MazePlan => { const p = A.D.plan; if (!p.maze) p.maze = seedMaze(); return p.maze; };
  const view = () => { U.MZ = U.MZ || { track: 'tajrobi', lane: 'main', subj: 'all', open: null, ed: null }; return U.MZ; };
  const find = (id: string): MStage | undefined => { const m = M(); return [...m.tracks.riazi, ...m.tracks.tajrobi, ...m.prem.riazi, ...m.prem.tajrobi].find((s) => s.id === id); };
  function page() {
    const v = view();
    const body = mazeView(M(), { track: v.track, lane: v.lane, subj: v.subj, open: v.ed ? null : v.open, set: 'MZ_set', esc, n: A.n, admin: true });
    const ed = v.ed ? editor(find(v.ed)) : '';
    const dates = datesTable(v);
    return `${ed}${body}${dates}`;
  }
  function datesTable(v: any) {
    const L = ((v.lane === 'prem' ? M().prem : M().tracks) as any)[v.track] as MStage[];
    return `<details class="c" style="margin-top:14px"><summary style="cursor:pointer"><b>📅 تنظیم تاریخ آزمون‌ها</b> <span class="m">(${TRACKS[v.track].t} · ${v.lane === 'prem' ? 'پریمیوم' : 'آزمون اصلی'})؛ با تغییر تاریخ، نقشه‌ی راه و شمارش معکوس دانش‌آموزان خودکار به‌روز می‌شود</span></summary>
      <div class="tw" style="margin-top:8px"><table><thead><tr><th>#</th><th>آزمون</th><th>تاریخ شمسی</th><th></th></tr></thead><tbody>${L.map((s) => `<tr style="cursor:default"><td>${A.n(s.no)}</td><td>${esc(stageTitle(s))}</td><td><input id="mzd_${s.id}" dir="ltr" value="${esc(s.date)}" placeholder="1405/08/15" style="width:130px"> ${s.date ? '' : `<span class="m">${esc(s.dateText || '')}</span>`}</td><td><button class="btn" onclick="MZ_date('${s.id}')">ذخیره</button> <button class="btn" onclick="MZ_edit('${s.id}')">✎ بودجه</button></td></tr>`).join('')}</tbody></table></div>
      <div class="tb" style="margin-top:8px"><button class="btn" style="color:var(--bad)" onclick="MZ_reset()">بازگرداندن همه‌ی برنامه‌ی ماز به حالت اولیه (PDF)</button></div></details>`;
  }
  function editor(s?: MStage) {
    if (!s) return '';
    return `<div class="c mzed"><h3>✎ ${esc(stageTitle(s))}</h3>
      <div class="tb"><label class="m">تاریخ شمسی <input id="mze_date" dir="ltr" value="${esc(s.date)}" style="width:130px" placeholder="1405/08/15"></label><label class="m">یا متن تاریخ <input id="mze_dt" value="${esc(s.dateText || '')}" style="width:170px"></label><label class="m">عنوان (اختیاری) <input id="mze_title" value="${esc(s.title || '')}" style="min-width:220px"></label></div>
      ${s.secs.map((c, i) => `<div class="mzsec" style="--h:${(c.s.length * 37) % 360}"><div class="mzsh"><b>${esc(c.s)}</b><span>${A.n(c.q)} سؤال</span></div>${c.parts.map((p, j) => `<label class="m">${esc(p.l || 'مباحث')}${p.opts?.length ? ' (دارای گزینه‌ی انتخابی؛ متن گزینه‌ها را در PDF/اولیه ببینید)' : ''}</label><textarea id="mze_${i}_${j}" style="width:100%;min-height:62px">${esc(p.t)}</textarea>`).join('') || '<div class="m">این درس در این آزمون نیست.</div>'}</div>`).join('')}
      <textarea id="mze_note" placeholder="توضیح اضافه (اختیاری)" style="width:100%;min-height:50px">${esc(s.note || '')}</textarea>
      <div class="tb" style="margin-top:8px"><button class="btn p" onclick="MZ_save('${s.id}')">ذخیره</button><button class="btn" onclick="MZ_set('ed','')">انصراف</button></div></div>`;
  }
  const h = {
    MZ_set: (k: string, v: string) => { const m = view(); m[k] = v || null; if (k === 'track' || k === 'lane') { m.open = null; m.subj = 'all'; } A.draw(); },
    MZ_edit: (id: string) => { const m = view(); m.ed = id; m.open = null; A.draw(); window.scrollTo(0, 0); },
    MZ_date: (id: string) => { const s = find(id); if (!s) return; const v = latin(val('mzd_' + id)).trim(); if (v && !j2iso(v)) { A.toast('تاریخ را به شکل ۱۴۰۵/۰۸/۱۵ بنویسید'); return; } s.date = v; A.save(); A.draw(); A.toast('ذخیره شد ✓'); },
    MZ_save: (id: string) => { const s = find(id); if (!s) return; const d = latin(val('mze_date')).trim(); if (d && !j2iso(d)) { A.toast('تاریخ معتبر نیست'); return; }
      s.date = d; s.dateText = val('mze_dt').trim(); s.title = val('mze_title').trim(); s.note = val('mze_note').trim();
      s.secs.forEach((c, i) => c.parts.forEach((p, j) => { const el = document.getElementById(`mze_${i}_${j}`) as HTMLTextAreaElement | null; if (el) p.t = el.value.trim(); }));
      view().ed = null; A.save(); A.draw(); A.toast('ذخیره شد ✓'); },
    MZ_reset: () => { if (!confirm('همه‌ی برنامه‌ی ماز (تاریخ‌ها و متن‌ها) به حالت اولیه برگردد؟')) return; A.D.plan.maze = seedMaze(); A.save(); A.draw(); },
  };
  return { page, h, ensure: () => M() };
}
export { isoToday };
