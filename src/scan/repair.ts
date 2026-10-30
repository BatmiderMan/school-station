// نام درس‌ها در نتیجه‌های ذخیره‌شده: تمیز کردن نام‌های خراب (مثل «ف�زیک» یا «زیست‌شناسی» جدا از «زیست»)
// و اصلاح یک اشتباه رایج در کارنامه‌ی تجربیِ ماز: «زمین‌شناسی» که به‌جایش «ادبیات» نوشته شده بود.
import { squash } from './qalamchiReport';

/** نام بخش‌های مدرسه (همان SUBJ برنامه) */
export const SECTION_NAMES = ['ریاضی', 'فیزیک', 'شیمی', 'زیست', 'ادبیات', 'عربی', 'دین و زندگی', 'زبان', 'زمین شناسی'];
// نام‌هایی که در کارنامه‌ها می‌آید و باید در یکی از بخش‌های بالا حساب شود
const ALIAS: [string, string][] = [['زیست‌شناسی', 'زیست'], ['زیست شناسی', 'زیست'], ['زمین‌شناسی', 'زمین شناسی'], ['ریاضیات', 'ریاضی'], ['زبان انگلیسی', 'زبان'], ['دین و زندگی', 'دین و زندگی']];
const TARGETS: [string, string][] = [...SECTION_NAMES.map((s): [string, string] => [squash(s), s]), ...ALIAS.map(([a, s]): [string, string] => [squash(a), s])];

function lev(a: string, b: string): number {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}

/** نام استاندارد یک بخش؛ اگر شناخته نشد همان نام (بدون نویسه‌ی خراب) برمی‌گردد */
export function canonSection(name: string): string {
  const clean = String(name || '').replace(/\ufffd/g, '').trim(); if (!clean) return String(name || '');
  const q = squash(clean), exact = TARGETS.find(([k]) => k === q); if (exact) return exact[1];
  let best: { s: string; d: number } | null = null, tie = false;
  for (const [k, s] of TARGETS) {
    if (k.length < 5) continue; // نام‌های کوتاه (عربی، زبان، شیمی…) فقط دقیق تطبیق می‌شوند
    const d = lev(q, k); if (d > 1 && d > Math.floor(k.length / 4)) continue;
    if (!best || d < best.d) { best = { s, d }; tie = false; } else if (d === best.d && s !== best.s) tie = true;
  }
  return best && !tie ? best.s : clean;
}

export interface FixCtx { inst: string; /** دانش‌آموز رشته‌ی تجربی است؟ */ exp: boolean }
/** نام همه‌ی ردیف‌ها را استاندارد می‌کند؛ «ماز + تجربی»: ادبیات ← زمین شناسی. تعداد تغییرها را برمی‌گرداند */
export function fixRowsNames(rows: { sectionName: string }[], ctx: FixCtx): number {
  let ch = 0;
  rows.forEach((r) => { const c = canonSection(r.sectionName); if (c !== r.sectionName) { r.sectionName = c; ch++; } });
  const names = rows.map((r) => r.sectionName);
  if (ctx.inst === 'ماز' && ctx.exp && names.includes('ادبیات') && names.includes('زیست') && !names.includes('زمین شناسی')) {
    rows.forEach((r) => { if (r.sectionName === 'ادبیات') { r.sectionName = 'زمین شناسی'; ch++; } });
  }
  return ch;
}

/** یک نتیجه‌ی ذخیره‌شده ({subj, raw, slv}) را درجا اصلاح می‌کند؛ فهرست تغییرها [از، به] برمی‌گردد (اگر dry باشد چیزی عوض نمی‌شود) */
export function repairRes(res: any, ctx: FixCtx, dry = false): [string, string][] {
  const keys = [...new Set([...Object.keys(res.subj || {}), ...Object.keys(res.raw || {}), ...Object.keys(res.slv || {})])];
  const map: Record<string, string> = {}; keys.forEach((k) => { map[k] = canonSection(k); });
  const names = keys.map((k) => map[k]);
  if (ctx.inst === 'ماز' && ctx.exp && names.includes('ادبیات') && names.includes('زیست') && !names.includes('زمین شناسی')) keys.forEach((k) => { if (map[k] === 'ادبیات') map[k] = 'زمین شناسی'; });
  const changes: [string, string][] = keys.filter((k) => map[k] !== k).map((k) => [k, map[k]]);
  if (dry || !changes.length) return changes;
  const raw: any = {}, subj: any = {}, slv: any = {}; const cnt: Record<string, number> = {};
  keys.forEach((k) => { cnt[map[k]] = (cnt[map[k]] || 0) + 1; });
  keys.forEach((k) => {
    const t = map[k];
    if (res.raw?.[k]) { const a = raw[t] || [0, 0, 0], b = res.raw[k]; raw[t] = [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
    if (cnt[t] === 1) { if (res.subj && k in res.subj) subj[t] = res.subj[k]; if (res.slv && k in res.slv) slv[t] = res.slv[k]; }
  });
  Object.keys(raw).forEach((t) => { if (cnt[t] > 1) { const [c, w, b] = raw[t], tt = c + w + b; subj[t] = tt ? Math.round((3 * c - w) / (3 * tt) * 1000) / 10 : 0; } });
  if (res.subj) res.subj = subj; if (res.raw) res.raw = raw; if (res.slv) res.slv = slv;
  return changes;
}
