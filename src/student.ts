// پنل دانش‌آموز: ورود، تقویم معافیت، آزمون‌ها، ارسال کارنامه
import './style.css';
import { ic, initUi, annHtml, daysLeft } from './ui';
import { sb, cfgOk } from './supa';
import { initPwa } from './pwa';
import { importReport, ExamSettings } from './scan';

const $ = (s: string) => document.querySelector(s) as any;
const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const n = (v: any) => (v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('fa-IR'));
const n1 = (v: any) => (v == null || isNaN(v) ? '—' : (Math.round(v * 10) / 10).toLocaleString('fa-IR'));
const DAYN = ['شنبه', 'یکشنبه', 'سه‌شنبه', 'چهارشنبه'], GL = ['A', 'B', 'C', 'D'], GC = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];
const STN: any = { g: 'معاف (گروه)', f: 'معاف (معلم)', p: 'معاف (پیشرفت)' };
const SUBJ = ['ریاضی', 'فیزیک', 'شیمی', 'زیست', 'ادبیات', 'عربی', 'دین و زندگی', 'زبان'];
const CFG: ExamSettings = { sections: SUBJ.map((name, i) => ({ id: 'u' + i, name, color: '#888', n: 0, parts: [] })) };
const T: any = { con: [], ann: [], xi: 'ماز', sch: [], u: null, me: null, exams: [], cal: [], pend: 0, p: 'home', wi: null, open: null, prev: null, err: '', busy: false, ok: '', login: '', rc: [], rw: 0, rd: 0, rerr: '' };
const W: any = window;
const jdate = (iso: string, o: any = { day: 'numeric', month: 'long' }) => new Date(iso + 'T12:00:00').toLocaleDateString('fa-IR', o);
const todayIso = () => { const t = new Date(), p = (x: number) => String(x).padStart(2, '0'); return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`; };

/* ---------- auth & data ---------- */
async function boot() {
  $('#dt').textContent = new Date().toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' });
  if (cfgOk) { const { data } = await sb.auth.getSession(); T.u = data.session?.user || null; if (T.u) await load(); }
  draw();
}
async function login() {
  const u = ($('#lu').value || '').trim().toLowerCase(), p = $('#lp').value;
  T.busy = true; T.login = ''; draw();
  const { data, error } = await sb.auth.signInWithPassword({ email: `${u}@school.example`, password: p });
  T.busy = false;
  if (error) { T.login = 'نام کاربری یا رمز اشتباه است.'; draw(); return; }
  T.u = data.user; await load(); draw();
}
async function logout() { await sb.auth.signOut(); T.u = null; T.me = null; T.p = 'home'; draw(); }
async function load() {
  const [m, e, c, s, h, an, cs] = await Promise.all([
    sb.from('students').select('*').maybeSingle(),
    sb.from('exams_pub').select('*'),
    sb.from('calendar_pub').select('*').order('week_start'),
    sb.from('submissions').select('id', { count: 'exact', head: true }),
    sb.from('school_pub').select('*'),
    sb.from('announcements').select('*'),
    sb.from('consults').select('*').order('created_at', { ascending: false }),
  ]);
  T.con = cs.data || [];
  T.ann = (an.data || []).filter((a: any) => daysLeft(a.exp) >= 0 && (!a.starts || daysLeft(a.starts) <= 0)).sort((a: any, b: any) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (a.exp < b.exp ? -1 : 1));
  T.sch = (h.data || []).sort((a: any, b: any) => (a.date < b.date ? 1 : -1));
  T.me = m.data; T.exams = (e.data || []).sort((a: any, b: any) => (a.date < b.date ? -1 : 1)); T.cal = c.data || []; T.pend = s.count || 0;
  T.rc = []; T.rerr = '';
  if (T.me?.is_rep) {
    const r = await sb.rpc('class_calendar');
    if (r.error) T.rerr = r.error.message.includes('class_calendar') ? 'فایل supabase/update-8.sql روی سرور اجرا نشده است.' : r.error.message; else T.rc = r.data || [];
    const ws = [...new Set<string>(T.rc.map((x: any) => x.week_start))].sort(), iso0 = todayIso(); let q = 0; ws.forEach((w, i) => { if (w <= iso0) q = i; }); T.rw = q; T.rd = 0;
  }
  const iso = todayIso(); let k = -1; T.cal.forEach((r: any, i: number) => { if (r.week_start <= iso) k = i; }); T.wi = Math.max(k, 0);
}

/* ---------- views ---------- */
function draw() {
  document.body.classList.toggle('guest', !T.me);
  $('#who').textContent = T.me ? T.me.name : 'پنل دانش‌آموز';
  if (!T.me) { $('#nv').innerHTML = ''; $('#pt').textContent = 'ورود'; $('#app').innerHTML = loginView(); return; }
  const P = [['home', 'خانه', 'home'], ['ann', 'اطلاعیه‌ها', 'bell'], ['con', 'وقت مشاوره', 'chat'], ['cal', 'تقویم معافیت', 'cal'], ...(T.me.is_rep ? [['rcal', 'تقویم معافیت کلاس', 'users']] : []), ['exm', 'آزمون‌ها', 'clip'], ['send', 'ارسال کارنامه', 'up']];
  $('#nv').innerHTML = P.map(([k, t, i]) => `<button class="${T.p === k ? 'on' : ''}" onclick="go('${k}')" aria-label="${t}">${ic(i)}<span>${t}</span>${k === 'ann' && T.ann.length ? `<em class="bdg">${T.ann.length.toLocaleString('fa-IR')}</em>` : ''}${k === 'con' && upcoming().length ? `<em class="bdg" style="background:var(--ok)">${upcoming().length.toLocaleString('fa-IR')}</em>` : ''}</button>`).join('');
  $('#pt').textContent = (P.find((p) => p[0] === T.p) || ['', ''])[1];
  const a = $('#app'); a.classList.remove('in'); void a.offsetWidth; a.classList.add('in');
  a.innerHTML = ({ home, ann, con, cal, rcal, exm, send } as any)[T.p]();
}
const go = (p: string) => { T.p = p; T.ok = ''; T.err = ''; draw(); window.scrollTo(0, 0); };
function loginView() {
  if (!cfgOk) return `<div class="c">اتصال به سرور تنظیم نشده است.</div>`;
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
  return `<div class="homehero"><div><small>خوش آمدی 👋</small><h2>سلام ${esc(T.me.name)}</h2></div></div>
  ${upcoming()[0] ? (() => { const c = upcoming()[0]; return `<div class="ann" style="--ac2:#10b981" onclick="go('con')"><div class="ai">🗓️</div><div class="ab"><div><b>وقت مشاوره‌ی شما (${rel(c.slot_date)}): ${jdate(c.slot_date, { weekday: 'long', day: 'numeric', month: 'long' })} — ساعت ${ftime(c.slot_time)}</b></div>${c.place ? `<span class="tag">📍 ${esc(c.place)}</span>` : ''}${c.note ? `<p>${esc(c.note)}</p>` : ''}</div></div>`; })() : ''}
  ${T.ann.length ? `<div style="margin-bottom:6px">${T.ann.slice(0, 2).map((a: any) => annHtml(a)).join('')}${T.ann.length > 2 ? `<p class="m" style="margin:0 0 10px"><a href="#" onclick="go('ann');return false" style="color:var(--ac)">دیدن همه‌ی ${T.ann.length.toLocaleString('fa-IR')} اطلاعیه ←</a></p>` : ''}</div>` : ''}
  ${td ? dayCard(td, 'امروز') : nx ? `<div class="c m" style="margin-bottom:10px">امروز مدرسه نیست.</div>` : `<div class="c m">تقویم معافیت هنوز منتشر نشده است.</div>`}
  ${nx && (!td || nx.date !== td.date) ? `<div style="margin-top:10px">${dayCard(nx, 'روز مدرسه‌ی بعد')}</div>` : ''}
  <div class="g" style="margin-top:10px">${insCard('ماز')}${insCard('قلم‌چی')}${sl ? `<div class="c k" onclick="T.xi='مدرسه';go('exm')" style="cursor:pointer"><span>آخرین آزمون مدرسه</span><b style="font-size:17px">${esc(sl.title)}</b><span>${esc(sl.date)}</span></div>` : ''}${!T.exams.length && !sl ? `<div class="c m">هنوز نتیجه‌ای ثبت نشده.</div>` : ''}
  ${T.pend ? `<div class="c k"><b>${n(T.pend)}</b><span>کارنامه‌ی ارسال‌شده، منتظر بررسی مدیر</span></div>` : ''}</div>
  <div class="tb" style="margin-top:12px"><button class="btn p" onclick="go('send')">📄 ارسال کارنامه‌ی جدید</button></div>`;
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
Object.assign(W, { conSend, conCancel, T, draw, go, login, logout, pick, submitIt });
boot();
