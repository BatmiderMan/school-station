// برنامه‌ی آزمون‌ها: تشریحی مدرسه، ماز، قلم‌چی و ... (نمایش مشترک پنل مدیر و دانش‌آموز + ویرایش مدیر)
import { j2iso, daysLeft } from './ui';

export const KINDS: Record<string, { t: string; c: string; i: string }> = {
  sch: { t: 'آزمون تشریحی مدرسه', c: '#0891b2', i: '📝' },
  maz: { t: 'آزمون ماز', c: '#6366f1', i: '🎯' },
  qal: { t: 'آزمون قلم‌چی', c: '#f59e0b', i: '📊' },
  oth: { t: 'سایر', c: '#64748b', i: '📌' },
};
export interface PEx { id: string; kind: string; stage: string; title?: string; date?: string; dateText?: string; approx?: string; final?: boolean; groups: { s: string; t: string }[]; note?: string }
export interface Plan { v: number; exams: PEx[]; notes: string[] }

// برنامه‌ی تشریحی مدرسه (از فایل «آزمون تشریحی») به‌عنوان مقدار اولیه
export function seedPlan(): Plan {
  const g = (s: string, t: string) => ({ s, t });
  return {
    v: 1,
    exams: [
      { id: 'sch1', kind: 'sch', stage: 'اول', date: '1405/08/21', groups: [g('دین و زندگی', 'درس ۱ تا ۳'), g('زبان انگلیسی', 'فصل ۱'), g('هویت اجتماعی', 'درس ۱ تا ۳')] },
      { id: 'sch2', kind: 'sch', stage: 'دوم', date: '1405/09/19', groups: [g('عربی', 'درس ۲'), g('فارسی', 'درس ۱ تا ۵'), g('سلامت و بهداشت', 'درس ۱ تا ۵')] },
      { id: 'sch3', kind: 'sch', stage: 'سوم', date: '1405/11/15', groups: [g('دین و زندگی', 'درس ۴ تا ۶'), g('زبان انگلیسی', 'فصل ۲'), g('هویت اجتماعی', 'درس ۵ تا ۷')] },
      { id: 'sch4', kind: 'sch', stage: 'چهارم', date: '1405/12/13', groups: [g('عربی', 'درس ۲ و نصف ۳ تا آخر صفحه ۵۱'), g('فارسی', 'درس ۶ تا ۱۱'), g('سلامت و بهداشت', 'درس ۹ تا ۱۱')] },
      { id: 'sch5', kind: 'sch', stage: 'پنجم', date: '1406/01/26', groups: [g('دین و زندگی', 'درس ۷ تا ۱۰'), g('زبان انگلیسی', 'فصل ۳'), g('هویت اجتماعی', 'درس ۸ تا ۱۰')] },
      { id: 'sch6', kind: 'sch', stage: 'ششم', date: '1406/02/23', groups: [g('عربی', 'از صفحه ۵۱ تا آخر کتاب (نصف ۳ و درس ۴)'), g('فارسی', 'درس ۱۲ تا ۱۸'), g('سلامت و بهداشت', 'درس ۱۲ تا ۱۴')] },
      { id: 'sch7', kind: 'sch', stage: 'هفتم (جامع)', dateText: 'خرداد ماه', approx: '1406/03/15', final: true, groups: [g('کلیه دروس عمومی', 'ارزیابی جامع و شبیه‌سازی نهایی از کل کتاب‌ها')] },
    ],
    notes: [
      'درس ۴ و ۱۵ ادبیات (دروس آزاد) می‌باشند؛ لذا برنامه‌ریزی و مطالعه‌ی آن‌ها طبق نظر و تدریس دبیر محترم صورت پذیرد.',
      'در دی‌ماه به دلیل برگزاری امتحانات نوبت اول مدارس، آزمون تشریحی برگزار نخواهد شد تا دانش‌آموزان فرصت کافی جهت آمادگی امتحانات را داشته باشند.',
    ],
  };
}

