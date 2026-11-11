// آزمون‌های کلاسی — بخش مشترکِ پنل مدیر، نماینده‌ی کلاس و دانش‌آموز:
// نوع‌ها، تاریخ/ساعت، «کارت آزمون» (همان چیزی که دانش‌آموز می‌بیند)، فرم ثبت (با پیش‌نمایش زنده) و اعتبارسنجی.
import { j2iso, iso2j, daysLeft, isoToday } from './ui';

export interface CExam {
  id: string; cls: string; subject: string; kind: string; title: string;
  exam_date: string;            // میلادی yyyy-mm-dd
  start_time: string | null;    // 'HH:MM'
  period: number | null;        // زنگ
  duration: number | null;      // دقیقه
  place: string; topics: string; resources: string; note: string;
  max_score: number; status: 'scheduled' | 'cancelled';
  by_role: 'admin' | 'rep'; by_name: string; created_at?: string; updated_at?: string;
}
export interface CDraft {
  id: string; cls: string; classes: string[]; subject: string; kind: string; title: string; exam_date: string; start_time: string;
  period: number | null; duration: number | null; place: string; topics: string; resources: string; note: string; max_score: number;
}
export interface CRes { s: number | null; max: number; c: number | null; ab?: boolean }

export const CE_KINDS: Record<string, { t: string; i: string; c: string; hint: string }> = {
  quiz: { t: 'کوییز', i: '⚡', c: '#f59e0b', hint: 'کوتاه و سریع' },
  class: { t: 'آزمون کلاسی', i: '📝', c: '#0891b2', hint: 'یک یا چند فصل' },
  mid: { t: 'میان‌ترم', i: '📚', c: '#6366f1', hint: 'نیمی از کتاب' },
  final: { t: 'پایان‌ترم', i: '🏁', c: '#e11d48', hint: 'جامع' },
  other: { t: 'سایر', i: '📌', c: '#64748b', hint: 'شفاهی، ارائه، …' },
};
export const CE_SUBJECTS = ['ریاضی', 'حسابان', 'هندسه', 'گسسته', 'آمار و احتمال', 'فیزیک', 'شیمی', 'زیست', 'زمین شناسی', 'ادبیات', 'فارسی', 'عربی', 'دین و زندگی', 'زبان', 'هویت اجتماعی', 'سلامت و بهداشت'];
const SCHOOL_DAYS = [6, 0, 2, 3]; // شنبه، یکشنبه، سه‌شنبه، چهارشنبه (Date.getDay)

