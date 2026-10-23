// حضور و غیاب (سمت مدیر): «مرکز فرمان روز» + تب غیبت‌ها در پروفایل هر دانش‌آموز.
// نماینده‌ی کلاس غیبت را ثبت می‌کند (روی سرور)؛ مدیر اینجا می‌بیند، شرح می‌نویسد و با والدین تماس می‌گیرد.
import { sb } from './supa';
import { mkAttGrid } from './attgrid';

export function mkAttend(A: any) {
  const esc = A.esc, n = A.n, D = () => A.D, U = A.U;
  const AT: any = (U.AT = U.AT || { w: null, d: null, rows: [], sess: [], notes: [], hist: {}, loaded: '', days: [], cnt: {}, tab: 'abs', f: 'all', cf: 'all', pc: '', pp: 1, at: 0, err: '', busy: false, stu: {}, warmed: false });
  const acc = () => D().srv?.accounts || {};
  const sidOf = (lid: string) => acc()[lid]?.sid;
  const lidOfSid = (sid: string) => Object.keys(acc()).find((l) => acc()[l].sid === sid);
  const stuBy = (lid: string) => D().students.find((x: any) => x.id === lid);
  const iso = (w: number, d: number) => A.dateOf(w, d).toISOString().slice(0, 10);
  const fa = (day: string) => new Date(day + 'T12:00:00').toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
  const hhmm = (ts: string) => new Date(ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' });
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
  const chk = (id: string) => !!(document.getElementById(id) as HTMLInputElement | null)?.checked;
  const draw = () => A.draw();
  const tag = (t: string, bg?: string) => `<span class="tag" ${bg ? `style="background:${bg};color:#fff;border-color:${bg}"` : ''}>${t}</span>`;
  const errMsg = (e: any) => (/attendance|att_|function/i.test(e?.message || '') && /does not exist|find|schema|could not/i.test(e?.message || '') ? 'فایل supabase/update-9.sql هنوز روی سرور اجرا نشده است.' : e?.message || String(e));
  const todayIso = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });

  /* ---------- روز انتخاب‌شده ---------- */
  function initDay() {
    if (AT.w != null) return;
    const t = A.mid(new Date()).getTime(); let best: number[] | null = null;
    for (let w = A.wk0() - 1; w <= A.wk0() + 2 && !best; w++) for (let d = 0; d < 4; d++) if (A.mid(A.dateOf(w, d)).getTime() >= t) { best = [w, d]; break; }
    AT.w = best ? best[0] : A.wk0(); AT.d = best ? best[1] : 0;
  }
  const weekDays = (w: number) => [0, 1, 2, 3].map((d) => iso(w, d));
  const go = (w: number, d: number) => { AT.w = w; AT.d = d; if (typeof G !== 'undefined') G.st.ap = 0; if (AT.loaded === iso(w, 0)) draw(); else { draw(); load(true); } };
  const wk = (k: number) => go(AT.w + k, AT.d);
  const ini = (nm: string) => { const w = nm.trim().split(/[\s\u200c]+/).filter(Boolean); return w.length > 1 ? w[0][0] + '\u200c' + w[w.length - 1][0] : (w[0] || '').slice(0, 2); };

  /* ---------- بارگیری از سرور (کل هفته‌ی انتخاب‌شده) ---------- */
  async function load(force?: boolean) {
    if (!A.SV.isMgr()) return;
    initDay(); const days = weekDays(AT.w), key = days[0];
    if (!force && AT.tried === key && Date.now() - AT.at < 20000) return;
    if (AT.busy) return; AT.busy = true; AT.err = ''; AT.tried = key; AT.at = Date.now();
    try {
      const [a, s, nn, hh] = await Promise.all([
        sb.from('attendance').select('*').in('day', days), sb.from('att_sessions').select('*').in('day', days), sb.from('att_notes').select('*').in('day', days),
        sb.from('attendance').select('student_id,day,status').limit(20000)]);
      const bad = [a, s, nn].find((x: any) => x.error); if (bad) throw bad.error;
      AT.rows = a.data || []; AT.sess = s.data || []; AT.notes = nn.data || []; AT.days = days;
      const m: any = {}, cn: any = {}; (hh.data || []).forEach((r: any) => { (m[r.student_id] = m[r.student_id] || new Set()).add(r.day); if (r.status === 'absent') (cn[r.day] = cn[r.day] || new Set()).add(r.student_id); });
      AT.hist = m; AT.cnt = Object.fromEntries(Object.keys(cn).map((k) => [k, cn[k].size])); AT.loaded = key;
    } catch (e: any) { AT.err = errMsg(e); }
    AT.busy = false; AT.at = Date.now(); (A.bg || A.draw)();
  }
  function warm() { if (AT.warmed || !A.SV.isMgr()) return; AT.warmed = true; load(true); }
  setInterval(() => { const ae = document.activeElement as HTMLElement | null; if (U.p === 'day' && A.SV.isMgr() && !(ae && /TEXTAREA|INPUT|SELECT/.test(ae.tagName))) load(true); }, 30000);

  /* ---------- مدل روز ---------- */
  function model() {
    const w = AT.w, d = AT.d, day = iso(w, d), Ls = [...new Set<string>(A.CL.map((c: string) => A.letterC(c, d, w)))], L = Ls.join('·'), per = A.D.ex.per, ok = AT.loaded === iso(w, 0);
    const R = AT.rows.filter((r: any) => r.day === day), S = AT.sess.filter((x: any) => x.day === day), N = AT.notes.filter((x: any) => x.day === day);
    const classes = A.CL.map((cl: string) => {
      const ss = D().students.filter((s: any) => s.cls === cl).sort(A.byNum).map((s: any) => {
        const sid = sidOf(s.id), cells = Array.from({ length: per }, (_, p) => {
          const ex = A.status(s.id, cl, w, d, p), rec = sid ? R.find((r: any) => r.student_id === sid && r.period === p + 1) : null;
          return { ex, st: rec?.status || '', done: S.some((x: any) => x.cls === cl && x.period === p + 1) };
        });
        return { s, sid, cells };
      });
      return { cl, ss, sessions: Array.from({ length: per }, (_, p) => S.find((x: any) => x.cls === cl && x.period === p + 1) || null) };
    });
    const abs: any[] = [];
    classes.forEach((c: any) => c.ss.forEach((x: any) => { const mine = x.sid ? R.filter((r: any) => r.student_id === x.sid) : []; if (!mine.length) return;
      const note = N.find((q: any) => q.student_id === x.sid);
      abs.push({ ...x, cl: c.cl, rows: mine, periods: mine.map((r: any) => r.period).sort((a: number, b: number) => a - b), full: mine.some((r: any) => r.status === 'absent'), note: note?.note || '', called: !!note?.called }); }));
    const needs = (a: any) => !a.note && !a.called;
    abs.sort((x, y) => (needs(y) ? 1 : 0) - (needs(x) ? 1 : 0) || x.cl.localeCompare(y.cl, 'fa'));
    const exemptCount = classes.reduce((t: number, c: any) => t + c.ss.filter((x: any) => x.cells.some((q: any) => q.ex)).length, 0);
    const total = classes.length * per, done = classes.reduce((t: number, c: any) => t + c.sessions.filter(Boolean).length, 0);
    const absSt = new Set(R.filter((r: any) => r.status === 'absent').map((r: any) => r.student_id)), lateSt = new Set(R.filter((r: any) => r.status === 'late' && !absSt.has(r.student_id)).map((r: any) => r.student_id));
    const strip = [0, 1, 2, 3].map((dd) => { const dy = iso(w, dd), ab = new Set(AT.rows.filter((r: any) => r.day === dy && r.status === 'absent').map((r: any) => r.student_id)).size, sc = AT.sess.filter((x: any) => x.day === dy).length; const Lz = [...new Set<string>(A.CL.map((c: string) => A.letterC(c, dd, w)))]; return { d: dd, day: dy, ab, sc, L: Lz.join('·'), L0: Lz[0] }; });
    return { w, d, day, L, L0: Ls[0], per, ok, classes, abs, needs, exemptCount, done, total, unmarked: total - done, absN: absSt.size, lateN: lateSt.size, strip };
  }
  const badge = () => { if (!A.SV.isMgr() || !AT.days?.includes(todayIso())) return 0; const t = todayIso(), sids = new Set<string>(AT.rows.filter((r: any) => r.day === t).map((r: any) => r.student_id)); let c = 0; sids.forEach((sid: string) => { const nt = AT.notes.find((q: any) => q.student_id === sid && q.day === t); if (!nt?.note && !nt?.called) c++; }); return c; };

  /* ---------- اجزای نمایش ---------- */
  const mon = (day: string) => new Date(day + 'T12:00:00').toLocaleDateString('fa-IR', { month: 'long' });
  const dnum = (day: string) => new Date(day + 'T12:00:00').toLocaleDateString('fa-IR', { day: 'numeric' });
  const gcol = (L: string) => A.GC[A.GL.indexOf(L)];
  const EXN: any = { g: 'گروه', f: 'معلم', p: 'پیشرفت' }, EXI: any = { g: '👥', f: '🎓', p: '🚀' };

  function hero(M: any) {
    const C = 2 * Math.PI * 26, frac = M.total ? M.done / M.total : 0, isToday = M.day === todayIso();
    return `<div class="dyhero"><div class="atring"><svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="#ffffff44" stroke-width="6"/><circle cx="32" cy="32" r="26" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}" transform="rotate(-90 32 32)"/></svg><b>${n(M.done)}/${n(M.total)}</b></div>
      <div style="flex:1;min-width:0"><small>${isToday ? '🟢 امروز' : 'مرکز فرمان روز'}</small><h2>${fa(M.day)}</h2><small>گروه ${M.L} معاف · ${n(M.done)} از ${n(M.total)} زنگ‌کلاس ثبت شده</small></div>
      <div style="display:flex;flex-direction:column;gap:6px"><button class="dyref" onclick="AT_ref()" title="به‌روزرسانی">${AT.busy ? '⏳' : '🔄'}</button><button class="dyref" onclick="AT_today()">امروز</button></div></div>`;
  }
  function weekStrip(M: any) {
    const t = todayIso();
    const days = M.strip.map((x: any) => `<button class="dyd ${x.d === M.d ? 'on' : ''} ${x.day === t ? 'td' : ''}" onclick="AT_go(${M.w},${x.d})"><small>${A.DAYN[x.d]}</small><b>${dnum(x.day)}</b><span>${mon(x.day)}</span><i style="background:${gcol(x.L0)}">${x.L}</i>${x.ab ? `<em>${n(x.ab)}</em>` : x.sc ? '<u>✓</u>' : ''}</button>`).join('');
    return `<div class="dywk"><button class="btn" onclick="AT_wk(-1)">▶</button><div class="dyds">${days}</div><button class="btn" onclick="AT_wk(1)">◀</button></div>`;
  }
  function heat(M: any) {
    const t = todayIso(), rows = [];
    for (let w = M.w - 5; w <= M.w + 1; w++) { const first = iso(w, 0);
      rows.push(`<tr><td class="m" style="white-space:nowrap;font-size:12px">${dnum(first)} ${mon(first)}</td>${[0, 1, 2, 3].map((d) => { const dy = iso(w, d), c = AT.cnt?.[dy] || 0, fut = dy > t, lv = c >= 6 ? 4 : c >= 3 ? 3 : c >= 1 ? 2 : 0;
        return `<td><button class="dyh l${lv} ${w === M.w && d === M.d ? 'on' : ''} ${dy === t ? 'td' : ''} ${fut ? 'fu' : ''}" onclick="AT_go(${w},${d})">${c ? n(c) : '·'}</button></td>`; }).join('')}</tr>`); }
    return `<details class="c" style="margin:10px 0"><summary style="cursor:pointer"><b>📆 مرور هفته‌های اخیر</b> <span class="m">تعداد غایب هر روز؛ برای رفتن به آن روز بزنید</span></summary><div class="tw" style="margin-top:8px"><table class="dyheat"><thead><tr><th></th>${[0, 1, 2, 3].map((d) => `<th style="text-align:center">${A.DAYN[d]}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>
      <p class="m" style="margin:6px 0 0"><span class="dyh l0" style="display:inline-grid;width:18px;height:18px"></span> ۰ <span class="dyh l2" style="display:inline-grid;width:18px;height:18px"></span> ۱–۲ <span class="dyh l3" style="display:inline-grid;width:18px;height:18px"></span> ۳–۵ <span class="dyh l4" style="display:inline-grid;width:18px;height:18px"></span> ۶+</p></details>`;
  }
  function kpis(M: any) {
    const noRes = M.abs.filter((a: any) => M.needs(a)).length, k = (ic: string, b: any, t: string, col: string, hot?: boolean) => `<div class="dykp ${hot ? 'hot' : ''}" style="--kc:${col}"><span>${ic}</span><b>${n(b)}</b><small>${t}</small></div>`;
    return `<div class="dykps">${k('❌', M.absN, 'غایب', '#dc2626', M.absN > 0)}${k('⏰', M.lateN, 'متأخر', '#d97706')}${k('🔒', M.exemptCount, 'دارای معافیت', '#7c3aed')}${k('📞', noRes, 'نیازمند تماس', '#e11d48', noRes > 0)}${k('⚪', M.unmarked, 'زنگِ ثبت‌نشده', '#64748b')}</div>`;
  }
  function absCard(a: any, day: string) {
    const s = a.s, ph = s.phone ? esc(s.phone) : '', prev = (AT.hist[a.sid]?.size || 1) - 1, need = !a.note && !a.called, k = `${a.sid}_${day}`;
    return `<div class="dyab ${need ? 'need' : 'ok'}"><div class="dyah"><div class="av">${esc(ini(s.name))}</div><div style="flex:1;min-width:0"><b style="font-size:16px">${esc(s.name)}</b><div class="m">${a.cl} · ${prev > 0 ? `قبلاً ${n(prev)} روز غایب بوده` : 'اولین غیبت'}</div></div><div class="dyps">${a.rows.map((r: any) => `<span class="dyp ${r.status}">${r.status === 'late' ? '⏰' : '❌'} ${n(r.period)}</span>`).join('')}</div></div>
      ${need ? '<div class="dn" style="margin:8px 0 4px;font-size:13px">📞 هنوز تماس نگرفته‌اید و شرحی ننوشته‌اید.</div>' : ''}
      <div class="tb" style="margin:8px 0">${ph ? `<a class="btn p dycall" href="tel:${ph}">📞 تماس با والدین <span dir="ltr">${ph}</span></a>` : `<input id="ph_${s.id}" dir="ltr" inputmode="tel" placeholder="تلفن والدین (۰۹…)" style="width:170px"><button class="btn" onclick="AT_phone('${s.id}')">ذخیره‌ی شماره</button>`}<button class="btn" onclick="AT_prof('${s.id}')">پرونده ←</button></div>
      <textarea id="nt_${k}" placeholder="شرح غیبت (مثلاً: با مادرشان تماس گرفتم؛ بیمار بوده…)" style="width:100%;min-height:62px">${esc(a.note)}</textarea>
      <div class="tb" style="margin:8px 0 0"><label class="dytog"><input type="checkbox" id="cl_${k}" ${a.called ? 'checked' : ''}> <span>تماس گرفتم</span></label><span style="flex:1"></span><button class="btn p" onclick="AT_note('${a.sid}','${day}')">ذخیره‌ی شرح</button></div></div>`;
  }
  function absTab(M: any) {
    const f = AT.f || 'all', cf = AT.cf || 'all', needN = M.abs.filter((a: any) => M.needs(a)).length;
    const chip = (k: string, v: string, t: string, cur: string) => `<button class="${cur === v ? 'on' : ''}" onclick="AT_${k}('${v}')">${t}</button>`;
    const list = M.abs.filter((a: any) => (f === 'all' || (f === 'need' ? M.needs(a) : !M.needs(a))) && (cf === 'all' || a.cl === cf));
    const filt = `<div class="seg">${chip('f', 'all', `همه (${n(M.abs.length)})`, f)}${chip('f', 'need', `📞 نیازمند تماس (${n(needN)})`, f)}${chip('f', 'done', '✅ رسیدگی‌شده', f)}</div><div class="seg">${chip('cf', 'all', 'همه کلاس‌ها', cf)}${A.CL.map((c: string) => chip('cf', c, c, cf)).join('')}</div>`;
    const empty = `<div class="c m" style="text-align:center;padding:26px">🎉 ${M.unmarked === M.total ? 'هنوز حضور و غیابی ثبت نشده است.' : M.abs.length ? 'موردی با این فیلتر نیست.' : 'تا این لحظه هیچ غیبتی ثبت نشده.'}</div>`;
    return `${M.abs.length ? filt : ''}${list.length ? list.map((a: any) => absCard(a, M.day)).join('') : empty}`;
  }
  /* ----- تب زنگ‌ها: ثبت حضور و غیاب توسط مدیر (همان شبکه‌ی کارتیِ نماینده) ----- */
  const EDS: any = {};
  const curCl = () => (A.CL.includes(AT.pc) ? AT.pc : A.CL[0]);
  const dayKey = () => `${iso(AT.w, AT.d)}|${curCl()}`;
  const baseOf = () => { const day = iso(AT.w, AT.d), cl = curCl(), ids = new Set(D().students.filter((s: any) => s.cls === cl).map((s: any) => sidOf(s.id)).filter(Boolean)), b: any = {};
    AT.rows.filter((r: any) => r.day === day && ids.has(r.student_id)).forEach((r: any) => { b[r.student_id + '|' + r.period] = r.status === 'late' ? 'l' : 'a'; }); return b; };
  const edsOf = () => { const k = dayKey(), cur = baseOf(), e = EDS[k];
    if (!e) return (EDS[k] = { ed: { ...cur }, bs: cur }).ed;
    if (JSON.stringify(cur) !== JSON.stringify(e.bs) && JSON.stringify(e.ed) === JSON.stringify(e.bs)) { e.ed = { ...cur }; e.bs = cur; }   // تغییر دیگران را وقتی ویرایش ناذخیره‌ای نداریم بگیر
    return e.ed; };
  const G = mkAttGrid({
    id: 'adm', root: () => document.getElementById('atbox'), esc, n, toast: (m: string) => A.toast(m),
    rows: () => { const M = model(), c = M.classes.find((x: any) => x.cl === curCl()); return c ? c.ss.map((x: any) => ({ id: x.sid || x.s.id, name: x.s.name, ok: !!x.sid, cells: x.cells.map((q: any, i: number) => ({ s: A.subj(c.cl, M.d, i), t: q.ex || null })) })) : []; },
    done: () => { const M = model(), c = M.classes.find((x: any) => x.cl === curCl()); return c ? c.sessions.map((q: any, i: number) => (q ? i + 1 : 0)).filter(Boolean) : []; },
    ed: edsOf, base: baseOf,
    note: (ap: number) => { const M = model(), c = M.classes.find((x: any) => x.cl === curCl()), q = c?.sessions[ap - 1]; if (!q) return `<div class="c" style="margin-bottom:10px;border-inline-start:5px solid #94a3b8">⚪ این زنگ هنوز ثبت نشده است؛ می‌توانید همین‌جا حضور و غیابش را ثبت کنید.</div>`;
      const who = q.by_role === 'admin' ? 'مدیر' : (D().students.find((x: any) => acc()[x.id]?.sid === q.marked_by)?.name ? 'نماینده (' + D().students.find((x: any) => acc()[x.id]?.sid === q.marked_by).name + ')' : 'نماینده');
      return `<div class="c" style="margin-bottom:10px;border-inline-start:5px solid var(--ok)">✅ این زنگ ساعت <b>${hhmm(q.marked_at)}</b> توسط <b>${esc(who)}</b> ثبت شده است.</div>`; },
    save: async (ps: number[], rows: any[]) => { const { error } = await sb.rpc('staff_save_attendance', { p_day: iso(AT.w, AT.d), p_cls: curCl(), p_periods: ps, p_rows: rows }); if (error) return errMsg(error); delete EDS[dayKey()]; await load(true); return null; },
  });
  function perTab(M: any) {
    const cl = curCl(), clsSeg = `<div class="seg">${A.CL.map((x: string) => `<button class="${x === cl ? 'on' : ''}" onclick="AT_pc('${x}')">${x}</button>`).join('')}</div>`;
    return `${clsSeg}<div id="atbox">${G.html()}</div>`;
  }
  function exTab(M: any) {
    return M.classes.map((c: any) => {
      const g = c.ss.filter((x: any) => x.cells.every((q: any) => q.ex === 'g') && x.cells.length), rest = c.ss.filter((x: any) => !g.includes(x) && x.cells.some((q: any) => q.ex));
      const line = (x: any) => { const by: any = {}; x.cells.forEach((q: any, i: number) => { if (q.ex) (by[q.ex] = by[q.ex] || []).push(i + 1); });
        return `<span class="tag" style="margin:3px">${esc(x.s.name)} ${Object.keys(by).map((k) => `${EXI[k]} ${EXN[k]}${by[k].length === x.cells.length ? '' : ' (زنگ ' + by[k].map(n).join('،') + ')'}`).join(' + ')}</span>`; };
      return `<div class="c" style="margin-bottom:10px"><div class="tb" style="margin:0 0 6px"><b style="font-size:16px">${c.cl}</b>${tag('گروه ' + A.letterC(c.cl, M.d, M.w), gcol(A.letterC(c.cl, M.d, M.w)))}<span class="m">${n(g.length + rest.length)} نفر دارای معافیت</span></div>
        ${g.length ? `<div style="margin:6px 0"><b>👥 معاف کل روز (گروه ${A.letterC(c.cl, M.d, M.w)})</b><div>${g.map((x: any) => `<span class="tag" style="margin:3px">${esc(x.s.name)}</span>`).join('')}</div></div>` : ''}
        ${rest.length ? `<div style="margin:6px 0"><b>🎓🚀 معافیت‌های دیگر</b><div>${rest.map(line).join('')}</div></div>` : ''}
        ${!g.length && !rest.length ? '<p class="m" style="margin:0">امروز در این کلاس معافیتی نیست.</p>' : ''}</div>`; }).join('');
  }

  /* ---------- صفحه‌ی «روز» ---------- */
  function page() {
    initDay();
    if (!A.SV.isMgr()) return `<div class="c" style="text-align:center;padding:26px"><h3>🗓 مرکز روز</h3><p class="m">برای دیدن غیبت‌ها و وضعیت کلاس‌ها اول به سرور وارد شوید.</p><button class="btn p" onclick="go('srv')">ورود به بخش سرور</button></div>`;
    load(false);
    const M = model(), tab = AT.tab || 'abs';
    if (AT.err) return `${weekStrip(M)}<div class="c dn">${esc(AT.err)}</div>`;
    if (!M.ok) return `${weekStrip(M)}<div class="c m" style="text-align:center">⏳ در حال دریافت…</div>`;
    const needN = M.abs.filter((a: any) => M.needs(a)).length, T = [['abs', `🚨 غایبین${M.abs.length ? ` <i class="bdg" style="display:inline-grid;margin:0 4px">${n(M.abs.length)}</i>` : ''}`], ['per', '🏫 زنگ‌ها'], ['ex', '🎓 معافیت‌ها']];
    const body: any = { abs: absTab, per: perTab, ex: exTab };
    const noAcc = D().students.filter((s: any) => !sidOf(s.id)).length;
    return `${hero(M)}${weekStrip(M)}${heat(M)}${kpis(M)}
    <div class="seg xtabs">${T.map(([k, t]) => `<button class="${tab === k ? 'on' : ''}" onclick="AT_tab('${k}')">${t}</button>`).join('')}</div>
    ${(body[tab] || absTab)(M)}
    ${noAcc ? `<p class="m" style="margin-top:10px">⚠ ${n(noAcc)} دانش‌آموز هنوز حساب پنل ندارند؛ غیبت‌شان را نماینده نمی‌تواند ثبت کند.</p>` : ''}
    <div class="tb" style="margin-top:14px"><button class="btn" onclick="AT_csv()">⬇ خروجی CSV غیبت‌های این روز</button>${needN ? `<span class="m">${n(needN)} مورد هنوز نیاز به تماس دارد</span>` : ''}</div>`;
  }

  /* ---------- تب غیبت‌ها در پروفایل ---------- */
  async function loadStu(sid: string, force?: boolean) {
    const c = AT.stu[sid]; if (c && !force && Date.now() - c.at < 60000) return; if (c?.busy) return;
    AT.stu[sid] = { ...(c || {}), busy: true, at: Date.now() };
    const [a, nn] = await Promise.all([sb.from('attendance').select('*').eq('student_id', sid).order('day', { ascending: false }), sb.from('att_notes').select('*').eq('student_id', sid)]);
    AT.stu[sid] = { rows: a.data || [], notes: nn.data || [], at: Date.now(), err: a.error ? errMsg(a.error) : '', busy: false };
    if (U.p === 'sp') draw();
  }
  function groups(sid: string) {
    const c = AT.stu[sid]; if (!c?.rows) return [];
    const m: any = {}; c.rows.forEach((r: any) => { (m[r.day] = m[r.day] || []).push(r); });
    return Object.keys(m).sort().reverse().map((day) => { const rs = m[day].sort((a: any, b: any) => a.period - b.period), nt = c.notes.find((q: any) => q.day === day);
      return { day, rs, note: nt?.note || '', called: !!nt?.called, hasAbs: rs.some((r: any) => r.status === 'absent') }; });
  }
  function kpi(s: any) {
    const sid = sidOf(s.id); if (!A.SV.isMgr() || !sid) return '';
    loadStu(sid); const c = AT.stu[sid];
    const g = c?.rows ? groups(sid).filter((x: any) => x.hasAbs) : null;
    return `<div class="c k" style="cursor:pointer" onclick="U.stab='abs';draw()"><b class="${g && g.length ? 'dn' : ''}">${g ? n(g.length) : '…'}</b><span>روز غیبت ←</span></div>`;
  }
  function stuTab(s: any) {
    const sid = sidOf(s.id);
    if (!A.SV.isMgr()) return `<div class="c m">برای دیدن غیبت‌ها به بخش سرور وارد شوید.</div>`;
    if (!sid) return `<div class="c m">این دانش‌آموز حساب پنل ندارد (بخش سرور)؛ برای ثبت غیبت اول حساب بسازید.</div>`;
    loadStu(sid); const c = AT.stu[sid];
    if (!c?.rows) return `<div class="c m" style="text-align:center">${c?.err ? esc(c.err) : '⏳ در حال دریافت…'}</div>`;
    if (c.err) return `<div class="c dn">${esc(c.err)}</div>`;
    const G = groups(sid), absDays = G.filter((x: any) => x.hasAbs), absP = c.rows.filter((r: any) => r.status === 'absent').length, late = c.rows.filter((r: any) => r.status === 'late').length, noReason = absDays.filter((x: any) => !x.note && !x.called).length;
    const months: any = {}; absDays.forEach((x: any) => { const k = new Date(x.day + 'T12:00:00').toLocaleDateString('fa-IR', { month: 'long' }); months[k] = (months[k] || 0) + 1; });
    const kp = (b: any, t: string, cls = '') => `<div class="c k"><b class="${cls}">${n(b)}</b><span>${t}</span></div>`;
    const ph = s.phone ? esc(s.phone) : '';
    const top = `<div class="c"><div class="tb" style="margin:0"><b>📞 تلفن والدین:</b>${ph ? `<span dir="ltr" style="font-weight:700">${ph}</span><a class="btn p" href="tel:${ph}">تماس</a>` : ''}<input id="ph_${s.id}" dir="ltr" inputmode="tel" placeholder="${ph ? 'تغییر شماره' : '۰۹…'}" style="width:160px" value=""><button class="btn" onclick="AT_phone('${s.id}')">ذخیره</button></div></div>`;
    const cards = G.map((x: any) => { const k = `${sid}_${x.day}`;
      return `<div class="c" style="margin-top:8px;border-inline-start:5px solid ${x.note || x.called ? 'var(--ok)' : x.hasAbs ? '#ef4444' : '#f59e0b'}"><div class="tb" style="margin:0 0 4px"><b>${fa(x.day)}</b><span class="m">${x.rs.map((r: any) => `${r.status === 'late' ? '⏰' : '❌'} زنگ ${n(r.period)}`).join(' · ')}</span><span style="flex:1"></span>${x.called ? tag('📞 تماس گرفته شد', '#10b981') : ''}</div>
      <textarea id="nt_${k}" placeholder="شرح مدیر (نتیجه‌ی تماس با والدین…)" style="width:100%;min-height:56px">${esc(x.note)}</textarea>
      <div class="tb" style="margin:6px 0 0"><label class="m"><input type="checkbox" id="cl_${k}" ${x.called ? 'checked' : ''}> با والدین تماس گرفتم</label><span style="flex:1"></span><button class="btn p" onclick="AT_note('${sid}','${x.day}')">ذخیره</button></div></div>`; }).join('') || '<div class="c m" style="text-align:center">🎉 تا حالا غیبتی نداشته.</div>';
    return `<div class="g" style="margin:0 0 10px">${kp(absDays.length, 'روز غیبت', absDays.length ? 'dn' : '')}${kp(absP, 'زنگ غیبت')}${kp(late, 'تأخیر')}${kp(noReason, 'بدون شرح', noReason ? 'dn' : '')}</div>${top}
    ${Object.keys(months).length ? `<div class="c" style="margin-top:10px"><h3>غیبت به تفکیک ماه</h3>${A.bars(Object.entries(months).map(([l, v]: any) => ({ l, v })))}</div>` : ''}${cards}`;
  }

  /* ---------- عملیات ---------- */
  async function saveNote(sid: string, day: string) {
    const k = `${sid}_${day}`, note = val('nt_' + k).trim(), called = chk('cl_' + k);
    const { error } = await sb.from('att_notes').upsert({ student_id: sid, day, note, called, updated_at: new Date().toISOString() }, { onConflict: 'student_id,day' });
    if (error) { A.toast('خطا: ' + errMsg(error)); return; }
    const put = (arr: any[]) => { const i = arr.findIndex((q: any) => q.student_id === sid && q.day === day); const o = { student_id: sid, day, note, called }; if (i >= 0) arr[i] = { ...arr[i], ...o }; else arr.push(o); };
    put(AT.notes); if (AT.stu[sid]?.notes) put(AT.stu[sid].notes);
    A.toast('شرح ذخیره شد ✓'); draw();
  }
  async function setCell(lid: string, p: number, st: string) {
    const sid = sidOf(lid); if (!sid) return; document.getElementById('md')!.classList.remove('on');
    const { error } = await sb.rpc('admin_set_attendance', { p_student: sid, p_day: iso(AT.w, AT.d), p_period: p + 1, p_status: st });
    if (error) { A.toast('خطا: ' + errMsg(error)); return; }
    await load(true);
  }
  function cellModal(lid: string, p: number) {
    const s = stuBy(lid), M = model(), x = M.classes.flatMap((c: any) => c.ss).find((q: any) => q.s.id === lid), q = x.cells[p];
    const b = (st: string, t: string, cls = '') => `<button class="btn ${cls}" onclick="AT_set('${lid}',${p},'${st}')">${t}</button>`;
    document.getElementById('mb')!.innerHTML = `<div class="tb"><h3 style="margin:0;flex:1">${esc(s.name)} · زنگ ${n(p + 1)} <span class="m">${esc(A.subj(s.cls, M.d, p))}</span></h3><button class="btn" onclick="cm()">بستن</button></div>
      ${q.ex ? `<p class="dn">این دانش‌آموز در این زنگ معافیت (${({ g: 'گروه', f: 'معلم', p: 'پیشرفت' } as any)[q.ex]}) دارد.</p>` : ''}
      <div class="tb">${b('present', '✓ حاضر', q.st ? '' : 'p')}${b('absent', '❌ غایب', q.st === 'absent' ? 'p' : '')}${b('late', '⏰ تأخیر', q.st === 'late' ? 'p' : '')}</div>
      <div class="tb"><button class="btn" onclick="AT_all('${lid}')">❌ غایب در همه‌ی زنگ‌های امروز (بدون معافیت)</button></div>`;
    document.getElementById('md')!.classList.add('on');
  }
  async function allDay(lid: string) {
    const sid = sidOf(lid), M = model(), x = M.classes.flatMap((c: any) => c.ss).find((q: any) => q.s.id === lid); if (!sid) return; document.getElementById('md')!.classList.remove('on');
    for (let p = 0; p < M.per; p++) if (!x.cells[p].ex) { const { error } = await sb.rpc('admin_set_attendance', { p_student: sid, p_day: M.day, p_period: p + 1, p_status: 'absent' }); if (error) { A.toast('خطا: ' + errMsg(error)); break; } }
    await load(true);
  }
  function csv() {
    const M = model(), rows = M.abs.map((a: any) => [a.s.name, a.cl, a.periods.join('،'), a.note, a.called ? 'بله' : 'خیر', a.s.phone || '']);
    A.dlf(`غیبت-${M.day}.csv`, [['نام', 'کلاس', 'زنگ‌ها', 'شرح مدیر', 'تماس گرفته شد', 'تلفن والدین'], ...rows]);
  }
  const h = {
    AT_go: go, AT_wk: wk, AT_ref: () => load(true), AT_today: () => { AT.w = null; initDay(); load(true); },
    AT_tab: (t: string) => { AT.tab = t; draw(); }, AT_pc: (c: string) => { AT.pc = c; G.st.ap = 0; draw(); }, AT_pp: (_p: number) => { AT.tab = 'per'; draw(); }, AT_f: (v: string) => { AT.f = v; draw(); }, AT_cf: (v: string) => { AT.cf = v; draw(); },
    AT_cell: cellModal, AT_set: setCell, AT_all: allDay, AT_note: saveNote, AT_csv: csv,
    AT_prof: (lid: string) => { A.op(lid); U.stab = 'abs'; draw(); },
    AT_phone: (lid: string) => { const v = val('ph_' + lid).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[^\d+]/g, ''); if (v.length < 8) { A.toast('شماره معتبر نیست'); return; } A.sf(lid, 'phone', v); A.toast('شماره ذخیره شد ✓'); },
      };
  return { page, h, badge, warm, kpi, stuTab, lidOfSid };
}
