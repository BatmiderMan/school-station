// مرکز معافیت‌ها: نمای روزمحور (بدون نیاز به برنامه‌ی کلاسی)، معافیت معلم بر اساس «درس»، معافیت پیشرفت، گروه‌ها.
// برنامه‌ی ساعتی کلاس اختیاری است؛ اگر وارد شود فقط ساعت دقیق را در تقویم دانش‌آموز نشان می‌دهد.

export function mkExempt(A: any) {
  const esc = A.esc, n = A.n, D = () => A.D, U = A.U;
  const XM: any = (U.XM = U.XM || { sub: null });
  const enc = encodeURIComponent, dec = decodeURIComponent;
  const colorOf = (L: string) => A.GC[A.GL.indexOf(L)];
  const stuOf = (cl: string) => D().students.filter((s: any) => s.cls === cl).sort(A.byNum);
  const clean = (x: any) => String(x || '').trim();
  const ttSubs = (cl: string): string[] => [...new Set<string>(A.tt(cl).flat().map(clean).filter(Boolean))];
  const subjectsFor = (cl: string): string[] => { const E = A.ensureEx(); return [...new Set<string>([...A.SUBJ, ...ttSubs(cl), ...Object.keys((E.fs || {})[cl] || {})])]; };
  const sameDay = (a: Date, b: Date) => A.mid(a).getTime() === A.mid(b).getTime();
  const tag = (t: string, bg?: string) => `<span class="tag" ${bg ? `style="background:${bg};color:#fff;border-color:${bg}"` : ''}>${t}</span>`;

  /* ---------- موتور روزمحور ---------- */
  // لیست همه‌ی معاف‌های یک روز کلاس، هر نفر با دلیل‌هایش: g=گروه، f=معلم (درس)، p=پیشرفت (درس)
  function dayList(cl: string, w: number, d: number) {
    const E = A.ensureEx(), L = A.letter(d, w), map: any = {}, add = (id: string, o: any) => { (map[id] = map[id] || []).push(o); };
    const today = new Set(A.tt(cl)[d].map(clean).filter(Boolean)), known = new Set(ttSubs(cl));
    A.members(cl, L).forEach((id: string) => add(id, { k: 'g' }));
    subjectsFor(cl).forEach((s) => { if (known.has(s) && today.has(s)) A.teacherIds(cl, s).forEach((id: string) => add(id, { k: 'f', s })); });
    const pw = E.pw[w] || {};
    Object.keys(pw).forEach((id) => { if (!A.nm(id) || !D().students.find((x: any) => x.id === id && x.cls === cl)) return; pw[id].forEach((k: string) => { if (k.startsWith('S:')) return; const [dd, p] = k.split('-').map(Number); if (dd === d) add(id, { k: 'p', s: A.subj(cl, dd, p) }); }); });
    const ids = Object.keys(map).filter((id) => A.nm(id)).sort((a, b) => (A.nm(a) as string).localeCompare(A.nm(b), 'fa'));
    return { L, ids, map };
  }
  // معافیت‌هایی که روز مشخص ندارند: معافیت معلم برای درسی که در برنامه نیست + معافیت پیشرفت «درسی»
  function loose(cl: string, w: number) {
    const E = A.ensureEx(), known = new Set(ttSubs(cl)), t: any[] = [], p: any[] = [];
    subjectsFor(cl).forEach((s) => { const ids = A.teacherIds(cl, s); if (ids.length && !known.has(s)) t.push({ s, ids }); });
    const pw = E.pw[w] || {};
    Object.keys(pw).forEach((id) => { if (!D().students.find((x: any) => x.id === id && x.cls === cl)) return; pw[id].forEach((k: string) => { if (k.startsWith('S:')) p.push({ id, s: k.slice(2) }); }); });
    return { t, p };
  }
  const why = (o: any) => o.k === 'g' ? tag('👥 گروه', '#10b981') : o.k === 'f' ? tag(`🎓 ${esc(o.s)}`, '#f59e0b') : tag(`🚀 ${esc(o.s)}`, '#ec4899');

  /* ---------- روز مدرسه‌ی بعد ---------- */
  function nextDay(): [number, number, string] {
    const t = A.mid(new Date()).getTime(), w0 = A.wk0();
    for (let k = 0; k < 3; k++) for (let d = 0; d < 4; d++) { const x = A.mid(A.dateOf(w0 + k, d)).getTime(); if (x >= t) return [w0 + k, d, x === t ? 'امروز' : 'روز مدرسه‌ی بعد']; }
    return [w0, 0, 'هفته‌ی جاری'];
  }
  function banner() {
    const [w, d, lab] = nextDay(), date = A.dateOf(w, d);
    return `<div class="c xban" style="margin-bottom:12px"><div class="tb" style="margin-bottom:6px"><b style="font-size:16px">${lab} — ${A.DAYN[d]} ${A.jd(date)}</b><span style="flex:1"></span><button class="btn p" onclick="XM_copy(${w},${d})">📋 کپی متن برای ارسال</button></div>
    ${A.CL.map((c: string) => { const L = A.letter(d, w), gm = A.members(c, L), lo = dayList(c, w, d); const extra = lo.ids.length - gm.length;
      return `<div class="row" style="cursor:default"><span><b>${c}</b> ${tag('گروه ' + L, colorOf(L))}</span><span class="m" style="text-align:left">${n(lo.ids.length)} نفر معاف${extra > 0 ? ` (${n(gm.length)} گروه + ${n(extra)} دیگر)` : ''}${gm.length ? ' — ' + esc(A.names(gm, 4)) : ''}</span></div>`; }).join('')}</div>`;
  }
  function textFor(w: number, d: number) {
    const out = [`معافیت‌های ${A.DAYN[d]} ${A.jd(A.dateOf(w, d))}`];
    A.CL.forEach((c: string) => { const lo = dayList(c, w, d); out.push('', `${c} — گروه ${lo.L}:`);
      const by = (k: string) => lo.ids.filter((id) => lo.map[id].some((o: any) => o.k === k));
      const g = by('g'); out.push(g.length ? g.map((id) => '• ' + A.nm(id)).join('\n') : '(گروه خالی)');
      subjectsFor(c).forEach((s) => { const ids = lo.ids.filter((id) => lo.map[id].some((o: any) => o.k === 'f' && o.s === s)); if (ids.length) out.push(`معلم (${s}): ` + ids.map(A.nm).join('، ')); });
      const p = lo.ids.filter((id) => lo.map[id].some((o: any) => o.k === 'p')); if (p.length) out.push('پیشرفت: ' + p.map((id) => A.nm(id) + ' (' + lo.map[id].filter((o: any) => o.k === 'p').map((o: any) => o.s).join('، ') + ')').join('، ')); });
    return out.join('\n');
  }

  /* ---------- تب ۱: هفته ---------- */
  function week() {
    const cl = U.xc, w = U.w, ss = stuOf(cl), sv = ss.find((s: any) => s.id === U.sv) ? U.sv : '', today = new Date();
    const cards = [0, 1, 2, 3].map((d) => {
      const lo = dayList(cl, w, d), c = colorOf(lo.L), date = A.dateOf(w, d), isT = sameDay(date, today), head = `<div class="tb" style="margin-bottom:8px"><b style="font-size:15px">${A.DAYN[d]}</b><span class="m">${A.jd(date)}</span>${isT ? tag('امروز') : ''}<span style="flex:1"></span>${tag('گروه ' + lo.L, c)}</div>`;
      if (sv) { const ws = lo.map[sv] || []; return `<div class="c" style="border-top:4px solid ${c}">${head}${ws.length ? `<div style="font-size:15px;margin-bottom:6px"><b class="up">معاف</b></div>${ws.map(why).join('')}` : `<div class="m">حضور در کلاس</div>`}</div>`; }
      const g = lo.ids.filter((id) => lo.map[id].some((o: any) => o.k === 'g')), others = lo.ids.filter((id) => !g.includes(id) || lo.map[id].length > 1);
      return `<div class="c" style="border-top:4px solid ${c}">${head}
        <div><b>👥 ${n(g.length)} نفر معاف (گروه)</b></div><div class="m" style="margin:2px 0 8px">${esc(A.names(g, 8)) || 'گروه خالی است'}</div>
        ${others.filter((id) => lo.map[id].some((o: any) => o.k !== 'g')).map((id) => `<div style="margin:3px 0"><span>${esc(A.nm(id))}</span> ${lo.map[id].filter((o: any) => o.k !== 'g').map(why).join('')}</div>`).join('')}
        <div class="tb" style="margin:10px 0 0"><button class="btn" onclick="XM_day(${d})">لیست کامل (${n(lo.ids.length)})</button></div></div>`; }).join('');
    const lz = loose(cl, w), looseHtml = (lz.t.length || lz.p.length) && !sv ? `<div class="c" style="margin-top:10px"><h3>🎓 معافیت‌های درسی (بدون ساعت مشخص)</h3>${lz.t.map((x: any) => `<div class="row" style="cursor:default"><span>هر جلسه‌ی «${esc(x.s)}»</span><span class="m">${esc(x.ids.map(A.nm).join('، '))}</span></div>`).join('')}${lz.p.map((x: any) => `<div class="row" style="cursor:default"><span>🚀 ${esc(A.nm(x.id))}</span><span class="m">یک جلسه از «${esc(x.s)}»</span></div>`).join('')}</div>` : '';
    const pool = ss.filter((s: any) => !A.ensureEx().g[s.id]);
    const teachSv = sv ? (A.teacherSubs(sv, cl) as string[]).filter((s) => !ttSubs(cl).includes(s)) : [];
    return `${banner()}${A.wnav()}${A.rotBar()}
    <div class="tb"><select onchange="U.sv=this.value;draw()"><option value="">نمای کل کلاس ${cl}</option>${ss.map((s: any) => `<option value="${s.id}" ${s.id === sv ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select><button class="btn" onclick="XM_png()">🖼 تصویر برای ارسال</button><button class="btn" onclick="window.print()">چاپ</button></div>
    <div class="g2">${cards}</div>${teachSv.length ? `<div class="c" style="margin-top:10px">🎓 معافیت درسی ${esc(A.nm(sv))}: ${teachSv.map((s) => tag(esc(s), '#f59e0b')).join('')} <span class="m">(هر جلسه)</span></div>` : ''}${looseHtml}
    ${pool.length ? `<p class="dn">${n(pool.length)} نفر از این کلاس هنوز گروه ندارند؛ <a href="#" onclick="U.xs='grp';draw();return false">گروه‌بندی</a></p>` : ''}`;
  }
  function dayModal(d: number) {
    const cl = U.xc, w = U.w, lo = dayList(cl, w, d);
    const h = `<div class="tb"><h3 style="margin:0;flex:1">${cl} · ${A.DAYN[d]} ${A.jd(A.dateOf(w, d))} ${tag('گروه ' + lo.L, colorOf(lo.L))}</h3><button class="btn" onclick="cm()">بستن</button></div>
      ${lo.ids.map((id) => `<div class="row" style="cursor:default"><span>${esc(A.nm(id))}</span><span>${lo.map[id].map(why).join('')}</span></div>`).join('') || '<p class="m">کسی معاف نیست.</p>'}`;
    document.getElementById('mb')!.innerHTML = h; document.getElementById('md')!.classList.add('on');
  }

  /* ---------- تب ۳: معافیت معلم (بر اساس درس) ---------- */
  function teacher() {
    const cl = U.xc, subs = subjectsFor(cl), ss = stuOf(cl);
    if (!XM.sub || !subs.includes(XM.sub)) XM.sub = subs.find((s) => A.teacherIds(cl, s).length) || subs[0];
    const sel = XM.sub, ids: string[] = A.teacherIds(cl, sel);
    const chips = subs.map((s) => { const c = A.teacherIds(cl, s).length; return `<button class="${s === sel ? 'on' : ''}" onclick="XM_sub('${enc(s)}')">${esc(s)}${c ? ` <i class="bdg" style="display:inline-grid;margin:0 4px">${n(c)}</i>` : ''}</button>`; }).join('');
    const summary = subs.filter((s) => A.teacherIds(cl, s).length).map((s) => `<div class="row" style="cursor:pointer" onclick="XM_sub('${enc(s)}')"><span><b>${esc(s)}</b></span><span class="m">${esc(A.names(A.teacherIds(cl, s), 6))}</span></div>`).join('');
    return `<div class="c"><h3>🎓 معلمی که گفته «هر کس نمی‌خواهد، نیاید»</h3><p class="m" style="margin:0">اول درس را انتخاب کنید، بعد دانش‌آموزانی را که معاف‌اند تیک بزنید. همین‌قدر! معافیت <b>هر هفته و در تمام جلسه‌های آن درس</b> اعمال می‌شود و نیازی به برنامه‌ی کلاسی نیست.</p></div>
    <div class="seg" style="margin-top:10px">${chips}<button onclick="XM_newSub()">＋ درس دیگر</button></div>
    <div class="c"><div class="tb"><h3 style="margin:0;flex:1">معافیت درس «${esc(sel)}» — ${cl} <span class="m">${n(ids.length)} نفر</span></h3><button class="btn" onclick="XM_all('${enc(sel)}',1)">انتخاب همه</button><button class="btn" onclick="XM_all('${enc(sel)}',0)">پاک‌کردن همه</button></div>
    <div class="chk">${ss.map((s: any) => `<label><input type="checkbox" ${ids.includes(s.id) ? 'checked' : ''} onchange="XM_tf('${enc(sel)}','${s.id}',this.checked)"> ${s.num ? n(s.num) + '. ' : ''}${esc(s.name)}</label>`).join('')}</div></div>
    ${summary ? `<div class="c" style="margin-top:10px"><h3>خلاصه‌ی معافیت‌های معلم ${cl}</h3>${summary}</div>` : ''}`;
  }

  /* ---------- تب ۴: معافیت پیشرفت ---------- */
  function progress() {
    const cl = U.xc, w = U.w, E = A.ensureEx(), ss = A.snap().filter((s: any) => s.cls === cl), subs = subjectsFor(cl), pw = E.pw[w] || {}, hasTT = ttSubs(cl).length > 0;
    const sug = new Set(ss.filter((s: any) => s.d > 0).sort((a: any, b: any) => b.d - a.d).slice(0, 3).map((s: any) => s.id));
    const rows = ss.sort((a: any, b: any) => (sug.has(b.id) ? 1 : 0) - (sug.has(a.id) ? 1 : 0) || (b.l || 0) - (a.l || 0)).map((s: any) => `<tr style="cursor:default"><td>${esc(s.name)}${sug.has(s.id) ? ' ' + tag('⭐ پیشنهاد', '#8b5cf6') : ''}</td><td>${n(s.l)} ${A.dl(s.d)}</td>
      <td style="white-space:normal"><div class="chips" style="margin:0">${subs.map((k) => `<button class="${(E.skip[s.id] || []).includes(k) ? 'on' : ''}" onclick="tgSkip('${s.id}','${esc(k)}')">${esc(k)}</button>`).join('')}</div></td>
      <td style="white-space:normal">${pw[s.id] ? `${pw[s.id].map((k: string) => tag(A.pkl(cl, k))).join('')}<div style="margin-top:6px"><button class="btn" onclick="revoke('${s.id}')">لغو</button></div>` : `<button class="btn p" onclick="grant('${s.id}')">اعطا</button>`}</td></tr>`).join('');
    return `<div class="c"><h3>🚀 پاداش پیشرفت</h3><p class="m" style="margin:0">۱) برای هر دانش‌آموز درس‌هایی را علامت بزنید که دوست دارد از آن‌ها معاف شود. ۲) «اعطا» دو جلسه از همان درس‌ها را برای این هفته ثبت می‌کند. دانش‌آموزان با بیشترین پیشرفت تراز بالا آمده‌اند (⭐).${hasTT ? '' : ' <b>چون برنامه‌ی ساعتی وارد نشده، معافیت به‌صورت «درس» ثبت می‌شود، بدون ساعت دقیق.</b>'}</p></div>
    <div style="margin-top:10px">${A.insSeg()}${A.wnav()}</div><div class="c tw"><table><thead><tr><th>دانش‌آموز</th><th>تراز</th><th>درس‌های دلخواه برای معافیت</th><th>این هفته</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  /* ---------- تب ۵: برنامه‌ی ساعتی (اختیاری) ---------- */
  const dayIdx = (t: string) => { const s = t.replace(/[\u200c\s]/g, ''); return s.startsWith('یک') ? 1 : s.startsWith('سه') ? 2 : s.startsWith('چهار') ? 3 : s.startsWith('شنبه') ? 0 : -1; };
  function sched() {
    const cl = U.xc, T = A.tt(cl), txt = [0, 1, 2, 3].map((d) => `${A.DAYN[d]}: ${T[d].map(clean).filter(Boolean).join('، ')}`).join('\n');
    return `<div class="c" style="border-inline-start:5px solid var(--ac)"><h3>🗓 برنامه‌ی ساعتی کلاس ${cl} <span class="tag">اختیاری</span></h3><p class="m" style="margin:0">برای معافیت‌ها <b>لازم نیست</b>. فقط اگر بخواهید ساعت دقیق هر درس در تقویم دانش‌آموزان نشان داده شود، یک‌بار برنامه را اینجا بنویسید یا از جایی کپی کنید؛ هر خط یک روز، درس‌ها با ویرگول جدا.</p></div>
    <div class="c" style="margin-top:10px"><textarea id="xm_tt" style="width:100%;min-height:120px;direction:rtl" placeholder="شنبه: ریاضی، فیزیک، شیمی، ادبیات&#10;یکشنبه: ...">${esc(txt)}</textarea>
    <div class="tb" style="margin:8px 0 0"><button class="btn p" onclick="XM_tt()">اعمال برنامه</button><button class="btn" onclick="XM_ttCopy()">کپی برای همه‌ی کلاس‌ها</button><button class="btn" style="color:var(--bad)" onclick="XM_ttClear()">پاک‌کردن برنامه</button></div></div>
    <details class="c" style="margin-top:10px"><summary style="cursor:pointer"><b>ویرایش جدولی و معافیت ساعتیِ یک درس خاص</b></summary>${A.xtt()}</details>`;
  }

  /* ---------- قاب اصلی ---------- */
  function page() {
    const T: string[][] = [['cal', '🏠 هفته'], ['grp', '👥 گروه‌ها'], ['fx', '🎓 معافیت معلم'], ['prg', '🚀 معافیت پیشرفت'], ['tt', '🗓 برنامه‌ی ساعتی']];
    if (!T.find((t) => t[0] === U.xs)) U.xs = 'cal';
    const body: any = { cal: week, grp: () => A.xgrp(), fx: teacher, prg: progress, tt: sched };
    return `<div class="seg">${A.CL.map((c: string) => `<button class="${U.xc === c ? 'on' : ''}" onclick="U.xc='${c}';U.sv='';draw()">${c}</button>`).join('')}</div>
    <div class="seg xtabs">${T.map(([k, t]) => `<button class="${U.xs === k ? 'on' : ''}" onclick="U.xs='${k}';draw()">${t}</button>`).join('')}</div>${body[U.xs]()}`;
  }

  /* ---------- تصویر برای ارسال (روزمحور) ---------- */
  function svgDays(cl: string, w: number, sv: string, font: string) {
    const W = 940, pad = 16, cw = (W - 2 * pad) / 4, X = (d: number) => W - pad - (d + 1) * cw, top = 112, rh = 22;
    const cols = [0, 1, 2, 3].map((d) => {
      const lo = dayList(cl, w, d), lines: [string, string, number][] = [];
      if (sv) { const ws = lo.map[sv] || []; if (!ws.length) lines.push(['حضور در کلاس', '#6b6f85', 400]); else ws.forEach((o: any) => lines.push([o.k === 'g' ? 'معاف (گروه) — کل روز' : o.k === 'f' ? 'معاف (معلم) — ' + o.s : 'معاف (پیشرفت) — ' + o.s, o.k === 'g' ? '#10b981' : o.k === 'f' ? '#b45309' : '#be185d', 800])); }
      else {
        lines.push([`معاف (گروه ${lo.L}) — ${lo.ids.filter((id) => lo.map[id].some((o: any) => o.k === 'g')).length} نفر`, '#10b981', 800]);
        lo.ids.filter((id) => lo.map[id].some((o: any) => o.k === 'g')).forEach((id) => lines.push([A.nm(id), '#1b1d2a', 400]));
        lo.ids.filter((id) => lo.map[id].some((o: any) => o.k === 'f')).forEach((id) => lines.push(['🎓 ' + A.nm(id) + ' · ' + lo.map[id].filter((o: any) => o.k === 'f').map((o: any) => o.s).join('،'), '#b45309', 400]));
        lo.ids.filter((id) => lo.map[id].some((o: any) => o.k === 'p')).forEach((id) => lines.push(['🚀 ' + A.nm(id) + ' · ' + lo.map[id].filter((o: any) => o.k === 'p').map((o: any) => o.s).join('،'), '#be185d', 400]));
      }
      return { d, L: lo.L, lines };
    });
    const H = top + Math.max(...cols.map((c) => c.lines.length), 2) * rh + 40, T = (x: number, y: number, t: string, sz = 14, c = '#1b1d2a', wt = 400) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${sz}" fill="${c}" font-weight="${wt}">${esc(t)}</text>`;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" direction="rtl"><style>@font-face{font-family:V;src:url(data:font/woff2;base64,${font})}text{font-family:V,Tahoma,sans-serif}</style><rect width="100%" height="100%" fill="#f4f5fa"/>`;
    s += T(W / 2, 34, `معافیت‌های هفتگی ${cl}${sv ? ' — ' + A.nm(sv) : ''}`, 22, '#1b1d2a', 800) + T(W / 2, 60, `${A.jd(A.dateOf(w, 0))} تا ${A.jd(A.dateOf(w, 3))}`, 14, '#6b6f85');
    cols.forEach((c) => { const col = colorOf(c.L);
      s += `<rect x="${X(c.d) + 3}" y="72" width="${cw - 6}" height="40" rx="10" fill="${col}"/>` + T(X(c.d) + cw / 2, 90, A.DAYN[c.d] + ' · ' + A.jd(A.dateOf(w, c.d)), 14, '#fff', 800) + T(X(c.d) + cw / 2, 106, 'گروه ' + c.L, 11, '#fff');
      s += `<rect x="${X(c.d) + 3}" y="${top + 6}" width="${cw - 6}" height="${H - top - 14}" rx="10" fill="#fff" stroke="#e3e5ef"/>`;
      c.lines.forEach((l, i) => { s += T(X(c.d) + cw / 2, top + 28 + i * rh, l[0], 13, l[1], l[2]); }); });
    return s + '</svg>';
  }
  async function png() {
    const sv = U.sv && D().students.find((s: any) => s.id === U.sv && s.cls === U.xc) ? U.sv : '', svg = svgDays(U.xc, U.w, sv, await A.fontB64());
    const img = new Image();
    img.onload = () => { const k = 2, cv = document.createElement('canvas'); cv.width = img.width * k; cv.height = img.height * k; const c = cv.getContext('2d')!; c.scale(k, k); c.drawImage(img, 0, 0); cv.toBlob((b) => A.saveFile(`${U.xc}-${sv ? A.nm(sv) + '-' : ''}معافیت-هفته.png`, b), 'image/png'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  /* ---------- عملیات ---------- */
  const val = (id: string) => (document.getElementById(id) as HTMLTextAreaElement | null)?.value ?? '';
  function parseTT(txt: string, cl: string) {
    const E = A.ensureEx(), T = A.tt(cl); let mx = 0, hit = 0;
    txt.split('\n').forEach((line) => { const i = line.search(/[:：]/); if (i < 0) return; const d = dayIdx(line.slice(0, i)); if (d < 0) return;
      const sb = line.slice(i + 1).split(/[،,\-–/|]/).map(clean).filter(Boolean); T[d].length = 0; sb.forEach((x) => T[d].push(x)); mx = Math.max(mx, sb.length); hit++; });
    if (hit) E.per = Math.max(3, Math.min(8, Math.max(E.per, mx))); return hit;
  }
  const h = {
    XM_sub: (s: string) => { XM.sub = dec(s); A.draw(); },
    XM_newSub: () => { const s = clean(prompt('نام درس را بنویسید:')); if (!s) return; const E = A.ensureEx(); E.fs = E.fs || {}; E.fs[U.xc] = E.fs[U.xc] || {}; E.fs[U.xc][s] = E.fs[U.xc][s] || []; XM.sub = s; A.save(); A.draw(); },
    XM_tf: (s: string, id: string, on: boolean) => {
      const sub = dec(s), cl = U.xc, E = A.ensureEx(); E.fs = E.fs || {}; const m = (E.fs[cl] = E.fs[cl] || {}), a = (m[sub] || []).filter((x: string) => x !== id); if (on) a.push(id); m[sub] = a;
      if (!on) Object.keys(E.fixed).forEach((k) => { if (!k.startsWith(cl + '|')) return; const [d, p] = k.split('|')[1].split('-').map(Number); if (clean(A.tt(cl)[d]?.[p]) === sub) E.fixed[k] = E.fixed[k].filter((x: string) => x !== id); });
      A.save(); A.draw();
    },
    XM_all: (s: string, on: number) => { const sub = dec(s), cl = U.xc, E = A.ensureEx(); E.fs = E.fs || {}; (E.fs[cl] = E.fs[cl] || {})[sub] = on ? stuOf(cl).map((x: any) => x.id) : [];
      if (!on) Object.keys(E.fixed).forEach((k) => { if (!k.startsWith(cl + '|')) return; const [d, p] = k.split('|')[1].split('-').map(Number); if (clean(A.tt(cl)[d]?.[p]) === sub) E.fixed[k] = []; }); A.save(); A.draw(); },
    XM_day: dayModal,
    XM_copy: (w: number, d: number) => { const t = textFor(w, d); const done = () => A.toast('کپی شد؛ حالا در پیام‌رسان بچسبانید ✓'); if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(done, () => { prompt('متن را کپی کنید:', t); }); else prompt('متن را کپی کنید:', t); },
    XM_png: png,
    XM_tt: () => { const k = parseTT(val('xm_tt'), U.xc); A.save(); A.draw(); A.toast(k ? 'برنامه اعمال شد ✓' : 'خطی با نام روز (مثلاً «شنبه: …») پیدا نشد'); },
    XM_ttCopy: () => { if (!confirm('همین برنامه برای همه‌ی کلاس‌ها هم اعمال شود؟ (برنامه‌ی فعلی آن‌ها جایگزین می‌شود)')) return; const txt = val('xm_tt'); A.CL.forEach((c: string) => parseTT(txt, c)); A.save(); A.draw(); A.toast('برای همه‌ی کلاس‌ها اعمال شد'); },
    XM_ttClear: () => { if (!confirm('برنامه‌ی ساعتی این کلاس پاک شود؟ (معافیت‌های درسی حفظ می‌شوند)')) return; A.tt(U.xc).forEach((r: string[]) => { r.length = 0; }); A.save(); A.draw(); },
  };
  return { page, h };
}
