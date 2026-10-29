// شبکه‌ی کارتیِ حضور و غیاب؛ مشترک بین نماینده‌ی کلاس و مدیر (مدیر و معاون یکی هستند).
// دانش‌آموز معاف هم در فهرست است (بنفش و خط‌چین): معافیت یعنی «نرفتن به کلاس»، نه «نبودن در مدرسه».
// فقط اگر اصلاً در مدرسه نیست، غایبش می‌کنید.

export interface GRow { id: string; name: string; cells: { s: string; t?: string | null }[]; ok?: boolean }
export interface GOpt {
  id: string;
  root: () => HTMLElement | null;
  esc: (s: any) => string;
  n: (v: any) => string;
  rows: () => GRow[];
  done: () => number[];
  ed: () => Record<string, string>;     // ویرایش‌های فعلی؛ کلید «شناسه|زنگ»، مقدار a یا l
  base: () => Record<string, string>;   // وضعیت ذخیره‌شده روی سرور
  save: (ps: number[], rows: { student_id: string; period: number; status: string }[]) => Promise<string | null>; // پیام خطا یا null
  top?: (ap: number) => string;         // محتوای بالای شبکه (کارت عنوان و ...)
  note?: (ap: number) => string;        // یادداشت زیر نوار زنگ‌ها
  toast?: (m: string) => void;
}

const INST: Record<string, any> = {};
let wired = false;
function wire() {
  if (wired) return; wired = true;
  document.addEventListener('click', (e: any) => {
    const el = e.target?.closest?.('[data-ag]') as HTMLElement | null; if (!el) return;
    const inst = INST[el.dataset.ag as string]; if (!inst) return; e.preventDefault(); inst.act(el.dataset.a as string, el.dataset);
  });
}
const EXL: any = { g: 'گروه', f: 'معلم', p: 'پیشرفت' };