export const exIso = (e: PEx): string => j2iso(e.date || '') || j2iso(e.approx || '') || '';
const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
export const sorted = (P: Plan | null | undefined) => [...(P?.exams || [])].sort((a, b) => (exIso(a) || '9') < (exIso(b) || '9') ? -1 : 1);
export const nextExam = (P: Plan | null | undefined, kind = 'all') => sorted(P).filter((e) => kind === 'all' || e.kind === kind).find((e) => { const i = exIso(e); return i && daysLeft(i) >= 0; }) || null;
export const exTitle = (e: PEx) => e.title || `${KINDS[e.kind]?.t || 'آزمون'}${e.stage ? ' — مرحله‌ی ' + e.stage : ''}`;
export const exDateLabel = (e: PEx) => { const i = exIso(e); if (e.date && i) return new Date(i + 'T12:00:00').toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }); return e.dateText || ''; };
export const exLeft = (e: PEx, n: (v: any) => string) => { const i = exIso(e); if (!i) return ''; const d = daysLeft(i), ap = !e.date ? 'حدود ' : ''; return d < 0 ? 'برگزار شد' : d === 0 ? 'امروز' : d === 1 ? 'فردا' : `${ap}${n(d)} روز دیگر`; };

export interface PView { kind: string; admin?: boolean; setKind: string; esc: (s: any) => string; n: (v: any) => string }
// نمای کامل: قهرمان (آزمون بعدی)، ریل مراحل، فیلتر نوع، تایم‌لاین کارت‌ها، توضیحات مهم
export function planView(P: Plan | null | undefined, o: PView): string {
  const { esc, n } = o;
  if (!P || !P.exams.length) return `<div class="c m" style="text-align:center;padding:30px">📅 هنوز برنامه‌ی آزمونی ثبت نشده است.</div>`;
  const all = sorted(P), kinds = [...new Set(all.map((e) => e.kind))], list = all.filter((e) => o.kind === 'all' || e.kind === o.kind);
  const nx = nextExam(P, o.kind), pastN = list.filter((e) => { const i = exIso(e); return i && daysLeft(i) < 0; }).length;
  const st = (e: PEx) => { const i = exIso(e); if (!i) return 'soon'; const d = daysLeft(i); return d < 0 ? 'past' : nx && nx.id === e.id ? 'next' : 'soon'; };
  const dnum = (e: PEx) => { const i = exIso(e); return e.date && i ? new Date(i + 'T12:00:00').toLocaleDateString('fa-IR', { day: 'numeric' }) : '؟'; };
  const mon = (e: PEx) => { const i = exIso(e); return e.date && i ? new Date(i + 'T12:00:00').toLocaleDateString('fa-IR', { month: 'long' }) : (e.dateText || ''); };
  const wkd = (e: PEx) => { const i = exIso(e); return e.date && i ? new Date(i + 'T12:00:00').toLocaleDateString('fa-IR', { weekday: 'long' }) : ''; };
  const chips = (e: PEx, lim = 99) => e.groups.slice(0, lim).map((g) => `<span class="plsub" style="--h:${hue(g.s)}">${esc(g.s)}</span>`).join('');
  const kc = (k: string) => KINDS[k]?.c || '#64748b';
  const hero = nx ? (() => { const d = daysLeft(exIso(nx)), K = KINDS[nx.kind] || KINDS.oth;
    return `<div class="plhero"><div class="plhl"><small>${K.i} آزمون پیش‌رو</small><h2>${esc(exTitle(nx))}</h2><div class="plhd">📅 ${esc(exDateLabel(nx))}</div><div class="plhc">${chips(nx)}</div></div>
      <div class="plcount"><b>${d === 0 ? 'امروز' : n(d)}</b><span>${d === 0 ? 'روز آزمون' : nx.date ? 'روز دیگر' : 'روز (تقریبی)'}</span></div></div>`; })()
    : `<div class="plhero"><div class="plhl"><small>برنامه‌ی آزمون‌ها</small><h2>آزمونِ پیش‌رویی ثبت نشده</h2><div class="plhd">همه‌ی آزمون‌های ثبت‌شده برگزار شده‌اند.</div></div></div>`;
  const prog = `<div class="plprog"><div><b>${n(pastN)}</b> از <b>${n(list.length)}</b> آزمون برگزار شده</div><div class="plbar"><i style="width:${list.length ? (pastN / list.length) * 100 : 0}%"></i></div></div>`;
  const rail = `<div class="plrail">${list.map((e, i) => `<button class="plrl ${st(e)}" style="--kc:${kc(e.kind)}" onclick="plGo('${e.id}')"><i>${st(e) === 'past' ? '✓' : n(i + 1)}</i><b>${esc(e.stage || '')}</b><small>${esc(dnum(e) === '؟' ? mon(e) : dnum(e) + ' ' + mon(e))}</small></button>`).join('')}</div>`;
  const filt = kinds.length > 1 ? `<div class="seg"><button class="${o.kind === 'all' ? 'on' : ''}" onclick="${o.setKind}('all')">همه</button>${kinds.map((k) => `<button class="${o.kind === k ? 'on' : ''}" onclick="${o.setKind}('${k}')">${KINDS[k]?.i || ''} ${esc(KINDS[k]?.t || k)}</button>`).join('')}</div>` : '';
  const cards = list.map((e) => { const s = st(e), K = KINDS[e.kind] || KINDS.oth;
    return `<div class="plc ${s} ${e.final ? 'fin' : ''}" id="pl_${e.id}" style="--kc:${K.c}"><div class="plnode">${s === 'past' ? '✓' : e.final ? '🏁' : esc((e.stage || '').slice(0, 3))}</div>
      ${s === 'next' ? '<div class="plrib">آزمون بعدی</div>' : ''}
      <div class="plch"><div class="pldate"><b>${esc(dnum(e))}</b><span>${esc(mon(e))}</span><small>${esc(wkd(e))}</small></div>
        <div class="plmeta"><div class="plk">${K.i} ${esc(K.t)}${e.final ? ' · جامع' : ''}</div><h3>${esc(exTitle(e))}</h3><div class="plst ${s}">${esc(exLeft(e, n))}</div></div>
        ${o.admin ? `<div class="plad"><button class="btn" onclick="PL_edit('${e.id}')">✎ ویرایش</button></div>` : ''}</div>
      <div class="plgs">${e.groups.map((g) => `<div class="plg"><span class="plsub" style="--h:${hue(g.s)}">${esc(g.s)}</span><span class="plsc">${esc(g.t)}</span></div>`).join('')}</div>
      ${e.note ? `<div class="plnote">💬 ${esc(e.note)}</div>` : ''}</div>`; }).join('');
  const notes = P.notes?.length ? `<div class="plnotes"><h3>📌 توضیحات و نکات مهم</h3><ol>${P.notes.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></div>` : '';
  return `${hero}${prog}${rail}${filt}<div class="pltl">${cards || '<div class="c m">برای این نوع آزمونی ثبت نشده.</div>'}</div>${notes}`;
}

