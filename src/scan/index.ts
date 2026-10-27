// Institute report importers. To support another institute, add a reader that returns an ImportedExam and register it here.
export interface Part { id: string; name: string; n: number; children?: Part[] }
export interface Section { id: string; name: string; color: string; n: number; parts: Part[] }
export interface ExamSettings { sections: Section[] }
import { extractPdfJpeg, fileToRaster } from './loadReport';
import type { Raster } from './raster';
import { nameFromFilename, tokens } from './nameMatch';
import { readMazName, vocabOf } from './mazName';
import { extractPdfText } from './pdfText';
import { MONTHS, QLesson, baseOf, lev, norm, parseQalamchi, squash } from './qalamchiReport';
import { MazReport, parseMazReport, sigDistance } from './mazReport';
import { KNOWN_HEADINGS } from './mazKnown';

export interface ImportRow { index: number; label?: string; sectionName: string; partName?: string; n: number; c: number; w: number; level: number | null; countryRank: number | null; recognised: boolean }
export interface ImportedExam {
  institute: string; title: string; date: string; time?: string; rows: ImportRow[];
  level: number | null; countryRank: number | null; regionRank: number | null; participants: number | null; warnings: string[]; extraNotes?: string[];
  /** who the sheet belongs to, as far as the file tells: name from the PDF text, from the file name, and (Maz images) a crop of the name cards */
  detected?: { name: string; source: 'pdf' | 'ocr' | 'filename' | ''; alt: string; group?: string; crop?: string; avgLevel?: number | null };
}
export const INSTITUTES = [{ id: 'maz', label: 'ماز', hint: 'کارنامه‌ی تحلیلی (PDF یا عکس)' }, { id: 'qalamchi', label: 'قلم‌چی', hint: 'کارنامه‌ی PDF از kanoon.ir' }];

const SEEN_KEY = 'konkour_maz_heading_map_v1';
const loadSeen = (): { name: string; sig: string }[] => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch (e) { return []; } };
export function rememberHeading(sig: string, name: string): void {
  const rest = loadSeen().filter((x) => sigDistance(x.sig, sig) > 0.05);
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...rest, { name, sig }].slice(-40))); } catch (e) { /* ignore */ }
}

