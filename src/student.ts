// پنل دانش‌آموز: ورود، تقویم معافیت، آزمون‌ها، ارسال کارنامه
import './style.css';
import { ic, initUi, annHtml, daysLeft, toast } from './ui';
import { sb, cfgOk, authErrText } from './supa';
import { initPwa } from './pwa';
import { importReport, ExamSettings } from './scan';
import { mkAttGrid } from './attgrid';
import { planView, nextExam, exTitle, exDateLabel, exLeft } from './plan';
import { mazeView, nextStage, stageTitle, stageLeft, trackOf } from './maze';

const $ = (s: string) => document.querySelector(s) as any;
const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const n = (v: any) => (v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('fa-IR'));
const n1 = (v: any) => (v == null || isNaN(v) ? '—' : (Math.round(v * 10) / 10).toLocaleString('fa-IR'));
const DAYN = ['شنبه', 'یکشنبه', 'سه‌شنبه', 'چهارشنبه'], GL = ['A', 'B', 'C', 'D'], GC = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];
const STN: any = { g: 'معاف (گروه)', f: 'معاف (معلم)', p: 'معاف (پیشرفت)' };
const SUBJ = ['ریاضی', 'فیزیک', 'شیمی', 'زیست', 'ادبیات', 'عربی', 'دین و زندگی', 'زبان', 'زمین شناسی'];
const CFG: ExamSettings = { sections: SUBJ.map((name, i) => ({ id: 'u' + i, name, color: '#888', n: 0, parts: [] })) };
const T: any = { con: [], ann: [], xi: 'ماز', sch: [], u: null, me: null, exams: [], cal: [], pend: 0, p: 'home', wi: null, open: null, prev: null, err: '', busy: false, ok: '', login: '', rc: [], rw: 0, rd: 0, rerr: '', ab: [], at: null, atErr: '', ae: {}, ab0: {}, atBusy: false, ap: 0, plan: null, plk: 'all', sync: 'ok', loadErr: '' };
const W: any = window;
const P = [['home', 'خانه', 'home'], ['ann', 'اطلاعیه‌ها', 'bell'], ['con', 'وقت مشاوره', 'chat'], ['cal', 'تقویم معافیت', 'cal'], ['pln', 'برنامه آزمون‌ها', 'plan'], ['abs', 'غیبت‌های من', 'att'], ['rat', 'حضور و غیاب کلاس', 'clip'], ['rcal', 'تقویم معافیت کلاس', 'users'], ['exm', 'آزمون‌ها', 'clip'], ['send', 'ارسال کارنامه', 'up']];
const studentPages = () => P.filter(([k]) => T.me?.is_rep || (k !== 'rat' && k !== 'rcal'));
function closeStudentMenu() { const menu = $('#student-menu'); menu.hidden = true; $('#student-more')?.setAttribute('aria-expanded', 'false'); }
function toggleStudentMenu() { const menu = $('#student-menu'); menu.hidden = !menu.hidden; $('#student-more')?.setAttribute('aria-expanded', String(!menu.hidden)); }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeStudentMenu(); });
const jdate = (iso: string, o: any = { day: 'numeric', month: 'long' }) => new Date(iso + 'T12:00:00').toLocaleDateString('fa-IR', o);
const todayIso = () => { const t = new Date(), p = (x: number) => String(x).padStart(2, '0'); return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`; };

/* ---------- auth & data ---------- */
const SK = 'ss-student-auth', CK = 'ss-student-cache-v1';
const SPL = (): any => (window as any).__splash;
const isNet = (e: any) => !!e && (e.status === 0 || /failed to fetch|network|timeout|load failed|abort|fetch/i.test(String(e.message || e)));
const annOk = (a: any) => daysLeft(a.exp) >= 0 && (!a.starts || daysLeft(a.starts) <= 0);
const annSort = (x: any[]) => x.filter(annOk).sort((a: any, b: any) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (a.exp < b.exp ? -1 : 1));
// نشست را مستقیم از حافظه‌ی دستگاه می‌خوانیم (بدون شبکه) تا برنامه بلافاصله باز شود.
function localUser(): any { try { return JSON.parse(localStorage.getItem(SK) || 'null')?.user || null; } catch (e) { return null; } }
// آخرین داده‌های موفق روی خود دستگاه نگه داشته می‌شود؛ دفعه‌ی بعد فوراً نمایش داده می‌شود و در پس‌زمینه به‌روز می‌شود.
function saveCache() { try { localStorage.setItem(CK, JSON.stringify({ uid: T.u?.id, t: Date.now(), d: { me: T.me, exams: T.exams, cal: T.cal, pend: T.pend, sch: T.sch, ann: T.ann, con: T.con, ab: T.ab, plan: T.plan, rc: T.rc, rerr: T.rerr } })); } catch (e) { /* حافظه پر است */ } }
function clearCache() { try { localStorage.removeItem(CK); } catch (e) { /* ignore */ } }
function calcPos() {
  const iso = todayIso(); let k = -1; T.cal.forEach((r: any, i: number) => { if (r.week_start <= iso) k = i; }); T.wi = Math.max(k, 0);
  const ws = [...new Set<string>((T.rc || []).map((x: any) => x.week_start))].sort(); let q = 0; ws.forEach((w, i) => { if (w <= iso) q = i; }); T.rw = q; T.rd = 0;
}
function restoreCache(uid: string): boolean {
  try {
    const c = JSON.parse(localStorage.getItem(CK) || 'null');
    if (!c || c.uid !== uid || !c.d?.me) return false;
    Object.assign(T, c.d); T.ann = annSort(T.ann || []); T.rc = T.rc || []; calcPos(); return true;
  } catch (e) { return false; }
}
function netbar() {
  const b = $('#netbar'); if (!b) return;
  if (T.me && T.sync === 'syncing') { b.hidden = false; b.className = 'sy'; b.innerHTML = '<i class="spn"></i><span>در حال به‌روزرسانی…</span>'; }
  else if (T.me && T.sync === 'off') { b.hidden = false; b.className = 'of'; b.innerHTML = '<span>اتصال برقرار نشد؛ داده‌های ذخیره‌شده نمایش داده می‌شود</span><button type="button" onclick="retryLoad()">تلاش دوباره</button>'; }
  else b.hidden = true;
}
async function refresh() {
  T.sync = 'syncing'; T.loadErr = ''; netbar();
  try {
    await load(); T.sync = 'ok';
    if (!T.me) { const { data } = await sb.auth.getSession(); if (!data.session) { T.u = null; clearCache(); } }
  } catch (e: any) { T.sync = 'off'; if (!T.me) T.loadErr = isNet(e) ? 'net' : String(e?.message || 'خطای ناشناخته'); }
  netbar(); draw();
}
async function retryLoad() { const cold = !T.me; if (cold) SPL()?.show('در حال اتصال به سرور…'); await refresh(); if (cold) SPL()?.hide(); }
async function boot() {
  $('#dt').textContent = new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
  const lu = cfgOk ? localUser() : null;
  if (!lu) { draw(); SPL()?.hide(); return; }
  T.u = lu;
  if (restoreCache(lu.id)) { draw(); SPL()?.hide(); await refresh(); return; }
  SPL()?.set('در حال دریافت اطلاعات…');
  await refresh(); SPL()?.hide();
}
async function login() {
  const u = ($('#lu').value || '').trim().toLowerCase(), p = $('#lp').value;
  T.busy = true; T.login = ''; draw(); SPL()?.show('در حال ورود به حساب…');
  const { data, error } = await sb.auth.signInWithPassword({ email: `${u}@school.example`, password: p });
  T.busy = false;
  if (error) { T.login = authErrText(error, 'نام کاربری یا رمز اشتباه است.'); draw(); SPL()?.hide(); return; }
  T.u = data.user; SPL()?.set('در حال دریافت اطلاعات…'); await refresh(); SPL()?.hide();
}
async function logout() { clearCache(); T.sync = 'ok'; T.loadErr = ''; await sb.auth.signOut(); T.u = null; T.me = null; T.p = 'home'; netbar(); draw(); }
async function load() {
  const [m, e, c, s, h, an, cs, ab, pl] = await Promise.all([
    sb.from('students').select('*').maybeSingle(),
    sb.from('exams_pub').select('*'),
    sb.from('calendar_pub').select('*').order('week_start'),
    sb.from('submissions').select('id', { count: 'exact', head: true }),
    sb.from('school_pub').select('*'),
    sb.from('announcements').select('*'),
    sb.from('consults').select('*').order('created_at', { ascending: false }),
    sb.from('attendance').select('*').order('day', { ascending: false }),
    sb.from('exam_plan').select('data').eq('id', 'main').maybeSingle(),
  ]);
  // خطای شبکه = داده‌های قبلی (ذخیره‌شده) دست‌نخورده می‌ماند
  if ([m, e, c, s, h, an, cs, ab, pl].some((r: any) => isNet(r.error))) throw new Error('network');
  let rc: any[] = [], rerr = '';
  if (m.data?.is_rep) {
    const r = await sb.rpc('class_calendar');
    if (isNet(r.error)) throw new Error('network');
    if (r.error) rerr = r.error.message.includes('class_calendar') ? 'فایل supabase/update-8.sql روی سرور اجرا نشده است.' : r.error.message; else rc = r.data || [];
  }
  T.con = cs.data || []; T.ab = ab.error ? [] : ab.data || []; T.plan = pl.error ? null : pl.data?.data || null;
  T.ann = annSort(an.data || []);
  T.sch = (h.data || []).sort((a: any, b: any) => (a.date < b.date ? 1 : -1));
  T.me = m.data; T.exams = (e.data || []).sort((a: any, b: any) => (a.date < b.date ? -1 : 1)); T.cal = c.data || []; T.pend = s.count || 0;
  T.rc = rc; T.rerr = rerr; calcPos();
  if (T.me) saveCache(); else clearCache();
  if (T.me?.is_rep) await loadAtt();
}

/* ---------- views ---------- */
function draw() {
  netbar();
  document.body.classList.toggle('guest', !T.me);
  $('#who').textContent = T.me ? T.me.name : 'پنل دانش‌آموز';
  if (!T.me) { $('#nv').innerHTML = ''; $('#student-mobile-nav').innerHTML = ''; closeStudentMenu(); $('#pt').textContent = 'ورود'; $('#app').innerHTML = loginView(); return; }
  const pages = studentPages();
  $('#nv').innerHTML = pages.map(([k, t, i]) => `<button class="${T.p === k ? 'on' : ''}" onclick="go('${k}')" aria-label="${t}">${ic(i)}<span>${t}</span>${k === 'ann' && T.ann.length ? `<em class="bdg">${T.ann.length.toLocaleString('fa-IR')}</em>` : ''}${k === 'con' && upcoming().length ? `<em class="bdg" style="background:var(--ok)">${upcoming().length.toLocaleString('fa-IR')}</em>` : ''}</button>`).join('');
  const quick = ['home', 'cal', T.me.is_rep ? 'rat' : 'abs', 'exm'];
  const quickPages = pages.filter(([k]) => quick.includes(k)).sort((a, b) => quick.indexOf(a[0]) - quick.indexOf(b[0]));
  $('#student-mobile-nav').innerHTML = quickPages.map(([k, t, i]) => `<button type="button" class="${T.p === k ? 'on' : ''}" onclick="go('${k}')" ${T.p === k ? 'aria-current="page"' : ''}>${ic(i)}<span>${k === 'rat' ? 'حضور کلاس' : k === 'cal' ? 'تقویم' : k === 'abs' ? 'غیبت‌ها' : t}</span></button>`).join('') + `<button type="button" id="student-more" class="${quick.includes(T.p) ? '' : 'on'}" onclick="toggleStudentMenu()" aria-expanded="${!$('#student-menu').hidden}" aria-controls="student-menu"><span class="student-more-icon" aria-hidden="true">☰</span><span>بیشتر</span></button>`;
  $('#student-menu-links').innerHTML = pages.map(([k, t, i]) => `<button type="button" class="${T.p === k ? 'on' : ''}" onclick="go('${k}')" ${T.p === k ? 'aria-current="page"' : ''}>${ic(i)}<span>${t}</span>${k === 'ann' && T.ann.length ? `<em class="bdg">${T.ann.length.toLocaleString('fa-IR')}</em>` : ''}${k === 'con' && upcoming().length ? `<em class="bdg">${upcoming().length.toLocaleString('fa-IR')}</em>` : ''}</button>`).join('');
  $('#pt').textContent = (pages.find((p) => p[0] === T.p) || ['', ''])[1];
  const a = $('#app'); a.classList.remove('in'); void a.offsetWidth; a.classList.add('in');
  a.innerHTML = ({ home, ann, con, cal, rcal, exm, send, abs, rat, pln } as any)[T.p]();
}
const go = (p: string) => { closeStudentMenu(); T.p = p; T.ok = ''; T.err = ''; draw(); window.scrollTo(0, 0); };
function loginView() {
  if (!cfgOk) return `<div class="c">اتصال به سرور تنظیم نشده است.</div>`;
  if (T.u && T.loadErr) return `<div class="c" style="max-width:380px;margin:30px auto;text-align:center"><h3 style="font-size:18px">اتصال برقرار نشد</h3><p class="m">${T.loadErr === 'net' ? 'سرور در دسترس نیست یا اینترنت کند است. چند لحظه بعد دوباره تلاش کنید.' : esc(T.loadErr)}</p><div class="tb" style="justify-content:center"><button class="btn p" onclick="retryLoad()">تلاش دوباره</button><button class="btn" onclick="__diag()">بررسی اتصال</button><button class="btn" onclick="logout()">خروج</button></div></div>`;
  if (T.u) return `<div class="c">حساب شما هنوز به دانش‌آموزی متصل نشده. با مدیر مدرسه تماس بگیرید.<div class="tb" style="margin-top:8px"><button class="btn" onclick="logout()">خروج</button></div></div>`;
  return `<div class="c" style="max-width:360px;margin:30px auto"><h3 style="font-size:18px">ورود به پنل دانش‌آموز</h3><p class="m">نام کاربری و رمز را مدیر مدرسه به شما داده است.</p>${T.login ? `<p class="dn">${T.login}</p>` : ''}<div class="tb" style="flex-direction:column;align-items:stretch"><input id="lu" dir="ltr" placeholder="نام کاربری" autocapitalize="off"><input id="lp" dir="ltr" type="password" placeholder="رمز" onkeydown="if(event.key==='Enter')login()"><button class="btn p" onclick="login()" ${T.busy ? 'disabled' : ''}>${T.busy ? '…' : 'ورود'}</button></div></div>`;
}
const days = () => T.cal.flatMap((r: any) => r.data.days);
function dayCard(d: any, lab: string) {
  const c = GC[GL.indexOf(d.L)], ex = d.cells.filter((x: any) => x.t).length;
  return `<div class="c hc" style="--gc:${c};cursor:default"><div class="hl">${d.L}</div><div style="flex:1"><b>${lab} — ${DAYN[d.d]} ${jdate(d.date)}</b><div class="m">${ex ? `${n(ex)} از ${n(d.cells.length)} ساعت معافی` : 'همه‌ی ساعت‌ها حضور'}</div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">${d.cells.map((x: any) => `<span class="tag ${x.t ? 'x' + x.t : ''}" style="padding:2px 8px">${esc(x.s)}${x.t ? ' · ' + STN[x.t].replace('معاف ', '') : ''}</span>`).join('')}</div></div></div>`;
}
function home() {
  const iso = todayIso(), ds = days(), td = ds.find((d: any) => d.date === iso), nx = ds.find((d: any) => d.date > iso);
  const insCard = (ins: string) => { const ex = T.exams.filter((e: any) => e.inst === ins), l = ex[ex.length - 1], p = ex[ex.length - 2]; if (!l) return ''; const d = p ? l.level - p.level : null;
    return `<div class="c k" onclick="T.xi='${ins}';go('exm')" style="cursor:pointer"><span>${ins}</span><b>${n(l.level)}</b><span>تراز ${d != null ? `<span class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${n(Math.abs(d))}</span>` : ''} · رتبه ${n(l.rank)}</span></div>`; };
  const sl = T.sch[0];
  const rp = repTodo(), pex = nextExam(T.plan), pexd = pex ? exLeft(pex, n) : '', mzn = T.plan?.maze ? nextStage(T.plan.maze, mzState().track) : null, mznd = mzn ? stageLeft(mzn) : null;
  return `<div class="homehero"><div><small>خوش آمدی 👋</small><h2>سلام ${esc(T.me.name)}</h2></div></div>
  ${mzn ? `<div class="ann" style="--ac2:#4560b4" onclick="go('pln')"><div class="ai">🧭</div><div class="ab"><div><b>آزمون ماز بعدی: ${esc(stageTitle(mzn))} — ${mznd === 0 ? 'امروز' : mznd === 1 ? 'فردا' : n(mznd) + ' روز دیگر'}</b></div></div></div>` : ''}
  ${pex ? `<div class="ann" style="--ac2:#0891b2" onclick="go('pln')"><div class="ai">🗓️</div><div class="ab"><div><b>آزمون بعدی: ${esc(exTitle(pex))} — ${esc(exDateLabel(pex))}${pexd ? ' (' + pexd + ')' : ''}</b></div></div></div>` : ''}
  ${rp ? `<div class="ann" style="--ac2:#6366f1" onclick="go('rat')"><div class="ai">📋</div><div class="ab"><div><b>حضور و غیاب امروز: ${n(rp)} زنگ هنوز ثبت نشده است.</b></div></div></div>` : ''}
  ${upcoming()[0] ? (() => { const c = upcoming()[0]; return `<div class="ann" style="--ac2:#10b981" onclick="go('con')"><div class="ai">🗓️</div><div class="ab"><div><b>وقت مشاوره‌ی شما (${rel(c.slot_date)}): ${jdate(c.slot_date, { weekday: 'long', day: 'numeric', month: 'long' })} — ساعت ${ftime(c.slot_time)}</b></div>${c.place ? `<span class="tag">📍 ${esc(c.place)}</span>` : ''}${c.note ? `<p>${esc(c.note)}</p>` : ''}</div></div>`; })() : ''}
  ${T.ann.length ? `<div style="margin-bottom:6px">${T.ann.slice(0, 2).map((a: any) => annHtml(a)).join('')}${T.ann.length > 2 ? `<p class="m" style="margin:0 0 10px"><a href="#" onclick="go('ann');return false" style="color:var(--ac)">دیدن همه‌ی ${T.ann.length.toLocaleString('fa-IR')} اطلاعیه ←</a></p>` : ''}</div>` : ''}
  ${td ? dayCard(td, 'امروز') : nx ? `<div class="c m" style="margin-bottom:10px">امروز مدرسه نیست.</div>` : `<div class="c m">تقویم معافیت هنوز منتشر نشده است.</div>`}
  ${nx && (!td || nx.date !== td.date) ? `<div style="margin-top:10px">${dayCard(nx, 'روز مدرسه‌ی بعد')}</div>` : ''}
  <div class="g" style="margin-top:10px">${insCard('ماز')}${insCard('قلم‌چی')}${sl ? `<div class="c k" onclick="T.xi='مدرسه';go('exm')" style="cursor:pointer"><span>آخرین آزمون مدرسه</span><b style="font-size:17px">${esc(sl.title)}</b><span>${esc(sl.date)}</span></div>` : ''}${!T.exams.length && !sl ? `<div class="c m">هنوز نتیجه‌ای ثبت نشده.</div>` : ''}
  ${T.pend ? `<div class="c k"><b>${n(T.pend)}</b><span>کارنامه‌ی ارسال‌شده، منتظر بررسی مدیر</span></div>` : ''}</div>
  <div class="tb" style="margin-top:12px"><button class="btn p" onclick="go('send')">📄 ارسال کارنامه‌ی جدید</button></div>`;
}
/* ---------- حضور و غیاب ---------- */
const absMissing = (e: any) => /attendance|class_attendance|save_attendance|submit_absence/i.test(e?.message || '') && /not exist|find|schema|could not/i.test(e?.message || '');
const left = (ts: string) => { const m = Math.max(0, Math.round((new Date(ts).getTime() - Date.now()) / 60000)), h = Math.floor(m / 60), r = m % 60; return h ? `${n(h)} ساعت${r ? ' و ' + n(r) + ' دقیقه' : ''}` : `${n(r)} دقیقه`; };
// غیبت‌های خودِ دانش‌آموز (فقط نمایش؛ شرح غیبت را فقط مدیر می‌نویسد)
function absGroups() {
  const m: any = {}; (T.ab || []).forEach((r: any) => { (m[r.day] = m[r.day] || []).push(r); });
  return Object.keys(m).sort().reverse().map((day) => ({ day, rs: m[day].sort((a: any, b: any) => a.period - b.period) }));
}
function mzState() { T.mz = T.mz || { track: trackOf(T.me?.cls) || 'tajrobi', lane: 'main', subj: 'all', open: null }; return T.mz; }
function pln() {
  const hasM = !!T.plan?.maze, sec = T.plsec || (hasM ? 'maze' : 'school');
  const tabs = hasM ? `<div class="seg"><button class="${sec === 'maze' ? 'on' : ''}" onclick="plSec('maze')">🧭 نقشه‌ی راه ماز</button><button class="${sec === 'school' ? 'on' : ''}" onclick="plSec('school')">📝 تشریحی مدرسه</button></div>` : '';
  if (sec === 'maze' && hasM) { const m = mzState(); return tabs + mazeView(T.plan.maze, { track: m.track, lane: m.lane, subj: m.subj, open: m.open, set: 'mzSet', esc, n }); }
  return tabs + planView(T.plan, { kind: T.plk || 'all', setKind: 'plKind', esc, n });
}
function abs() {
  const G = absGroups(), A = T.ab || [], days = G.filter((g: any) => g.rs.some((r: any) => r.status === 'absent')).length, per = A.filter((r: any) => r.status === 'absent').length, late = A.filter((r: any) => r.status === 'late').length;
  const kp = (b: number, t: string, c = '') => `<div class="c k"><b class="${c}">${n(b)}</b><span>${t}</span></div>`;
  return `<div class="g" style="margin-bottom:10px">${kp(days, 'روز غیبت', days ? 'dn' : '')}${kp(per, 'زنگ غیبت')}${kp(late, 'تأخیر')}</div>
  ${G.length ? G.map((g: any) => `<div class="c" style="margin-bottom:8px"><div class="tb" style="margin:0"><b>${jdate(g.day, { weekday: 'long', day: 'numeric', month: 'long' })}</b><span class="m">${g.rs.map((r: any) => `${r.status === 'late' ? '⏰ تأخیر' : '❌ غیبت'} زنگ ${n(r.period)}`).join(' · ')}</span></div></div>`).join('') : `<div class="c m" style="text-align:center">🎉 تا حالا هیچ غیبتی نداشته‌اید.</div>`}
  <p class="m">غیبت‌ها را نماینده‌ی کلاس ثبت می‌کند و مدیر در صورت نیاز با شما یا والدینتان در تماس خواهد بود.</p>`;
}

