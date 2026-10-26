// تاریخچه‌ی تماس با والدین: تماس‌های ثبت‌شده در غیبت‌ها + تماس‌های دستی مدیر.
import { sb } from './supa';
import { online, down, cacheGet, cacheSet, withTimeout, retryable, flush, pending } from './offq';

type ManualCall = { id: string; student: string; at: string; contact: string; phone?: string; reason: string; outcome: string; note: string; followup: string };
type AbsenceCall = { student_id: string; day: string; note: string; updated_at?: string };

export function mkCalls(A: any) {
  const U = A.U, D = () => A.D, esc = A.esc, n = A.n;
  const C: any = (U.calls = U.calls || { q: '', source: 'all', cls: 'all', student: 'all', edit: null, rows: [], loaded: false, busy: false, err: '', at: 0 });
  const manual = (): ManualCall[] => (D().calls = D().calls || []);
  const students = () => [...D().students].sort((a: any, b: any) => A.CL.indexOf(a.cls) - A.CL.indexOf(b.cls) || A.byNum(a, b));
  const byId = (id: string) => D().students.find((s: any) => s.id === id);
  const localId = (sid: string) => Object.keys(D().srv?.accounts || {}).find((id) => D().srv.accounts[id]?.sid === sid);
  const norm = (s: any) => String(s ?? '').replace(/[۰-۹]/g, (x) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(x))).replace(/[٠-٩]/g, (x) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(x))).replace(/ي/g, 'ی').replace(/ك/g, 'ک').toLowerCase().trim();
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value || '';
  const localNow = () => { const d = new Date(), z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 16); };
  const dateFa = (iso: string) => new Date(iso).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
  const when = (iso: string) => new Date(iso).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const usable = () => A.SV.isMgr() || !!(window as any).__OFFLINE;
  // تماسی که بدون اینترنت ثبت شده (از بخش غیبت‌ها) همین‌جا هم دیده شود
  function local(r: any) { const rows = (C.rows as any[]).filter((x) => !(x.student_id === r.student_id && x.day === r.day)); if (r.called) rows.push({ student_id: r.student_id, day: r.day, note: r.note, updated_at: r.updated_at }); C.rows = rows; cacheSet('calls', rows); }
  async function load(force = false) {
    if (!usable() || C.busy || (!force && C.loaded && Date.now() - C.at < 30000)) return;
    C.busy = true; C.err = '';
    try {
      if (!online() || down()) throw { __net: true, message: 'offline' };
      await flush(); if (pending()) throw { __net: true, message: 'pending' };
      const rows: AbsenceCall[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from('att_notes').select('student_id,day,note,updated_at').eq('called', true).order('day', { ascending: false }).range(from, from + 999);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
      }
      C.rows = rows; C.loaded = true; C.stale = false; cacheSet('calls', rows);
    } catch (e: any) {
      if (retryable(e)) { if (!C.stale) C.rows = (await cacheGet('calls')) || C.rows || []; C.loaded = true; C.stale = true; } else C.err = e?.message || 'دریافت تماس‌های غیبت ناموفق بود.';
    }
    C.busy = false; C.at = Date.now(); if (U.p === 'calls') (A.bg || A.draw)();
  }

  function combined() {
    const own = manual().map((x) => ({ ...x, source: 'manual', student: x.student, sortAt: x.at, date: x.at.slice(0, 10) }));
    const abs = (C.rows as AbsenceCall[]).map((x) => ({ id: 'absence:' + x.student_id + ':' + x.day, student: localId(x.student_id) || '', source: 'absence', sortAt: x.day + 'T12:00:00', date: x.day, reason: 'غیبت', outcome: 'تماس ثبت‌شده', contact: '', note: x.note || '', followup: '', day: x.day }));
    return [...own, ...abs].sort((a: any, b: any) => b.sortAt.localeCompare(a.sortAt));
  }
  function filtered() {
    const q = norm(C.q);
    return combined().filter((x: any) => {
      const s = byId(x.student);
      return (C.source === 'all' || x.source === C.source) && (C.cls === 'all' || s?.cls === C.cls) && (C.student === 'all' || x.student === C.student)
        && (!q || norm([s?.name, s?.cls, s?.num, x.reason, x.note, x.contact, x.outcome, x.date].join(' ')).includes(q));
    });
  }
  const outLabel: any = { reached: 'صحبت شد', no_answer: 'پاسخ ندادند', followup: 'پیگیری لازم' };
  function card(x: any) {
    const s = byId(x.student), absent = x.source === 'absence', phone = (!absent && x.phone) || s?.phone || '', date = absent ? x.day + 'T12:00:00' : x.at;
    const color = absent ? '#f59e0b' : x.outcome === 'followup' ? '#dc2626' : x.outcome === 'no_answer' ? '#64748b' : '#10b981';
    return `<article class="call-card" style="--call-color:${color}"><div class="call-icon">${absent ? '🚫' : '📞'}</div><div class="call-main"><div class="call-top"><div><b>${esc(s?.name || 'دانش‌آموز حذف‌شده')}</b> <span class="tag">${esc(s?.cls || 'نامشخص')}</span></div><span class="m">${dateFa(date)}${absent ? ' · تاریخ غیبت' : ` · ${when(date)}`}</span></div>
      <div class="call-tags"><span class="tag">${absent ? 'از غیبت‌ها' : 'تماس دستی'}</span><span class="tag">${esc(absent ? 'تماس ثبت‌شده' : outLabel[x.outcome] || x.outcome)}</span>${x.contact ? `<span class="tag">با ${esc(x.contact)}</span>` : ''}${x.followup ? `<span class="tag">پیگیری: ${dateFa(x.followup + 'T12:00:00')}</span>` : ''}</div>
      ${!absent && x.reason ? `<p class="call-reason"><b>موضوع:</b> ${esc(x.reason)}</p>` : ''}${x.note ? `<p class="call-note">${esc(x.note)}</p>` : ''}
      <div class="call-actions">${phone ? `<a class="btn" href="tel:${esc(phone)}">📞 ${esc(phone)}</a>` : ''}${s ? `<button class="btn" onclick="CALL_profile('${s.id}')">پرونده</button>` : ''}${absent ? (s ? `<button class="btn" onclick="CALL_absence('${s.id}')">غیبت‌ها</button>` : '') : `<button class="btn" onclick="CALL_edit('${x.id}')">ویرایش</button><button class="btn" style="color:var(--bad)" onclick="CALL_delete('${x.id}')">حذف</button>`}</div></div></article>`;
  }
  function listHtml() {
    const rows = filtered();
    if (!rows.length) return `<div class="c m" style="text-align:center;padding:28px">تماسی با این فیلتر پیدا نشد.</div>`;
    const groups: Record<string, any[]> = {};
    rows.forEach((x: any) => { const month = x.date.slice(0, 7); (groups[month] = groups[month] || []).push(x); });
    return Object.entries(groups).map(([month, items]) => `<section class="call-month"><h3>${new Date(month + '-01T12:00:00').toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' })} <span class="m">${n(items.length)} تماس</span></h3>${items.map(card).join('')}</section>`).join('');
  }
  function form() {
    const x = manual().find((r) => r.id === C.edit), edit = !!x;
    const chosen = x?.student || (C.student !== 'all' ? C.student : '');
    const opts = students().map((s: any) => `<option value="${s.id}" ${chosen === s.id ? 'selected' : ''}>${n(s.num)} · ${esc(s.name)} — ${esc(s.cls)}</option>`).join('');
    return `<div class="c call-form"><div class="tb" style="margin:0 0 10px"><h3 style="margin:0;flex:1">${edit ? 'ویرایش تماس' : 'ثبت تماس جدید'}</h3>${edit ? '<button class="btn" onclick="CALL_cancel()">انصراف از ویرایش</button>' : ''}</div>
      <div class="call-fields"><label>دانش‌آموز<select id="call-student" onchange="CALL_studentPhone(this.value)"><option value="">انتخاب کنید…</option>${opts}</select></label><label>زمان تماس<input id="call-at" type="datetime-local" value="${esc(x?.at || localNow())}"></label><label>مخاطب<select id="call-contact">${['مادر','پدر','سرپرست','سایر'].map((v) => `<option ${x?.contact === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label><label>نتیجه<select id="call-outcome">${Object.entries(outLabel).map(([k, v]) => `<option value="${k}" ${x?.outcome === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <div class="call-fields call-fields-wide"><label>موضوع تماس<input id="call-reason" maxlength="160" value="${esc(x?.reason || '')}" placeholder="مثلاً وضعیت درسی، رفتار، هماهنگی جلسه…"></label><label>شماره تماس<input id="call-phone" dir="ltr" inputmode="tel" maxlength="30" value="${esc(x?.phone || byId(chosen)?.phone || '')}" placeholder="اختیاری"></label><label>تاریخ پیگیری (اختیاری)<input id="call-followup" type="date" value="${esc(x?.followup || '')}"></label></div>
      <label class="call-full">شرح گفتگو<textarea id="call-note" maxlength="3000" placeholder="آنچه گفته شد و قرار بعدی را بنویسید…">${esc(x?.note || '')}</textarea></label><div class="tb" style="margin:10px 0 0"><button class="btn p" onclick="CALL_save()">${edit ? 'ذخیره‌ی تغییرات' : 'ثبت تماس'}</button></div></div>`;
  }
  function page() {
    if (usable()) load();
    const all = combined(), own = all.filter((x: any) => x.source === 'manual').length, absence = all.length - own, follow = all.filter((x: any) => x.source === 'manual' && x.outcome === 'followup').length;
    return `<div class="call-hero"><div><small>دفتر تماس با والدین</small><h2>همه‌ی گفتگوها، یک‌جا</h2><p>تماس‌های غیبت خودکار اضافه می‌شوند. تماس‌های دیگر را همین‌جا ثبت کنید.</p></div><button class="btn" onclick="CALL_refresh()">${C.busy ? '⏳ در حال دریافت…' : '🔄 به‌روزرسانی'}</button></div>
      <div class="call-kpis"><div class="c k"><b>${n(all.length)}</b><span>کل تماس‌ها</span></div><div class="c k"><b>${n(absence)}</b><span>از غیبت‌ها</span></div><div class="c k"><b>${n(own)}</b><span>ثبت دستی</span></div><div class="c k"><b>${n(follow)}</b><span>نیازمند پیگیری</span></div></div>
      ${!usable() ? '<div class="c m" style="margin-bottom:10px">برای نمایش تماس‌های غیبت به بخش سرور وارد شوید. تماس‌های دستی همچنان در این پنل ثبت می‌شوند.</div>' : ''}
      ${C.err ? `<div class="c dn" style="margin-bottom:10px">دریافت تماس‌های غیبت ناموفق بود: ${esc(C.err)}</div>` : ''}${form()}
      <div class="c call-filter"><div class="tb" style="margin:0"><input id="call-q" placeholder="جستجوی نام، موضوع یا شرح…" value="${esc(C.q)}" oninput="CALL_q(this.value)" style="flex:1;min-width:180px"><select onchange="CALL_filter('source',this.value)"><option value="all">همه‌ی تماس‌ها</option><option value="absence" ${C.source === 'absence' ? 'selected' : ''}>از غیبت‌ها</option><option value="manual" ${C.source === 'manual' ? 'selected' : ''}>ثبت دستی</option></select><select onchange="CALL_filter('cls',this.value)"><option value="all">همه‌ی کلاس‌ها</option>${A.CL.map((cl: string) => `<option value="${esc(cl)}" ${C.cls === cl ? 'selected' : ''}>${esc(cl)}</option>`).join('')}</select><select onchange="CALL_filter('student',this.value)"><option value="all">همه‌ی دانش‌آموزان</option>${students().map((s: any) => `<option value="${s.id}" ${C.student === s.id ? 'selected' : ''}>${esc(s.name)} · ${esc(s.cls)}</option>`).join('')}</select><button class="btn" onclick="CALL_csv()">⬇ CSV</button></div></div>
      <div id="call-list">${listHtml()}</div>`;
  }
  function saveCall() {
    const student = val('call-student'), at = val('call-at'), contact = val('call-contact'), outcome = val('call-outcome'), phone = val('call-phone').trim(), reason = val('call-reason').trim(), note = val('call-note').trim(), followup = val('call-followup');
    if (!byId(student) || !at || !Number.isFinite(new Date(at).getTime())) { A.toast('دانش‌آموز و زمان تماس را وارد کنید'); return; }
    if (!reason && !note) { A.toast('موضوع یا شرح تماس را بنویسید'); return; }
    const old = manual().find((x) => x.id === C.edit), row: ManualCall = { id: old?.id || 'call-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), student, at, contact, phone, reason, outcome, note, followup };
    if (old) Object.assign(old, row); else manual().push(row);
    C.edit = null; A.save(); A.draw(); A.toast('تماس ذخیره شد ✓');
  }
  const h = {
    CALL_save: saveCall,
    CALL_studentPhone: (id: string) => { const input = document.getElementById('call-phone') as HTMLInputElement | null; if (input) input.value = byId(id)?.phone || ''; },
    CALL_edit: (id: string) => { C.edit = id; A.draw(); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    CALL_cancel: () => { C.edit = null; A.draw(); },
    CALL_delete: (id: string) => { if (!confirm('این تماس حذف شود؟')) return; D().calls = manual().filter((x) => x.id !== id); if (C.edit === id) C.edit = null; A.save(); A.draw(); },
    CALL_q: (q: string) => { C.q = q; const el = document.getElementById('call-list'); if (el) el.innerHTML = listHtml(); },
    CALL_filter: (key: string, value: string) => { C[key] = value; A.draw(); },
    CALL_refresh: () => load(true),
    CALL_csv: () => A.dlf('تاریخچه-تماس‌ها.csv', [['تاریخ','دانش‌آموز','کلاس','منبع','مخاطب','شماره تماس','موضوع','نتیجه','شرح','پیگیری'], ...filtered().map((x: any) => { const s = byId(x.student); return [x.source === 'absence' ? x.day + ' (تاریخ غیبت)' : x.at, s?.name || '', s?.cls || '', x.source === 'absence' ? 'غیبت' : 'دستی', x.contact || '', x.phone || s?.phone || '', x.reason || '', x.source === 'absence' ? 'تماس ثبت‌شده' : outLabel[x.outcome] || x.outcome, x.note || '', x.followup || '']; })]),
    CALL_profile: (id: string) => A.op(id),
    CALL_absence: (id: string) => { A.op(id); U.stab = 'abs'; A.draw(); },
  };
  const openForStudent = (id: string) => { C.student = id; C.cls = 'all'; U.p = 'calls'; A.draw(); };
  return { page, h, openForStudent, local, invalidate: () => { C.loaded = false; C.at = 0; } };
}
