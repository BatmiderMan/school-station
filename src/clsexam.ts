// آزمون‌های کلاسی (سمت مدیر) — تب «🏫 مدرسه» در بخش آزمون‌ها.
// • برنامه و جزئیات هر آزمون روی سرور (جدول class_exams) است تا نماینده‌ی هر کلاس هم بتواند برای کلاس خودش آزمون ثبت کند.
// • نمره‌ها مثل قبل در داده‌های مدیر (D.sch) نگه داشته می‌شوند و فقط وقتی مدیر «انتشار» بزند به پنل خودِ هر دانش‌آموز می‌رسند (جدول school_pub).
import { sb } from './supa';
import { iso2j, daysLeft } from './ui';
import { CExam, CDraft, CE_KINDS, ceCard, ceCheck, ceDraftNew, ceDraftOf, ceForm, ceInit, ceRead, ceSort, ceTitle, cePhase, ceDay, fa } from './cexam';

export function mkClassExams(A: any) {
  const esc = A.esc, n = A.n, D = () => A.D;
  const S: any = (A.U.CE = A.U.CE || { rows: [] as CExam[], at: 0, err: '', busy: false, cls: 'all', f: 'up', draft: null, view: null, old: false, saving: false });
  const num = (v: any) => Number(String(v).trim().replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace('٫', '.'));
  const r2 = (v: number) => (Math.round(v * 100) / 100).toLocaleString('fa-IR');
  const missing = (e: any) => /class_exams|rep_save|my_cls/i.test(e?.message || '') && /not exist|find|schema|could not/i.test(e?.message || '');
  const errText = (e: any) => (missing(e) ? 'فایل supabase/update-12.sql هنوز روی سرور اجرا نشده است.' : e?.message || String(e));
  const redraw = () => (A.bg || A.draw)();
  const byId = (id: string): CExam | undefined => S.rows.find((x: CExam) => x.id === id);
  const sch = () => A.ensureSch();
  const linkOf = (id: string) => sch().exams.find((x: any) => x.id === id);
  const mates = (s: any) => D().students.filter((x: any) => x.cls === s.cls).sort(A.byNum);
  const accOf = (lid: string) => D().srv?.accounts?.[lid];

  /* ---------- بارگیری از سرور ---------- */
  async function load(force = false) {
    if (!A.SV.isMgr()) return;
    if (S.busy || (!force && S.at && Date.now() - S.at < 45000)) return;
    S.busy = true;
    try {
      const { data, error } = await sb.from('class_exams').select('*').order('exam_date', { ascending: true });
      if (error) throw error;
      S.rows = data || []; S.err = '';
    } catch (e: any) { S.err = errText(e); }
    S.at = Date.now(); S.busy = false; redraw();
  }

  /* ---------- پیوند آزمون ↔ نمره‌ها (D.sch) ---------- */
  /** نمره‌های هر آزمونِ کلاسی در یک «آزمون مدرسه» با همان شناسه نگه داشته می‌شود؛ تا انتشار صریح، به دانش‌آموزان نمی‌رسد (hold) */
  function ensureLink(e: CExam) {
    let s = linkOf(e.id); const title = ceTitle(e), date = iso2j(e.exam_date);
    if (!s) { s = { id: e.id, title, date, cls: e.cls, lessons: [{ name: e.subject, max: Number(e.max_score) || 20 }], sc: {}, sa: {}, ce: 1, hold: true }; sch().exams.push(s); A.save(); return s; }
    if (!s.ce) return s;
    s.sa = s.sa || {};
    let ch = false;
    if (s.title !== title) { s.title = title; ch = true; }
    if (s.date !== date) { s.date = date; ch = true; }
    if (s.cls !== e.cls) { s.cls = e.cls; ch = true; }
    const L = s.lessons[0];
    if (L && L.name !== e.subject) { const old = L.name; Object.values(s.sc).forEach((o: any) => { if (old in o) { o[e.subject] = o[old]; delete o[old]; } }); L.name = e.subject; ch = true; }
    if (L && Number(e.max_score) !== L.max) { const top = Math.max(0, ...Object.values(s.sc).map((o: any) => o[L.name] ?? 0)); if (top <= Number(e.max_score)) { L.max = Number(e.max_score); ch = true; } }
    if (ch) A.save();
    return s;
  }
  const stat = (s: any) => {
    const L = s.lessons[0], ss = mates(s), sa = s.sa || {};
    const vals = ss.map((x: any) => s.sc[x.id]?.[L.name]).filter((v: any) => v != null) as number[];
    const ab = ss.filter((x: any) => sa[x.id]).length;
    return { total: ss.length, done: vals.length, ab, left: ss.length - vals.length - ab, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null, max: vals.length ? Math.max(...vals) : null, min: vals.length ? Math.min(...vals) : null };
  };
  const released = (s: any) => !!s && s.hold === false;

  /* ---------- فهرست ---------- */
  const today = () => A.today();
  const phaseOf = (e: CExam) => {
    const s = linkOf(e.id), p = cePhase(e);
    if (released(s)) return 'done';
    if (e.status === 'cancelled') return 'cancel';
    return p === 'past' ? 'wait' : 'up';
  };
  const inFilter = (e: CExam, f: string) => f === 'all' || (f === 'up' ? (cePhase(e) === 'soon' || cePhase(e) === 'today' || (e.status === 'cancelled' && daysLeft(e.exam_date) >= 0)) : phaseOf(e) === f);
  const fresh = (e: CExam) => e.by_role === 'rep' && e.created_at && Date.now() - new Date(e.created_at).getTime() < 3 * 864e5;

  function card(e: CExam) {
    const s = linkOf(e.id), st = s ? stat(s) : null, ph = phaseOf(e);
    const prog = s && st && (st.done || st.ab) ? `<div class="cex-who" style="color:var(--tx)">🧮 نمره‌ها: <b>${n(st.done)}</b> از ${n(st.total)} ثبت شده${st.ab ? ` · ${n(st.ab)} غایب` : ''} — ${released(s) ? '<span class="up">منتشر شده ✓</span>' : '<span style="color:var(--warn)">هنوز منتشر نشده</span>'}</div>` : (ph === 'wait' ? `<div class="cex-who" style="color:var(--warn)">⏳ برگزار شده؛ منتظر ثبت نمره</div>` : '');
    const nw = fresh(e) ? `<div class="cex-who"><span class="tag" style="background:#6366f122;border-color:#6366f155">🆕 تازه از طرف نماینده</span></div>` : '';
    const cancelled = e.status === 'cancelled';
    const actions = `${cancelled ? '' : `<button class="btn p" onclick="CE_open('${e.id}')">🧮 ${s && (st!.done || st!.ab) ? 'نمره‌ها' : 'ثبت نمره'}</button>`}<button class="btn" onclick="CE_edit('${e.id}')">✎ ویرایش</button><button class="btn" onclick="CE_cancelEx('${e.id}')">${cancelled ? '♻ فعال‌سازی دوباره' : '🚫 لغو آزمون'}</button><button class="btn" style="color:var(--bad)" onclick="CE_del('${e.id}')">حذف</button>`;
    return ceCard(e, { showCls: true, who: true, extra: nw + prog, actions });
  }
  function form() {
    const d: CDraft = S.draft.d, ed = S.draft.editing;
    const subs = [...new Set<string>(A.CL.flatMap((c: string) => A.tt(c).flat()).filter(Boolean))];
    return `<div class="c" style="margin-bottom:14px;border-color:var(--ac)"><h3 style="font-size:16px">${ed ? '✎ ویرایش آزمون' : '＋ آزمون جدید'}</h3>${ceForm(d, { admin: true, classes: A.CL, editing: ed, subjects: subs, needTopics: false })}
      <div class="cexf-bar"><button class="btn p" ${S.saving ? 'disabled' : ''} onclick="CE_save()">${S.saving ? 'در حال ذخیره…' : ed ? 'ذخیره‌ی تغییرها' : 'ثبت آزمون'}</button><button class="btn" onclick="CE_formCancel()">انصراف</button>${ed ? '<span class="m">تغییر تاریخ یا ساعت فوراً برای دانش‌آموزان آن کلاس دیده می‌شود.</span>' : '<span class="m">بعد از ثبت، آزمون فوراً در پنل دانش‌آموزان همان کلاس‌ها دیده می‌شود.</span>'}</div></div>`;
  }
  function listPage() {
    const rows: CExam[] = S.rows, cl = S.cls, base = rows.filter((e) => cl === 'all' || e.cls === cl);
    const cnt = (f: string) => base.filter((e) => inFilter(e, f)).length;
    const FL = [['up', '📅 پیش‌رو'], ['wait', '⏳ منتظر نمره'], ['done', '✅ نمره‌دار'], ['all', 'همه']];
    let list = base.filter((e) => inFilter(e, S.f)).sort(ceSort); if (S.f !== 'up') list = list.reverse();
    const fr = rows.filter(fresh);
    const old = S.at && !S.err ? sch().exams.filter((x: any) => !byId(x.id)).sort((a: any, b: any) => (a.date < b.date ? 1 : -1)) : [];
    const head = `<div class="cexa-top"><button class="btn p" onclick="CE_new()">＋ آزمون جدید</button><button class="btn" onclick="CE_refresh()" ${S.busy ? 'disabled' : ''}>${S.busy ? '…' : '🔄 به‌روزرسانی'}</button><span class="m" style="flex:1">برنامه‌ی هر کلاس را اینجا بنویسید؛ نماینده‌ها هم می‌توانند برای کلاس خودشان آزمون ثبت کنند. بعد از برگزاری، نمره‌ها را وارد و منتشر کنید.</span></div>`;
    const clsSeg = `<div class="seg">${['all', ...A.CL].map((c) => `<button class="${cl === c ? 'on' : ''}" onclick="CE_f('cls','${c}')">${c === 'all' ? 'همه‌ی کلاس‌ها' : c}</button>`).join('')}</div>`;
    const fSeg = `<div class="seg">${FL.map(([k, t]) => `<button class="${S.f === k ? 'on' : ''}" onclick="CE_f('f','${k}')">${t} <small>${n(cnt(k))}</small></button>`).join('')}</div>`;
    const empty = `<div class="c cex-empty"><b>${S.f === 'up' ? '📭' : '🗂'}</b>${S.f === 'up' ? 'آزمونِ پیش‌رویی ثبت نشده است.' : 'موردی در این بخش نیست.'}${S.f === 'up' ? '<div class="tb" style="justify-content:center;margin:12px 0 0"><button class="btn p" onclick="CE_new()">＋ ثبت اولین آزمون</button></div>' : ''}</div>`;
    return `${head}${fr.length ? `<div class="cexa-new">🆕 ${n(fr.length)} آزمون در ۳ روز گذشته توسط نماینده‌ها ثبت شده است؛ در فهرست با برچسب «تازه» مشخص شده‌اند.</div>` : ''}${S.draft ? form() : ''}
      <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">${clsSeg}${fSeg}</div>${list.map(card).join('') || empty}
      ${old.length ? `<details class="c" style="margin-top:14px"><summary style="cursor:pointer;font-weight:700">🗄 آزمون‌های قدیمیِ فقط‌نمره (${n(old.length)})</summary><p class="m">این آزمون‌ها قبل از سامانه‌ی جدید ساخته شده‌اند و برنامه‌ی زمان‌بندی ندارند.</p>${old.map((x: any) => `<div class="row" style="cursor:pointer" onclick="CE_openOld('${x.id}')"><span>${esc(x.title)} <span class="tag">${esc(x.cls)}</span>${x.hold === true ? ' <span class="tag" style="color:var(--warn)">منتشر نشده</span>' : ''}</span><span class="m">${esc(x.date)} · ${n(x.lessons.length)} درس</span></div>`).join('')}</details>` : ''}`;
  }

  /* ---------- نمره‌دهی ---------- */
  function relBar(s: any) {
    if (s.hold === undefined) return '';
    const st = stat(s), on = released(s), withAcc = mates(s).filter((x: any) => accOf(x.id)).length;
    return `<div class="cexm-rel ${on ? 'on' : 'off'}"><p>${on ? '✅ نمره‌ها برای دانش‌آموزان <b>منتشر شده</b> و هر نفر فقط نمره‌ی خودش (و میانگین کلاس) را می‌بیند.' : `🔒 نمره‌ها <b>هنوز منتشر نشده</b>؛ تا وقتی دکمه‌ی انتشار را نزنید، هیچ‌کس نمره را نمی‌بیند. بعد از ورود همه‌ی نمره‌ها و غایب‌ها منتشر کنید.`}${withAcc < st.total ? `<br><span class="m">${n(st.total - withAcc)} نفر از این کلاس هنوز حساب کاربری ندارند و نمره را نمی‌بینند.</span>` : ''}</p><button class="btn ${on ? '' : 'p'}" onclick="CE_rel('${s.id}')">${on ? 'برداشتن از پنل دانش‌آموزان' : '📢 انتشار نمره‌ها'}</button></div>`;
  }
  function statsHtml(s: any) {
    const st = stat(s);
    return `<div><b>${n(st.done)}</b><span>از ${n(st.total)} نمره ثبت شده</span></div><div><b>${n(st.ab)}</b><span>غایب</span></div><div><b class="${st.left ? 'dn' : ''}">${n(st.left)}</b><span>بدون نمره</span></div><div><b>${st.avg == null ? '—' : r2(st.avg)}</b><span>میانگین</span></div><div><b>${st.max == null ? '—' : r2(st.max)}</b><span>بیشترین</span></div><div><b>${st.min == null ? '—' : r2(st.min)}</b><span>کمترین</span></div>`;
  }
  function marksView(e: CExam) {
    const s = ensureLink(e), L = s.lessons[0], ss = mates(s), sa = s.sa || {};
    const rows = ss.map((x: any) => { const v = s.sc[x.id]?.[L.name], ab = !!sa[x.id], acc = accOf(x.id);
      return `<tr id="cexr_${x.id}" class="${ab ? 'ab' : ''}" style="cursor:default"><td class="m">${n(x.num)}</td><td class="nm">${esc(x.name)}${acc ? '' : ' <span class="tag r" title="حساب کاربری ندارد">بدون حساب</span>'}</td><td class="s"><input class="cexm-in" id="cexi_${x.id}" type="number" inputmode="decimal" step="0.25" min="0" max="${L.max}" dir="ltr" value="${v ?? ''}" ${ab ? 'disabled' : ''} onchange="CE_sc('${s.id}','${x.id}',this.value)" onkeydown="CE_key(event)"></td><td><label class="m"><input type="checkbox" id="cexa_${x.id}" ${ab ? 'checked' : ''} onchange="CE_ab('${s.id}','${x.id}',this.checked)"> غایب</label></td></tr>`; }).join('');
    return `<div class="tb"><button class="btn" onclick="CE_back()">▶ بازگشت به فهرست</button><span style="flex:1"></span><button class="btn" onclick="CE_csv('${s.id}')">⬇ CSV</button></div>
      ${ceCard(e, { showCls: true, who: true, actions: `<button class="btn" onclick="CE_edit('${e.id}')">✎ ویرایش مشخصات آزمون</button>` })}
      <div class="c"><div class="cexm-head"><h3 style="margin:0;flex:1">🧮 نمره‌ی ${esc(L.name)} — ${esc(e.cls)}</h3><label class="m">سقف نمره <input type="number" min="0.25" step="0.25" dir="ltr" value="${L.max}" style="width:80px" onchange="CE_max('${s.id}',this.value)"></label></div>
        <div class="cexm-stats" id="cexm_stats">${statsHtml(s)}</div>${relBar(s)}
        <p class="m" style="margin:6px 0">نمره را بنویسید و Enter بزنید تا به دانش‌آموز بعدی بروید. اگر کسی در آزمون نبود «غایب» را بزنید (با خالی گذاشتن فرق دارد: خالی یعنی «هنوز ثبت نشده»).</p>
        <div class="tw"><table class="cexm"><thead><tr><th>#</th><th>دانش‌آموز</th><th>نمره (از ${n(L.max)})</th><th>وضعیت</th></tr></thead><tbody>${rows}</tbody></table></div>
        <details style="margin-top:12px"><summary style="cursor:pointer">ثبت گروهیِ نمره‌ها (چسباندن از اکسل یا فایل)</summary><p class="m">هر خط: شماره‌ی کلاسی یا نام کامل، سپس نمره. برای غایب به‌جای نمره «غ» بنویسید. مثال: ۱۲، ۱۷٫۵</p><textarea id="cexm_bulk" placeholder="۱۲، ۱۷.۵&#10;علی احمدی، ۱۹&#10;۱۵، غ" style="min-height:90px"></textarea><div class="tb" style="margin-top:6px"><button class="btn p" onclick="CE_bulk('${s.id}')">ثبت نمره‌ها</button></div></details></div>`;
  }
  function oldView(id: string) {
    const s = linkOf(id); if (!s) return `<div class="c m">این آزمون پیدا نشد.</div><button class="btn" onclick="CE_back()">▶ بازگشت</button>`;
    return `<div class="tb"><button class="btn" onclick="CE_back()">▶ بازگشت به فهرست</button></div>${relBar(s) ? `<div class="c">${relBar(s)}</div>` : ''}${A.legacyGrid(s)}`;
  }

  function page() {
    load(false);
    if (!A.SV.isMgr()) return `<div class="c" style="text-align:center;padding:26px"><div style="font-size:34px">🔐</div><p>برای مدیریت آزمون‌های کلاس باید در تب «☁️ سرور» با حساب مدیر وارد شده باشید تا برنامه‌ها با نماینده‌ها و دانش‌آموزان همگام شود.</p><button class="btn p" onclick="go('srv')">رفتن به تب سرور</button></div>`;
    if (S.err) return `<div class="c" style="border-color:var(--bad)"><b class="dn">${esc(S.err)}</b><div class="tb" style="margin-top:10px"><button class="btn" onclick="CE_refresh()">تلاش دوباره</button></div></div>`;
    if (!S.at) return `<div class="c m" style="text-align:center;padding:26px">⏳ در حال دریافت برنامه‌ی آزمون‌ها…</div>`;
    if (S.view) { if (S.old) return oldView(S.view); const e = byId(S.view); if (e) return marksView(e); S.view = null; }
    return listPage();
  }

  /* ---------- عملیات ---------- */
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
  const rowOf = (d: CDraft) => ({ subject: d.subject, kind: d.kind, title: d.title, exam_date: d.exam_date, start_time: d.start_time || null, period: d.period, duration: d.duration, place: d.place, topics: d.topics, resources: d.resources, note: d.note, max_score: d.max_score });
  async function save() {
    if (!S.draft || S.saving) return;
    const d: CDraft = ceRead(), ed = S.draft.editing; if (ed) { d.cls = S.draft.d.cls; d.classes = [d.cls]; }
    const bad = ceCheck(d, { admin: true, needTopics: false, needClass: !ed }); if (bad) { A.toast(bad); return; }
    S.saving = true; A.draw();
    try {
      if (ed) {
        const { error } = await sb.from('class_exams').update({ ...rowOf(d), updated_at: new Date().toISOString() }).eq('id', d.id); if (error) throw error;
        const e = byId(d.id); if (e) { Object.assign(e, rowOf(d)); if (linkOf(e.id)) ensureLink(e); }
      } else {
        const { error } = await sb.from('class_exams').insert(d.classes.map((c) => ({ ...rowOf(d), cls: c, by_role: 'admin', by_name: 'مدیریت' }))); if (error) throw error;
      }
      S.draft = null; S.saving = false; await load(true); A.toast(ed ? 'تغییرها ذخیره شد ✓' : d.classes.length > 1 ? `آزمون برای ${n(d.classes.length)} کلاس ثبت شد ✓` : 'آزمون ثبت شد ✓');
    } catch (e: any) { S.saving = false; A.toast('ذخیره نشد: ' + errText(e)); }
    A.draw();
  }
  const setScore = (s: any, sid: string, v: number | null) => {
    const L = s.lessons[0]; s.sc[sid] = s.sc[sid] || {};
    if (v == null) delete s.sc[sid][L.name]; else { s.sc[sid][L.name] = v; if (s.sa) delete s.sa[sid]; }
    if (!Object.keys(s.sc[sid]).length) delete s.sc[sid];
  };
  const paint = (s: any, sid: string) => {
    const L = s.lessons[0], ab = !!s.sa?.[sid], i = document.getElementById('cexi_' + sid) as HTMLInputElement | null, c = document.getElementById('cexa_' + sid) as HTMLInputElement | null, r = document.getElementById('cexr_' + sid);
    if (i) { i.disabled = ab; i.value = s.sc[sid]?.[L.name] ?? ''; } if (c) c.checked = ab; if (r) r.classList.toggle('ab', ab);
    const st = document.getElementById('cexm_stats'); if (st) st.innerHTML = statsHtml(s);
  };
  const h = {
    CE_new: () => { S.draft = { editing: false, d: ceDraftNew('', S.cls !== 'all' ? [S.cls] : []) }; S.view = null; A.draw(); window.scrollTo(0, 0); },
    CE_edit: (id: string) => { const e = byId(id); if (!e) return; S.draft = { editing: true, d: ceDraftOf(e) }; S.view = null; A.draw(); window.scrollTo(0, 0); },
    CE_formCancel: () => { S.draft = null; A.draw(); },
    CE_save: save,
    CE_refresh: () => { S.at = 0; load(true); },
    CE_f: (k: string, v: string) => { S[k] = v; A.draw(); },
    CE_open: (id: string) => { S.view = id; S.old = false; S.draft = null; A.draw(); window.scrollTo(0, 0); },
    CE_openOld: (id: string) => { S.view = id; S.old = true; A.draw(); window.scrollTo(0, 0); },
    CE_back: () => { S.view = null; S.old = false; A.draw(); },
    CE_cancelEx: async (id: string) => {
      const e = byId(id); if (!e) return; const to = e.status === 'cancelled' ? 'scheduled' : 'cancelled';
      if (to === 'cancelled' && !confirm(`آزمون «${ceTitle(e)}» (${e.cls}) لغو شود؟\nدانش‌آموزان آن را با برچسب «لغو شد» می‌بینند.`)) return;
      const { error } = await sb.from('class_exams').update({ status: to, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) { A.toast('انجام نشد: ' + errText(error)); return; } e.status = to; A.draw(); A.toast(to === 'cancelled' ? 'آزمون لغو شد' : 'آزمون دوباره فعال شد');
    },
    CE_del: async (id: string) => {
      const e = byId(id); if (!e || !confirm(`آزمون «${ceTitle(e)}» (${e.cls}) حذف شود؟`)) return;
      const s = linkOf(id), has = !!s && (Object.keys(s.sc || {}).length + Object.keys(s.sa || {}).length > 0);
      let drop = !!s; if (has) drop = confirm('برای این آزمون نمره ثبت شده است.\n\nتأیید = نمره‌ها هم حذف شوند\nانصراف = نمره‌ها به‌صورت «آزمون قدیمی» بمانند');
      const { error } = await sb.from('class_exams').delete().eq('id', id); if (error) { A.toast('حذف نشد: ' + errText(error)); return; }
      if (s) { if (drop) sch().exams = sch().exams.filter((x: any) => x !== s); else delete s.ce; A.save(); }
      S.rows = S.rows.filter((x: CExam) => x.id !== id); A.draw(); A.toast('آزمون حذف شد');
    },
    CE_sc: (id: string, sid: string, v: string) => {
      const s = linkOf(id); if (!s) return; const L = s.lessons[0], t = v.trim(), x = num(v);
      if (t !== '' && (!Number.isFinite(x) || x < 0 || x > L.max)) { A.toast(`نمره باید بین ۰ و ${n(L.max)} باشد`); paint(s, sid); return; }
      setScore(s, sid, t === '' ? null : x); A.save(); paint(s, sid);
    },
    CE_ab: (id: string, sid: string, on: boolean) => {
      const s = linkOf(id); if (!s) return; s.sa = s.sa || {}; const L = s.lessons[0];
      if (on) { s.sa[sid] = true; if (s.sc[sid]) { delete s.sc[sid][L.name]; if (!Object.keys(s.sc[sid]).length) delete s.sc[sid]; } } else delete s.sa[sid];
      A.save(); paint(s, sid); if (!on) (document.getElementById('cexi_' + sid) as HTMLInputElement | null)?.focus();
    },
    CE_key: (ev: KeyboardEvent) => {
      if (ev.key !== 'Enter') return; ev.preventDefault();
      const all = [...document.querySelectorAll('input.cexm-in:not(:disabled)')] as HTMLInputElement[], i = all.indexOf(ev.target as HTMLInputElement);
      (ev.target as HTMLInputElement).blur(); const nx = all[i + 1]; if (nx) { nx.focus(); nx.select(); }
    },
    CE_max: (id: string, v: string) => {
      const s = linkOf(id), e = byId(id); if (!s || !e) return; const L = s.lessons[0], x = num(v), top = Math.max(0, ...Object.values(s.sc).map((o: any) => o[L.name] ?? 0));
      if (!Number.isFinite(x) || x <= 0 || x > 100) { A.toast('سقف نمره معتبر نیست'); A.draw(); return; }
      if (x < top) { A.toast(`نمره‌ی ${r2(top)} از سقف جدید بیشتر است؛ اول آن را ویرایش کنید`); A.draw(); return; }
      L.max = x; e.max_score = x; A.save(); sb.from('class_exams').update({ max_score: x }).eq('id', id).then(() => undefined); A.draw();
    },
    CE_rel: (id: string) => {
      const s = linkOf(id); if (!s) return;
      if (released(s)) { s.hold = true; A.save(); A.draw(); A.toast('نمره‌ها از پنل دانش‌آموزان برداشته می‌شود'); return; }
      const st = stat(s); if (!st.done && !st.ab) { A.toast('اول نمره‌ها را وارد کنید'); return; }
      if (st.left && !confirm(`${n(st.left)} نفر هنوز نه نمره دارند و نه «غایب» ثبت شده‌اند.\nنمره‌ی بقیه منتشر شود؟`)) return;
      s.hold = false; A.save(); A.draw(); A.toast('نمره‌ها منتشر شد؛ چند ثانیه‌ی دیگر در پنل دانش‌آموزان دیده می‌شود ✓');
    },
    CE_bulk: (id: string) => {
      const s = linkOf(id); if (!s) return; const L = s.lessons[0], ss = mates(s), rows = val('cexm_bulk').split(/\r?\n/).map((x) => x.trim()).filter(Boolean), ch: { sid: string; v: number | null }[] = [];
      if (!rows.length) { A.toast('نمره‌ها را وارد کنید'); return; }
      for (const row of rows) {
        const at = Math.max(row.lastIndexOf('\t'), row.lastIndexOf('،'), row.lastIndexOf(',')); if (at < 0) { A.toast('هر خط باید «شماره یا نام، نمره» باشد: ' + row); return; }
        const who = row.slice(0, at).trim(), t = row.slice(at + 1).trim(), k = num(who), stu = ss.find((x: any) => String(x.num) === String(k)) || ss.find((x: any) => x.name === who);
        const abs = /^(غ|غایب)$/.test(t), x = num(t);
        if (!stu || !t || (!abs && (!Number.isFinite(x) || x < 0 || x > L.max)) || ch.some((c) => c.sid === stu.id)) { A.toast('ردیف نامعتبر یا تکراری: ' + row); return; }
        ch.push({ sid: stu.id, v: abs ? null : x });
      }
      s.sa = s.sa || {};
      ch.forEach((c) => { if (c.v == null) { s.sa[c.sid] = true; if (s.sc[c.sid]) delete s.sc[c.sid]; } else setScore(s, c.sid, c.v); });
      A.save(); A.draw(); A.toast(`${n(ch.length)} مورد ثبت شد`);
    },
    CE_csv: (id: string) => {
      const s = linkOf(id); if (!s) return; const L = s.lessons[0];
      A.dlf(`${s.title}.csv`, [['شماره', 'نام', 'کلاس', `نمره (از ${L.max})`, 'وضعیت'], ...mates(s).map((x: any) => [x.num, x.name, x.cls, s.sc[x.id]?.[L.name] ?? '', s.sa?.[x.id] ? 'غایب' : s.sc[x.id]?.[L.name] != null ? 'ثبت شده' : 'ثبت نشده'])]);
    },
  };
  ceInit(window as any, { list: () => S.rows, store: (d) => { if (S.draft) S.draft.d = d; }, admin: true });
  void CE_KINDS; void ceDay; void fa;
  return { page, h, load };
}