export function mkAttGrid(o: GOpt) {
  const esc = o.esc, n = o.n, st = { ap: 0, busy: false };
  const ini = (nm: string) => { const w = nm.trim().split(/[\s\u200c]+/).filter(Boolean); return w.length > 1 ? w[0][0] + '\u200c' + w[w.length - 1][0] : (w[0] || '').slice(0, 2); };
  const dirtyP = (p: number) => { const ed = o.ed(), bs = o.base(); for (const k of new Set([...Object.keys(ed), ...Object.keys(bs)])) if (k.endsWith('|' + p) && (ed[k] || '') !== (bs[k] || '')) return true; return false; };
  const attr = (a: string, extra = '') => `data-ag="${o.id}" data-a="${a}" ${extra}`;

  function html(): string {
    const rows = o.rows(); if (!rows.length) return '';
    const per = rows[0].cells.length, done = o.done(), ps = Array.from({ length: per }, (_, i) => i + 1), ed = o.ed();
    if (!st.ap || st.ap > per) st.ap = ps.find((p) => !done.includes(p)) || 1;
    const ap = st.ap, dirty = ps.filter(dirtyP);
    // وضعیت یک خانه: p حاضر، a غایب، l تأخیر، x معاف (در مدرسه)، xa معاف ولی در مدرسه نیست، xl معاف ولی با تأخیر آمده
    const stOf = (r: GRow) => { const c = r.cells[ap - 1], v = ed[r.id + '|' + ap]; if (c.t) return v === 'a' ? 'xa' : v === 'l' ? 'xl' : 'x'; return v === 'a' ? 'a' : v === 'l' ? 'l' : 'p'; };
    const cnt: any = { a: 0, l: 0, x: 0, p: 0 }; rows.forEach((r) => { const s = stOf(r); cnt[s === 'xa' ? 'a' : s === 'xl' ? 'l' : s]++; });
    const subj = (p: number) => { const s0 = rows[0].cells[p - 1].s; return s0 === '—' ? '' : esc(s0); };
    const chips = `<div class="atps">${ps.map((p) => { const d = done.includes(p), dt = dirtyP(p); return `<button ${attr('pick', `data-p="${p}"`)} class="atp ${p === ap ? 'on' : ''} ${dt ? 'dt' : d ? 'ok' : ''}"><span class="no">${dt ? '●' : d ? '✓' : n(p)}</span><b>زنگ ${n(p)}</b><small>${subj(p) || (dt ? 'ثبت‌نشده' : d ? 'ثبت شد' : 'منتظر')}</small></button>`; }).join('')}</div>`;
    const pills = `<div class="atpills"><span class="atpill" style="color:#16a34a">✓ ${n(cnt.p)} حاضر</span><span class="atpill" style="color:#dc2626">❌ ${n(cnt.a)} غایب</span><span class="atpill" style="color:#d97706">⏰ ${n(cnt.l)} تأخیر</span><span class="atpill" style="color:#7c3aed">🟣 ${n(cnt.x)} معاف (در مدرسه)</span></div>`;
    const tools = `<div class="tb" style="margin:0 0 10px"><button class="btn" ${attr('allp')}>✓ همه حاضر</button>${ap > 1 ? `<button class="btn" ${attr('copy')}>⤵ غایب‌های زنگ ${n(ap - 1)} را بیاور</button>` : ''}</div>`;
    const cards = rows.map((r) => { const c = r.cells[ap - 1], s = stOf(r), off = r.ok === false, other = ps.filter((q) => q !== ap && ed[r.id + '|' + q] === 'a').length;
      const lab = off ? 'بدون حساب پنل' : s === 'xa' ? `❌ غایب · در مدرسه نیست (معاف ${EXL[c.t as string]})` : s === 'xl' ? `⏰ تأخیر (معاف ${EXL[c.t as string]})` : s === 'x' ? `🟣 معاف ${EXL[c.t as string]} · در مدرسه` : s === 'a' ? '❌ غایب' : s === 'l' ? '⏰ تأخیر' : other ? `حاضر · در ${n(other)} زنگ دیگر غایب` : '✓ حاضر';
      return `<div class="atc ${s}" ${off ? 'style="opacity:.55;cursor:default"' : attr('tap', `data-s="${r.id}"`)}><div class="av">${s === 'xa' || s === 'a' ? '✕' : s === 'x' ? '🟣' : s === 'l' || s === 'xl' ? '⏰' : esc(ini(r.name))}</div><div style="min-width:0"><div class="nm">${esc(r.name)}</div><div class="st">${lab}</div></div>${off ? '' : `<button class="dd" ${attr('day', `data-s="${r.id}"`)} title="غایب در کل روز (اصلاً در مدرسه نیست)">کل روز</button>`}</div>`; }).join('');
    const isDone = done.includes(ap), dtAp = dirtyP(ap), nA = cnt.a;
    const bar = `<div class="atbar">${dirty.length > 1 ? `<button class="btn" ${st.busy ? 'disabled' : ''} ${attr('saveall')}>ثبت همه (${n(dirty.length)} زنگ)</button>` : ''}<button class="btn p" ${st.busy ? 'disabled' : ''} ${attr('save')}>${st.busy ? '⏳ در حال ثبت…' : dtAp ? `ثبت زنگ ${n(ap)}${nA ? ` · ${n(nA)} غایب` : ''}` : isDone ? `✅ زنگ ${n(ap)} ثبت شده` : `ثبت زنگ ${n(ap)} · ${nA ? n(nA) + ' غایب' : 'همه حاضرند'}`}</button></div>`;
    const map = `<details class="c" style="margin-top:14px"><summary style="cursor:pointer"><b>نمای کلی روز</b> <span class="m">همه‌ی زنگ‌ها و دانش‌آموزان</span></summary><div class="tw" style="margin-top:8px"><table class="atmap"><thead><tr><th></th>${ps.map((p) => `<th style="text-align:center">${n(p)}</th>`).join('')}<th style="text-align:center">غیبت</th></tr></thead><tbody>${rows.map((r) => { const ab = ps.filter((p) => ed[r.id + '|' + p] === 'a').length;
      return `<tr style="cursor:default"><td style="white-space:nowrap">${esc(r.name)}</td>${ps.map((p) => { const c = r.cells[p - 1], v = ed[r.id + '|' + p], k = v === 'a' ? 'a' : v === 'l' ? 'l' : c.t ? 'x' : done.includes(p) ? 'ok' : 'n'; return `<td style="text-align:center"><span class="atdot ${k}" ${attr('pick', `data-p="${p}"`)}></span></td>`; }).join('')}<td style="text-align:center">${ab ? `<b class="dn">${n(ab)}</b>` : '<span class="m">—</span>'}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="m" style="margin:8px 0 0"><span class="atdot ok"></span> حاضر (ثبت‌شده) · <span class="atdot a"></span> غایب · <span class="atdot l"></span> تأخیر · <span class="atdot x"></span> معاف · <span class="atdot n"></span> هنوز ثبت نشده</p></details>`;
    return `${o.top ? o.top(ap) : ''}${chips}${o.note ? o.note(ap) : ''}${pills}${tools}<div class="atgrid">${cards}</div>${bar}${map}
    <div class="c exnote" style="margin-top:12px">🟣 <b>دانش‌آموز معاف</b> فقط به کلاس نمی‌رود و <b>غیبت حساب نمی‌شود</b>؛ ممکن است در مدرسه باشد. فقط اگر اصلاً در مدرسه نیست او را غایب کنید. روی هر کارت بزنید: حاضر ← غایب ← تأخیر (برای معاف هم همین‌طور: در مدرسه ← غایب ← تأخیر). «کل روز» او را برای همه‌ی زنگ‌ها غایب می‌کند. بعد از هر زنگ «ثبت» را بزنید.</div>`;
  }
  function refresh(center?: boolean) {
    const b = o.root(); if (!b) return; const sc = (b.querySelector('.atps') as HTMLElement | null)?.scrollLeft; b.innerHTML = html();
    const p2 = b.querySelector('.atps') as HTMLElement | null; if (p2 && sc != null) p2.scrollLeft = sc; if (center) (b.querySelector('.atp.on') as any)?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }
  async function save(ps: number[]) {
    if (!ps.length || st.busy) return; st.busy = true; refresh(); const ed = o.ed();
    const rows = Object.keys(ed).filter((k) => ps.includes(+k.split('|')[1])).map((k) => { const [sid, p] = k.split('|'); return { student_id: sid, period: +p, status: ed[k] === 'l' ? 'late' : 'absent' }; });
    const err = await o.save(ps, rows); st.busy = false;
    if (err) { alert(err); refresh(); return; }
    const done = o.done(), per = o.rows()[0]?.cells.length || 0;
    if (ps.length === 1 && ps[0] === st.ap) { const nx = Array.from({ length: per }, (_, i) => i + 1).find((q) => q > st.ap && !done.includes(q)); if (nx) st.ap = nx; }
    refresh(true); o.toast?.(`حضور و غیاب زنگ ${ps.map(n).join('، ')} ثبت شد ✓`);
  }
  function act(a: string, d: any) {
    const rows = o.rows(), ed = o.ed(), ap = st.ap;
    if (a === 'pick') { st.ap = +d.p; refresh(true); }
    else if (a === 'tap') { const r = rows.find((x) => x.id === d.s); if (!r) return; const k = d.s + '|' + ap, c = ed[k];
      if (!c) ed[k] = 'a'; else if (c === 'a') ed[k] = 'l'; else delete ed[k]; refresh(); }
    else if (a === 'day') { const r = rows.find((x) => x.id === d.s); if (!r) return; const ps = r.cells.map((_, i) => i + 1), all = ps.every((p) => ed[d.s + '|' + p] === 'a'); ps.forEach((p) => { if (all) delete ed[d.s + '|' + p]; else ed[d.s + '|' + p] = 'a'; }); refresh(); }
    else if (a === 'allp') { rows.forEach((r) => { delete ed[r.id + '|' + ap]; }); refresh(); }
    else if (a === 'copy') { rows.forEach((r) => { if (ed[r.id + '|' + (ap - 1)] === 'a') ed[r.id + '|' + ap] = 'a'; else delete ed[r.id + '|' + ap]; }); refresh(); }
    else if (a === 'save') save([ap]);
    else if (a === 'saveall') { const per = rows[0]?.cells.length || 0; save(Array.from({ length: per }, (_, i) => i + 1).filter(dirtyP)); }
  }
  INST[o.id] = { act }; wire();
  return { html, refresh, st, dirtyP };
}
