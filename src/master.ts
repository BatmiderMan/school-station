// «نمای جامع آزمون‌ها»: همه‌ی دانش‌آموزان × همه‌ی آزمون‌ها در یک جدول؛ ترکیبِ «نتایج هر آزمون» و «نتایج هر دانش‌آموز».
// ✔ هر خانه = نتیجه‌ی یک دانش‌آموز در یک آزمون، رنگ‌شده بر اساس جایگاه نسبی او در همان آزمون (قرمز ← سبز)
// ✔ ستون‌های خلاصه‌ی هر نفر (میانگین، آخرین، روند، حضور، پرچم‌ها) و ردیف‌های خلاصه‌ی هر آزمون (میانگین، شرکت‌کننده، تغییر)
// ✔ ردیفِ میانگینِ هر کلاس، شاخص‌های مدیریتی بالای صفحه، فیلتر/مرتب‌سازی/جستجو، و خروجی CSV
export function mkMaster(C: any) {
  const A = C.A, X = C.X, esc = A.esc, n = A.n, INST: string[] = C.INST, IC: any = C.IC, CL: string[] = A.CL;
  const D = () => A.D;
  const f0 = (x: number) => Math.round(x).toLocaleString('fa-IR', { useGrouping: false });
  const isMath = (cl: string) => String(cl).startsWith('ریاضی');
  const heat = (p: number) => `background:hsl(${(Math.max(0, Math.min(1, p)) * 125).toFixed(0)} 62% 42% / .30)`;
  const up = (d: number, t = f0(Math.abs(d))) => `<i class="mx-d ${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'}${t}</i>`;
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const slope = (v: number[]) => { const m = v.length; if (m < 2) return 0; const mx = (m - 1) / 2, my = v.reduce((a, b) => a + b, 0) / m; let nu = 0, de = 0; v.forEach((y, i) => { nu += (i - mx) * (y - my); de += (i - mx) ** 2; }); return nu / de; };

  function defaults(all: any[]) {
    X.mm = X.mm || 'lv'; X.msk = X.msk || 'num'; X.msd = X.msd || 1; X.mg = X.mg == null ? '1' : X.mg; X.mc = X.mc || 'all'; X.mf = X.mf || 'all'; X.mo = X.mo || 'new'; X.mq = X.mq || '';
    if (!X.mi) { const cnt = (i: string) => all.filter((e: any) => e.inst === i).reduce((s: number, e: any) => s + Object.keys(e.res).length, 0); X.mi = cnt(INST[0]) >= cnt(INST[1]) ? INST[0] : INST[1]; }
  }

  /* ---------- مدل داده ---------- */
  function model() {
    const all: any[] = C.exams(); defaults(all);
    const insts = X.mi === 'both' ? INST.filter((i) => all.some((e) => e.inst === i)) : [X.mi];
    const cnt = (i: string) => all.filter((e) => e.inst === i).reduce((s, e) => s + Object.keys(e.res).length, 0);
    const pi: string = X.mi === 'both' ? (cnt(INST[0]) >= cnt(INST[1]) ? INST[0] : INST[1]) : X.mi;
    const cols = all.filter((e) => insts.includes(e.inst)), order = X.mo === 'old' ? cols : [...cols].reverse();
    const held: any = {}, latest: any = {}; INST.forEach((i) => { const L = all.filter((e) => e.inst === i); held[i] = L.length; latest[i] = L[L.length - 1] || null; });
    // توزیع تراز هر آزمون در کل مدرسه (برای رنگ خانه‌ها)
    const dist: any = {}; all.forEach((e) => { dist[e.id] = Object.values(e.res).map((r: any) => r.level).filter((v: any) => v != null).sort((a: number, b: number) => a - b); });
    const pct = (e: any, v: number) => { const d: number[] = dist[e.id] || []; if (!d.length) return 0.5; const lo = d.filter((x) => x < v).length, eq = d.filter((x) => x === v).length; return (lo + 0.5 * eq) / d.length; };
    const inCls = (s: any) => X.mc === 'all' || (X.mc === 'grp:m' ? isMath(s.cls) : X.mc === 'grp:e' ? !isMath(s.cls) : s.cls === X.mc);
    const base: any[] = C.stuList().filter(inCls);
    const stat: any = {};
    base.forEach((s) => { stat[s.id] = {}; insts.forEach((i) => {
      const L = all.filter((e) => e.inst === i), got = L.filter((e) => e.res[s.id]), lv = got.map((e) => e.res[s.id].level), m = lv.length;
      const last = got[m - 1] || null, d1 = m > 1 ? lv[m - 1] - lv[m - 2] : null, d2 = m > 2 ? lv[m - 2] - lv[m - 3] : null;
      stat[s.id][i] = { got, lv, avg: mean(lv), last, lastLv: m ? lv[m - 1] : null, lastRk: last ? last.res[s.id].rank : null, d1, d2, slope: slope(lv), played: m, held: L.length, miss: L.length - m, absLast: !!latest[i] && !latest[i].res[s.id] };
    }); });
    // پرچم‌ها بر اساس مؤسسه‌ی اصلی
    const topIds = new Set(latest[pi] ? Object.keys(latest[pi].res).sort((a, b) => latest[pi].res[b].level - latest[pi].res[a].level).slice(0, 3) : []);
    const flags = (s: any) => { const t = stat[s.id][pi] || stat[s.id][insts[0]]; return { dn: !!t && t.played >= 3 && t.d1 < 0 && t.d2 < 0, up: !!t && t.played >= 3 && t.d1 > 0 && t.d2 > 0, ab: !!t && t.absLast, top: topIds.has(s.id) }; };
    const fcnt: any = { dn: 0, up: 0, ab: 0, top: 0 }; base.forEach((s) => { const f: any = flags(s); (['dn', 'up', 'ab', 'top'] as string[]).forEach((k) => { if (f[k]) fcnt[k]++; }); });
    return { all, insts, pi, cols, order, held, latest, dist, pct, base, stat, flags, fcnt };
  }

  /* ---------- تولتیپ (کارنامه‌ی خلاصه‌ی هر خانه، با ماوس/لمس) ---------- */
  function tipFor(sid: string, eid: string): string {
    const e = D().exams.find((x: any) => x.id === eid), s = D().students.find((x: any) => x.id === sid); if (!e || !s) return '';
    const r = e.res[sid], head = `<div class="cht-h">${esc(s.name)} <span class="m">${esc(s.cls)}</span></div><div>${C.chip(e.inst)} ${esc(e.title)} · ${esc(e.date)}</div>`;
    if (!r) return `${head}<div class="m">در این آزمون شرکت نکرده / نتیجه‌ای ثبت نشده</div>`;
    const dl = C.delta(sid, e), subs = Object.keys(r.subj || {}).map((k) => `<span style="${A.hue(r.subj[k])};padding:1px 6px;border-radius:6px;margin:1px;display:inline-block">${esc(k)} ${n(r.subj[k])}٪</span>`).join('');
    return `${head}<div>تراز <b>${n(r.level)}</b> · رتبه‌ی کشوری <b>${n(r.rank)}</b></div>${dl != null ? `<div>تغییر نسبت به آزمون قبل: ${up(dl, n(Math.abs(dl)))}</div>` : ''}${subs ? `<div class="cht-x">${subs}</div>` : ''}<div class="m" style="margin-top:3px">برای باز کردن کارنامه کلیک کنید</div>`;
  }
  (window as any).__mxTip = tipFor;

  const spark = (v: number[], col: string) => { if (v.length < 2) return ''; const lo = Math.min(...v), hi = Math.max(...v), W = 66, H = 20, X_ = (i: number) => 2 + ((W - 4) * i) / (v.length - 1), Y = (y: number) => H - 3 - ((H - 6) * (y - lo)) / (hi - lo || 1); return `<polyline fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round" points="${v.map((y, i) => X_(i).toFixed(1) + ',' + Y(y).toFixed(1)).join(' ')}"/><circle cx="${X_(v.length - 1).toFixed(1)}" cy="${Y(v[v.length - 1]).toFixed(1)}" r="2.2" fill="${col}"/>`; };

  /* ---------- صفحه ---------- */
  function page() {
    const M = model(), { all, insts, pi, order, held, latest, pct, base, stat, flags, fcnt } = M;
    if (!all.length) return `<div class="c m" style="text-align:center;padding:30px">هنوز آزمونی ثبت نشده.<div class="tb" style="justify-content:center;margin:12px 0 0"><button class="btn p" onclick="X_('tab','in')">📥 دریافت کارنامه</button></div></div>`;
    if (!D().students.length) return '<div class="c m">دانش‌آموزی ثبت نشده.</div>';
    const q = C.norm(X.mq);
    // مرتب‌سازی (مرتب‌سازی «خوب‌ترین اول»؛ جهت با کلیک روی سربرگ برعکس می‌شود)
    const sv = (s: any) => stat[s.id][pi] || stat[s.id][insts[0]] || {};
    const NEG = -1e12;
    const cmpMap: any = {
      num: (a: any, b: any) => CL.indexOf(a.cls) - CL.indexOf(b.cls) || A.byNum(a, b), name: (a: any, b: any) => a.name.localeCompare(b.name, 'fa'),
      avg: (a: any, b: any) => (sv(b).avg ?? NEG) - (sv(a).avg ?? NEG), last: (a: any, b: any) => (sv(b).lastLv ?? NEG) - (sv(a).lastLv ?? NEG),
      trend: (a: any, b: any) => (sv(b).played > 1 ? sv(b).slope : NEG) - (sv(a).played > 1 ? sv(a).slope : NEG), chg: (a: any, b: any) => (sv(b).d1 ?? NEG) - (sv(a).d1 ?? NEG),
      abs: (a: any, b: any) => (sv(b).miss ?? 0) - (sv(a).miss ?? 0), rank: (a: any, b: any) => (sv(a).lastRk ?? 1e12) - (sv(b).lastRk ?? 1e12),
    };
    const cmp = cmpMap[X.msk] || cmpMap.num, dir = X.msd || 1;
    let list = [...base].sort((a, b) => cmp(a, b) * dir);
    if (X.mf !== 'all') list = list.filter((s) => (flags(s) as any)[X.mf]);
    const grouped = X.mg === '1';
    const nExam = order.length;

    /* شاخص‌های مدیریتی (مؤسسه‌ی اصلی، کلاس‌های انتخاب‌شده) */
    const le = latest[pi], pe = le ? C.exams().filter((e: any) => e.inst === pi && e.date < le.date).pop() : null;
    const gotL = le ? base.filter((s) => le.res[s.id]) : [], avgL = mean(gotL.map((s) => le.res[s.id].level)), avgP = pe ? mean(base.filter((s) => pe.res[s.id]).map((s) => pe.res[s.id].level)) : null;
    const byD = base.map((s) => ({ s, d: sv(s).d1 })).filter((x) => x.d != null) as { s: any; d: number }[];
    const best = byD.length ? byD.reduce((a, b) => (b.d > a.d ? b : a)) : null, worst = byD.length ? byD.reduce((a, b) => (b.d < a.d ? b : a)) : null;
    const top = gotL.length ? gotL.reduce((a, b) => (le.res[b.id].level > le.res[a.id].level ? b : a)) : null;
    const kpi = (c: string, t: string, v: string, sub: string, on = '') => `<div class="c k" style="border-top:3px solid ${c};${on ? 'cursor:pointer' : ''}" ${on ? `onclick="${on}"` : ''}><span>${t}</span><b>${v}</b><span>${sub}</span></div>`;
    const kpis = `<div class="g mx-k">
      ${kpi(IC[pi], `حضور در آخرین آزمون ${esc(pi)}`, le ? `${n(gotL.length)}<small> از ${n(base.length)}</small>` : '—', le ? `${n(base.length ? Math.round((gotL.length / base.length) * 100) : 0)}٪ · ${esc(le.date)}` : 'آزمونی نیست', "X_m('mf','ab')")}
      ${kpi(IC[pi], 'میانگین تراز آخرین آزمون', avgL != null ? f0(avgL) : '—', avgL != null && avgP != null ? `${up(avgL - avgP)} نسبت به آزمون قبل` : '&nbsp;')}
      ${kpi('#16a34a', '🏆 بهترین تراز', top ? esc(top.name) : '—', top ? `تراز ${n(le.res[top.id].level)} · ${esc(top.cls)}` : '&nbsp;', top ? `X_gs('${top.id}')` : '')}
      ${kpi('#0ea5e9', '🚀 بیشترین پیشرفت', best ? esc(best.s.name) : '—', best ? `${up(best.d)} نسبت به آزمون قبل` : '&nbsp;', "X_ms('chg',1)")}
      ${kpi('#ef4444', '📉 بیشترین افت', worst ? esc(worst.s.name) : '—', worst ? `${up(worst.d)} نسبت به آزمون قبل` : '&nbsp;', "X_ms('chg',1);X_m('msd',-1)")}
    </div>`;

    /* نوار کنترل */
    const seg = (k: string, o: string[][], cur: string) => `<div class="seg" style="margin:0">${o.map(([v, t]) => `<button class="${String(cur) === v ? 'on' : ''}" onclick="X_m('${k}','${v}')">${t}</button>`).join('')}</div>`;
    const flagChip = (v: string, t: string, c?: number) => `<button class="mx-fc ${X.mf === v ? 'on' : ''}" onclick="X_m('mf','${v}')">${t}${c != null ? ` <b>${n(c)}</b>` : ''}</button>`;
    const sortSel = `<select onchange="X_ms(this.value,1)" title="مرتب‌سازی">${[['num', 'مرتب‌سازی: شماره‌ی کلاسی'], ['name', 'الفبایی'], ['avg', 'میانگین تراز'], ['last', 'آخرین تراز'], ['rank', 'آخرین رتبه‌ی کشوری'], ['trend', 'بهترین روند'], ['chg', 'بیشترین پیشرفت/افت اخیر'], ['abs', 'بیشترین غیبت در آزمون']].map(([v, t]) => `<option value="${v}" ${X.msk === v ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    const bar = `<div class="mx-bar">
      ${seg('mi', [...INST.map((i) => [i, i]), ['both', 'هر دو']], X.mi)}${seg('mm', [['lv', 'تراز'], ['rk', 'رتبه'], ['ch', 'تغییر']], X.mm)}
      ${seg('mc', [['all', 'همه'], ['grp:m', 'ریاضی'], ['grp:e', 'تجربی'], ...CL.map((c) => [c, c])], X.mc)}
    </div>
    <div class="mx-bar">
      <input id="mx_q" placeholder="🔍 جستجوی نام…" value="${esc(X.mq)}" oninput="X_mq(this.value)" style="width:170px">${sortSel}
      <button class="btn ${X.msd === -1 ? 'on' : ''}" onclick="X_m('msd',${-(X.msd || 1)})" title="برعکس کردن ترتیب">${X.msd === -1 ? '⬆' : '⬇'}</button>
      <button class="btn ${grouped ? 'on' : ''}" onclick="X_m('mg','${grouped ? '0' : '1'}')" title="گروه‌بندی کلاس‌ها همراه با میانگین هر کلاس">🧩 گروه‌بندی کلاس</button>
      <button class="btn" onclick="X_m('mo','${X.mo === 'new' ? 'old' : 'new'}')" title="جهت ستون‌ها">${X.mo === 'new' ? '↔ تازه‌ترین نزدیک نام' : '↔ قدیمی‌ترین نزدیک نام'}</button>
      <span style="flex:1"></span><button class="btn" onclick="X_mcsv()">⬇ CSV</button>
    </div>
    <div class="mx-bar">${flagChip('all', 'همه', base.length)}${flagChip('dn', '⚠️ افت پیاپی', fcnt.dn)}${flagChip('up', '🚀 رشد پیاپی', fcnt.up)}${flagChip('ab', '🚫 غایب آخرین آزمون', fcnt.ab)}${flagChip('top', '🔥 ۳ نفر برتر آخرین آزمون', fcnt.top)}
      <span class="m" style="margin-inline-start:auto">مبنای پرچم‌ها و مرتب‌سازی: <b style="color:${IC[pi]}">${esc(pi)}</b></span></div>`;

    /* سربرگ‌ها */
    const shortDate = (d: string) => String(d).slice(5);
    const th1 = order.map((e: any) => `<th class="mx-e" style="--ic:${IC[e.inst]}" onclick="X_ge('${e.id}')" title="${esc(e.inst)} · ${esc(e.title)} · ${esc(e.date)} — کلیک: نتایج این آزمون"><i></i><b>${esc(shortDate(e.date))}</b><small>${esc(e.title).slice(0, 12)}</small></th>`).join('');
    const sortTh = (k: string, t: string) => `<th class="mx-sh ${X.msk === k ? 'on' : ''}" onclick="X_ms('${k}')">${t}${X.msk === k ? (X.msd === -1 ? ' ▲' : ' ▼') : ''}</th>`;
    const exStat = (e: any) => { const got = base.filter((s: any) => e.res[s.id]), av = mean(got.map((s: any) => e.res[s.id].level)); const pv = C.exams().filter((x: any) => x.inst === e.inst && x.date < e.date).pop(); const pav = pv ? mean(base.filter((s: any) => pv.res[s.id]).map((s: any) => pv.res[s.id].level)) : null; return { got: got.length, av, d: av != null && pav != null ? av - pav : null }; };
    const ES: any = {}; order.forEach((e: any) => { ES[e.id] = exStat(e); });
    const r2 = order.map((e: any) => { const s = ES[e.id]; return `<th class="mx-st">${s.av != null ? `<b>${f0(s.av)}</b>${s.d != null ? up(s.d) : ''}` : '—'}</th>`; }).join('');
    const r3 = order.map((e: any) => { const s = ES[e.id], p = base.length ? s.got / base.length : 0; return `<th class="mx-st"><span style="color:${p < 0.8 ? 'var(--bad)' : 'inherit'}">${n(s.got)}<small>/${n(base.length)}</small></span></th>`; }).join('');
    const thead = `<thead><tr class="r1"><th class="mx-c0">#</th><th class="mx-c1">${'نام'}</th><th class="mx-c2">کلاس</th>${sortTh('avg', 'میانگین')}${sortTh('last', 'آخرین')}${sortTh('trend', 'روند')}${sortTh('abs', 'حضور')}<th class="mx-sh">پرچم</th>${th1}</tr>
      <tr class="r2"><th class="mx-c0 mx-lb" colspan="3">میانگین تراز (کلاس‌های انتخابی)</th><th colspan="5" class="mx-st"></th>${r2}</tr>
      <tr class="r3"><th class="mx-c0 mx-lb" colspan="3">شرکت‌کننده</th><th colspan="5" class="mx-st"></th>${r3}</tr></thead>`;

    /* ردیف‌ها */
    const cell = (s: any, e: any) => {
      const r = e.res[s.id], key = `data-s="${s.id}" data-e="${e.id}"`;
      if (!r) return `<td class="mx-ab" ${key}>${held[e.inst] ? '—' : ''}</td>`;
      const p = pct(e, r.level), d = C.delta(s.id, e);
      if (X.mm === 'ch') { if (d == null) return `<td class="mx-na" ${key} onclick="X_open('${s.id}','${e.id}')">·</td>`; const a = Math.min(0.5, 0.1 + (Math.abs(d) / ((mean(Object.values(e.res).map((x: any) => x.level)) || 1000) * 0.08)) * 0.4); return `<td ${key} onclick="X_open('${s.id}','${e.id}')" style="background:hsl(${d >= 0 ? 135 : 2} 62% 42% / ${a.toFixed(2)})"><b>${d >= 0 ? '+' : '−'}${f0(Math.abs(d))}</b></td>`; }
      if (X.mm === 'rk') { const pv = C.prevOf(s.id, e), dr = pv && pv.res[s.id].rank != null && r.rank != null ? pv.res[s.id].rank - r.rank : null; /* رتبه‌ی کمتر = بهتر */ return `<td ${key} onclick="X_open('${s.id}','${e.id}')" style="${heat(p)}"><b>${r.rank != null ? f0(r.rank) : '—'}</b>${dr != null ? up(dr) : ''}</td>`; }
      return `<td ${key} onclick="X_open('${s.id}','${e.id}')" style="${heat(p)}"><b>${f0(r.level)}</b>${d != null ? up(d) : ''}</td>`;
    };
    const sumCells = (s: any) => {
      const sp = insts.map((i: string) => { const t = stat[s.id][i]; return t && t.played > 1 ? `<svg width="66" height="20" style="display:block">${spark(t.lv, insts.length > 1 ? IC[i] : t.lv[t.lv.length - 1] >= t.lv[0] ? 'var(--ok)' : 'var(--bad)')}</svg>` : ''; }).join('') || '<span class="m">—</span>';
      const avgC = insts.map((i: string) => { const t = stat[s.id][i]; return t && t.avg != null ? `<div ${insts.length > 1 ? `style="color:${IC[i]}"` : ''}><b>${f0(t.avg)}</b></div>` : ''; }).join('') || '<span class="m">—</span>';
      const lastC = insts.map((i: string) => { const t = stat[s.id][i]; return t && t.lastLv != null ? `<div ${insts.length > 1 ? `style="color:${IC[i]}"` : ''}><b>${f0(t.lastLv)}</b>${t.d1 != null ? up(t.d1) : ''}</div>` : ''; }).join('') || '<span class="m">—</span>';
      const attC = insts.map((i: string) => { const t = stat[s.id][i]; if (!t) return ''; return `<div class="${t.miss >= 2 ? 'mx-bad' : t.miss === 0 && t.held ? 'mx-good' : ''}">${n(t.played)}<small>/${n(t.held)}</small></div>`; }).join('');
      const f: any = flags(s), fl = `${f.top ? '<span title="۳ نفر برتر آخرین آزمون">🔥</span>' : ''}${f.up ? '<span title="رشد پیاپی">🚀</span>' : ''}${f.dn ? '<span title="افت پیاپی (دو بار پشت‌سرهم)">⚠️</span>' : ''}${f.ab ? '<span title="در آخرین آزمون شرکت نکرده">🚫</span>' : ''}`;
      return `<td class="mx-s">${avgC}</td><td class="mx-s">${lastC}</td><td class="mx-s">${sp}</td><td class="mx-s">${attC}</td><td class="mx-s mx-fl">${fl}</td>`;
    };
    const groupRow = (cl: string, ss: any[]) => {
      const avs = ss.map((s) => sv(s).avg).filter((x) => x != null) as number[], lasts = ss.map((s) => sv(s).lastLv).filter((x) => x != null) as number[];
      const cells = order.map((e: any) => { const got = ss.filter((s) => e.res[s.id]), av = mean(got.map((s) => e.res[s.id].level)); return `<td class="mx-gc" ${av != null ? `style="${heat(pct(e, av))}"` : ''}>${av != null ? `<b>${f0(av)}</b>` : ''}<small>${n(got.length)}/${n(ss.length)}</small></td>`; }).join('');
      return `<tr class="mx-g"><th class="mx-c0 mx-gh" colspan="3">${esc(cl)} <span class="m">· ${n(ss.length)} نفر</span></th><td class="mx-gs">${avs.length ? f0(mean(avs) as number) : '—'}</td><td class="mx-gs">${lasts.length ? f0(mean(lasts) as number) : '—'}</td><td class="mx-gs" colspan="3"></td>${cells}</tr>`;
    };
    const row = (s: any, idx: number) => `<tr data-n="${esc(C.norm(s.name))}"><td class="mx-c0 m">${n(idx)}</td><td class="mx-c1"><a href="#" onclick="X_gs('${s.id}');return false" title="کارنامه‌ی کامل ${esc(s.name)}">${esc(s.name)}</a></td><td class="mx-c2"><span class="tag">${esc(s.cls)}</span></td>${sumCells(s)}${order.map((e: any) => cell(s, e)).join('')}</tr>`;
    let body = '';
    if (grouped) CL.forEach((cl) => { const ss = list.filter((s: any) => s.cls === cl); if (!ss.length) return; body += groupRow(cl, ss) + ss.map((s: any, i: number) => row(s, i + 1)).join(''); });
    else body = list.map((s: any, i: number) => row(s, i + 1)).join('');

    const legend = `<div class="mx-leg"><span>رنگ هر خانه = جایگاه نسبی آن دانش‌آموز در <b>همان آزمون</b> بین همه‌ی دانش‌آموزان مدرسه</span><i class="mx-lg"></i><span>ضعیف ← قوی</span><span style="margin-inline-start:auto">${n(list.length)} نفر × ${n(nExam)} آزمون = ${n(list.length * nExam)} خانه</span></div>`;
    return `${kpis}${bar}${legend}<div class="mxw c"><table class="mx" data-mm="${X.mm}">${thead}<tbody>${body || `<tr><td colspan="${8 + nExam}" class="m" style="padding:24px;text-align:center">با این فیلترها دانش‌آموزی نیست.</td></tr>`}</tbody></table></div>
    <p class="m" style="margin-top:6px">روی خانه‌ها بروید تا جزئیات (تراز، رتبه، تغییر، درصد دروس) دیده شود · کلیک روی خانه = کارنامه‌ی همان آزمون · کلیک روی نام = همه‌ی کارنامه‌های آن دانش‌آموز · کلیک روی سربرگ آزمون = نتایج کل آن آزمون · کلیک روی سربرگ‌های «میانگین/آخرین/روند/حضور» = مرتب‌سازی.</p>`;
  }

  /* جستجو بدون رسم دوباره‌ی صفحه (تا مکان‌نما نپرد) */
  function filterDom(v: string) {
    X.mq = v; const q = C.norm(v), rows = document.querySelectorAll('table.mx tbody tr');
    let grp: HTMLElement | null = null, shown = 0; const flush = () => { if (grp) (grp as HTMLElement).hidden = !shown; };
    rows.forEach((tr: any) => { if (tr.classList.contains('mx-g')) { flush(); grp = tr; shown = 0; return; } if (!tr.dataset.n) return; const ok = !q || tr.dataset.n.includes(q); tr.hidden = !ok; if (ok) shown++; }); flush();
  }

  function csv() {
    const M = model(), { insts, pi, order, held, stat, base } = M, cmp = (a: any, b: any) => CL.indexOf(a.cls) - CL.indexOf(b.cls) || A.byNum(a, b);
    const metric = (s: any, e: any) => { const r = e.res[s.id]; if (!r) return ''; const d = C.delta(s.id, e); return X.mm === 'rk' ? (r.rank ?? '') : X.mm === 'ch' ? (d ?? '') : r.level; };
    const head = ['ردیف', 'نام', 'کلاس', ...insts.flatMap((i: string) => [`میانگین ${i}`, `آخرین ${i}`, `تغییر آخر ${i}`, `شرکت در ${i}`]), ...order.map((e: any) => `${e.inst} ${e.date} ${e.title}`)];
    const rows = [...base].sort(cmp).map((s: any, k: number) => [k + 1, s.name, s.cls, ...insts.flatMap((i: string) => { const t = stat[s.id][i]; return [t.avg != null ? Math.round(t.avg) : '', t.lastLv ?? '', t.d1 ?? '', `${t.played}/${held[i]}`]; }), ...order.map((e: any) => metric(s, e))]);
    void pi; A.dlf(`نمای-جامع-${X.mm === 'rk' ? 'رتبه' : X.mm === 'ch' ? 'تغییر' : 'تراز'}.csv`, [head, ...rows]);
  }

  return { page, filterDom, csv };
}

/* ---------- تولتیپ شناور خانه‌ها (یک بار برای کل برنامه) ---------- */
if (typeof document !== 'undefined' && !(window as any).__mxTipInstalled) {
  (window as any).__mxTipInstalled = true;
  let tip: HTMLElement | null = null;
  const hide = () => { if (tip) tip.hidden = true; };
  const show = (e: PointerEvent) => {
    const td = (e.target as Element | null)?.closest?.('table.mx td[data-s]') as HTMLElement | null;
    if (!td) return hide();
    const html = (window as any).__mxTip?.(td.dataset.s, td.dataset.e); if (!html) return hide();
    if (!tip) { tip = document.createElement('div'); tip.className = 'cht mx-tip'; document.body.appendChild(tip); }
    tip.innerHTML = html; tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(6, Math.min(e.clientX + 14, window.innerWidth - w - 6)) + 'px';
    tip.style.top = (e.clientY + 16 + h > window.innerHeight ? Math.max(6, e.clientY - h - 12) : e.clientY + 16) + 'px';
  };
  document.addEventListener('pointermove', show); document.addEventListener('pointerdown', show);
  document.addEventListener('scroll', hide, true); document.documentElement.addEventListener('mouseleave', hide);
}