/* ---------- ابزارهای کوچک ---------- */
export const ceEsc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
export const fa = (v: any) => String(v ?? '').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
const latin = (t: string) => t.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const num = (v: any, d = 2) => (v == null || isNaN(v) ? '—' : (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('fa-IR'));
const nl = (s: string) => ceEsc(s).replace(/\n/g, '<br>');
export const ceTitle = (e: { title?: string; kind: string; subject: string }) => (e.title || '').trim() || `${(CE_KINDS[e.kind] || CE_KINDS.other).t} ${e.subject}`;
export const ceDay = (iso: string, o: any = { weekday: 'long', day: 'numeric', month: 'long' }) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fa-IR', o) : '');
const hm = (t: string | null) => (t && /^\d{2}:\d{2}$/.test(t) ? t : '');
function addMin(t: string, m: number) { const [h, mi] = t.split(':').map(Number), x = h * 60 + mi + m; return `${String(Math.floor(x / 60) % 24).padStart(2, '0')}:${String(x % 60).padStart(2, '0')}`; }
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

export type CPhase = 'cancel' | 'today' | 'soon' | 'past';
/** در چه وضعیتی است؟ لغو شده / امروز / پیش‌رو / برگزار شده (امروز هم بعد از پایان ساعتِ آزمون «برگزار شده» حساب می‌شود) */
export function cePhase(e: CExam): CPhase {
  if (e.status === 'cancelled') return 'cancel';
  if (!e.exam_date) return 'soon';
  const d = daysLeft(e.exam_date);
  if (d < 0) return 'past';
  if (d === 0) { const t = hm(e.start_time); if (t) { const [h, m] = t.split(':').map(Number); if (nowMin() >= h * 60 + m + (e.duration || 45) + 10) return 'past'; } return 'today'; }
  return 'soon';
}
export function ceLeft(e: CExam): string {
  if (!e.exam_date) return 'پیش‌نمایش';
  const p = cePhase(e); if (p === 'cancel') return 'لغو شد'; if (p === 'past') return 'برگزار شد';
  const d = daysLeft(e.exam_date); return d === 0 ? 'امروز' : d === 1 ? 'فردا' : d === 2 ? 'پس‌فردا' : `${fa(d)} روز دیگر`;
}
/** «زنگ ۳ · ۱۰:۰۰ تا ۱۰:۴۵» */
export function ceTimeLabel(e: { start_time: string | null; period: number | null; duration: number | null }): string {
  const t = hm(e.start_time), out: string[] = [];
  if (e.period) out.push(`زنگ ${fa(e.period)}`);
  if (t) out.push(e.duration ? `${fa(t)} تا ${fa(addMin(t, e.duration))}` : `ساعت ${fa(t)}`);
  return out.join(' · ');
}
export const ceSort = (a: CExam, b: CExam) => (a.exam_date + (a.start_time || '99:99') + a.subject < b.exam_date + (b.start_time || '99:99') + b.subject ? -1 : 1);

/* ---------- کارت آزمون (نمای دانش‌آموز / پیش‌نمایش / فهرست مدیر) ---------- */
export interface CardOpts { preview?: boolean; res?: CRes | null; actions?: string; extra?: string; showCls?: boolean; who?: boolean }
export function ceCard(e: CExam, o: CardOpts = {}): string {
  const K = CE_KINDS[e.kind] || CE_KINDS.other, ph = cePhase(e), dt = e.exam_date ? new Date(e.exam_date + 'T12:00:00') : null;
  const dn = dt ? dt.toLocaleDateString('fa-IR', { day: 'numeric' }) : '؟', mn = dt ? dt.toLocaleDateString('fa-IR', { month: 'long' }) : 'تاریخ', wd = dt ? dt.toLocaleDateString('fa-IR', { weekday: 'long' }) : 'انتخاب نشده';
  const when = ceTimeLabel(e);
  const item = (i: string, t: string, v: string, wide = false) => (v ? `<div class="cex-i${wide ? ' wd' : ''}"><dt>${i} ${t}</dt><dd>${v}</dd></div>` : '');
  const ghost = (s: string) => `<span class="m">${s}</span>`;
  const custom = (e.title || '').trim() ? `<div class="cex-sub">${ceEsc(e.title)}</div>` : '';
  const r = o.res; const n1 = (v: any) => num(v, 2);
  const res = !r ? '' : r.ab ? `<div class="cex-res ab">🚫 در این آزمون غایب بودید</div>`
    : r.s == null ? '' : `<div class="cex-res"><span>نمره‌ی شما</span><b>${n1(r.s)}</b><span>از ${fa(r.max)}</span>${r.c != null ? `<em>میانگین کلاس: ${n1(r.c)}</em>` : ''}</div>`;
  const who = o.who ? `<div class="cex-who">${e.by_role === 'rep' ? `ثبت‌شده توسط نماینده‌ی کلاس${e.by_name ? ' (' + ceEsc(e.by_name) + ')' : ''}` : 'ثبت‌شده توسط مدیریت'}</div>` : '';
  const warn = ph === 'cancel' ? `<div class="cex-cancel">این آزمون لغو شده است؛ مگر اینکه تاریخ جدیدی اعلام شود.</div>` : '';
  return `<div class="cex ${ph}${o.preview ? ' pv' : ''}" style="--kc:${K.c}" ${e.id ? `id="cex_${e.id}"` : ''}>
    <div class="cex-date"><b>${dn}</b><span>${mn}</span><small>${wd}</small></div>
    <div class="cex-main">
      <div class="cex-top"><span class="cex-kind">${K.i} ${K.t}</span>${o.showCls ? `<span class="tag">${ceEsc(e.cls)}</span>` : ''}<span class="cex-st ${ph}">${ceLeft(e)}</span></div>
      <h3>${ceEsc(e.subject)}</h3>${custom}${warn}
      <dl class="cex-info">
        ${item('🕘', 'زمان', when ? ceEsc(when) : (o.preview ? ghost('ساعت را مشخص کنید') : ghost('ساعت دقیق را معلم اعلام می‌کند')))}
        ${item('⏱', 'مدت', e.duration ? `${fa(e.duration)} دقیقه` : '')}
        ${item('📍', 'مکان', ceEsc(e.place))}
        ${item('🎯', 'سقف نمره', e.max_score && e.max_score !== 20 ? fa(e.max_score) : '')}
        ${item('📖', 'مباحث', e.topics ? nl(e.topics) : (o.preview ? ghost('مباحثی که باید بخوانند را بنویسید') : ''), true)}
        ${item('📚', 'منبع', ceEsc(e.resources), true)}
        ${item('💬', 'توضیح', nl(e.note), true)}
      </dl>
      ${res}${o.extra || ''}${who}${o.actions ? `<div class="cex-act">${o.actions}</div>` : ''}
    </div></div>`;
}
/** کارت درشتِ «آزمون بعدی» با شمارش معکوس — هم‌سبک «نقشه‌ی راه» */
export function ceHero(e: CExam): string {
  const K = CE_KINDS[e.kind] || CE_KINDS.other, d = daysLeft(e.exam_date), when = ceTimeLabel(e);
  return `<div class="plhero"><div class="plhl"><small>${K.i} آزمون بعدیِ کلاس</small><h2>${ceEsc(e.subject)} — ${K.t}</h2>
    <div class="plhd">📅 ${ceDay(e.exam_date)}${when ? ' · ' + ceEsc(when) : ''}</div>${e.topics ? `<div class="plhc"><span class="plsub" style="--h:190">📖 ${ceEsc(e.topics.length > 90 ? e.topics.slice(0, 90) + '…' : e.topics)}</span></div>` : ''}</div>
    <div class="plcount"><b>${d === 0 ? 'امروز' : fa(d)}</b><span>${d === 0 ? 'روز آزمون' : 'روز دیگر'}</span></div></div>`;
}

/* ---------- فرم ثبت/ویرایش ---------- */
export interface CFormOpts { admin: boolean; classes: string[]; fixedCls?: string; editing: boolean; subjects?: string[]; needTopics: boolean }
export const ceDraftNew = (cls = '', classes: string[] = []): CDraft => ({ id: '', cls, classes: classes.length ? classes : cls ? [cls] : [], subject: '', kind: 'class', title: '', exam_date: '', start_time: '', period: null, duration: 45, place: '', topics: '', resources: '', note: '', max_score: 20 });
export const ceDraftOf = (e: CExam): CDraft => ({ id: e.id, cls: e.cls, classes: [e.cls], subject: e.subject, kind: e.kind, title: e.title, exam_date: e.exam_date, start_time: hm(e.start_time), period: e.period, duration: e.duration, place: e.place, topics: e.topics, resources: e.resources, note: e.note, max_score: Number(e.max_score) || 20 });
export const ceFromDraft = (d: CDraft, admin: boolean): CExam => ({
  id: d.id, cls: d.cls || d.classes[0] || '', subject: d.subject.trim() || 'نام درس', kind: d.kind, title: d.title, exam_date: d.exam_date || '', start_time: d.start_time || null, period: d.period, duration: d.duration,
  place: d.place, topics: d.topics, resources: d.resources, note: d.note, max_score: d.max_score || 20, status: 'scheduled', by_role: admin ? 'admin' : 'rep', by_name: '',
});

export function ceForm(d: CDraft, o: CFormOpts): string {
  const sec = (k: string, t: string, s: string, body: string) => `<section class="cexf-s"><div class="cexf-h"><i>${k}</i><div><b>${t}</b><small>${s}</small></div></div>${body}</section>`;
  const fld = (label: string, inner: string, req = false, hint = '') => `<label class="cexf-f"><span>${label}${req ? ' <em>*</em>' : ''}</span>${inner}${hint ? `<small>${hint}</small>` : ''}</label>`;
  const subs = [...new Set([...(o.subjects || []), ...CE_SUBJECTS])];
  const clsPicker = o.fixedCls ? `<div class="cexf-cls"><span class="tag">👥 ${ceEsc(o.fixedCls)}</span><small>این آزمون برای همین کلاس ثبت می‌شود.</small></div>`
    : o.editing ? `<div class="cexf-cls"><span class="tag">👥 ${ceEsc(d.cls)}</span></div>`
      : `<div class="cexf-f"><span>برای کدام کلاس‌ها؟ <em>*</em></span><div class="cexf-chips">${o.classes.map((c) => `<label class="cexf-chip"><input type="checkbox" class="ce_cls_cb" value="${ceEsc(c)}" ${d.classes.includes(c) ? 'checked' : ''}><span>${ceEsc(c)}</span></label>`).join('')}</div><small>می‌توانید چند کلاس را یک‌جا انتخاب کنید؛ برای هر کلاس یک آزمون جدا ساخته می‌شود.</small></div>`;
  const kinds = `<div class="cexf-f"><span>نوع آزمون</span><div class="cexf-chips">${Object.entries(CE_KINDS).map(([k, K]) => `<label class="cexf-chip kd" style="--kc:${K.c}"><input type="radio" name="ce_kind" value="${k}" ${d.kind === k ? 'checked' : ''}><span>${K.i} ${K.t}<small>${K.hint}</small></span></label>`).join('')}</div></div>`;
  const durChips = [15, 30, 45, 60, 90].map((m) => `<button type="button" class="cexf-q" onclick="CE_dur(${m})">${fa(m)}</button>`).join('');
  const jp = `openJP('ce_date',{${o.admin ? 'min:false,' : ''}cb:()=>CE_prev()})`;
  const form = `<div class="cexf" id="ce_form" oninput="CE_prev()" onchange="CE_prev()"><input type="hidden" id="ce_id" value="${ceEsc(d.id)}">
    ${sec('۱', 'چه آزمونی؟', 'کلاس، نوع و درس', `${clsPicker}${kinds}
      ${fld('درس', `<input id="ce_subj" list="ce_subjs" maxlength="60" value="${ceEsc(d.subject)}" placeholder="مثلاً فیزیک" autocomplete="off"><datalist id="ce_subjs">${subs.map((x) => `<option value="${ceEsc(x)}">`).join('')}</datalist>`, true)}
      ${fld('عنوان (اختیاری)', `<input id="ce_title" maxlength="80" value="${ceEsc(d.title)}" placeholder="مثلاً: فصل ۲ — حرکت‌شناسی">`)}`)}
    ${sec('۲', 'کِی و کجا؟', 'تاریخ و زمان برگزاری', `<div class="cexf-row">
      ${fld('تاریخ', `<input id="ce_date" class="dp" readonly dir="ltr" placeholder="📅 انتخاب تاریخ" value="${d.exam_date ? iso2j(d.exam_date) : ''}" onclick="${jp}">`, true)}
      ${fld('ساعت شروع', `<input id="ce_time" type="time" dir="ltr" value="${ceEsc(d.start_time)}">`, false, 'اگر ساعت دقیق ندارید، فقط زنگ را بنویسید.')}
      ${fld('زنگ', `<select id="ce_per"><option value="">—</option>${Array.from({ length: 8 }, (_, i) => `<option value="${i + 1}" ${d.period === i + 1 ? 'selected' : ''}>زنگ ${fa(i + 1)}</option>`).join('')}</select>`)}</div>
      <div class="cexf-row">
      ${fld('مدت آزمون (دقیقه)', `<input id="ce_dur" type="number" inputmode="numeric" min="5" max="600" step="5" dir="ltr" value="${d.duration ?? ''}" placeholder="۴۵"><div class="cexf-qs">${durChips}</div>`)}
      ${fld('مکان', `<input id="ce_place" maxlength="80" value="${ceEsc(d.place)}" placeholder="مثلاً: همان کلاس / سالن آزمون">`)}</div>
      <div id="ce_warn"></div>`)}
    ${sec('۳', 'چه چیزی بخوانند؟', 'مباحث و نکته‌های مهم', `
      ${fld('مباحث آزمون', `<textarea id="ce_topics" maxlength="600" rows="3" placeholder="مثلاً: فصل ۲ کامل، تمرین‌های آخر فصل، مثال‌های کلاس">${ceEsc(d.topics)}</textarea>`, o.needTopics, 'هر چه دقیق‌تر بنویسید، هم‌کلاسی‌ها بهتر آماده می‌شوند.')}
      ${fld('منبع (اختیاری)', `<input id="ce_res" maxlength="300" value="${ceEsc(d.resources)}" placeholder="مثلاً: کتاب درسی صفحه ۲۰ تا ۵۰ + جزوه‌ی کلاس">`)}
      ${fld('توضیح یا نکته‌ی مهم (اختیاری)', `<textarea id="ce_note" maxlength="400" rows="2" placeholder="مثلاً: ماشین‌حساب همراه داشته باشید">${ceEsc(d.note)}</textarea>`)}
      ${o.admin ? fld('سقف نمره', `<input id="ce_max" type="number" min="1" max="100" step="0.25" dir="ltr" value="${d.max_score}" style="max-width:120px">`, false, 'برای نمره‌دهی بعد از آزمون.') : `<input id="ce_max" type="hidden" value="${d.max_score}">`}`)}
  </div>`;
  const prev = `<aside class="cexf-prev"><div class="cexf-ph">👀 پیش‌نمایش؛ دانش‌آموزان این‌طور می‌بینند</div><div id="ce_prev">${ceCard(ceFromDraft(d, o.admin), { preview: true })}</div></aside>`;
  return `<div class="cexf-wrap">${form}${prev}</div>`;
}

/** خواندن مقدارهای فرم از صفحه */
export function ceRead(): CDraft {
  const g = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
  const kind = (document.querySelector('input[name=ce_kind]:checked') as HTMLInputElement | null)?.value || 'class';
  const classes = [...document.querySelectorAll('.ce_cls_cb:checked')].map((x) => (x as HTMLInputElement).value);
  const int = (v: string) => { const x = parseInt(latin(v).trim(), 10); return Number.isFinite(x) ? x : null; };
  const mx = parseFloat(latin(g('ce_max')).replace('٫', '.'));
  return {
    id: g('ce_id'), cls: classes[0] || '', classes, subject: g('ce_subj').trim(), kind, title: g('ce_title').trim(),
    exam_date: j2iso(g('ce_date')) || '', start_time: g('ce_time').trim(), period: int(g('ce_per')), duration: int(g('ce_dur')),
    place: g('ce_place').trim(), topics: g('ce_topics').trim(), resources: g('ce_res').trim(), note: g('ce_note').trim(), max_score: Number.isFinite(mx) && mx > 0 ? mx : 20,
  };
}
/** پیام خطا یا '' */
export function ceCheck(d: CDraft, o: { admin: boolean; needTopics: boolean; needClass: boolean }): string {
  if (o.needClass && !d.classes.length) return 'حداقل یک کلاس را انتخاب کنید.';
  if (!d.subject) return 'درس را بنویسید.';
  if (!d.exam_date) return 'تاریخ آزمون را از تقویم انتخاب کنید.';
  if (!o.admin && d.exam_date < isoToday()) return 'تاریخ آزمون نمی‌تواند گذشته باشد.';
  if (d.start_time && !/^\d{2}:\d{2}$/.test(d.start_time)) return 'ساعت معتبر نیست.';
  if (d.period != null && (d.period < 1 || d.period > 12)) return 'شماره‌ی زنگ معتبر نیست.';
  if (d.duration != null && (d.duration < 5 || d.duration > 600)) return 'مدت آزمون باید بین ۵ تا ۶۰۰ دقیقه باشد.';
  if (o.needTopics && !d.topics) return 'مباحث آزمون را بنویسید تا هم‌کلاسی‌ها بدانند چه بخوانند.';
  if (d.max_score <= 0 || d.max_score > 100) return 'سقف نمره باید بین ۱ تا ۱۰۰ باشد.';
  return '';
}
/** آزمون‌های هم‌روزِ همان کلاس‌ها (برای هشدار «روز شلوغ») */
export function ceSameDay(list: CExam[], d: CDraft): CExam[] {
  if (!d.exam_date) return [];
  const cls = d.classes.length ? d.classes : [d.cls];
  return list.filter((x) => x.status === 'scheduled' && x.exam_date === d.exam_date && cls.includes(x.cls) && x.id !== d.id);
}
export function ceWarnHtml(list: CExam[], d: CDraft): string {
  if (!d.exam_date) return '';
  const out: string[] = [], same = ceSameDay(list, d), wd = new Date(d.exam_date + 'T12:00:00').getDay();
  if (!SCHOOL_DAYS.includes(wd)) out.push(`<div class="cexf-w">📅 ${ceDay(d.exam_date, { weekday: 'long' })} طبق تقویم مدرسه روز حضوری نیست؛ مطمئن هستید؟</div>`);
  if (same.length) out.push(`<div class="cexf-w ${same.length >= 2 ? 'hi' : ''}">⚠️ برای ${ceDay(d.exam_date)} از قبل ${fa(same.length)} آزمون ثبت شده است (${same.map((x) => ceEsc(x.subject) + (d.classes.length > 1 ? ' · ' + ceEsc(x.cls) : '')).join('، ')}).${same.length >= 2 ? ' بهتر است روز دیگری را انتخاب کنید تا فشار روی دانش‌آموزان زیاد نشود.' : ''}</div>`);
  return out.join('');
}
/** پیش‌نمایش زنده و ذخیره‌ی پیش‌نویس (تا با رسم دوباره‌ی صفحه، چیزی از فرم پاک نشود) */
export function ceInit(W: any, cfg: { list: () => CExam[]; store: (d: CDraft) => void; admin: boolean; fixedCls?: () => string }) {
  W.CE_prev = () => {
    const d = ceRead(); if (cfg.fixedCls) { const c = cfg.fixedCls(); d.cls = c; d.classes = [c]; }
    cfg.store(d);
    const box = document.getElementById('ce_prev'); if (box) box.innerHTML = ceCard(ceFromDraft(d, cfg.admin), { preview: true });
    const w = document.getElementById('ce_warn'); if (w) w.innerHTML = ceWarnHtml(cfg.list(), d);
  };
  W.CE_dur = (m: number) => { const i = document.getElementById('ce_dur') as HTMLInputElement | null; if (i) i.value = String(m); W.CE_prev(); };
}
