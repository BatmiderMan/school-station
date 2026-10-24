// Reader for the Qalamchi / Kanoon (کانون فرهنگی آموزش) personal result sheet — the PDF from kanoon.ir.
// The sheet is a real-text PDF. Nothing here depends on fixed pixel positions: the table is found from its own «NN%» cells,
// the overall table's columns come from its header cells, labels are matched fuzzily (some letters may be missing in the
// PDF's text layer), and the student's name is read from the header.
import type { TextItem } from './pdfText';
import { decodeItems, base } from './glyphLearn';
import { wordSim } from './nameMatch';

export interface QLesson {
  label: string; base: string; grade: number | null; // grade: 10 / 11 / 12
  score10: number; level: number; rank: number; responders: number; correct: number; wrong: number; blank: number;
}
export interface QReport {
  day: number | null; month: number | null; year: number | null; date: string | null; // Jalali exam date
  level: number | null; countryRank: number | null; population: number | null; regionRank: number | null; cityRank: number | null;
  notebookLevels: { grade: number | null; level: number }[];
  lessons: QLesson[]; warnings: string[];
  studentName: string; group: string; avgLevel: number | null; examsTaken: number | null; participants: number | null; receivedAt: string | null;
  decoded: { learned: number; unknown: number };
}

export const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩';
export const norm = (s: string): string => s.normalize('NFKC').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[ۀة]/g, 'ه')
  .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim();
export const squash = (s: string): string => norm(s).replace(/[\s]/g, '').replace(/[ًٌٍَُِّْ]/g, '');