// ویرایشگر مدیر
export function mkPlanAdmin(A: any) {
  const esc = A.esc, U = A.U, val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
  const P = (): Plan => (A.D.plan = A.D.plan || seedPlan());
  const draft = () => (U.PLd as PEx | undefined);
  const latin = (s: string) => s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const form = () => { const d = draft(); if (!d) return '';
    return `<div class="c plform"><h3>${U.PLe === 'new' ? '＋ آزمون جدید' : '✎ ویرایش آزمون'}</h3>
      <div class="tb"><span class="m">نوع آزمون:</span><div class="seg" style="margin:0">${Object.keys(KINDS).map((k) => `<button class="${d.kind === k ? 'on' : ''}" onclick="PL_set('kind','${k}')">${KINDS[k].i} ${KINDS[k].t}</button>`).join('')}</div></div>
      <div class="tb"><input id="pl_stage" value="${esc(d.stage)}" placeholder="مرحله / شماره (مثلاً اول یا آزمون ۳)" style="flex:1;min-width:180px"><input id="pl_title" value="${esc(d.title || '')}" placeholder="عنوان (اختیاری؛ خودکار ساخته می‌شود)" style="flex:2;min-width:200px"></div>
      <div class="tb"><input id="pl_date" dir="ltr" value="${esc(d.date || '')}" placeholder="تاریخ شمسی: 1405/08/21" style="width:170px"><span class="m">یا</span><input id="pl_dt" value="${esc(d.dateText || '')}" placeholder="فقط ماه (مثلاً خرداد ماه)" style="width:190px"><input id="pl_ap" dir="ltr" value="${esc(d.approx || '')}" placeholder="تاریخ تقریبی برای مرتب‌سازی" style="width:190px"><label class="m"><input type="checkbox" id="pl_fin" ${d.final ? 'checked' : ''}> آزمون جامع</label></div>
      <b class="m">دروس و مباحث:</b>
      ${d.groups.map((g, i) => `<div class="tb" style="margin:4px 0"><input class="pl_s" value="${esc(g.s)}" placeholder="درس (مثلاً فارسی)" style="flex:1;min-width:150px"><input class="pl_t" value="${esc(g.t)}" placeholder="محدوده (مثلاً درس ۱ تا ۵)" style="flex:2;min-width:180px"><button class="btn" onclick="PL_rm(${i})">✕</button></div>`).join('')}
      <div class="tb"><button class="btn" onclick="PL_add()">＋ درس دیگر</button></div>
      <textarea id="pl_note" placeholder="توضیح اضافه برای این آزمون (اختیاری)" style="width:100%;min-height:54px">${esc(d.note || '')}</textarea>
      <div class="tb" style="margin:8px 0 0"><button class="btn p" onclick="PL_save()">ذخیره</button><button class="btn" onclick="PL_cancel()">انصراف</button>${U.PLe !== 'new' ? '<span style="flex:1"></span><button class="btn" style="color:var(--bad)" onclick="PL_del()">حذف این آزمون</button>' : ''}</div></div>`; };
  function page() {
    const p = P(), k = U.plk || 'all';
    return `<div class="tb"><button class="btn p" onclick="PL_new()">＋ آزمون جدید</button><span class="m">این برنامه خودکار در پنل دانش‌آموزان نمایش داده می‌شود؛ آزمون‌های ماز و قلم‌چی را هم همین‌جا اضافه کنید.</span></div>${form()}${planView(p, { kind: k, admin: true, setKind: 'PL_kind', esc, n: A.n })}
      <div class="c" style="margin-top:14px"><h3>📌 توضیحات و نکات مهم (هر خط یک مورد)</h3><textarea id="pl_notes" style="width:100%;min-height:110px">${esc(p.notes.join('\n'))}</textarea><div class="tb" style="margin:8px 0 0"><button class="btn p" onclick="PL_notes()">ذخیره‌ی توضیحات</button></div></div>`;
  }
  const readForm = () => { const d = draft(); if (!d) return; d.stage = val('pl_stage').trim(); d.title = val('pl_title').trim(); d.date = latin(val('pl_date')).trim(); d.dateText = val('pl_dt').trim(); d.approx = latin(val('pl_ap')).trim(); d.final = (document.getElementById('pl_fin') as HTMLInputElement | null)?.checked || false; d.note = val('pl_note').trim();
    const ss = [...document.querySelectorAll('.pl_s')] as HTMLInputElement[], ts = [...document.querySelectorAll('.pl_t')] as HTMLInputElement[]; d.groups = ss.map((x, i) => ({ s: x.value.trim(), t: (ts[i]?.value || '').trim() })); };
  const h = {
    PL_new: () => { U.PLe = 'new'; U.PLd = { id: 'p' + Date.now().toString(36), kind: U.plk && U.plk !== 'all' ? U.plk : 'maz', stage: '', groups: [{ s: '', t: '' }] }; A.draw(); },
    PL_edit: (id: string) => { const e = P().exams.find((x) => x.id === id); if (!e) return; U.PLe = id; U.PLd = JSON.parse(JSON.stringify(e)); A.draw(); window.scrollTo(0, 0); },
    PL_cancel: () => { U.PLe = null; U.PLd = null; A.draw(); },
    PL_set: (k: string, v: string) => { readForm(); (draft() as any)[k] = v; A.draw(); },
    PL_add: () => { readForm(); draft()!.groups.push({ s: '', t: '' }); A.draw(); },
    PL_rm: (i: number) => { readForm(); draft()!.groups.splice(i, 1); if (!draft()!.groups.length) draft()!.groups.push({ s: '', t: '' }); A.draw(); },
    PL_save: () => {
      readForm(); const d = draft()!; d.groups = d.groups.filter((g) => g.s || g.t);
      if (!d.stage && !d.title) { A.toast('مرحله یا عنوان را بنویسید'); return; }
      if (d.date && !j2iso(d.date)) { A.toast('تاریخ را به شکل ۱۴۰۵/۰۸/۲۱ بنویسید'); return; }
      if (!d.date && !d.dateText) { A.toast('تاریخ یا ماه آزمون را بنویسید'); return; }
      if (!d.groups.length) { A.toast('حداقل یک درس بنویسید'); return; }
      const p = P(), i = p.exams.findIndex((x) => x.id === d.id); if (i >= 0) p.exams[i] = d; else p.exams.push(d);
      U.PLe = null; U.PLd = null; A.save(); A.draw(); A.toast('ذخیره شد ✓');
    },
    PL_del: () => { const d = draft(); if (!d || !confirm('این آزمون از برنامه حذف شود؟')) return; const p = P(); p.exams = p.exams.filter((x) => x.id !== d.id); U.PLe = null; U.PLd = null; A.save(); A.draw(); },
    PL_notes: () => { P().notes = val('pl_notes').split('\n').map((x) => x.trim()).filter(Boolean); A.save(); A.toast('ذخیره شد ✓'); },
    PL_kind: (k: string) => { U.plk = k; A.draw(); },
    plGo: (id: string) => { document.getElementById('pl_' + id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
  };
  return { page, h, ensure: P };
}