/* ----- نماینده: ثبت حضور و غیاب ----- */
async function loadAtt() {
  const r = await sb.rpc('class_attendance');
  if (isNet(r.error)) { if (!T.at) T.atErr = 'اتصال برقرار نشد؛ دوباره تلاش کنید.'; return; }
  if (r.error) { T.atErr = absMissing(r.error) ? 'فایل supabase/update-9.sql روی سرور اجرا نشده است.' : r.error.message; T.at = null; return; }
  T.atErr = ''; T.at = r.data; T.ae = {}; T.ab0 = {};
  (r.data?.rows || []).forEach((x: any) => { const k = x.student_id + '|' + x.period, v = x.status === 'late' ? 'l' : 'a'; T.ae[k] = v; T.ab0[k] = v; });
}
const atRows = () => T.rc.map((r: any) => ({ id: r.student_id, name: r.name, day: r.data.days.find((d: any) => d.date === T.at?.today) })).filter((x: any) => x.day).sort((a: any, b: any) => a.name.localeCompare(b.name, 'fa'));
function repTodo() { if (!T.me?.is_rep || !T.at) return 0; const rs = atRows(); if (!rs.length) return 0; return rs[0].day.cells.length - (T.at.done || []).length; }
function rat() {
  if (!T.me?.is_rep) return `<div class="c m">این بخش فقط برای نماینده‌ی کلاس است.</div>`;
  if (T.atErr) return `<div class="c dn">${esc(T.atErr)}</div>`;
  if (!T.at) return `<div class="c m">در حال دریافت…</div>`;
  return `<div id="atbox">${ratBody()}</div>`;
}
function repTop() {
  const rows = atRows(), t = T.at.today, dstr = jdate(t, { weekday: 'long', day: 'numeric', month: 'long' }), test = t !== new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' });
  const per = rows[0].day.cells.length, L = rows[0].day.L, done: number[] = T.at.done || [], C = 2 * Math.PI * 26, frac = done.length / per;
  return `<div class="athero"><div class="atring"><svg width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="none" stroke="#ffffff44" stroke-width="6"/><circle cx="32" cy="32" r="26" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - frac)}" transform="rotate(-90 32 32)"/></svg><b>${n(done.length)}/${n(per)}</b></div>
    <div style="flex:1"><small>حضور و غیاب امروز</small><h3>${esc(T.at.cls)}</h3><small>${dstr} · گروه ${L}</small></div></div>${test ? '<div class="c dn" style="margin-bottom:10px">🧪 حالت آزمایشی: تاریخ حضور و غیاب روی روز بالا تنظیم شده است.</div>' : ''}`;
}
const G = mkAttGrid({
  id: 'rep', root: () => $('#atbox'), esc, n, toast,
  rows: () => atRows().map((r: any) => ({ id: r.id, name: r.name, cells: r.day.cells })),
  done: () => T.at?.done || [], ed: () => T.ae, base: () => T.ab0,
  top: () => repTop(),
  save: async (ps, rows) => { const r = await sb.rpc('save_attendance', { p_periods: ps, p_rows: rows }); if (r.error) return r.error.message; await loadAtt(); return null; },
});
function ratBody() {
  const rows = atRows(), t = T.at.today, dstr = jdate(t, { weekday: 'long', day: 'numeric', month: 'long' });
  if (!rows.length) return `<div class="athero"><div style="flex:1"><small>حضور و غیاب</small><h3>${esc(T.at.cls)}</h3><small>${dstr}</small></div></div><div class="c m">امروز روز مدرسه نیست یا تقویم معافیت هنوز منتشر نشده است.</div>`;
  return G.html();
}
/* ---------- وقت مشاوره ---------- */
const rel = (iso: string) => { const d = daysLeft(iso); return d === 0 ? 'امروز' : d === 1 ? 'فردا' : `${d.toLocaleString('fa-IR')} روز دیگر`; };
const ftime = (t: string) => String(t || '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const upcoming = () => T.con.filter((c: any) => c.status === 'scheduled' && c.slot_date >= todayIso()).sort((a: any, b: any) => (a.slot_date + a.slot_time).localeCompare(b.slot_date + b.slot_time));
function conCard(c: any) {
  const past = c.status === 'scheduled' && c.slot_date < todayIso();
  const col = c.status === 'scheduled' ? '#10b981' : c.status === 'pending' ? '#f59e0b' : '#dc2626', ico = c.status === 'scheduled' ? '🗓️' : c.status === 'pending' ? '⏳' : '❌';
  return `<div class="ann" style="--ac2:${col};${past ? 'opacity:.6' : ''}"><div class="ai">${ico}</div><div class="ab"><div><b>${c.status === 'scheduled' ? `${jdate(c.slot_date, { weekday: 'long', day: 'numeric', month: 'long' })} — ساعت ${ftime(c.slot_time)}` : c.status === 'pending' ? 'در انتظار بررسی مدیر' : 'درخواست پذیرفته نشد'}</b></div>${c.status === 'scheduled' && c.dur ? `<span class="tag">⏱ ${ftime(String(c.dur))} دقیقه</span>` : ''}${c.place ? ` <span class="tag">📍 ${esc(c.place)}</span>` : ''}${past ? ' <span class="tag">گذشته</span>' : ''}${c.note ? `<p>${esc(c.note)}</p>` : ''}${c.status === 'pending' ? `<div class="tb" style="margin:8px 0 0"><button class="btn" onclick="conCancel('${c.id}')">لغو درخواست</button></div>` : ''}</div></div>`;
}
function con() {
  const act = T.con.filter((c: any) => c.status !== 'rejected' && !(c.status === 'scheduled' && c.slot_date < todayIso())).length;
  const form = act >= 2 ? `<div class="c m">دو درخواست فعال دارید؛ بعد از پایان یکی می‌توانید درخواست جدید بدهید.</div>` : `<div class="c"><h3>درخواست وقت مشاوره‌ی تحصیلی</h3><p class="m">پیام شما فقط برای مدیر مدرسه قابل مشاهده است.</p><div class="tb" style="flex-direction:column;align-items:stretch"><textarea id="cms" maxlength="800" placeholder="مشکل یا سؤال تحصیلی‌تان را کوتاه بنویسید (اختیاری)"></textarea><input id="cpf" maxlength="200" placeholder="چه زمان‌هایی مناسب شماست؟ (مثلاً شنبه زنگ تفریح)"><button class="btn p" onclick="conSend()" ${T.busy ? 'disabled' : ''}>ارسال درخواست</button></div></div>`;
  const order = (c: any) => (c.status === 'scheduled' && c.slot_date >= todayIso() ? 0 : c.status === 'pending' ? 1 : c.status === 'rejected' ? 2 : 3);
  const list = [...T.con].sort((a: any, b: any) => order(a) - order(b) || (a.slot_date || '').localeCompare(b.slot_date || ''));
  return `${T.err ? `<div class="c dn" style="margin-bottom:10px">${esc(T.err)}</div>` : ''}${T.ok ? `<div class="c up" style="margin-bottom:10px">${T.ok}</div>` : ''}${form}<h3 style="margin:16px 0 10px">درخواست‌های من</h3>${list.map(conCard).join('') || '<div class="c m">هنوز درخواستی نداده‌اید.</div>'}`;
}
async function reloadCons() { const r = await sb.from('consults').select('*').order('created_at', { ascending: false }); T.con = r.data || []; }
async function conSend() {
  const topic = 'تحصیلی', msg = $('#cms').value.trim(), pref = $('#cpf').value.trim();
  T.busy = true; T.err = ''; T.ok = ''; draw();
  const { error } = await sb.from('consults').insert({ student_id: T.me.id, topic, msg, pref });
  T.busy = false;
  if (error) T.err = error.message.includes('too many') ? 'دو درخواست فعال دارید؛ صبر کنید یکی تمام شود.' : 'ارسال نشد: ' + error.message;
  else { T.ok = '✅ درخواست ارسال شد. وقت را مدیر تعیین می‌کند و همین‌جا می‌بینید.'; await reloadCons(); }
  draw();
}
async function conCancel(id: string) { if (!confirm('درخواست لغو شود؟')) return; await sb.from('consults').delete().eq('id', id); await reloadCons(); draw(); }
function ann() { return T.ann.length ? T.ann.map((a: any) => annHtml(a)).join('') : `<div class="c m" style="text-align:center;padding:30px">اطلاعیه‌ی فعالی نیست 🎉</div>`; }
function cal() {
  const r = T.cal[T.wi]; if (!r) return `<div class="c m">تقویم هنوز منتشر نشده است.</div>`;
  const D = r.data, last = T.cal.length - 1;
  let g = `<div class="cal"><div></div>${D.days.map((d: any) => `<div class="ch" style="--gc:${GC[GL.indexOf(d.L)]}"><b>${DAYN[d.d]}</b><span>${jdate(d.date)}</span><i>${d.L}</i></div>`).join('')}`;
  for (let p = 0; p < D.per; p++) { g += `<div class="cp">${n(p + 1)}</div>`; D.days.forEach((d: any) => { const x = d.cells[p]; g += `<div class="cell ${x.t ? 'x' + x.t : ''}" style="--gc:${GC[GL.indexOf(d.L)]}"><b>${esc(x.s)}</b><em>${x.t ? STN[x.t] : 'حضور'}</em></div>`; }); }
  return `<div class="tb"><button class="btn" ${T.wi >= last ? 'disabled' : ''} onclick="T.wi++;draw()">◀</button><b>هفته‌ی ${jdate(D.days[0].date)} تا ${jdate(D.days[3].date)}</b><button class="btn" ${T.wi <= 0 ? 'disabled' : ''} onclick="T.wi--;draw()">▶</button></div>${g}
  <p class="m" style="margin-top:10px"><span class="tag xg">معاف (گروه)</span> <span class="tag xf">معاف (معلم)</span> <span class="tag xp">معاف (پیشرفت)</span></p>`;
}

/* ---------- تقویم معافیت کلاس (فقط نماینده‌ی کلاس) ---------- */
function rcal() {
  if (!T.me?.is_rep) return `<div class="c m">این بخش فقط برای نماینده‌ی کلاس است.</div>`;
  if (T.rerr) return `<div class="c dn">${esc(T.rerr)}</div>`;
  const weeks = [...new Set<string>(T.rc.map((x: any) => x.week_start))].sort();
  if (!weeks.length) return `<div class="c m">تقویم کلاس هنوز منتشر نشده است.</div>`;
  const wk = weeks[Math.min(T.rw, weeks.length - 1)], rows = T.rc.filter((x: any) => x.week_start === wk).sort((a: any, b: any) => a.name.localeCompare(b.name, 'fa'));
  const days0 = rows[0].data.days, di = Math.min(T.rd, days0.length - 1), d0 = days0[di];
  const tabs = `<div class="seg">${days0.map((d: any, i: number) => `<button class="${i === di ? 'on' : ''}" onclick="T.rd=${i};draw()">${DAYN[d.d]} ${jdate(d.date)}</button>`).join('')}</div>`;
  const c = GC[GL.indexOf(d0.L)], per = d0.cells.length;
  const head = `<tr><th>دانش‌آموز</th>${d0.cells.map((x: any, p: number) => `<th style="text-align:center">${n(p + 1)}<br><span class="m">${esc(x.s)}</span></th>`).join('')}<th style="text-align:center">جمع</th></tr>`;
  let tot = 0;
  const body = rows.map((r: any) => {
    const d = r.data.days[di]; if (!d) return '';
    const ex = d.cells.filter((x: any) => x.t).length; tot += ex;
    return `<tr style="cursor:default"><td>${esc(r.name)}${r.student_id === T.me.id ? ' <span class="tag">شما</span>' : ''}</td>${d.cells.map((x: any) => `<td style="text-align:center">${x.t ? `<span class="tag x${x.t}" style="margin:0">${STN[x.t].replace('معاف ', '')}</span>` : '<span class="m">—</span>'}</td>`).join('')}<td style="text-align:center">${ex ? `<b>${n(ex)}</b>` : '<span class="m">—</span>'}</td></tr>`;
  }).join('');
  const last = weeks.length - 1, wi = Math.min(T.rw, last), D0 = rows[0].data;
  return `<div class="c" style="--gc:${c};margin-bottom:10px"><b>تقویم معافیت کلاس ${esc(T.me.cls)}</b><div class="m">نمایش وضعیت معافیت ${n(rows.length)} دانش‌آموز کلاس شما، فقط برای اطلاع نماینده.</div></div>
  <div class="tb"><button class="btn" ${wi >= last ? 'disabled' : ''} onclick="T.rw++;T.rd=0;draw()">◀</button><b>هفته‌ی ${jdate(D0.days[0].date)} تا ${jdate(D0.days[D0.days.length - 1].date)}</b><button class="btn" ${wi <= 0 ? 'disabled' : ''} onclick="T.rw--;T.rd=0;draw()">▶</button></div>
  ${tabs}<p class="m">گروه ${d0.L} · ${n(tot)} ساعت معافیت در این روز</p>
  <div class="c tw"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>
  <p class="m" style="margin-top:10px"><span class="tag xg">گروه</span> <span class="tag xf">معلم</span> <span class="tag xp">پیشرفت</span></p>`;
}
function chart(v: number[]) {
  if (v.length < 2) return '';
  const W_ = 600, H = 200, pl = 42, pr = 14, pt = 12, pb = 24, lo = Math.floor(Math.min(...v) / 500) * 500, hi = Math.ceil(Math.max(...v) / 500) * 500 || lo + 500;
  const X = (i: number) => W_ - pr - (W_ - pl - pr) * i / (v.length - 1), Y = (x: number) => pt + (H - pt - pb) * (1 - (x - lo) / (hi - lo || 1));
  let o = `<svg viewBox="0 0 ${W_} ${H}" width="100%">`;
  for (let k = 0; k <= 3; k++) { const x = lo + (hi - lo) * k / 3, y = Y(x); o += `<line x1="${pl}" x2="${W_ - pr}" y1="${y}" y2="${y}" stroke="var(--bd)"/><text x="${pl - 4}" y="${y + 4}" text-anchor="end">${n(x)}</text>`; }
  o += `<path d="${v.map((x, i) => (i ? 'L' : 'M') + X(i) + ' ' + Y(x)).join(' ')}" fill="none" stroke="var(--ac)" stroke-width="2.6"/>` + v.map((x, i) => `<circle cx="${X(i)}" cy="${Y(x)}" r="3.5" fill="var(--ac)"><title>${n(x)}</title></circle>`).join('');
  return o + '</svg>';
}
function exm() {
  const tabs = `<div class="seg">${['ماز', 'قلم‌چی', 'مدرسه'].map((k) => `<button class="${T.xi === k ? 'on' : ''}" onclick="T.xi='${k}';draw()">${k === 'مدرسه' ? 'آزمون‌های مدرسه' : 'تراز ' + k}</button>`).join('')}</div>`;
  if (T.xi === 'مدرسه') return tabs + (T.sch.map((e: any) => `<div class="c" style="margin-bottom:10px"><div class="tb"><b style="flex:1">${esc(e.title)} <span class="m">${esc(e.date)}</span></b></div>
    <div class="tw"><table><thead><tr><th>درس</th><th>نمره</th><th>میانگین کلاس</th></tr></thead><tbody>${e.data.lessons.map((l: any) => `<tr style="cursor:default"><td>${esc(l.n)}</td><td><b>${l.s == null ? '—' : (Math.round(l.s * 100) / 100).toLocaleString('fa-IR')}</b>${l.max !== 20 ? ` <span class="m">از ${n(l.max)}</span>` : ''}</td><td class="m">${l.c == null ? '—' : (Math.round(l.c * 10) / 10).toLocaleString('fa-IR')}</td></tr>`).join('')}</tbody></table></div></div>`).join('') || `<div class="c m">هنوز نمره‌ای ثبت نشده.</div>`);
  const all = T.exams.filter((e: any) => e.inst === T.xi), ex = [...all].reverse();
  if (!ex.length) return tabs + `<div class="c m">هنوز نتیجه‌ی ${T.xi} ثبت نشده. از بخش «ارسال کارنامه» بفرستید.</div>`;
  return tabs + `<div class="c"><h3>روند تراز ${T.xi}</h3>${chart(all.map((e: any) => e.level)) || '<p class="m">بعد از دو آزمون نمودار ساخته می‌شود.</p>'}</div>
  <div class="c" style="margin-top:10px">${ex.map((e: any) => `<details style="padding:6px 0;border-bottom:1px solid var(--bd)"><summary style="cursor:pointer;display:flex;justify-content:space-between;gap:8px"><span>${esc(e.title)}<br><span class="m">${esc(e.date)}</span></span><span>تراز <b>${n(e.level)}</b> · رتبه ${n(e.rank)}</span></summary>
  ${Object.entries(e.subj || {}).map(([k, v]: any) => `<div style="margin:6px 0"><div style="display:flex;justify-content:space-between"><span>${esc(k)}</span><b>${n(v)}٪</b></div><div class="bar"><i style="width:${Math.max(2, Math.min(100, v))}%"></i></div></div>`).join('') || '<p class="m">درصد دروس ثبت نشده.</p>'}</details>`).join('')}</div>`;
}

/* ---------- send report ---------- */
async function prepare(f: File): Promise<File> {
  if (f.type === 'application/pdf') { if (f.size > 1100000) throw new Error('PDF بزرگ است (بیشتر از ۱ مگابایت). همان کارنامه را به‌صورت عکس/اسکرین‌شات بفرستید.'); return f; }
  const bm = await createImageBitmap(f), k = Math.min(1, 2400 / bm.width), cv = document.createElement('canvas');
  cv.width = Math.round(bm.width * k); cv.height = Math.round(bm.height * k); cv.getContext('2d')!.drawImage(bm, 0, 0, cv.width, cv.height);
  const b: Blob = await new Promise((r) => cv.toBlob((x) => r(x!), 'image/jpeg', 0.85));
  if (b.size > 1100000) throw new Error('حجم عکس زیاد است؛ کارنامه را نزدیک‌تر و بدون حاشیه‌ی اضافه عکس بگیرید.');
  return new File([b], 'report.jpg', { type: 'image/jpeg' });
}
const toB64 = (f: File) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(f); });
async function pick(inp: HTMLInputElement) {
  const f = inp.files?.[0]; inp.value = ''; if (!f) return;
  T.busy = true; T.err = ''; T.ok = ''; T.prev = null; draw();
  try { const pf = await prepare(f); const r = await importReport(pf, CFG); T.prev = { file: pf, x: r.exam }; }
  catch (e: any) { T.err = e?.message === 'layout' ? 'این فایل شبیه کارنامه‌ی ماز یا قلم‌چی نیست.' : (e?.message || 'فایل خوانده نشد.'); }
  T.busy = false; draw();
}
function send() {
  const pr = T.prev, x = pr?.x;
  return `<div class="c scn"><h3>ارسال کارنامه</h3><p class="m">کارنامه‌ی تحلیلی ماز (عکس یا PDF) یا PDF کارنامه‌ی قلم‌چی را انتخاب کنید. اعداد روی گوشی شما خوانده می‌شود و بعد از تأیید مدیر در پنل شما ثبت می‌شود.</p><input type="file" accept="application/pdf,image/*" onchange="pick(this)"></div>
  ${T.busy ? '<div class="c" style="margin-top:10px">⏳ لطفاً صبر کنید…</div>' : ''}${T.err ? `<div class="c dn" style="margin-top:10px">${esc(T.err)}</div>` : ''}${T.ok ? `<div class="c up" style="margin-top:10px">${T.ok}</div>` : ''}
  ${x ? `<div class="c fc" style="margin-top:10px"><div class="tb"><span class="tag">${esc(x.institute)}</span><input id="st" value="${esc(x.title)}" placeholder="عنوان آزمون"><input id="sd" value="${esc(x.date)}" style="width:110px" placeholder="1405/07/10"></div>
  <div class="tb"><div>تراز کل: <b>${n(x.level)}</b></div><div>رتبه: <b>${n(x.countryRank)}</b></div></div>
  <div class="tw"><table><thead><tr><th>درس</th><th>درست</th><th>غلط</th><th>نزده</th></tr></thead><tbody>${x.rows.map((r: any, i: number) => `<tr style="cursor:default"><td><select onchange="T.prev.x.rows[${i}].sectionName=this.value">${[...new Set([...SUBJ, r.sectionName])].map((k) => `<option ${k === r.sectionName ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></td><td>${n(r.c)}</td><td>${n(r.w)}</td><td>${n(r.n - r.c - r.w)}</td></tr>`).join('')}</tbody></table></div>
  ${x.warnings.map((w: string) => `<div class="w">⚠ ${esc(w)}</div>`).join('')}
  <div class="tb" style="margin-top:8px"><button class="btn p" onclick="submitIt()">ارسال برای مدیر</button><span class="m">اعداد قابل ویرایش نیستند؛ اگر اشتباه خوانده شده، فایل واضح‌تری بدهید.</span></div></div>` : ''}`;
}
async function submitIt() {
  const x = T.prev.x, title = $('#st').value.trim(), date = $('#sd').value.trim();
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(date)) { alert('تاریخ را به شکل 1405/07/10 بنویسید.'); return; }
  if (x.level == null) { alert('تراز کل خوانده نشد؛ فایل واضح‌تری بدهید.'); return; }
  if (!title) { alert('عنوان آزمون را بنویسید.'); return; }
  T.busy = true; draw();
  const agg: any = {}; x.rows.forEach((r: any) => { const a = agg[r.sectionName] || [0, 0, 0]; agg[r.sectionName] = [a[0] + r.c, a[1] + r.w, a[2] + r.n - r.c - r.w]; });
  const subj: any = {}; Object.entries(agg).forEach(([k, [c, w, b]]: any) => { const t = c + w + b; subj[k] = t ? Math.round((3 * c - w) / (3 * t) * 1000) / 10 : 0; });
  const { error } = await sb.from('submissions').insert({ student_id: T.me.id, inst: x.institute, title, date, level: x.level, rank: x.countryRank, subj, raw: x.rows.map((r: any) => ({ k: r.sectionName, c: r.c, w: r.w, b: r.n - r.c - r.w, lv: r.level })), file_b64: await toB64(T.prev.file), file_type: T.prev.file.type });
  T.busy = false;
  if (error) { T.err = error.message.includes('too many') ? 'حداکثر ۳ کارنامه‌ی بررسی‌نشده می‌تواند ارسال شود؛ صبر کنید مدیر بررسی کند.' : 'ارسال نشد: ' + error.message; draw(); return; }
  T.prev = null; T.pend++; T.ok = '✅ ارسال شد. بعد از تأیید مدیر در بخش آزمون‌ها دیده می‌شود.'; draw();
}

initUi();
initPwa();
Object.assign(W, { retryLoad, conSend, conCancel, T, draw, go, login, logout, pick, submitIt, closeStudentMenu, toggleStudentMenu, plKind: (k: string) => { T.plk = k; draw(); }, plSec: (k: string) => { T.plsec = k; draw(); }, mzSet: (k: string, v: string) => { const m = mzState(); m[k] = v || null; if (k === 'track' || k === 'lane') { m.open = null; m.subj = 'all'; } draw(); }, plGo: (id: string) => { document.getElementById('pl_' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
boot();
