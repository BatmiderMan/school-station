// فضای تحلیل «تراز و رتبه»ی یک دانش‌آموز. ماز و قلم‌چی جدا بررسی می‌شوند (مقیاس تراز و رتبه‌ی آن‌ها با هم قابل مقایسه‌ی مستقیم نیست)
// و یک نمای «مقایسه» هم هست که هر مؤسسه را نسبت به خودش و نسبت به هم‌کلاسی‌ها می‌سنجد. درصد دروس اینجا نیست (در کارنامه‌ی هر آزمون است).
export function mkTrend(A: any) {
  const esc = A.esc, n = A.n, n1 = A.n1;
  const INST = ['ماز', 'قلم‌چی'];
  const IC: any = { 'ماز': '#6366f1', 'قلم‌چی': '#f59e0b' };
  const T: any = (A.U.TA = A.U.TA || { v: '' });
  const D = () => A.D;
  const exams = () => [...D().exams].sort((a: any, b: any) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  /* ---------- آمار ---------- */
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const median = (a: number[]) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const sd = (a: number[]) => { const m = mean(a); return m == null || a.length < 2 ? null : Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
  const slope = (a: number[]) => { const N = a.length; if (N < 3) return null; const mx = (N - 1) / 2, my = mean(a)!; let num = 0, den = 0; a.forEach((y, i) => { num += (i - mx) * (y - my); den += (i - mx) ** 2; }); return num / den; };
  const dl = (d: number | null, unit = '') => (d == null ? '<span class="m">—</span>' : d === 0 ? '<span class="m">＝</span>' : `<span class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'} ${n(Math.abs(d))}${unit}</span>`);

  interface Row { e: any; lv: number; rk: number | null; cav: number | null; cr: number; cn: number; d: number | null; dr: number | null }
  function rows(s: any, inst: string): Row[] {
    const all = exams().filter((e: any) => e.inst === inst && e.res[s.id]);
    return all.map((e: any, i: number) => {
      const r = e.res[s.id], p = i ? all[i - 1].res[s.id] : null, m = D().students.filter((x: any) => x.cls === s.cls && e.res[x.id]);
      return { e, lv: r.level, rk: r.rank ?? null, cav: m.length > 1 ? mean(m.map((x: any) => e.res[x.id].level)) : null, cr: 1 + m.filter((x: any) => e.res[x.id].level > r.level).length, cn: m.length,
        d: p ? r.level - p.level : null, dr: p && p.rank != null && r.rank != null ? p.rank - r.rank : null }; // dr > 0 = رتبه بهتر شده
    });
  }

  /* ---------- نمودار ---------- */
  function chart(labels: string[], series: any[], o: any = {}) {
    const W = 640, H = o.h || 250, pl = 56, pr = 16, pt = 22, pb = 34, N = labels.length;
    const vals = series.flatMap((s) => s.v).filter((x: any) => x != null && isFinite(x));
    if (!vals.length) return '<p class="m">داده‌ای نیست</p>';
    let lo = Math.min(...vals), hi = Math.max(...vals); if (o.ref) { lo = Math.min(lo, o.ref.v); hi = Math.max(hi, o.ref.v); }
    const pad = (hi - lo) * 0.14 || Math.abs(hi) * 0.06 || 1; lo -= pad; hi += pad;
    const X = (i: number) => (N < 2 ? (pl + W - pr) / 2 : W - pr - ((W - pl - pr) * i) / (N - 1));
    const Y = (v: number) => { const t = (v - lo) / (hi - lo); return o.invert ? pt + (H - pt - pb) * t : pt + (H - pt - pb) * (1 - t); };
    const fmt = o.fmt || ((x: number) => n(x));
    let s = `<svg viewBox="0 0 ${W} ${H}" width="100%">`;
    for (let k = 0; k <= 4; k++) { const v = lo + ((hi - lo) * k) / 4, y = Y(v); s += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="var(--bd)"/><text x="${pl - 7}" y="${y + 4}" text-anchor="end">${fmt(v)}</text>`; }
    const step = Math.ceil(N / 8); labels.forEach((l, i) => { if (i % step === 0 || i === N - 1) s += `<text x="${X(i)}" y="${H - 12}" text-anchor="middle">${esc(l)}</text>`; });
    if (o.ref) { const y = Y(o.ref.v); s += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="${o.ref.c || '#888'}" stroke-dasharray="2 5" opacity=".75"/>`; }
    series.forEach((se) => {
      const pts = se.v.map((v: any, i: number) => (v == null ? null : [X(i), Y(v), v, i])).filter(Boolean) as number[][];
      if (!pts.length) return;
      const d = pts.map((p, j) => (j ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
      if (se.area && !o.invert) s += `<path d="${d} L${pts[pts.length - 1][0].toFixed(1)} ${H - pb} L${pts[0][0].toFixed(1)} ${H - pb} Z" fill="${se.c}" opacity=".13"/>`;
      s += `<path d="${d}" fill="none" stroke="${se.c}" stroke-width="${se.w || 2.6}" ${se.dash ? 'stroke-dasharray="6 5"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
      if (se.dots !== false) pts.forEach((p) => { s += `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${se.dash ? 2.4 : 4}" fill="${se.c}"><title>${esc(labels[p[3]])}: ${fmt(p[2])}</title></circle>`; });
      if (se.lab) pts.forEach((p, j) => { if (se.lab === 'all' || j === 0 || j === pts.length - 1) s += `<text x="${p[0].toFixed(1)}" y="${(p[1] + (o.invert ? 17 : -9)).toFixed(1)}" text-anchor="middle" style="fill:${se.c};font-weight:700">${fmt(p[2])}</text>`; });
    });
    s += '</svg>';
    const leg = series.filter((x) => x.name).map((x) => `<span><b style="color:${x.c}">${x.dash ? '┅' : '●'}</b> ${esc(x.name)}</span>`).join('') + (o.ref ? `<span><b style="color:${o.ref.c || '#888'}">┈</b> ${esc(o.ref.name)}</span>` : '');
    return s + (leg ? `<div class="m" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:4px">${leg}</div>` : '');
  }
  /** میله‌های دوطرفه: بالاتر/پایین‌تر از میانگین هم‌کلاسی‌ها */
  function diffBars(R: Row[]) {
    const L = R.filter((r) => r.cav != null).reverse(); if (!L.length) return '<p class="m">میانگین کلاس هنوز قابل محاسبه نیست (حداقل دو نفر نتیجه لازم است).</p>';
    const mx = Math.max(...L.map((r) => Math.abs(r.lv - r.cav!)), 1);
    return L.map((r) => { const v = r.lv - r.cav!, w = Math.max(2, (Math.abs(v) / mx) * 100); return `<div style="display:grid;grid-template-columns:78px 1fr 70px;gap:8px;align-items:center;margin:5px 0"><span class="m">${esc(r.e.date.slice(5))}</span><div class="bar"><i style="width:${w}%;background:${v >= 0 ? 'var(--ok)' : 'var(--bad)'}"></i></div><b class="${v >= 0 ? 'up' : 'dn'}" style="text-align:left">${v >= 0 ? '+' : '−'}${n(Math.abs(v))}</b></div>`; }).join('');
  }

  /* ---------- نمای یک مؤسسه ---------- */
  function one(s: any, inst: string) {
    const R = rows(s, inst), c = IC[inst];
    if (!R.length) return `<div class="c m" style="text-align:center;padding:26px">برای ${inst} هنوز نتیجه‌ای ثبت نشده است.</div>`;
    const lv = R.map((r) => r.lv), rk = R.map((r) => r.rk).filter((x): x is number => x != null), last = R[R.length - 1], prev = R.length > 1 ? R[R.length - 2] : null;
    const bestR = R.reduce((a, b) => (b.lv > a.lv ? b : a)), worstR = R.reduce((a, b) => (b.lv < a.lv ? b : a)), m = mean(lv)!, md = median(lv)!, st = sd(lv), cv = st != null ? (st / m) * 100 : null, sl = slope(lv);
    const jump = R.filter((r) => r.d != null).sort((a, b) => b.d! - a.d!)[0], drop = R.filter((r) => r.d != null).sort((a, b) => a.d! - b.d!)[0];
    const bestRk = rk.length ? Math.min(...rk) : null, bestRkR = bestRk != null ? R.find((r) => r.rk === bestRk) : null;
    let streak = 0; for (let i = R.length - 1; i > 0 && R[i].lv > R[i - 1].lv; i--) streak++;
    const stab = cv == null ? '—' : cv < 3 ? 'خیلی پایدار' : cv < 6 ? 'پایدار' : cv < 10 ? 'نوسان متوسط' : 'پرنوسان';
    const proj = sl != null ? Math.round(lv[lv.length - 1] + sl) : null;
    const recent = R.length >= 6 ? mean(lv.slice(-3))! - mean(lv.slice(-6, -3))! : null;
    const rel = last.cav != null ? last.lv - last.cav : null;
    const kp = (t: string, b: string, sub: string) => `<div class="c k" style="border-top:3px solid ${c}"><span>${t}</span><b>${b}</b><span>${sub}</span></div>`;
    const kpis = `<div class="g" style="margin:10px 0">
      ${kp('آخرین تراز', n(last.lv), `${prev ? dl(last.d) + ' نسبت به قبل' : esc(last.e.date)}`)}
      ${kp('بهترین تراز', n(bestR.lv), esc(bestR.e.title))}
      ${kp('میانگین تراز', n(m), `میانه ${n(md)} · ${n(R.length)} آزمون`)}
      ${kp('ثبات', stab, cv != null ? `نوسان ${n1(cv)}٪ از میانگین` : 'حداقل دو آزمون لازم است')}
      ${kp('آخرین رتبه', last.rk != null ? n(last.rk) : '—', last.dr != null ? (last.dr === 0 ? 'بدون تغییر' : `<span class="${last.dr > 0 ? 'up' : 'dn'}">${last.dr > 0 ? '▲ بهتر شد' : '▼ بدتر شد'} ${n(Math.abs(last.dr))}</span>`) : 'رتبه‌ی کشوری')}
      ${kp('بهترین رتبه', bestRk != null ? n(bestRk) : '—', bestRkR ? esc(bestRkR.e.title) : '')}
      ${kp('جایگاه در کلاس', `${n(last.cr)} از ${n(last.cn)}`, rel != null ? `${rel >= 0 ? '+' : '−'}${n(Math.abs(rel))} نسبت به میانگین کلاس` : 'آخرین آزمون')}
      ${kp('روند', sl == null ? '—' : sl > 0 ? '📈 صعودی' : sl < 0 ? '📉 نزولی' : '➡ ثابت', sl == null ? 'حداقل سه آزمون لازم است' : `${sl > 0 ? '+' : '−'}${n(Math.abs(sl))} تراز در هر آزمون${proj != null ? ` · برآورد بعدی ≈ ${n(proj)}` : ''}`)}
    </div>`;
    const notes: string[] = [];
    if (streak >= 2) notes.push(`🔥 ${n(streak)} آزمون پشت‌سرهم تراز بالا رفته است.`);
    if (recent != null) notes.push(recent >= 0 ? `میانگین ۳ آزمون اخیر ${n(Math.abs(recent))} تراز بیشتر از ۳ آزمون قبل از آن است.` : `میانگین ۳ آزمون اخیر ${n(Math.abs(recent))} تراز کمتر از ۳ آزمون قبل از آن است.`);
    if (last.lv >= bestR.lv && R.length > 1) notes.push('آخرین آزمون بهترین تراز او تا امروز است.');
    else if (bestR.lv - last.lv > 0) notes.push(`${n(bestR.lv - last.lv)} تراز تا بهترین نتیجه‌اش (${esc(bestR.e.title)}) فاصله دارد.`);
    if (R.length >= 3 && proj != null) notes.push('«برآورد بعدی» فقط ادامه‌ی خط روند است و پیش‌بینی قطعی نیست؛ سختی آزمون‌ها با هم فرق دارد.');
    const labels = R.map((r) => r.e.date.slice(5)), ma = lv.map((_, i) => (i < 2 ? null : mean(lv.slice(i - 2, i + 1))));
    const levelChart = chart(labels, [
      { name: 'تراز او', c, v: lv, area: true, lab: R.length <= 8 ? 'all' : 'ends' },
      ...(R.length >= 3 ? [{ name: 'میانگین متحرک ۳ آزمون', c: '#10b981', v: ma, dash: true, w: 2 }] : []),
      ...(R.some((r) => r.cav != null) ? [{ name: 'میانگین کلاس', c: '#94a3b8', v: R.map((r) => r.cav), dash: true, w: 2 }] : [])], { ref: { v: m, c: c, name: 'میانگین خودش' } });
    const rankChart = rk.length ? chart(labels, [{ name: 'رتبه‌ی کشوری', c, v: R.map((r) => r.rk), lab: R.length <= 8 ? 'all' : 'ends' }], { invert: true, h: 220, fmt: (x: number) => n(Math.round(x)) }) + '<p class="m" style="margin:2px 0 0">بالاتر = رتبه‌ی بهتر</p>' : '<p class="m">رتبه ثبت نشده است.</p>';
    const hi = (t: string, r: Row | undefined, v: string) => (r ? `<div class="c k"><span>${t}</span><b style="font-size:17px">${v}</b><span>${esc(r.e.title)} · ${esc(r.e.date)}</span></div>` : '');
    const tableRows = [...R].reverse().map((r) => `<tr style="cursor:default"><td>${esc(r.e.date)}</td><td>${esc(r.e.title)}</td><td><b>${n(r.lv)}</b></td><td>${dl(r.d)}</td><td>${r.rk != null ? n(r.rk) : '—'}</td><td>${r.dr == null ? '<span class="m">—</span>' : r.dr === 0 ? '<span class="m">＝</span>' : `<span class="${r.dr > 0 ? 'up' : 'dn'}">${r.dr > 0 ? '▲' : '▼'} ${n(Math.abs(r.dr))}</span>`}</td><td>${n(r.cr)} از ${n(r.cn)}</td><td style="min-width:90px"><div class="bar"><i style="width:${Math.max(3, (r.lv / bestR.lv) * 100)}%;background:${c}"></i></div></td></tr>`).join('');
    return `${kpis}
    <div class="g2"><div class="c"><h3>روند تراز ${inst}</h3>${levelChart}</div><div class="c"><h3>روند رتبه‌ی کشوری ${inst}</h3>${rankChart}</div></div>
    <div class="g" style="margin:10px 0">${hi('بیشترین جهش', jump && jump.d! > 0 ? jump : undefined, `▲ ${n(jump?.d || 0)} تراز`)}${hi('بیشترین افت', drop && drop.d! < 0 ? drop : undefined, `▼ ${n(Math.abs(drop?.d || 0))} تراز`)}${hi('ضعیف‌ترین نتیجه', R.length > 2 ? worstR : undefined, `${n(worstR.lv)} تراز`)}</div>
    <div class="g2"><div class="c"><h3>نسبت به میانگین هم‌کلاسی‌ها</h3>${diffBars(R)}</div>
    <div class="c"><h3>نکته‌ها</h3>${notes.length ? `<ul style="margin:0;padding-inline-start:18px">${notes.map((t) => `<li style="margin:4px 0">${t}</li>`).join('')}</ul>` : '<p class="m">با ثبت آزمون‌های بیشتر، نکته‌ها اینجا ظاهر می‌شود.</p>'}</div></div>
    <div class="c tw" style="margin-top:10px"><h3>همه‌ی آزمون‌های ${inst}</h3><table><thead><tr><th>تاریخ</th><th>آزمون</th><th>تراز</th><th>تغییر</th><th>رتبه</th><th>تغییر رتبه</th><th>کلاس</th><th>نسبت به بهترینش</th></tr></thead><tbody>${tableRows}</tbody></table></div>`;
  }

  /* ---------- نمای مقایسه‌ی ماز و قلم‌چی ---------- */
  function compare(s: any) {
    const per: any = {}; INST.forEach((i) => (per[i] = rows(s, i)));
    if (!per['ماز'].length && !per['قلم‌چی'].length) return '<div class="c m" style="text-align:center;padding:26px">هنوز نتیجه‌ای ثبت نشده است.</div>';
    const all = exams().filter((e: any) => e.res[s.id]), labels = all.map((e: any) => e.date.slice(5));
    const best = (i: string) => (per[i].length ? Math.max(...per[i].map((r: Row) => r.lv)) : 1);
    const relBest = INST.map((i) => ({ name: i, c: IC[i], v: all.map((e: any) => (e.inst === i ? (e.res[s.id].level / best(i)) * 100 : null)), area: false, lab: 'none' }));
    const relCls = INST.map((i) => ({ name: i, c: IC[i], v: all.map((e: any) => { if (e.inst !== i) return null; const r = per[i].find((x: Row) => x.e === e); return r && r.cav ? ((r.lv - r.cav) / r.cav) * 100 : null; }) }));
    const col = (i: string) => { const R: Row[] = per[i]; if (!R.length) return Array(9).fill('—'); const lv = R.map((r) => r.lv), rk = R.map((r) => r.rk).filter((x): x is number => x != null), last = R[R.length - 1], m = mean(lv)!, st = sd(lv), sl = slope(lv);
      return [n(R.length), n(last.lv), n(Math.max(...lv)), n(m), st != null ? n1((st / m) * 100) + '٪' : '—', sl == null ? '—' : `${sl > 0 ? '📈' : sl < 0 ? '📉' : '➡'} ${n1((sl / m) * 100)}٪ در هر آزمون`, last.rk != null ? n(last.rk) : '—', rk.length ? n(Math.min(...rk)) : '—', `${n(last.cr)} از ${n(last.cn)}`]; };
    const names = ['تعداد آزمون', 'آخرین تراز', 'بهترین تراز', 'میانگین تراز', 'نوسان (٪ از میانگین)', 'روند (٪ از میانگین)', 'آخرین رتبه', 'بهترین رتبه', 'جایگاه در کلاس (آخرین)'];
    const a = col('ماز'), b = col('قلم‌چی');
    return `<div class="c tw"><h3>ماز و قلم‌چی کنار هم</h3><table><thead><tr><th></th><th style="color:${IC['ماز']}">ماز</th><th style="color:${IC['قلم‌چی']}">قلم‌چی</th></tr></thead><tbody>${names.map((t, k) => `<tr style="cursor:default"><td class="m">${t}</td><td><b>${a[k]}</b></td><td><b>${b[k]}</b></td></tr>`).join('')}</tbody></table>
    <p class="m" style="margin:8px 0 0">ترازِ ماز و قلم‌چی مقیاس یکسان ندارند؛ برای همین فقط روند و جایگاه نسبی را کنار هم می‌گذارم، نه خود عددها را.</p></div>
    <div class="g2" style="margin-top:10px"><div class="c"><h3>تراز نسبت به بهترین نتیجه‌ی خودش (۱۰۰ = بهترین)</h3>${chart(labels, relBest, { fmt: (x: number) => n(Math.round(x)) })}</div>
    <div class="c"><h3>فاصله از میانگین هم‌کلاسی‌ها (٪)</h3>${chart(labels, relCls, { fmt: (x: number) => `${x >= 0 ? '+' : '−'}${n1(Math.abs(x))}٪`, ref: { v: 0, c: '#94a3b8', name: 'میانگین کلاس' } })}</div></div>`;
  }

  /* ---------- ورودی ---------- */
  function analysis(s: any) {
    const cnt = (i: string) => exams().filter((e: any) => e.inst === i && e.res[s.id]).length;
    if (!T.v || (T.v !== 'cmp' && !INST.includes(T.v))) T.v = cnt('ماز') >= cnt('قلم‌چی') ? 'ماز' : 'قلم‌چی';
    const tabs = `<div class="seg">${[['ماز', `ماز (${n(cnt('ماز'))})`], ['قلم‌چی', `قلم‌چی (${n(cnt('قلم‌چی'))})`], ['cmp', '⚖️ مقایسه']].map(([k, t]) => `<button class="${T.v === k ? 'on' : ''}" onclick="TA_('${k}')">${t}</button>`).join('')}</div>`;
    return `<h3 class="xh" style="margin:14px 0 8px">تحلیل تراز و رتبه</h3>${tabs}${T.v === 'cmp' ? compare(s) : one(s, T.v)}`;
  }
  return { analysis, h: { TA_: (v: string) => { T.v = v; A.draw(); } } };
}
