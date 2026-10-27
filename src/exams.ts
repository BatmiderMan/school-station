// مرکز آزمون‌ها: همه‌ی کارهای مربوط به آزمون (دریافت کارنامه، نتایج هر آزمون، نتایج هر دانش‌آموز، مدیریت) در یک پنل.
// داده‌ها همان D.exams قبلی هستند: { id, title, inst, date, res: { [studentId]: { level, rank, subj, raw, slv } } }

import { buildSchoolXlsx } from './xlsx';

export function mkExams(A: any) {
  const esc = A.esc, n = A.n, n1 = A.n1;
  const D = () => A.D;
  const X: any = (A.U.X = A.U.X || { tab: '', inst: 'all', ex: null, cls: 'all', sort: 'lv', sid: null, open: null, sinst: 'all', edit: null });
  const INST = ['ماز', 'قلم‌چی'];
  const IC: any = { 'ماز': '#6366f1', 'قلم‌چی': '#f59e0b' };
  const draw = () => A.draw();
  const norm = (t: string) => String(t || '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim();
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';

  /* ---------- داده ---------- */
  const exams = () => [...D().exams].sort((a: any, b: any) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const stuList = () => [...D().students].sort((a: any, b: any) => A.CL.indexOf(a.cls) - A.CL.indexOf(b.cls) || A.byNum(a, b));
  const stu = (id: string) => D().students.find((s: any) => s.id === id);
  const prevOf = (sid: string, e: any) => { const L = exams().filter((x: any) => x.inst === e.inst && x.res[sid]); const i = L.findIndex((x: any) => x.id === e.id); return i > 0 ? L[i - 1] : null; };
  const delta = (sid: string, e: any) => { const p = prevOf(sid, e); return p ? e.res[sid].level - p.res[sid].level : null; };
  const dl = (d: number | null) => (d == null ? '<span class="m">—</span>' : `<span class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${n(Math.abs(d))}</span>`);
  const chip = (i: string) => `<span class="tag" style="background:${IC[i] || 'var(--card2)'}22;border-color:${IC[i] || 'var(--bd)'}55">${esc(i)}</span>`;
  const pend = () => A.SV.pend();
  // شمارش کارنامه‌های منتظر روی سرور؛ حداکثر هر ۳۰ ثانیه یک‌بار (مگر اجباری) و فقط اگر عدد عوض شد دوباره رسم می‌شود
  let lastRef = 0;
  const refresh = (force: boolean) => { if (!force && Date.now() - lastRef < 30000) return; lastRef = Date.now(); const b = pend(); A.SV.refreshPend().then(() => { if (pend() !== b && A.U.p === 'exm') (A.bg || A.draw)(); }); };

  const defaultTab = () => (pend() || A.FILES().some((f: any) => f.st === 'ok' && !f.done) ? 'in' : 'ex');
  const seg = (k: string, o: string[][], cur: string) => `<div class="seg">${o.map(([v, t]) => `<button class="${cur === v ? 'on' : ''}" onclick="X_('${k}','${v}')">${t}</button>`).join('')}</div>`;

  /* ---------- قاب اصلی ---------- */
  function page() {
    if (!X.tab) X.tab = defaultTab();
    refresh(false);
    const p = pend(), T = [['in', '📥 دریافت کارنامه' + (p ? ` <i class="bdg" style="display:inline-grid;margin:0 4px">${n(p)}</i>` : '')], ['ex', '📋 نتایج هر آزمون'], ['st', '👤 نتایج هر دانش‌آموز'], ['pl', '📅 برنامه‌ی آزمون‌ها'], ['mg', '🗂 مدیریت آزمون‌ها'], ['sch', '🏫 مدرسه']];
    const body: any = { in: receive, ex: byExam, st: byStu, pl: () => A.plan(), mg: manage, sch: () => A.schp() };
    return `<div class="tb" style="margin:0 0 8px"><span style="flex:1"></span><button class="btn" onclick="X_xlsx()" title="همه‌ی نتایج ثبت‌شده در برنامه، در قالب اکسل مدرسه (ریاضی/تجربی × قلم‌چی/ماز)">📊 خروجی اکسل (قالب مدرسه)</button></div><div class="seg xtabs">${T.map(([k, t]) => `<button class="${X.tab === k ? 'on' : ''}" onclick="X_('tab','${k}')">${t}</button>`).join('')}</div>${(body[X.tab] || byExam)()}`;
  }

  /* ---------- ۱) دریافت کارنامه ---------- */
  function receive() {
    const srv = A.SV.inbox();
    const E = exams(), last = E[E.length - 1];
    return `${srv ? `<h3 class="xh">۱) کارنامه‌هایی که دانش‌آموزان فرستاده‌اند</h3>${srv}` : ''}
    <h3 class="xh" style="margin-top:18px">${srv ? '۲) خودم کارنامه را وارد می‌کنم' : 'وارد کردن کارنامه'}</h3>
    ${A.scn()}
    ${last ? `<p class="m" style="margin-top:10px">آخرین آزمون ثبت‌شده: <b>${esc(last.title)}</b> (${esc(last.date)}) — ${n(Object.keys(last.res).length)} از ${n(D().students.length)} نفر <a href="#" onclick="X_('tab','ex');return false">نتایجش را ببین ←</a></p>` : ''}`;
  }

  /* ---------- ۲) نتایج هر آزمون ---------- */
  function byExam() {
    const all = exams().filter((e: any) => X.inst === 'all' || e.inst === X.inst).reverse();
    const head = seg('inst', [['all', 'همه'], ...INST.map((i) => [i, i])], X.inst);
    if (!all.length) return `${head}<div class="c m" style="text-align:center;padding:30px">هنوز آزمونی ثبت نشده.<div class="tb" style="justify-content:center;margin:12px 0 0"><button class="btn p" onclick="X_('tab','in')">📥 دریافت کارنامه</button><button class="btn" onclick="X_('tab','mg')">ساخت آزمون</button></div></div>`;
    if (!X.ex || !all.find((e: any) => e.id === X.ex)) X.ex = all[0].id;
    const i = all.findIndex((e: any) => e.id === X.ex), e = all[i];
    const pick = `<div class="tb"><button class="btn" ${i >= all.length - 1 ? 'disabled' : ''} onclick="X_('ex','${all[i + 1]?.id ?? ''}')" title="آزمون قبلی">▶</button>
      <select style="flex:1;min-width:220px;font-weight:700" onchange="X_('ex',this.value)">${all.map((x: any) => `<option value="${x.id}" ${x.id === e.id ? 'selected' : ''}>${x.inst} · ${esc(x.date)} · ${esc(x.title)} (${n(Object.keys(x.res).length)} نفر)</option>`).join('')}</select>
      <button class="btn" ${i <= 0 ? 'disabled' : ''} onclick="X_('ex','${all[i - 1]?.id ?? ''}')" title="آزمون بعدی">◀</button></div>`;
    const cls = seg('cls', [['all', 'همه کلاس‌ها'], ...A.CL.map((c: string) => [c, c])], X.cls);
    const inCls = D().students.filter((s: any) => X.cls === 'all' || s.cls === X.cls);
    let got = inCls.filter((s: any) => e.res[s.id]);
    const miss = inCls.filter((s: any) => !e.res[s.id]);
    const key: any = { lv: (a: any, b: any) => e.res[b.id].level - e.res[a.id].level, num: (a: any, b: any) => A.CL.indexOf(a.cls) - A.CL.indexOf(b.cls) || A.byNum(a, b), name: (a: any, b: any) => a.name.localeCompare(b.name, 'fa'), chg: (a: any, b: any) => (delta(b.id, e) ?? -1e9) - (delta(a.id, e) ?? -1e9), rk: (a: any, b: any) => (e.res[a.id].rank ?? 1e12) - (e.res[b.id].rank ?? 1e12) };
    got = [...got].sort(key[X.sort] || key.lv);
    const subs: string[] = [...new Set<string>(got.flatMap((s: any) => Object.keys(e.res[s.id].subj || {})))];
    const sortSel = `<select onchange="X_('sort',this.value)">${[['lv', 'مرتب‌سازی: تراز (زیاد به کم)'], ['rk', 'رتبه‌ی کشوری'], ['chg', 'بیشترین پیشرفت'], ['num', 'شماره‌ی کلاسی'], ['name', 'الفبایی']].map(([v, t]) => `<option value="${v}" ${X.sort === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    const rows = got.map((s: any, k: number) => { const r = e.res[s.id];
      return `<tr onclick="X_open('${s.id}','${e.id}')"><td class="m">${n(k + 1)}</td><td><b>${esc(s.name)}</b></td><td><span class="tag">${s.cls}</span></td><td><b>${n(r.level)}</b></td><td>${dl(delta(s.id, e))}</td><td>${n(r.rank)}</td>${subs.map((q) => { const v = r.subj?.[q], w = r.raw?.[q]; return v == null ? '<td class="m">—</td>' : `<td style="${A.hue(v)};text-align:center" title="${w ? `درست ${w[0]} · غلط ${w[1]} · نزده ${w[2]}` : ''}">${n(v)}٪</td>`; }).join('')}</tr>`; }).join('');
    return `${head}${pick}${cls}
    <div class="tb"><span class="m"><b>${n(got.length)}</b> نفر نتیجه دارند${miss.length ? ` · <b>${n(miss.length)}</b> نفر ندارند` : ''}</span><span style="flex:1"></span>${sortSel}<button class="btn" onclick="X_csv('${e.id}')">⬇ CSV</button></div>
    ${got.length ? `<div class="c tw"><table><thead><tr><th>#</th><th>نام</th><th>کلاس</th><th>تراز</th><th>تغییر</th><th>رتبه‌ی کشوری</th>${subs.map((q) => `<th style="text-align:center">${esc(q)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><p class="m">روی هر نفر بزنید تا کارنامه‌ی کامل او (درست/غلط/نزده‌ی هر درس) باز شود. «تغییر» نسبت به آزمون قبلیِ همان مؤسسه است.</p>` : '<div class="c m">برای این انتخاب نتیجه‌ای نیست.</div>'}
    ${miss.length ? `<div class="c" style="margin-top:10px"><h3>نتیجه‌ی این آزمون را ندارند</h3><div>${miss.map((s: any) => `<span class="tag" style="cursor:pointer" onclick="X_('qs','${s.id}')">${esc(s.name)}</span>`).join('')}</div>${quick(e, miss)}</div>` : ''}`;
  }
  function quick(e: any, miss: any[]) {
    const sel = miss.find((s: any) => s.id === X.qs) ? X.qs : miss[0].id;
    return `<div class="tb" style="margin:12px 0 0"><b class="m">ثبت سریع:</b><select id="xq_s">${miss.map((s: any) => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select><input id="xq_l" type="number" placeholder="تراز" style="width:90px"><input id="xq_r" type="number" placeholder="رتبه (اختیاری)" style="width:120px"><button class="btn p" onclick="X_quick('${e.id}')">ثبت</button></div>`;
  }
  function quickSave(eid: string) {
    const e = D().exams.find((x: any) => x.id === eid), sid = val('xq_s'), lv = parseFloat(val('xq_l'));
    if (!e || !sid || isNaN(lv)) { A.toast('تراز را وارد کنید'); return; }
    e.res[sid] = { level: Math.round(lv), rank: val('xq_r') ? +val('xq_r') : null, subj: {} }; A.save(); X.qs = null; draw();
  }
  function csvExam(eid: string) {
    const e = D().exams.find((x: any) => x.id === eid); if (!e) return;
    const ss = D().students.filter((s: any) => e.res[s.id]).sort((a: any, b: any) => e.res[b.id].level - e.res[a.id].level), subs: string[] = [...new Set<string>(ss.flatMap((s: any) => Object.keys(e.res[s.id].subj || {})))];
    A.dlf(`${e.inst}-${e.date.replace(/\//g, '-')}.csv`, [['نام', 'کلاس', 'تراز', 'رتبه', ...subs.map((q) => q + ' (درصد)')], ...ss.map((s: any) => [s.name, s.cls, e.res[s.id].level, e.res[s.id].rank ?? '', ...subs.map((q) => e.res[s.id].subj?.[q] ?? '')])]);
  }

  /* ---------- ۳) نتایج هر دانش‌آموز ---------- */
  function byStu() {
    const L = stuList();
    if (!L.length) return '<div class="c m">دانش‌آموزی ثبت نشده.</div>';
    if (!X.sid || !stu(X.sid)) X.sid = L[0].id;
    const s = stu(X.sid), ix = L.findIndex((x: any) => x.id === s.id);
    const nav = `<div class="tb"><button class="btn" ${ix <= 0 ? 'disabled' : ''} onclick="X_('sid','${L[ix - 1]?.id ?? ''}')">▶</button>
      <select style="flex:1;min-width:200px;font-weight:700" onchange="X_('sid',this.value)">${A.CL.map((c: string) => `<optgroup label="${c}">${L.filter((x: any) => x.cls === c).map((x: any) => `<option value="${x.id}" ${x.id === s.id ? 'selected' : ''}>${x.num ? n(x.num) + '. ' : ''}${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}</select>
      <input list="xdl" placeholder="🔍 جستجوی نام" style="width:140px" onchange="X_find(this.value)"><datalist id="xdl">${L.map((x: any) => `<option value="${esc(x.name)}">`).join('')}</datalist>
      <button class="btn" ${ix >= L.length - 1 ? 'disabled' : ''} onclick="X_('sid','${L[ix + 1]?.id ?? ''}')">◀</button></div>`;
    const mine = exams().filter((e: any) => e.res[s.id]);
    const kp = INST.map((i) => { const E = mine.filter((e: any) => e.inst === i), l = E[E.length - 1];
      return `<div class="c k" style="border-top:3px solid ${IC[i]}"><span>${i}${l ? ` · ${esc(l.date)}` : ''}</span><b>${l ? n(l.res[s.id].level) : '—'}</b><span>${l ? `${dl(delta(s.id, l))} · رتبه ${n(l.res[s.id].rank)}` : 'نتیجه‌ای ندارد'}</span><span class="m">${n(E.length)} آزمون</span></div>`; }).join('');
    const hero = `<div class="c hero"><div class="av">${n(s.num)}</div><div style="flex:1"><h2 style="margin:0">${esc(s.name)}</h2><div class="m">${s.cls}</div></div><button class="btn" onclick="op('${s.id}')">پروفایل کامل ←</button></div>`;
    const list = mine.filter((e: any) => X.sinst === 'all' || e.inst === X.sinst).reverse();
    if (X.open && !list.find((e: any) => e.id === X.open)) X.open = null;
    const cards = list.map((e: any) => examCard(s, e)).join('') || '<div class="c m">نتیجه‌ای برای نمایش نیست.</div>';
    return `${nav}${hero}<div class="g" style="margin-top:10px">${kp}</div>${A.TR.analysis(s)}
    <h3 class="xh" style="margin-top:16px">کارنامه‌ها</h3>${seg('sinst', [['all', 'همه'], ...INST.map((i) => [i, i])], X.sinst)}${cards}`;
  }
  function examCard(s: any, e: any) {
    const r = e.res[s.id], p = prevOf(s.id, e), keys = Object.keys(r.subj || {}), open = X.open === e.id ? 'open' : '';
    const rows = keys.map((k) => { const v = r.subj[k], w = r.raw?.[k], pv = p?.res[s.id]?.subj?.[k], d = pv != null ? v - pv : null;
      return `<tr style="cursor:default"><td>${esc(k)}</td><td style="${A.hue(v)};text-align:center"><b>${n(v)}٪</b></td><td>${w ? `${n(w[0])} / ${n(w[1])} / ${n(w[2])}` : '—'}</td><td>${n(r.slv?.[k])}</td><td>${d == null ? '<span class="m">—</span>' : `<span class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${n(Math.abs(d))}</span>`}</td></tr>`; }).join('');
    return `<details class="c" style="margin-top:8px" ${open}><summary style="cursor:pointer;display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap;align-items:center"><span>${chip(e.inst)} <b>${esc(e.title)}</b> <span class="m">${esc(e.date)}</span></span><span>تراز <b>${n(r.level)}</b> ${dl(delta(s.id, e))} · رتبه ${n(r.rank)}</span></summary>
    ${keys.length ? `<div class="tw" style="margin-top:8px"><table><thead><tr><th>درس</th><th>درصد</th><th>درست / غلط / نزده</th><th>تراز درس</th><th>تغییر درصد</th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="m">جزئیات دروس ندارد (فقط تراز و رتبه ثبت شده).</p>'}
    <div class="tb" style="margin:10px 0 0"><label class="m">تراز <input id="xl_${e.id}" type="number" value="${r.level ?? ''}" style="width:90px"></label><label class="m">رتبه <input id="xr_${e.id}" type="number" value="${r.rank ?? ''}" style="width:110px"></label><button class="btn" onclick="X_upd('${s.id}','${e.id}')">ذخیره‌ی ویرایش</button><button class="btn" style="color:var(--bad)" onclick="X_delres('${s.id}','${e.id}')">حذف این نتیجه</button></div></details>`;
  }
  /* ---------- ۴) مدیریت آزمون‌ها ---------- */
  function manage() {
    const E = exams().reverse();
    const create = `<div class="c"><h3>ساخت آزمون جدید</h3><div class="tb"><input id="xn_t" placeholder="عنوان (مثلاً قلم‌چی ۸ آبان)" style="flex:1;min-width:200px"><select id="xn_i">${INST.map((i) => `<option>${i}</option>`).join('')}</select><input id="xn_d" value="${A.today()}" style="width:110px"><button class="btn p" onclick="X_new()">ایجاد</button></div><p class="m" style="margin:0">معمولاً لازم نیست؛ با وارد کردن کارنامه، آزمون خودکار ساخته می‌شود. اینجا برای وقتی است که نتایج را به‌صورت لیست یا دستی وارد می‌کنید.</p></div>`;
    const list = E.map((e: any) => { const c = Object.keys(e.res).length, ed = X.edit === e.id;
      return `<div class="c" style="margin-top:8px"><div class="tb" style="margin:0"><span style="flex:1;min-width:180px">${chip(e.inst)} <b>${esc(e.title)}</b> <span class="m">${esc(e.date)} · ${n(c)} نفر</span></span><button class="btn" onclick="X_('ex','${e.id}');X_('tab','ex')">نتایج</button><button class="btn ${ed ? 'p' : ''}" onclick="X_('edit','${ed ? '' : e.id}')">${ed ? 'بستن' : 'ویرایش / چسباندن نتایج'}</button><button class="btn" style="color:var(--bad)" onclick="X_del('${e.id}')">حذف</button></div>
      ${ed ? `<div class="tb" style="margin-top:10px"><input id="xe_t" value="${esc(e.title)}" style="flex:1;min-width:180px"><select id="xe_i">${INST.map((i) => `<option ${i === e.inst ? 'selected' : ''}>${i}</option>`).join('')}</select><input id="xe_d" value="${esc(e.date)}" style="width:110px"><button class="btn p" onclick="X_save('${e.id}')">ذخیره</button></div>
      <p class="m" style="margin:6px 0">چسباندن نتایج؛ هر خط: <b>نام، تراز، رتبه</b> (رتبه اختیاری)</p><textarea id="xpr" placeholder="علی احمدی, 7250, 21000" style="width:100%;min-height:90px"></textarea><div class="tb" style="margin-top:6px"><button class="btn p" onclick="X_paste('${e.id}')">ثبت نتایج</button></div>` : ''}</div>`; }).join('') || '<p class="m">آزمونی نیست.</p>';
    return create + `<h3 class="xh" style="margin-top:16px">همه‌ی آزمون‌ها (${n(E.length)})</h3>${list}`;
  }

  /* ---------- عملیات ---------- */
  const goStu = (sid: string, eid?: string) => { X.sid = sid; X.open = eid || null; X.sinst = 'all'; X.tab = 'st'; A.U.p = 'exm'; draw(); };
  const h = {
    X_: (k: string, v: string) => { X[k] = v || null; if (k === 'inst') X.ex = null; if (k === 'sid') X.open = null; if (k === 'tab' && v === 'in') refresh(true); draw(); },
    X_open: goStu,
    xstu: (sid: string) => goStu(sid),
    xgo: (tab: string) => { X.tab = tab; A.U.p = 'exm'; draw(); },
    X_find: (name: string) => { const t = norm(name), s = D().students.find((x: any) => norm(x.name) === t) || D().students.find((x: any) => norm(x.name).includes(t)); if (s) { X.sid = s.id; X.open = null; draw(); } },
    X_csv: csvExam,
    X_xlsx: () => { try { const bytes = buildSchoolXlsx(D(), A.CL); A.saveFile(`نتایج-آزمون-${new Date().toISOString().slice(0, 10)}.xlsx`, new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); A.toast('فایل اکسل ساخته شد'); } catch (err: any) { alert('ساخت فایل اکسل ناموفق بود: ' + (err?.message || err)); } },
    X_quick: quickSave,
    X_new: () => { const t = val('xn_t').trim(); if (!t) { A.toast('عنوان را بنویسید'); return; } const id = 'e' + Date.now().toString(36); D().exams.push({ id, title: t, inst: val('xn_i'), date: val('xn_d').trim(), res: {} }); X.ex = id; X.edit = id; A.save(); draw(); },
    X_save: (id: string) => { const e = D().exams.find((x: any) => x.id === id); if (!e) return; e.title = val('xe_t').trim() || e.title; e.inst = val('xe_i'); e.date = val('xe_d').trim() || e.date; A.save(); draw(); A.toast('ذخیره شد'); },
    X_del: (id: string) => { const e = D().exams.find((x: any) => x.id === id); if (!e || !confirm(`آزمون «${e.title}» با ${Object.keys(e.res).length} نتیجه حذف شود؟`)) return; D().exams = D().exams.filter((x: any) => x.id !== id); X.ex = null; X.edit = null; A.save(); draw(); },
    X_paste: (id: string) => {
      const e = D().exams.find((x: any) => x.id === id); if (!e) return; let ok = 0; const bad: string[] = [];
      val('xpr').split('\n').forEach((l) => { if (!l.trim()) return; const p = l.split(/[,\t،]/).map((x) => norm(x)), s = D().students.find((x: any) => norm(x.name) === p[0]), lv = +p[1];
        if (!s || isNaN(lv) || !p[1]) { bad.push(p[0] || l); return; } e.res[s.id] = { ...(e.res[s.id] || {}), level: lv, rank: +p[2] || null, subj: e.res[s.id]?.subj || {} }; ok++; });
      A.save(); draw(); A.toast(`${n(ok)} نتیجه ثبت شد` + (bad.length ? ` · ${n(bad.length)} ردیف نامعتبر: ${bad.slice(0, 3).join('، ')}` : ''));
    },
    X_upd: (sid: string, eid: string) => { const e = D().exams.find((x: any) => x.id === eid), r = e?.res[sid]; if (!r) return; const l = parseFloat(val('xl_' + eid)); if (isNaN(l)) { A.toast('تراز معتبر نیست'); return; } r.level = Math.round(l); r.rank = val('xr_' + eid) ? +val('xr_' + eid) : null; A.save(); X.open = eid; draw(); A.toast('ذخیره شد'); },
    X_delres: (sid: string, eid: string) => { const e = D().exams.find((x: any) => x.id === eid); if (!e || !confirm('این نتیجه حذف شود؟')) return; delete e.res[sid]; X.open = null; A.save(); draw(); },
  };
  return { page, h, goStu };
}
