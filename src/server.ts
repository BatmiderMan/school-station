// بخش «سرور» پنل مدیر: ساخت حساب دانش‌آموز، دریافت کارنامه‌های ارسالی (با بررسی خودکار)، انتشار نتایج و تقویم.
import { sb, cfgOk } from './supa';
import { inboxGet, inboxSet } from './store';
import { importReport } from './scan';
import { j2iso, iso2j, daysLeft, isoToday, jlen, jfirst } from './ui';

const idb = (mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest) => new Promise<any>((res, rej) => {
  const o = indexedDB.open('station', 1);
  o.onupgradeneeded = () => o.result.createObjectStore('kv');
  o.onsuccess = () => { const t = o.result.transaction('kv', mode), r = f(t.objectStore('kv')); t.oncomplete = () => res(r.result); t.onerror = () => rej(t.error); };
  o.onerror = () => rej(o.error);
});
// با اتصال به سرور، صندوق ورودی روی Supabase ذخیره می‌شود؛ بدون اتصال، در IndexedDB همین مرورگر
const kvGet = (k: string) => (cfgOk && k === 'inbox' ? inboxGet() : idb('readonly', (s) => s.get(k)));
const kvSet = async (k: string, v: any): Promise<boolean> => {
  try { if (cfgOk && k === 'inbox') await inboxSet(v); else await idb('readwrite', (s) => s.put(v, k)); return true; }
  catch (e: any) { (window as any).alert('ذخیره‌ی صندوق ورودی ناموفق بود: ' + (e?.message || e)); return false; }
};
const CODE: any = { 'تجربی ۳۲۱': '321', 'تجربی ۳۲۲': '322', 'ریاضی ۳۱۱': '311' }; // کد کلاس
const rnd = (k: number) => { const a = 'abcdefghjkmnpqrstuvwxyz23456789'; return Array.from(crypto.getRandomValues(new Uint8Array(k)), (x) => a[x % a.length]).join(''); };
const b2f = (b: string, t: string) => { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new File([u], 'sub.' + (t.includes('pdf') ? 'pdf' : 'jpg'), { type: t }); };
const pad2 = (x: number) => String(x).padStart(2, '0');