export function gradeOf(s: string): number | null {
  const n = squash(s);
  if (n.includes('دوازدهم')) return 12;
  if (n.includes('یازدهم')) return 11;
  if (/(^|[^ز])دهم/.test(n) || n.endsWith('دهم')) return 10;
  // lost letters: «دوازد�م», «یازد�م» …
  if (/[دوازیاز\ufffd]{5,}ه?م$/.test(n) && n.length >= 6) return n.length >= 7 && (n[0] === 'د' || n[0] === '\ufffd') ? 12 : 11;
  return null;
}
export function lev(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const ALIAS: [RegExp, string][] = [[/^ریاضیات?گسسته?/, 'گسسته'], [/^گسسته?/, 'گسسته'], [/^ریاضیاتگسس/, 'گسسته']];
/** the lesson name without its grade word, squashed: «هندسه یازدهم» → «هندسه» */
export const baseOf = (label: string): string => {
  let b = squash(label).replace(/\ufffd/g, '').replace(/(دوازدهم|یازدهم|دهم)$/, '').replace(/(دوازدهم|یازدهم|دهم)/, '');
  for (const [re, to] of ALIAS) if (re.test(b)) { b = to; break; }
  return b;
};

/** does the text contain the word, allowing lost letters / small typos? */
const hasWord = (text: string, w: string): boolean => {
  const t = base(text), x = base(w); if (t.includes(x)) return true;
  for (let len = Math.max(2, x.length - 1); len <= x.length + 1; len++) for (let i = 0; i + len <= t.length; i++) if (wordSim(t.slice(i, i + len), x) >= 0.8) return true;
  return false;
};
const isWord = (text: string, w: string): boolean => wordSim(base(text), base(w)) >= 0.85;

interface Line { y: number; items: TextItem[] } // items sorted right → left (logical order for Persian)
function lines(items: TextItem[], tol = 2.6): Line[] {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const out: Line[] = [];
  for (const it of sorted) {
    const l = out[out.length - 1];
    if (l && Math.abs(it.y - l.y) <= tol) { l.items.push(it); l.y = (l.y * (l.items.length - 1) + it.y) / l.items.length; } else out.push({ y: it.y, items: [it] });
  }
  out.forEach((l) => l.items.sort((a, b) => b.x - a.x));
  return out;
}
const isNum = (t: string) => /^\d+$/.test(norm(t));
const numOf = (t: string) => parseInt(norm(t), 10);
const joinText = (its: TextItem[]) => norm(its.map((i) => i.text).join('')).replace(/\s+/g, ' ');

const HEAD_LABELS = ['گروه', 'نمایندگی', 'مدیر', 'پشتیبان', 'تاریخ', 'میانگین', 'تعداد', 'زمان', 'غیبت'];
/** the words that follow «label :» in a header line, up to the next label */
function valueAfter(line: Line, label: string, stop = HEAD_LABELS): string {
  const it = line.items; const k = it.findIndex((x) => { const t = base(x.text).replace(/[:\s]/g, ''); return t.length > 0 && t.length <= label.length + 2 && wordSim(t, base(label)) >= 0.85; });
  if (k < 0) return '';
  const out: string[] = []; let prevX = it[k].x;
  for (let i = k + 1; i < it.length; i++) {
    const t = it[i].text; const b = base(t).replace(/[:\s]/g, '');
    if (!b) continue;
    if (stop.some((s) => s !== label && b.length >= 2 && wordSim(b, base(s)) >= 0.85)) break;
    if (prevX - it[i].x > 90 && out.length) break;
    out.push(norm(t).replace(/^:+|:+$/g, '').trim()); prevX = it[i].x;
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

export function parseQalamchi(all0: TextItem[], rosterWords: string[] = []): QReport {
  const warnings: string[] = [];
  const dec = decodeItems(all0, rosterWords); const all = dec.items;

  // ---- find the lesson rows: a «87%» cell + at least seven numbers on its left (any layout / panel position)
  const pct = (i: TextItem) => /^\d+%$/.test(norm(i.text).replace(/\s/g, ''));
  const pctItems = all.filter(pct);
  if (!pctItems.length) throw new Error('layout');
  const panelLeft = Math.min(...pctItems.map((i) => i.x)) - 340;
  const right = all.filter((i) => i.x >= panelLeft && i.y > 5);
  const L = lines(right);

  const lessons: QLesson[] = []; const rowIdx: number[] = [];
  L.forEach((l, idx) => {
    const p = l.items.find(pct); if (!p) return;
    const nums = l.items.filter((i) => i.x < p.x - 2 && isNum(i.text)).map((i) => numOf(i.text));
    if (nums.length < 7) return;
    const n = nums.length;
    const [correct, wrong, blank] = [nums[n - 3], nums[n - 2], nums[n - 1]];
    const label = joinText(l.items.filter((i) => i.x > p.x + 2));
    const ls: QLesson = { label, base: baseOf(label), grade: gradeOf(label), score10: nums[n - 7], level: nums[n - 6], rank: nums[n - 5], responders: nums[n - 4], correct, wrong, blank };
    const tot = correct + wrong + blank, shown = parseInt(norm(p.text), 10), calc = tot ? Math.round(((3 * correct - wrong) / (3 * tot)) * 100) : 0;
    if (Math.abs(calc - shown) > 1) warnings.push(`«${label}»: درصد ${shown}٪ با درست/غلط/نزده (${correct}/${wrong}/${blank}) نمی‌خواند؛ عددها را بررسی کن.`);
    if (ls.level < 500 || ls.level > 20000) warnings.push(`«${label}»: تراز ${ls.level} غیرعادی است.`);
    lessons.push(ls); rowIdx.push(idx);
  });
  if (!lessons.length) throw new Error('layout');

  // grade of a lesson whose label lacks it: the notebook title row above («دوازدهم» / «دهم و یازدهم …»)
  lessons.forEach((ls, k) => {
    if (ls.grade !== null) return;
    for (let i = rowIdx[k]; i >= 0; i--) { const t = joinText(L[i].items); if (L[i].items.length <= 8 && !L[i].items.some(pct) && gradeOf(t)) { ls.grade = gradeOf(t); break; } }
  });

  // ---- overall table (above the first lesson row): label + level + ranks; columns come from the header cells
  const first = rowIdx[0];
  const rows: { label: string; cells: { x: number; v: number }[] }[] = [];
  let headLine = -1;
  for (let i = 0; i < first; i++) {
    const l = L[i];
    const nums = l.items.filter((x) => isNum(x.text)).map((x) => ({ x: x.x, v: numOf(x.text) }));
    if (headLine < 0 && l.items.some((x) => hasWord(x.text, 'تراز')) && l.items.some((x) => hasWord(x.text, 'رتبه'))) headLine = i;
    if (headLine >= 0 && i > headLine && nums.length >= 3 && nums.length <= 6 && nums[0].v >= 500 && !l.items.some(pct)) {
      const label = joinText(l.items.filter((x) => !isNum(x.text) && x.x > nums[0].x));
      rows.push({ label, cells: nums });
    }
  }
  type Role = 'level' | 'country' | 'region' | 'city' | 'population';
  const roleOfCell = (cx: number): Role | null => {
    if (headLine < 0) return null;
    const hs = L[headLine].items.filter((x) => !/^[\s:]*$/.test(x.text)); const groups: TextItem[][] = [];
    hs.forEach((x) => { const g = groups[groups.length - 1]; if (g && g[g.length - 1].x - x.x < 26) g.push(x); else groups.push([x]); });
    let best: { g: TextItem[]; d: number } | null = null;
    groups.forEach((g) => { const c = g.reduce((a, x) => a + x.x, 0) / g.length, d = Math.abs(c - cx); if (!best || d < best.d) best = { g, d }; });
    if (!best || (best as any).d > 40) return null;
    const t = joinText((best as any).g);
    return hasWord(t, 'منطقه') ? 'region' : hasWord(t, 'شهر') ? 'city' : hasWord(t, 'کشوری') || hasWord(t, 'کشور') ? 'country' : hasWord(t, 'شرکت') || hasWord(t, 'تعداد') ? 'population' : hasWord(t, 'تراز') ? 'level' : null;
  };
  const pick = (r: { cells: { x: number; v: number }[] }) => {
    const out: Partial<Record<Role, number>> = {}; let ok = true;
    r.cells.forEach((c) => { const role = roleOfCell(c.x); if (!role || out[role] !== undefined) ok = false; else out[role] = c.v; });
    if (ok && out.level !== undefined) return out;
    // header unreadable: by count
    const v = r.cells.map((c) => c.v);
    return v.length >= 5 ? { level: v[0], country: v[1], population: v[2], region: v[3], city: v[4] } : { level: v[0], country: v[1], region: v[2], city: v[3] };
  };
  const total = rows[0] ? pick(rows[0]) : null;
  if (!total) warnings.push('ردیف «اختصاصی - کل» پیدا نشد.');
  const notebookLevels = rows.slice(1).map((r) => ({ grade: gradeOf(r.label), level: pick(r).level as number }));

  // ---- header block: name, group, date, averages
  const headLines = lines(all.filter((i) => i.y < 40), 3);
  let studentName = '', group = '', avgLevel: number | null = null, examsTaken: number | null = null;
  headLines.forEach((hl) => {
    if (!studentName) { const v = valueAfter(hl, 'نام'); if (v && hl.items.some((x) => isWord(x.text.replace(/[:\s]/g, ''), 'نام'))) studentName = v; }
    if (!group) { const v = valueAfter(hl, 'گروه'); if (v) group = v; }
    if (avgLevel === null) { const k = hl.items.findIndex((x) => hasWord(x.text, 'میانگین')); if (k >= 0) { const n = hl.items.slice(k + 1).find((x) => /^\d{3,5}$/.test(norm(x.text))); if (n) avgLevel = numOf(n.text); } }
    if (examsTaken === null) { const k = hl.items.findIndex((x) => hasWord(x.text, 'شرکت')); if (k >= 0) { const n = hl.items.slice(k + 1).find((x) => /^\d{1,2}$/.test(norm(x.text))); if (n) examsTaken = numOf(n.text); } }
  });
  studentName = norm(studentName).replace(/[:]/g, '').trim();

  // ---- date: «۱ آبان» (day + month name) in the header, year from the receive date «1405/08/01»
  const head = all.filter((i) => i.y < 45);
  let mi: TextItem | undefined, mk = -1, ms = 0.78;
  head.forEach((i) => { const t = base(i.text).replace(/[\s\d:]/g, ''); if (t.length < 2) return; MONTHS.forEach((m, k) => { const s = wordSim(t, base(m)); if (s > ms) { ms = s; mi = i; mk = k; } }); });
  let day: number | null = null, month: number | null = null, year: number | null = null;
  if (mi) {
    month = mk + 1;
    const m0 = mi as TextItem;
    const near = head.filter((i) => isNum(i.text) && Math.abs(i.y - m0.y) < 3.5 && Math.abs(i.x - m0.x) < 45 && numOf(i.text) >= 1 && numOf(i.text) <= 31).sort((a, b) => Math.abs(a.x - m0.x) - Math.abs(b.x - m0.x))[0];
    if (near) day = numOf(near.text);
  }
  const recv = head.map((i) => /(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\D+(\d{1,2}):(\d{2}))?/.exec(norm(i.text))).find(Boolean);
  const receivedAt = recv ? `${recv[1]}/${recv[2].padStart(2, '0')}/${recv[3].padStart(2, '0')}` : null;
  if (recv) {
    const ry = +recv[1], rm = +recv[2], rd = +recv[3];
    if (day === null || month === null) { year = ry; month = rm; day = rd; warnings.push('تاریخ آزمون از تاریخ دریافت کارنامه برداشته شد.'); }
    else year = month > rm ? ry - 1 : ry;
  }
  const date = year && month && day ? `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}` : null;
  if (!date) warnings.push('تاریخ آزمون خوانده نشد.');

  // ---- participants of the student's group in this exam
  let participants: number | null = null;
  L.forEach((l) => { if (participants === null && l.items.some((x) => hasWord(x.text, 'شرکت')) && l.items.some((x) => hasWord(x.text, 'کننده'))) { const n = l.items.filter((x) => isNum(x.text) && numOf(x.text) >= 100).sort((a, b) => numOf(b.text) - numOf(a.text))[0]; if (n) participants = numOf(n.text); } });

  // ---- cross-check with the «وضعیت پاسخ‌گویی» summary (the «وضعیت کلی» row: total, correct, wrong)
  const after = L.slice(rowIdx[rowIdx.length - 1] + 1);
  const sumLine = after.find((l) => l.items.filter((x) => isNum(x.text)).length === 3 && l.items.some((x) => hasWord(x.text, 'کلی') || hasWord(x.text, 'وضعیت')));
  if (sumLine) {
    const [tot, cor, wr] = sumLine.items.filter((x) => isNum(x.text)).sort((a, b) => b.x - a.x).map((x) => numOf(x.text));
    const sq = lessons.reduce((a, x) => a + x.correct + x.wrong + x.blank, 0), sc = lessons.reduce((a, x) => a + x.correct, 0), sw = lessons.reduce((a, x) => a + x.wrong, 0);
    if (cor !== sc || wr !== sw || tot !== sq) warnings.push(`جمع درس‌ها (${sc}/${sw} از ${sq}) با جدول «وضعیت پاسخ‌گویی» (${cor}/${wr} از ${tot}) نمی‌خواند؛ اعداد را بررسی کن.`);
  } else warnings.push('جدول «وضعیت پاسخ‌گویی» برای تطبیق پیدا نشد.');
  if (studentName.includes('\ufffd')) warnings.push('بعضی حرف‌های نام در متن PDF قابل بازیابی نبود؛ نام را با پیشنهادها تطبیق بده.');

  return {
    day, month, year, date, level: (total?.level as number) ?? null, countryRank: (total?.country as number) ?? null, population: (total?.population as number) ?? null,
    regionRank: (total?.region as number) ?? null, cityRank: (total?.city as number) ?? null, notebookLevels, lessons, warnings,
    studentName, group, avgLevel, examsTaken, participants, receivedAt, decoded: { learned: dec.learned, unknown: dec.unknown }
  };
}