/** the «نام» and «نام خانوادگی» cards of a Maz sheet (fixed layout: 2400 px wide page) as a small picture the manager can read at a glance */
function mazNameCrop(r: Raster): string {
  try {
    const s = r.width / 2400, x0 = Math.round(1680 * s), x1 = Math.min(r.width, Math.round(2364 * s)), y0 = Math.round(430 * s), y1 = Math.min(r.height, Math.round(640 * s));
    if (x1 - x0 < 50 || y1 - y0 < 30) return '';
    const cv = document.createElement('canvas'); cv.width = r.width; cv.height = r.height; (cv.getContext('2d') as CanvasRenderingContext2D).putImageData(new ImageData(new Uint8ClampedArray(r.data), r.width, r.height), 0, 0);
    const out = document.createElement('canvas'); out.width = x1 - x0; out.height = y1 - y0;
    (out.getContext('2d') as CanvasRenderingContext2D).drawImage(cv, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
    return out.toDataURL('image/jpeg', 0.72);
  } catch (e) { return ''; }
}
const slash = (d: string) => d.replace(/\//g, '/');
export async function importMaz(file: File, cfg: ExamSettings, roster: string[] = []): Promise<{ exam: ImportedExam; sigs: string[] }> {
  const raster = await fileToRaster(file);
  const rep: MazReport = parseMazReport(raster);
  // who is it? read the name cards against the roster's words (best effort — a failure only means «no name»)
  let ocrName = '';
  if (roster.length) { try { ocrName = (await readMazName(raster, vocabOf(roster, tokens))).text; } catch (e) { ocrName = ''; } }
  const known = [...loadSeen(), ...KNOWN_HEADINGS];
  const used = new Set<string>();
  const rows: ImportRow[] = rep.sections.map((s) => {
    let hit: { name: string; d: number } | null = null;
    for (const k of known) { const d = sigDistance(s.sig, k.sig); if (d < 0.22 && (!hit || d < hit.d) && !used.has(k.name)) hit = { name: k.name, d }; }
    if (hit) used.add(hit.name);
    const c = s.correct ?? 0, w = s.wrong ?? 0, b = s.blank ?? 0;
    return { index: s.index, sectionName: hit?.name || '', n: c + w + b, c, w, level: s.level, countryRank: s.countryRank, recognised: !!hit };
  });
  // unrecognised headings: take the user's configured sections in order that aren't used yet
  const free = cfg.sections.map((s) => s.name).filter((n) => !used.has(n));
  rows.forEach((r) => { if (!r.sectionName) r.sectionName = free.shift() || `درس ${r.index + 1}`; });
  const warnings = [...rep.warnings];
  if (rep.date === null) warnings.push('تاریخ را خودت انتخاب کن.');
  return {
    sigs: rep.sections.map((s) => s.sig),
    exam: {
      institute: 'ماز', title: `آزمون ماز${rep.stage ? ' مرحله ' + rep.stage : ''}`, date: rep.date || '', time: rep.time || undefined, rows,
      level: rep.level, countryRank: rep.countryRank, regionRank: rep.regionRank, participants: rep.participants, warnings,
      detected: { name: ocrName, source: ocrName ? 'ocr' : '', alt: '', crop: mazNameCrop(raster) }
    }
  };
}


// ---------------------------------------------------------------- Qalamchi (Kanoon)
// نام درس‌ها همان‌طور که باید دیده شوند (رشته‌ی ریاضی و تجربی و عمومی). «زیست» جدا هم هست تا اگر بخش مدرسه «زیست» نام دارد پیدا شود.
const LESSON_NAMES = ['حسابان', 'هندسه', 'آمار و احتمال', 'گسسته', 'ریاضی', 'فیزیک', 'شیمی', 'زیست‌شناسی', 'زمین‌شناسی', 'ادبیات', 'عربی', 'دین و زندگی', 'زبان انگلیسی', 'اقتصاد', 'تاریخ', 'جغرافیا', 'منطق', 'فلسفه', 'علوم و اجتماعی', 'روانشناسی'];
const BASES = [...LESSON_NAMES, 'زیست'].map(squash);
const DISPLAY = new Map(LESSON_NAMES.map((n) => [squash(n), n]));
// درسی که در کارنامه «زیست‌شناسی» نوشته شده، در بخش «زیست» مدرسه حساب می‌شود
const SECTION_OF: Record<string, string> = { [squash('زیست‌شناسی')]: squash('زیست') };
const bareName = (s: string) => squash(s).replace(/\d+$/, '');
const matchBase = (base: string, cands: string[]): string | null => {
  let best: { c: string; d: number } | null = null;
  for (const c of cands) { const d = lev(base, c); if (d <= Math.max(1, Math.floor(c.length / 4)) && (!best || d < best.d)) best = { c, d }; }
  return best ? best.c : null;
};
// grade → number in the planner's part names (حسابان ۱ = یازدهم, هندسه ۱ = دهم ...)
const gradeIndex = (base: string, g: number | null): number | null => g === null ? null : base === 'حسابان' ? (g === 11 ? 1 : g === 12 ? 2 : null) : g - 9;

const gradeWordOf = (g: number | null) => (g === 12 ? 'دوازدهم' : g === 11 ? 'یازدهم' : g === 10 ? 'دهم' : '');
/** lesson name for display: letters that the PDF lost («ف�زیک») are repaired from the known lesson names */
export function lessonLabel(ls: QLesson, cfg: ExamSettings): string {
  const hit = matchBase(ls.base, [...BASES, ...cfg.sections.map((s) => bareName(s.name))]);
  const name = hit ? DISPLAY.get(hit) || cfg.sections.find((s) => bareName(s.name) === hit)?.name || '' : '';
  return name ? `${name} ${gradeWordOf(ls.grade)}`.trim() : ls.label.replace(/\ufffd/g, '');
}
/** where in the user's exam settings does a Qalamchi lesson belong? */
export function placeLesson(ls: QLesson, cfg: ExamSettings): { sectionName: string; partName: string; recognised: boolean } {
  const cand = [...BASES, ...cfg.sections.map((s) => bareName(s.name))];
  const base = matchBase(ls.base, cand) || ls.base;
  const sec = SECTION_OF[base] || base;
  const idx = gradeIndex(base, ls.grade);
  const gradeWord = gradeWordOf(ls.grade);
  const withGrade = (n: string) => `${n} ${gradeWord}`.trim();
  const lastNum = (n: string) => { const m = /(\d+)\s*$/.exec(norm(n)); return m ? +m[1] : null; };
  // (a) a part/group named like the lesson (حسابان, هندسه, گسسته, آمار و احتمال)
  for (const s of cfg.sections) for (const p of s.parts) {
    if (bareName(p.name) !== base) continue;
    if (p.children?.length) { const k = p.children.find((c) => lastNum(c.name) === idx); return { sectionName: s.name, partName: k ? k.name : withGrade(p.name), recognised: true }; }
    if (lastNum(p.name) === null) return { sectionName: s.name, partName: p.name, recognised: true };
  }
  // (b) a section named like the lesson, with parts «فیزیک ۱ / ۲ / ۳»
  for (const s of cfg.sections) {
    if (bareName(s.name) !== sec) continue;
    const k = s.parts.find((p) => bareName(p.name) === base && lastNum(p.name) === idx);
    return { sectionName: s.name, partName: k ? k.name : s.parts.length || idx === null ? withGrade(s.name) : '', recognised: true };
  }
  // (c) any section that holds a part with this base number-suffixed (e.g. زیست ۱۰ …) or nothing known
  for (const s of cfg.sections) if (s.parts.some((p) => bareName(p.name) === base)) return { sectionName: s.name, partName: withGrade(s.name), recognised: true };
  // (d) math-major lessons (حسابان، هندسه، گسسته، آمار و احتمال) all count as the «ریاضی» section
  if (MATH.includes(base)) { const s = cfg.sections.find((x) => bareName(x.name) === squash('ریاضی')); if (s) return { sectionName: s.name, partName: ls.label, recognised: true }; }
  return { sectionName: '', partName: ls.label, recognised: false };
}
const MATH = ['حسابان', 'هندسه', 'گسسته', 'آمار و احتمال', 'آمارواحتمال', 'ریاضی'].map(squash);

export function importQalamchi(rep: ReturnType<typeof parseQalamchi>, cfg: ExamSettings, fileName = ''): ImportedExam {
  const used = new Set<string>();
  const rows: ImportRow[] = rep.lessons.map((ls, i) => {
    const pl = placeLesson(ls, cfg);
    if (pl.sectionName) used.add(pl.sectionName);
    return { index: i, label: lessonLabel(ls, cfg), sectionName: pl.sectionName, partName: pl.partName, n: ls.correct + ls.wrong + ls.blank, c: ls.correct, w: ls.wrong, level: ls.level, countryRank: null, recognised: pl.recognised };
  });
  const free = cfg.sections.map((s) => s.name).filter((n) => !used.has(n));
  rows.forEach((r) => { if (!r.sectionName) r.sectionName = r.label?.split(' ')[0] || free.shift() || `درس ${r.index + 1}`; });
  const dateLabel = rep.day && rep.month ? `${rep.day} ${MONTHS[rep.month - 1]}` : '';
  const extra = [
    rep.population ? `رتبه کشوری ${rep.countryRank} از ${rep.population} نفر` : '', rep.cityRank ? `رتبه شهر ${rep.cityRank}` : '',
    ...rep.notebookLevels.map((n) => `تراز دفترچه ${n.grade === 11 ? 'یازدهم' : n.grade === 10 ? 'دهم' : n.grade === 12 ? 'دوازدهم' : ''}: ${n.level}`)
  ].filter(Boolean);
  return {
    institute: 'قلم‌چی', title: `آزمون قلم‌چی${dateLabel ? ' ' + dateLabel : ''}`, date: rep.date || '', rows,
    level: rep.level, countryRank: rep.countryRank, regionRank: rep.regionRank, participants: rep.participants, warnings: [...rep.warnings], extraNotes: extra,
    detected: { name: rep.studentName, source: rep.studentName ? 'pdf' : 'filename', alt: nameFromFilename(fileName), group: rep.group, avgLevel: rep.avgLevel }
  };
}

/** one entry point for the import button: picks the reader from the file itself */
export async function importReport(file: File, cfg: ExamSettings, roster: string[] = []): Promise<{ exam: ImportedExam; sigs: string[] }> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (isPdf) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const items = await extractPdfText(bytes).catch(() => []);
    if (items.length > 40) return { exam: importQalamchi(parseQalamchi(items, roster.flatMap((n) => tokens(n))), cfg, file.name), sigs: [] };
    if (!extractPdfJpeg(bytes)) throw new Error('pdf');
  }
  const r = await importMaz(file, cfg, roster);
  if (r.exam.detected) r.exam.detected.alt = nameFromFilename(file.name);
  return r;
}