export function mkServer(A: any) {
  const esc = A.esc, n = A.n;
  const S: any = { cons: [], ct: 'new', cform: '', consErr: '', dr: {}, user: null, mgr: null, tab: 'acc', msg: '', busy: false, inbox: [], creds: null };
  const sd = () => (A.D.srv = A.D.srv || { accounts: {}, firstOnly: true });
  const draw = () => A.draw();
  const say = (m: string) => { S.msg = m; S.busy = false; draw(); };
  const $v = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
  const stu = (lid: string) => A.D.students.find((s: any) => s.id === lid);
  const lidOf = (sid: string) => Object.keys(sd().accounts).find((l) => sd().accounts[l].sid === sid);

  async function call(body: any) {
    const { data, error } = await sb.functions.invoke('admin', { body });
    if (error) { let m = error.message; try { m = (await error.context.json()).error || m; } catch (e) { /* ignore */ } throw new Error(m); }
    return data;
  }
  async function chk() { const { data } = await sb.rpc('is_manager'); S.mgr = data === true; }
  async function init() {
    S.inbox = (await kvGet('inbox').catch(() => null)) || [];
    if (cfgOk) { const { data } = await sb.auth.getSession(); S.user = data.session?.user || null; if (S.user) { await chk().catch(() => 0); if (S.mgr) { consLoad().then(draw); repLoad().then(draw); } } }
    draw();
  }
  async function login() {
    const email = $v('sv_e').trim(), password = $v('sv_p');
    S.busy = true; draw();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { say('ورود ناموفق: ' + error.message); return; }
    S.user = data.user; await chk().catch(() => 0); if (S.mgr) { consLoad().then(draw); repLoad().then(draw); }
    say(S.mgr ? '' : 'این حساب در جدول managers نیست (مرحله‌ی ۴ راهنما).');
  }
  async function logout() { await sb.auth.signOut(); S.user = null; S.mgr = null; S.msg = ''; draw(); }

  /* ---- accounts ---- */
  async function create(lid: string, u?: string, p?: string) {
    const st = stu(lid), user = (u || $v('u_' + lid)).trim().toLowerCase(), pass = p || $v('p_' + lid);
    const name = sd().firstOnly ? st.name.split(' ')[0] : st.name;
    const r = await call({ action: 'create', username: user, password: pass, name, cls: st.cls, local_id: lid });
    sd().accounts[lid] = { sid: r.student.id, username: user, active: true }; A.save();
    return { name: st.name, cls: st.cls, user, pass };
  }
  // پیش‌فرض: نام‌کاربری = شماره‌ی کلاسی + کد کلاس (مثلاً ۵ در ۳۱۱ ← 5311)، رمز = کد ملی. اگر کد ملی ثبت نشده باشد رمز تصادفی ساخته می‌شود.
  const rp: any = {};
  const dr = (lid: string) => { const st = stu(lid), o = S.dr[lid] || {}; return { u: o.u ?? `${st.num || 0}${CODE[st.cls] || ''}`, p: o.p ?? (st.nid || rp[lid] || (rp[lid] = rnd(8))) }; };
  async function createOne(lid: string) {
    const d = dr(lid);
    S.busy = true; draw();
    try { S.creds = [await create(lid, d.u, d.p)]; delete S.dr[lid]; say('ساخته شد؛ نام کاربری و رمز را همین حالا به دانش‌آموز بدهید (رمز بعداً قابل مشاهده نیست).'); } catch (e: any) { say('خطا: ' + e.message); }
  }
  async function bulk() {
    const todo = A.D.students.filter((s: any) => !sd().accounts[s.id]).sort((a: any, b: any) => a.cls.localeCompare(b.cls, 'fa') || (a.num || 1e9) - (b.num || 1e9));
    if (!todo.length) { say('همه حساب دارند.'); return; }
    if (!confirm(`برای ${n(todo.length)} دانش‌آموز با همین نام کاربری و رمزهای جدول حساب ساخته شود؟`)) return;
    const out: any[] = [], bad: string[] = [];
    for (const s of todo) {
      const d = dr(s.id); S.msg = `در حال ساخت… ${n(out.length + bad.length + 1)} از ${n(todo.length)}`; S.busy = true; draw();
      try { out.push(await create(s.id, d.u, d.p)); delete S.dr[s.id]; } catch (e: any) { bad.push(s.name + ': ' + e.message); }
    }
    S.creds = out; say(`${n(out.length)} حساب ساخته شد.` + (bad.length ? ` ${n(bad.length)} خطا: ${bad.slice(0, 3).join(' | ')}` : '') + ' جدول زیر را همین حالا ذخیره/چاپ کنید.');
  }
  async function pass(lid: string) {
    const a = sd().accounts[lid], p = prompt('رمز جدید (خالی = تصادفی):'); if (p === null) return;
    const pw = p || rnd(8);
    try { await call({ action: 'password', student_id: a.sid, password: pw }); S.creds = [{ name: stu(lid).name, cls: stu(lid).cls, user: a.username, pass: pw }]; say('رمز تغییر کرد.'); } catch (e: any) { say('خطا: ' + e.message); }
  }
  async function toggle(lid: string) { const a = sd().accounts[lid]; try { await call({ action: 'toggle', student_id: a.sid, active: !a.active }); a.active = !a.active; A.save(); say(''); } catch (e: any) { say('خطا: ' + e.message); } }
  // نماینده‌ی کلاس: منبع اصلی ستون is_rep در جدول students روی سرور است (فقط مدیر اجازه‌ی تغییر دارد)
  async function rep(lid: string) {
    const a = sd().accounts[lid], v = !a.rep;
    const { data, error } = await sb.from('students').update({ is_rep: v }).eq('id', a.sid).select('id');
    if (error) { say('خطا: ' + (error.message.includes('is_rep') ? 'فایل supabase/update-8.sql را در SQL Editor اجرا کنید.' : error.message)); return; }
    if (!data?.length) { say('تغییر اعمال نشد.'); return; }
    a.rep = v; A.save(); say(v ? `${stu(lid).name} نماینده‌ی کلاس ${stu(lid).cls} شد؛ دفعه‌ی بعد که وارد شود «تقویم معافیت کلاس» را می‌بیند.` : 'نمایندگی لغو شد.');
  }
  async function repLoad() {
    const { data, error } = await sb.from('students').select('id,is_rep'); if (error || !data) return;
    const m = new Map<string, boolean>(data.map((r: any) => [r.id, !!r.is_rep]));
    Object.values(sd().accounts).forEach((a: any) => { if (m.has(a.sid)) a.rep = m.get(a.sid); });
  }
  async function del(lid: string) {
    if (!confirm('حساب و همه‌ی داده‌های منتشرشده‌ی این دانش‌آموز روی سرور حذف شود؟ (اطلاعات روی لپ‌تاپ شما می‌ماند)')) return;
    try { await call({ action: 'remove', student_id: sd().accounts[lid].sid }); delete sd().accounts[lid]; A.save(); say(''); } catch (e: any) { say('خطا: ' + e.message); }
  }
  const csv = () => A.saveFile('logins.csv', new Blob(['\ufeff' + [['نام', 'کلاس', 'نام کاربری', 'رمز'], ...S.creds.map((c: any) => [c.name, c.cls, c.user, c.pass])].map((r) => r.map((v: any) => `"${v}"`).join(',')).join('\n')], { type: 'text/csv' }));

  /* ---- inbox ---- */
  function cmp(r: any, x: any) {
    const a = (r.raw || []).map((o: any) => [o.c, o.w, o.b].join(',')).sort().join('|'), b = x.rows.map((o: any) => [o.c, o.w, o.n - o.c - o.w].join(',')).sort().join('|'), why: string[] = [];
    if (x.level !== r.level) why.push(`تراز: ارسالی ${r.level} / خوانش سیستم ${x.level}`);
    if (a !== b) why.push('تعداد درست/غلط/نزده‌ی دروس با خوانش سیستم فرق دارد');
    return { ok: !why.length, why, exam: x };
  }
  async function fetchInbox() {
    S.busy = true; S.msg = 'در حال دریافت…'; draw();
    const { data, error } = await sb.from('submissions').select('*').order('created_at');
    if (error) { say('خطا: ' + error.message); return; }
    if (!data.length) { say('ارسال جدیدی نیست.'); return; }
    A.saveFile(`backup-submissions-${Date.now()}.json`, new Blob([JSON.stringify(data)], { type: 'application/json' }));
    for (let i = 0; i < data.length; i++) {
      const r = data[i]; S.msg = `بررسی خودکار ${n(i + 1)} از ${n(data.length)}…`; draw();
      try { r.v = cmp(r, (await importReport(b2f(r.file_b64, r.file_type), A.CFG)).exam); } catch (e) { r.v = { ok: false, why: ['فایل ارسالی با سیستم شما خوانده نشد'], exam: null }; }
    }
    S.inbox = [...S.inbox, ...data]; if (!(await kvSet('inbox', S.inbox))) { S.inbox = S.inbox.slice(0, S.inbox.length - data.length); say('ارسال‌ها روی سرور باقی ماندند؛ دوباره «دریافت از سرور» را بزنید.'); return; }
    const del = await sb.from('submissions').delete().in('id', data.map((r: any) => r.id));
    say(del.error ? 'ذخیره شد ولی حذف از سرور ناموفق: ' + del.error.message : `${n(data.length)} ارسال دریافت و از سرور حذف شد (نسخه‌ی پشتیبان هم دانلود شد).`);
  }
  function apply(it: any, mode: string): string | null {
    const lid = lidOf(it.student_id); if (!lid) return 'حساب این دانش‌آموز در برنامه‌ی شما نیست';
    const sys = mode === 'sys' && it.v?.exam;
    const rows = sys ? it.v.exam.rows : (it.raw || []).map((o: any, k: number) => ({ index: k, sectionName: o.k, n: o.c + o.w + o.b, c: o.c, w: o.w, level: o.lv ?? null, countryRank: null, recognised: true }));
    const m = A.commit({ sid: lid, sigs: [], x: { institute: it.inst, title: it.title, date: it.date, level: sys ? it.v.exam.level : it.level, countryRank: it.rank, rows } });
    if (m) return m; it._lid = lid; return null;
  }
  async function approve(i: number, mode: string) {
    const it = S.inbox[i], m = apply(it, mode); if (m) { say(m); return; }
    A.save(); S.inbox.splice(i, 1); await kvSet('inbox', S.inbox); S.busy = true; draw();
    try { await publish([it._lid]); say('تأیید و برای دانش‌آموز منتشر شد.'); } catch (e: any) { say('تأیید شد ولی انتشار ناموفق: ' + e.message); }
  }
  async function approveAll() {
    const lids = new Set<string>(); let c = 0;
    for (let i = S.inbox.length - 1; i >= 0; i--) { const it = S.inbox[i]; if (it.v?.ok && !apply(it, 'sys')) { lids.add(it._lid); S.inbox.splice(i, 1); c++; } }
    A.save(); await kvSet('inbox', S.inbox); S.busy = true; draw();
    try { await publish([...lids]); say(`${n(c)} مورد تأیید و منتشر شد.`); } catch (e: any) { say('تأیید شد ولی انتشار ناموفق: ' + e.message); }
  }
  async function reject(i: number) { if (!confirm('این ارسال رد و حذف شود؟')) return; S.inbox.splice(i, 1); await kvSet('inbox', S.inbox); draw(); }

  /* ---- publish ---- */
  function calOf(lid: string, cls: string, w: number) {
    const E = A.ensureEx();
    return { per: E.per, days: [0, 1, 2, 3].map((d) => ({ d, date: A.dateOf(w, d).toISOString().slice(0, 10), L: A.letter(d, w), cells: Array.from({ length: E.per }, (_, p) => ({ s: A.tt(cls)[d][p] || '—', t: A.status(lid, cls, w, d, p) })) })) };
  }
  async function publish(lids?: string[]) {
    const acc = sd().accounts, list = (lids || Object.keys(acc)).filter((l) => acc[l] && stu(l)), ex: any[] = [], cal: any[] = [], w0 = A.wk0();
    list.forEach((l) => {
      const st = stu(l);
      A.D.exams.forEach((e: any) => { const r = e.res[l]; if (r) ex.push({ student_id: acc[l].sid, exam_key: e.inst + '|' + e.date, title: e.title, inst: e.inst, date: e.date, level: r.level, rank: r.rank ?? null, subj: r.subj || {} }); });
      for (let w = w0; w < w0 + 4; w++) { const c = calOf(l, st.cls, w); cal.push({ student_id: acc[l].sid, week_start: c.days[0].date, data: c }); }
    });
    const up = async (t: string, rows: any[], key: string) => { for (let i = 0; i < rows.length; i += 400) { const { error } = await sb.from(t).upsert(rows.slice(i, i + 400), { onConflict: key }); if (error) throw error; } };
    await up('exams_pub', ex, 'student_id,exam_key'); await up('calendar_pub', cal, 'student_id,week_start');
    const sch: any[] = [];
    A.sexams().forEach((e: any) => {
      const mates = A.D.students.filter((x: any) => x.cls === e.cls), cavg: any = {};
      e.lessons.forEach((ls: any) => { const v = mates.map((x: any) => e.sc[x.id]?.[ls.name]).filter((x: any) => x != null); if (v.length) cavg[ls.name] = v.reduce((p: number, q: number) => p + q, 0) / v.length; });
      list.forEach((l) => { const st = stu(l), sc = e.sc[l]; if (st.cls !== e.cls || !sc || !Object.keys(sc).length) return;
        sch.push({ student_id: acc[l].sid, exam_key: e.id, title: e.title, date: e.date, data: { lessons: e.lessons.map((ls: any) => ({ n: ls.name, max: ls.max, s: sc[ls.name] ?? null, c: cavg[ls.name] ?? null })) } }); });
    });
    S.annErr = '';
    try { await syncAnn(); } catch (e: any) { S.annErr = 'اطلاعیه‌ها منتشر نشد: ' + (e.message || e) + ' — فایل‌های supabase/update-3.sql و update-4.sql را اجرا کنید.'; }
    S.schErr = '';
    try { await up('school_pub', sch, 'student_id,exam_key'); } catch (e: any) { S.schErr = 'نمره‌های مدرسه منتشر نشد: ' + (e.message || e) + ' — فایل supabase/update-2.sql را اجرا کنید.'; }
    await sb.from('calendar_pub').delete().lt('week_start', A.dateOf(w0, 0).toISOString().slice(0, 10));
    S.last = { n: list.length, ex: ex.length, at: new Date().toLocaleTimeString('fa-IR') };
  }
  async function syncAnn() {
    const rows = A.annActive().map((a: any) => ({ id: a.id, type: a.type, title: a.title, body: a.body || '', cls: a.cls === 'all' ? null : a.cls, ev: a.ev || '', starts: a.starts || null, exp: a.exp, pin: !!a.pin }));
    if (rows.length) { const { error } = await sb.from('announcements').upsert(rows, { onConflict: 'id' }); if (error) throw error; }
    const { data, error: e2 } = await sb.from('announcements').select('id'); if (e2) throw e2;
    const keep = new Set(rows.map((r: any) => r.id)), del = (data || []).filter((r: any) => !keep.has(r.id)).map((r: any) => r.id);
    if (del.length) await sb.from('announcements').delete().in('id', del);
  }
  async function publishAll() { S.busy = true; S.msg = 'در حال انتشار…'; draw(); try { await publish(); say('انتشار انجام شد.'); } catch (e: any) { say('خطا: ' + (e.message || e)); } }

  /* ---- views ---- */
  const tabs = () => `<div class="seg">${[['acc', '👤 حساب دانش‌آموزان'], ['inb', `📥 صندوق ورودی${S.inbox.length ? ' (' + n(S.inbox.length) + ')' : ''}`], ['pub', '🚀 انتشار']].map(([k, t]) => `<button class="${S.tab === k ? 'on' : ''}" onclick="srvTab('${k}')">${t}</button>`).join('')}</div>`;
  function acc() {
    const ss = [...A.D.students].sort((a: any, b: any) => a.cls.localeCompare(b.cls, 'fa') || (a.num || 1e9) - (b.num || 1e9));
    const creds = S.creds ? `<div class="c" style="border-color:var(--ok)"><h3>🔑 اطلاعات ورود (فقط همین‌جا دیده می‌شود)</h3><div class="tw"><table><thead><tr><th>نام</th><th>کلاس</th><th>نام کاربری</th><th>رمز</th></tr></thead><tbody>${S.creds.map((c: any) => `<tr style="cursor:default"><td>${esc(c.name)}</td><td>${c.cls}</td><td dir="ltr">${esc(c.user)}</td><td dir="ltr"><b>${esc(c.pass)}</b></td></tr>`).join('')}</tbody></table></div><div class="tb" style="margin-top:8px"><button class="btn p" onclick="srvCsv()">دانلود CSV</button><button class="btn" onclick="window.print()">چاپ</button><button class="btn" onclick="S_.creds=null;draw()">بستن</button></div></div>` : '';
    return creds + `<div class="np"><div class="tb"><label><input type="checkbox" ${sd().firstOnly ? 'checked' : ''} onchange="srvFirst(this.checked)"> فقط نام کوچک روی سرور (حریم خصوصی)</label><button class="btn p" onclick="srvBulk()">ساخت حساب برای همه‌ی بدون حساب</button></div>
    <div class="c tw"><table><thead><tr><th>دانش‌آموز</th><th>کلاس</th><th>نام کاربری</th><th>رمز / نقش</th><th></th></tr></thead><tbody>${ss.map((s: any) => { const a = sd().accounts[s.id];
      return `<tr style="cursor:default"><td>${s.num ? n(s.num) + '. ' : ''}${esc(s.name)}</td><td>${s.cls}</td>` + (a ? `<td dir="ltr">${esc(a.username)} ${a.active ? '' : '<span class="tag r">غیرفعال</span>'}</td><td class="m">${a.rep ? '<span class="tag xg">⭐ نماینده</span>' : '—'}</td><td><button class="btn${a.rep ? ' p' : ''}" onclick="srvRep('${s.id}')">${a.rep ? 'لغو نمایندگی' : '⭐ نماینده‌ی کلاس'}</button> <button class="btn" onclick="srvPass('${s.id}')">تغییر رمز</button> <button class="btn" onclick="srvToggle('${s.id}')">${a.active ? 'غیرفعال' : 'فعال'}</button> <button class="btn" style="color:var(--bad)" onclick="srvDel('${s.id}')">حذف</button></td>`
        : `<td><input dir="ltr" style="width:90px" value="${esc(dr(s.id).u)}" onchange="srvDr('${s.id}','u',this.value)"></td><td><input dir="ltr" style="width:100px" value="${esc(dr(s.id).p)}" onchange="srvDr('${s.id}','p',this.value)"></td><td><button class="btn p" onclick="srvOne('${s.id}')">ساخت حساب</button></td>`) + '</tr>'; }).join('')}</tbody></table></div></div>`;
  }
  function inb() {
    const ok = S.inbox.filter((i: any) => i.v?.ok).length;
    return `<div class="tb"><button class="btn p" onclick="srvFetch()">⬇️ دریافت از سرور و حذف از آن</button>${ok ? `<button class="btn" onclick="srvAll()">تأیید همه‌ی ${n(ok)} مورد تطابق‌یافته</button>` : ''}</div>
    <p class="m">هر کارنامه دوباره روی لپ‌تاپ شما خوانده و با اعداد دانش‌آموز مقایسه می‌شود؛ فقط موارد ⚠ نیاز به نگاه شما دارند. قبل از حذف از سرور، یک فایل پشتیبان هم دانلود می‌شود.</p>
    ${S.inbox.map((it: any, i: number) => { const l = lidOf(it.student_id), st = l ? stu(l) : null, v = it.v || { ok: false, why: [] };
      return `<div class="c fc" style="margin-top:10px;border-color:${v.ok ? 'var(--ok)' : '#f59e0b'}"><div class="tb"><b>${esc(st?.name || 'ناشناس')}</b><span class="tag">${st?.cls || ''}</span><span class="tag">${esc(it.inst)}</span><span class="m">${esc(it.title)} · ${esc(it.date)}</span></div>
      <div>تراز <b>${n(it.level)}</b> · رتبه ${n(it.rank)}</div><div class="${v.ok ? 'up' : 'w'}">${v.ok ? '✅ با خوانش سیستم شما یکی است' : '⚠ ' + esc(v.why.join(' — '))}</div>
      <details><summary class="m">دیدن فایل ارسالی</summary>${it.file_type.includes('pdf') ? `<a download="sub.pdf" href="data:application/pdf;base64,${it.file_b64}">باز کردن PDF</a>` : `<img style="max-width:100%;border-radius:8px" src="data:${it.file_type};base64,${it.file_b64}">`}</details>
      <div class="tb" style="margin-top:8px">${v.ok ? `<button class="btn p" onclick="srvApp(${i},'sys')">تأیید</button>` : `${v.exam ? `<button class="btn p" onclick="srvApp(${i},'sys')">تأیید (خوانش سیستم)</button>` : ''}<button class="btn" onclick="srvApp(${i},'sub')">تأیید (اعداد ارسالی)</button>`}<button class="btn" style="color:var(--bad)" onclick="srvRej(${i})">رد</button></div></div>`; }).join('') || '<p class="m">صندوق ورودی خالی است.</p>'}`;
  }
  const pub = () => { const k = Object.keys(sd().accounts).length; return `<div class="c"><h3>انتشار برای دانش‌آموزان</h3><p class="m">نتایج تأییدشده (تراز، رتبه و درصد دروس) و تقویم معافیت ۴ هفته‌ی آینده‌ی ${n(k)} دانش‌آموز دارای حساب روی سرور قرار می‌گیرد. هر بار که معافیت‌ها را عوض کردید یا آزمون ثبت کردید، یک‌بار بزنید. (تأیید در صندوق ورودی خودش منتشر می‌کند.)</p><button class="btn p" onclick="srvPub()">🚀 انتشار همه</button>${S.schErr ? `<p class="dn">${esc(S.schErr)}</p>` : ''}${S.annErr ? `<p class="dn">${esc(S.annErr)}</p>` : ''}${S.last ? `<p class="m">آخرین انتشار ${S.last.at}: ${n(S.last.n)} نفر، ${n(S.last.ex)} نتیجه</p>` : ''}</div>`; };
  function page() {
    if (!cfgOk) return `<div class="c"><h3>اتصال به سرور تنظیم نشده</h3><p>فایل <code dir="ltr">src/config.ts</code> را با آدرس و کلید عمومی پروژه‌ی Supabase پر کنید (راهنما: SETUP.md).</p></div>`;
    if (!S.user) return `<div class="c" style="max-width:380px;margin:auto"><h3>ورود مدیر</h3>${S.msg ? `<p class="dn">${esc(S.msg)}</p>` : ''}<div class="tb" style="flex-direction:column;align-items:stretch"><input id="sv_e" dir="ltr" type="email" placeholder="ایمیل مدیر"><input id="sv_p" dir="ltr" type="password" placeholder="رمز"><button class="btn p" onclick="srvLogin()" ${S.busy ? 'disabled' : ''}>ورود</button></div></div>`;
    return `<div class="tb np"><span class="m">متصل: <span dir="ltr">${esc(S.user.email)}</span></span><button class="btn" onclick="srvOut()">خروج</button></div>` + (S.mgr === false ? `<div class="c dn">این حساب مدیر نیست (راهنما، مرحله‌ی ۴).</div>` : S.mgr === null ? '' : `<div class="np">${tabs()}</div>${S.msg ? `<div class="c np" style="margin-bottom:10px">${S.busy ? '⏳ ' : ''}${esc(S.msg)}</div>` : ''}${({ acc, inb, pub })[S.tab]()}`);
  }
  /* ---- وقت مشاوره (فقط تحصیلی) ---- */
  const av = () => (A.D.avail = A.D.avail || { len: 20, days: { 0: { on: 1, f: '10:00', t: '12:00' }, 1: { on: 1, f: '10:00', t: '12:00' }, 3: { on: 1, f: '10:00', t: '12:00' }, 4: { on: 1, f: '10:00', t: '12:00' } } });
  const tm = (t: string) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };
  const fm = (x: number) => `${pad2(Math.floor(x / 60))}:${pad2(x % 60)}`;
  const durOf = (r: any) => r.dur || av().len || 20;
  const sched = (ex?: string) => S.cons.filter((r: any) => r.status === 'scheduled' && r.id !== ex && r.slot_date && r.slot_time);
  const overlap = (d: string, t: string, dur: number, ex?: string) => sched(ex).find((r: any) => r.slot_date === d && tm(t) < tm(r.slot_time) + durOf(r) && tm(r.slot_time) < tm(t) + dur);
  function freeSlots(cnt = 8, ex?: string) {
    const a = av(), out: any[] = [], now = new Date();
    for (let k = 0; k < 30 && out.length < cnt; k++) {
      const d = new Date(); d.setDate(d.getDate() + k); const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`, c = a.days[(d.getDay() + 1) % 7];
      if (!c || !c.on) continue;
      for (let x = tm(c.f); x + a.len <= tm(c.t) && out.length < cnt; x += a.len) { if (k === 0 && x <= now.getHours() * 60 + now.getMinutes()) continue; if (overlap(iso, fm(x), a.len, ex)) continue; out.push({ iso, t: fm(x) }); }
    }
    return out;
  }
  async function consLoad() { const { data, error } = await sb.from('consults').select('*').order('created_at'); if (error) { S.consErr = error.message.includes('consults') ? 'جدول مشاوره ساخته نشده؛ فایل supabase/update-5.sql را اجرا کنید.' : error.message; return; } S.cons = data || []; S.consErr = ''; }
  const cname = (r: any) => { const l = lidOf(r.student_id), s = l ? stu(l) : null; return s ? { n: s.name, c: s.cls, num: s.num } : { n: 'دانش‌آموز', c: '', num: null }; };
  const fdate = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
  const ftime = (t: string) => String(t || '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
  const trange = (r: any) => `${ftime(r.slot_time)}–${ftime(fm(tm(r.slot_time) + durOf(r)))}`;
  const cform = (r: any) => `<div class="c" style="background:var(--card2);margin-top:8px"><div class="m" style="margin-bottom:6px">وقت‌های آزاد پیشنهادی (با زدن، پر می‌شود):</div><div class="tb">${freeSlots(8, r.id).map((s) => `<button class="btn" onclick="conPick('${r.id}','${s.iso}','${s.t}')">${new Date(s.iso + 'T12:00:00').toLocaleDateString('fa-IR', { weekday: 'short', day: 'numeric', month: 'numeric' })} ${ftime(s.t)}</button>`).join('') || '<span class="m">ساعتی تعریف نشده؛ از تب «ساعت‌های مشاوره» تنظیم کنید یا دستی بنویسید.</span>'}</div>
    <div class="tb"><label class="m">تاریخ <input id="cd_${r.id}" class="dp" readonly placeholder="📅 انتخاب" value="${r.slot_date ? iso2j(r.slot_date) : ''}" onclick="openJP('cd_${r.id}')"></label><label class="m">ساعت <input id="ct_${r.id}" type="time" value="${r.slot_time || ''}"></label><label class="m">مدت <select id="cu_${r.id}">${[15, 20, 30, 45].map((x) => `<option ${durOf(r) === x ? 'selected' : ''}>${x}</option>`).join('')}</select> دقیقه</label></div>
    <div class="tb"><input id="cp_${r.id}" placeholder="مکان" value="${esc(r.place || S.place || 'دفتر مشاوره')}"><input id="cn_${r.id}" placeholder="پیام برای دانش‌آموز (اختیاری)" style="flex:1;min-width:180px" value="${esc(r.note || '')}"></div><div class="tb" style="margin:0"><button class="btn p" onclick="conSave('${r.id}')">ثبت وقت</button><button class="btn" onclick="conForm('')">انصراف</button></div></div>`;
  const ccard = (r: any, actions: string) => { const p = cname(r); return `<div class="c" style="margin-bottom:10px"><div class="tb" style="margin-bottom:6px"><b>${p.num ? n(p.num) + '. ' : ''}${esc(p.n)}</b><span class="tag">${p.c}</span><span class="m">درخواست: ${new Date(r.created_at).toLocaleDateString('fa-IR')}</span></div>${r.msg ? `<p style="margin:4px 0;white-space:pre-wrap">${esc(r.msg)}</p>` : ''}${r.pref ? `<div class="m">⏰ زمان‌های مناسب برای دانش‌آموز: ${esc(r.pref)}</div>` : ''}${r.status === 'scheduled' ? `<div style="margin-top:6px"><span class="tag" style="background:#10b98122">📅 ${fdate(r.slot_date)} · ${trange(r)} · ${esc(r.place || '')}</span>${r.note ? ` <span class="m">${esc(r.note)}</span>` : ''}</div>` : ''}${r.status === 'rejected' ? `<div class="dn" style="margin-top:6px">رد شد${r.note ? ': ' + esc(r.note) : ''}</div>` : ''}<div class="tb" style="margin:8px 0 0">${actions}</div>${S.cform === r.id ? cform(r) : ''}</div>`; };
  const JMN = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const sch_actions = (r: any) => `<button class="btn p" onclick="conDone('${r.id}')">انجام شد ✓</button><button class="btn" onclick="conForm('${r.id}')">تغییر وقت</button><button class="btn" onclick="conBack('${r.id}')">لغو وقت</button>`;
  function conCal() {
    const Sc = S.cons.filter((r: any) => r.status === 'scheduled' && r.slot_date);
    if (!S.cm) { const [y, m] = iso2j(isoToday()).split('/').map(Number); S.cm = { y, m }; }
    const { y, m } = S.cm, off = jfirst(y, m), today = isoToday(); let cells = '';
    for (let i = 0; i < off; i++) cells += '<i></i>';
    for (let d = 1; d <= jlen(y, m); d++) {
      const iso = j2iso(`${y}/${m}/${d}`)!, list = Sc.filter((r: any) => r.slot_date === iso).sort((a: any, b: any) => a.slot_time.localeCompare(b.slot_time));
      cells += `<div class="cd${iso === today ? ' tod' : ''}${(off + d - 1) % 7 === 6 ? ' fri' : ''}${iso === S.cdSel ? ' sel' : ''}${list.length ? ' has' : ''}" onclick="conDay('${iso}')"><b>${n(d)}</b>${list.slice(0, 3).map((r: any) => `<span>${ftime(r.slot_time)} ${esc(cname(r).n.split(' ')[0])}</span>`).join('')}${list.length > 3 ? `<span>+${n(list.length - 3)}</span>` : ''}</div>`;
    }
    const sel = S.cdSel ? Sc.filter((r: any) => r.slot_date === S.cdSel).sort((a: any, b: any) => a.slot_time.localeCompare(b.slot_time)) : [];
    return `<div class="tb"><button class="btn" onclick="conCalNav(-1)">▶</button><b style="min-width:130px;text-align:center">${JMN[m - 1]} ${String(y).replace(/\d/g, (c) => '۰۱۲۳۴۵۶۷۸۹'[+c])}</b><button class="btn" onclick="conCalNav(1)">◀</button><button class="btn" onclick="conCalNav(0)">امروز</button><span class="m">${n(Sc.filter((r: any) => r.slot_date >= today).length)} وقت پیش‌رو</span></div>
    <div class="jw" style="margin-bottom:4px">${['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((x) => `<span>${x}</span>`).join('')}</div><div class="mc">${cells}</div>
    ${S.cdSel ? `<h3 style="margin:16px 0 8px">${fdate(S.cdSel)}</h3>${sel.map((r: any) => ccard(r, sch_actions(r))).join('') || '<div class="c m">در این روز وقتی تعیین نشده است.</div>'}` : '<p class="m">روی یک روز بزنید تا وقت‌هایش را ببینید.</p>'}`;
  }
  function conSettings() {
    const a = av(), nm = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
    return `<div class="c"><h3>ساعت‌های مشاوره</h3><p class="m">روزها و ساعت‌هایی که برای مشاوره آزاد هستید. هنگام تعیین وقت، ساعت‌های خالی بر اساس همین‌ها پیشنهاد می‌شود.</p><div class="tb"><label class="m">مدت هر جلسه <select onchange="conAvLen(this.value)">${[15, 20, 30, 45].map((x) => `<option ${a.len === x ? 'selected' : ''}>${x}</option>`).join('')}</select> دقیقه</label></div>${nm.map((d, i) => { const c = a.days[i] || { on: 0, f: '10:00', t: '12:00' }; return `<div class="tb"><label style="width:96px"><input type="checkbox" ${c.on ? 'checked' : ''} onchange="conAvDay(${i},'on',this.checked?1:0)"> ${d}</label>از <input type="time" value="${c.f}" onchange="conAvDay(${i},'f',this.value)"> تا <input type="time" value="${c.t}" onchange="conAvDay(${i},'t',this.value)"></div>`; }).join('')}</div>`;
  }
  function conPage() {
    if (!cfgOk || !S.user || !S.mgr) return `<div class="c">برای مدیریت وقت مشاوره، اول در تب «سرور» با حساب مدیر وارد شوید.<div class="tb" style="margin-top:8px"><button class="btn p" onclick="srvGoPage()">رفتن به سرور</button></div></div>`;
    const P = S.cons.filter((r: any) => r.status === 'pending'), Sc = S.cons.filter((r: any) => r.status === 'scheduled').sort((a: any, b: any) => (a.slot_date + (a.slot_time || '')).localeCompare(b.slot_date + (b.slot_time || ''))), Rj = S.cons.filter((r: any) => r.status === 'rejected'), arc = A.D.consult || [];
    const tabs = `<div class="seg">${[['new', `⏳ درخواست‌ها (${n(P.length)})`], ['sch', `📋 فهرست (${n(Sc.length)})`], ['cal', '📅 تقویم'], ['arc', `🗂 بایگانی (${n(arc.length)})`], ['set', '⚙️ ساعت‌های مشاوره']].map(([k, t]) => `<button class="${S.ct === k ? 'on' : ''}" onclick="conTab('${k}')">${t}</button>`).join('')}</div>`;
    let body = '';
    if (S.ct === 'new') body = P.map((r: any) => ccard(r, `<button class="btn p" onclick="conForm('${r.id}')">تعیین وقت</button><button class="btn" onclick="conReject('${r.id}')">رد با پیام</button>`)).join('') + (Rj.length ? `<h3 style="margin:14px 0 8px">ردشده‌ها (تا بایگانی برای دانش‌آموز دیده می‌شوند)</h3>${Rj.map((r: any) => ccard(r, `<button class="btn" onclick="conDone('${r.id}')">بایگانی</button>`)).join('')}` : '') || '<div class="c m" style="text-align:center;padding:26px">درخواست جدیدی نیست 🎉</div>';
    else if (S.ct === 'sch') { let last = ''; body = Sc.map((r: any) => { const h = r.slot_date !== last ? `<h3 style="margin:14px 0 8px">${fdate(r.slot_date)} ${daysLeft(r.slot_date) === 0 ? '<span class="tag" style="background:var(--acs)">امروز</span>' : daysLeft(r.slot_date) < 0 ? '<span class="tag r">گذشته</span>' : ''}</h3>` : ''; last = r.slot_date; return h + ccard(r, sch_actions(r)); }).join('') || '<div class="c m" style="text-align:center;padding:26px">وقتی تعیین نشده است.</div>'; }
    else if (S.ct === 'cal') body = conCal();
    else if (S.ct === 'set') body = conSettings();
    else body = arc.map((r: any, i: number) => `<div class="row" style="cursor:default"><span><b>${esc(r.name)}</b> <span class="tag">${r.cls}</span><br><span class="m">${r.slot_date ? fdate(r.slot_date) + ' · ' + ftime(r.slot_time) : 'بدون وقت'}</span></span><button class="btn" onclick="conDelArc(${i})">✕</button></div>`).join('') || '<div class="c m">بایگانی خالی است.</div>';
    return `<div class="tb"><button class="btn" onclick="conRefresh()">↻ به‌روزرسانی</button><span class="m">درخواست‌ها فقط تا زمانی که بایگانی نکنید روی سرور می‌مانند؛ بعد از «انجام شد» روی لپ‌تاپ شما می‌ماند و از سرور پاک می‌شود.</span></div>${S.consErr ? `<div class="c dn">${esc(S.consErr)}</div>` : ''}${tabs}${body}`;
  }
  async function conSave(id: string) {
    const dT = $v('cd_' + id), t = $v('ct_' + id), p = $v('cp_' + id).trim(), nt = $v('cn_' + id).trim(), d = dT ? j2iso(dT) : null, dur = +$v('cu_' + id) || av().len;
    if (!d || !t) { alert('تاریخ و ساعت را انتخاب کنید.'); return; }
    const clash = overlap(d, t, dur, id);
    if (clash && !confirm(`این بازه با وقت «${cname(clash).n}» (${trange(clash)}) هم‌پوشانی دارد؛ باز هم ثبت شود؟`)) return;
    S.place = p; const { error } = await sb.from('consults').update({ status: 'scheduled', slot_date: d, slot_time: t, place: p, note: nt || null, dur }).eq('id', id);
    if (error) { alert('خطا: ' + (error.message.includes('dur') ? 'فایل supabase/update-6.sql را اجرا کنید.' : error.message)); return; } S.cform = ''; await consLoad(); S.ct = S.ct === 'cal' ? 'cal' : 'sch'; say('وقت ثبت شد؛ دانش‌آموز در پنلش می‌بیند.');
  }
  async function conReject(id: string) { const m = prompt('پیام برای دانش‌آموز (مثلاً دلیل یا پیشنهاد):'); if (m === null) return; const { error } = await sb.from('consults').update({ status: 'rejected', note: m.trim() || null }).eq('id', id); if (error) { alert('خطا: ' + error.message); return; } await consLoad(); say(''); }
  async function conBack(id: string) { if (!confirm('وقت لغو شود و درخواست به صف برگردد؟')) return; const { error } = await sb.from('consults').update({ status: 'pending', slot_date: null, slot_time: null, place: null, note: null }).eq('id', id); if (error) { alert('خطا: ' + error.message); return; } await consLoad(); S.ct = 'new'; say(''); }
  async function conDone(id: string) {
    const r = S.cons.find((x: any) => x.id === id), p = cname(r); (A.D.consult = A.D.consult || []).push({ lid: lidOf(r.student_id), name: p.n, cls: p.c, topic: 'تحصیلی', msg: r.msg, slot_date: r.slot_date, slot_time: r.slot_time, dur: r.dur, place: r.place, note: r.note, status: r.status });
    A.save(); const { error } = await sb.from('consults').delete().eq('id', id); if (error) { alert('در بایگانی ذخیره شد ولی حذف از سرور ناموفق: ' + error.message); } await consLoad(); say('');
  }
  const badge = () => (S.cons.filter((r: any) => r.status === 'pending').length ? `<div class="c" style="margin-bottom:10px;cursor:pointer;border-inline-start:5px solid #8b5cf6" onclick="srvGoCon()">💬 ${n(S.cons.filter((r: any) => r.status === 'pending').length)} درخواست وقت مشاوره منتظر شماست</div>` : '') + (S.inbox.length ? `<div class="c" style="margin-bottom:10px;cursor:pointer;border-inline-start:5px solid #f59e0b" onclick="srvGo()">📥 ${n(S.inbox.length)} کارنامه منتظر بررسی شما است</div>` : '');
  const h = { conTab: (k: string) => { S.ct = k; S.cform = ''; draw(); }, conForm: (id: string) => { S.cform = id; draw(); }, conPick: (id: string, iso: string, t: string) => { (document.getElementById('cd_' + id) as HTMLInputElement).value = iso2j(iso); (document.getElementById('ct_' + id) as HTMLInputElement).value = t; }, conDay: (iso: string) => { S.cdSel = iso; S.cform = ''; draw(); }, conCalNav: (k: number) => { if (k === 0) { S.cm = null; S.cdSel = isoToday(); } else { S.cm.m += k; if (S.cm.m > 12) { S.cm.m = 1; S.cm.y++; } if (S.cm.m < 1) { S.cm.m = 12; S.cm.y--; } } draw(); }, conAvLen: (v: string) => { av().len = +v; A.save(); }, conAvDay: (i: number, k: string, v: any) => { const a = av(); a.days[i] = a.days[i] || { on: 0, f: '10:00', t: '12:00' }; a.days[i][k] = v; A.save(); }, conSave, conReject, conBack, conDone, conRefresh: async () => { await consLoad(); say(''); }, conDelArc: (i: number) => { if (!confirm('از بایگانی حذف شود؟')) return; A.D.consult.splice(i, 1); A.save(); draw(); }, srvGoPage: () => { A.U.p = 'srv'; draw(); }, srvGoCon: () => { A.U.p = 'con'; S.ct = 'new'; draw(); }, annSync: async () => { if (!S.user || !S.mgr) throw new Error('login'); await syncAnn(); }, srvDr: (lid: string, k: string, val: string) => { (S.dr[lid] = S.dr[lid] || {})[k] = val.trim(); }, srvLogin: login, srvOut: logout, srvTab: (k: string) => { S.tab = k; S.msg = ''; draw(); }, srvOne: createOne, srvBulk: bulk, srvPass: pass, srvRep: rep, srvToggle: toggle, srvDel: del, srvCsv: csv, srvFirst: (v: boolean) => { sd().firstOnly = v; A.save(); }, srvFetch: fetchInbox, srvApp: approve, srvAll: approveAll, srvRej: reject, srvPub: publishAll, srvGo: () => { A.U.p = 'srv'; S.tab = 'inb'; draw(); }, S_: S };
  return { page, conPage, badge, init, h };
}
