// Reader for the NEW «کارنامه آزمون ماز» analytical report card (white web page: «اطلاعات کلی» card on the left, KPI tiles,
// «وضعیت دروس» table, strengths/weaknesses and «تحلیل فصل‌ها»). Like the old card it is a picture (jsPDF page image or a screenshot),
// 2400 px wide at full size, so everything is found by position (scaled by width/2400) and numbers are read with a glyph matcher.
// Output has the same shape as the old reader's (MazReport), so the rest of the importer does not care which layout it was.
import { Box, Glyph, Raster, bitmapOf, components, lumAt } from './raster';
import { mergeDotPairs } from './digits';
import { GLYPHS_V2 } from './mazGlyphs2';
import { MazReport, MazSection, signature } from './mazReport';

type Ink = (x: number, y: number) => boolean;
/** nominal height (px at 2400 wide) of a full-height digit in each text style of the card; glyph features are relative to it */
const NOM = { kpi: 26, info: 22, tlevel: 20, rank: 20, ans: 17.5, title: 28, head: 19 };
const MAXD = 0.3; // above this a glyph is «not a known character»

// ---------------------------------------------------------------- glyph reading
const TPL = GLYPHS_V2.map((t) => ({ ch: t.ch, hr: t.hr, wr: t.wr, codes: Array.from(t.bm, (c) => c.charCodeAt(0)) }));
function classify(g: Glyph, refH: number): { ch: string; d: number } {
  const hr = g.box.h / refH, wr = g.box.w / refH, bm = bitmapOf(g, 12, 12);
  let best = { ch: '?', d: 9 };
  for (const t of TPL) {
    let d = 0;
    for (let i = 0; i < t.codes.length; i++) { const e = (bm.charCodeAt(i) - t.codes[i]) / 9; d += e * e; }
    d = d / t.codes.length + 1.2 * ((hr - t.hr) ** 2 + (wr - t.wr) ** 2);
    if (d < best.d) best = { ch: t.ch, d };
  }
  return best;
}
interface Num { text: string; x0: number; x1: number; v: number | null }
/** all the numbers (clusters of glyphs) inside `rect`, left → right. `text` keeps separators; `v` is the integer (null when any glyph was unknown). */
function readNumbers(r: Raster, rect: Box, ink: Ink, refH: number, s: number, gapK = 0.7): Num[] {
  const x = Math.max(0, rect.x), y = Math.max(0, rect.y), w = Math.min(r.width - x, rect.w), h = Math.min(r.height - y, rect.h);
  if (w < 4 || h < 4) return [];
  const gs = mergeDotPairs(components({ x, y, w, h }, ink, Math.max(3, Math.round(6 * s * s))));
  const out: Num[] = []; let cur: Glyph[] = [];
  const flush = () => {
    if (!cur.length) return;
    let text = '', bad = false;
    for (const g of cur) { const m = classify(g, refH); if (m.d > MAXD) { text += '?'; bad = true; } else text += m.ch; }
    const digits = text.replace(/[^0-9]/g, '');
    out.push({ text, x0: cur[0].box.x, x1: cur[cur.length - 1].box.x + cur[cur.length - 1].box.w, v: bad || !digits || /[^0-9,]/.test(text) ? null : parseInt(digits, 10) });
    cur = [];
  };
  for (const g of gs) {
    const last = cur[cur.length - 1];
    if (last && g.box.x - (last.box.x + last.box.w) > gapK * refH) flush();
    cur.push(g);
  }
  flush();
  return out;
}
/** the number that sits furthest right in the rect (values are right-aligned in this RTL page; anything left of it is another widget) */
const rightmost = (n: Num[]): Num | null => (n.length ? n[n.length - 1] : null);

// ---------------------------------------------------------------- finding lines
/** y of every thin, long, light-grey horizontal line between x0 and x1 (table rules, card borders) */
function hairlines(r: Raster, x0: number, x1: number, y0: number, y1: number): number[] {
  const out: number[] = []; let run: number[] = [];
  const end = () => { if (run.length && run.length <= 7) out.push(Math.round((run[0] + run[run.length - 1]) / 2)); run = []; };
  const xa = Math.max(0, Math.round(x0)), xb = Math.min(r.width, Math.round(x1));
  for (let y = Math.max(0, Math.round(y0)); y < Math.min(r.height, Math.round(y1)); y++) {
    let n = 0, tot = 0, sum = 0;
    for (let x = xa; x < xb; x += 2) { const l = lumAt(r, x, y); tot++; sum += l; if (l < 248) n++; }
    const mean = sum / Math.max(1, tot);
    if (n / Math.max(1, tot) > 0.92 && mean < 244 && mean > 200) run.push(y); else end();
  }
  end();
  return out;
}

const INFO_PITCH = 89.5, ROW_H = 145;
export interface CardGeometry { dy: number; infoLines: number[] }
/** the vertical shift of the card against the reference page, found from the rules of the «اطلاعات کلی» card (rows ~89.5 px apart) */
export function cardGeometry(r: Raster): CardGeometry | null {
  const s = r.width / 2400;
  const ls = hairlines(r, 130 * s, 700 * s, 520 * s, Math.min(r.height, 2200 * s));
  let best: number[] = [];
  for (let i = 0; i < ls.length; i++) {
    const chain = [ls[i]];
    for (let j = i + 1; j < ls.length; j++) if (Math.abs(ls[j] - chain[chain.length - 1] - INFO_PITCH * s) <= 5 * s) chain.push(ls[j]);
    if (chain.length > best.length) best = chain;
  }
  if (best.length < 9) return null;
  return { dy: best[0] - 698 * s, infoLines: best };
}

// ---------------------------------------------------------------- the reader
export function parseMazCard(r: Raster): MazReport {
  const s = r.width / 2400, warnings: string[] = [];
  const geo = cardGeometry(r);
  if (!geo) throw new Error('layout');
  const dy = geo.dy, il = geo.infoLines;
  const digitInk: Ink = (x, y) => {
    if (x < 0 || y < 0 || x >= r.width || y >= r.height) return false;
    const i = (y * r.width + x) * 4, R = r.data[i], G = r.data[i + 1], B = r.data[i + 2], l = 0.299 * R + 0.587 * G + 0.114 * B;
    return l < 95 || (l < 175 && Math.max(R, G, B) - Math.min(R, G, B) > 40);
  };
  const greyInk: Ink = (x, y) => x >= 0 && y >= 0 && x < r.width && y < r.height && lumAt(r, x, y) < 170;
  const pageInk: Ink = (x, y) => x >= 0 && y >= 0 && x < r.width && y < r.height && lumAt(r, x, y) < 140;
  const box = (x0: number, y0: number, x1: number, y1: number): Box => ({ x: Math.round(x0 * s), y: Math.round(y0 * s + dy), w: Math.round((x1 - x0) * s), h: Math.round((y1 - y0) * s) });
  const kpi = (x0: number, y0: number, x1: number, y1: number) => rightmost(readNumbers(r, box(x0, y0, x1, y1), digitInk, NOM.kpi * s, s))?.v ?? null;

  // ---- title: «… مرحله ۳» (the number is the left-most glyph) and the «تاریخ آزمون: … - hh:mm» line
  let stage: number | null = null;
  { const t = readNumbers(r, box(900, 395, 1510, 465), (x, y) => x >= 0 && y >= 0 && x < r.width && y < r.height && lumAt(r, x, y) < 110, NOM.title * s, s, 0.3)[0]; if (t && /^\d{1,2}$/.test(t.text)) stage = parseInt(t.text, 10); }
  let time: string | null = null, headDate: string | null = null;
  readNumbers(r, box(900, 466, 1700, 520), greyInk, NOM.head * s, s, 0.5).forEach((n) => {
    const tm = /^(\d{1,2}):(\d{2})$/.exec(n.text), dt = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(n.text);
    if (tm && +tm[1] < 24 && +tm[2] < 60) time = `${tm[1].padStart(2, '0')}:${tm[2]}`;
    if (dt) headDate = n.text;
  });

  // ---- «وضعیت کلی» tiles
  const level = kpi(1900, 735, 2180, 810), countryRank = kpi(1000, 735, 1445, 810), regionRank = kpi(1900, 925, 2180, 1000);
  const correct = kpi(1820, 1150, 2330, 1230), wrong = kpi(1360, 1150, 1800, 1230), blank = kpi(900, 1150, 1330, 1230);

  // ---- «اطلاعات کلی» card (values are left-aligned under their labels; label words sit right of x≈640 and are skipped)
  const rowRect = (i: number): Box => {
    const a = il[i] + 8 * s, b = i + 1 < il.length ? il[i + 1] - 6 * s : a + 90 * s;
    return { x: Math.round(118 * s), y: Math.round(a), w: Math.round(520 * s), h: Math.round(b - a) };
  };
  const infoNum = (i: number) => readNumbers(r, rowRect(i), digitInk, NOM.info * s, s, 1.2)[0] || null;
  const infoDate = infoNum(5)?.text || '';
  const avgLevel = infoNum(6)?.v ?? null, participants = infoNum(7)?.v ?? null, absent = infoNum(8)?.v ?? null;
  const pickDate = (t: string): string | null => {
    const m = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(t); if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    return y >= 1380 && y <= 1500 && mo >= 1 && mo <= 12 && d >= 1 && d <= 31 ? `${y}/${m[2]}/${m[3]}` : null;
  };
  const date = pickDate(infoDate) || pickDate(headDate || '');
  if (!date) warnings.push('تاریخ آزمون خوانده نشد.');

  // ---- «وضعیت دروس» table: rows are the 145 px bands between the long rules
  const rules = hairlines(r, 200 * s, 2200 * s, 1500 * s + dy, r.height);
  let j = -1;
  for (let i = 0; i + 1 < rules.length; i++) { const g = rules[i + 1] - rules[i]; if (g >= 120 * s && g <= 220 * s) { j = i; break; } }
  if (j < 1) throw new Error('layout');
  // every lesson row has the same height; the cards below the table (strengths / weaknesses) have rules too, but of another pitch
  const bands: [number, number][] = [];
  const pitch = rules[j + 1] - rules[j];
  for (let i = j; i + 1 < rules.length && bands.length < 8; i++) { const g = rules[i + 1] - rules[i]; if (Math.abs(g - pitch) <= 0.06 * pitch) bands.push([rules[i], rules[i + 1]]); else break; }
  const sections: MazSection[] = bands.map(([y0, y1], k) => {
    const rowBox = (x0: number, x1: number, a: number, b: number): Box => ({ x: Math.round(x0 * s), y: Math.round(y0 + a * s), w: Math.round((x1 - x0) * s), h: Math.max(4, Math.min(Math.round((b - a) * s), y1 - y0 - Math.round(a * s) - 2)) });
    // heading (lesson name): ink box of the bold name line in the right-most column
    const hb = rowBox(1850, 2300, 10, 75);
    const gs = components(hb, pageInk, Math.max(3, Math.round(6 * s * s)));
    let hbox: Box = { x: 0, y: y0, w: 1, h: 1 };
    if (gs.length) { const x0 = Math.min(...gs.map((g) => g.box.x)), x1 = Math.max(...gs.map((g) => g.box.x + g.box.w)), a = Math.min(...gs.map((g) => g.box.y)), b = Math.max(...gs.map((g) => g.box.y + g.box.h)); hbox = { x: x0, y: a, w: Math.max(1, x1 - x0), h: Math.max(1, b - a) }; }
    const lv = rightmost(readNumbers(r, rowBox(1690, 1830, 4, 75), digitInk, NOM.tlevel * s, s))?.v ?? null;
    const rk = rightmost(readNumbers(r, rowBox(150, 400, 4, ROW_H - 4), digitInk, NOM.rank * s, s))?.v ?? null;
    // «درست ۳۶ | نادرست ۲ | نزده ۲» — only the numbers are dark/coloured, the words are grey; right → left = correct, wrong, blank
    const ans = readNumbers(r, rowBox(700, 1215, 4, ROW_H - 4), digitInk, NOM.ans * s, s, 1.0).reverse();
    if (ans.length !== 3) warnings.push(`پاسخ‌های درس ${k + 1} کامل خوانده نشد.`);
    return {
      index: k, headingBox: hbox, sig: signature(r, hbox, pageInk),
      level: lv, correct: ans[0]?.v ?? null, wrong: ans[1]?.v ?? null, blank: ans.length === 3 ? ans[2].v : null,
      countryRank: rk, levelChange: null, dispersion: null
    };
  });
  if (!sections.length) throw new Error('layout');
  if (level === null && sections.every((x) => x.level === null)) throw new Error('layout');

  const out: MazReport = {
    stage, date, time, avgLevel, level, levelChange: null, countryRank, regionRank, participants, absent, correct, wrong, blank, sections, warnings
  };
  if (out.correct !== null && out.wrong !== null && out.blank !== null) {
    const sum = (f: (x: MazSection) => number | null) => sections.reduce((a, x) => a + (f(x) ?? NaN), 0);
    if (sum((x) => x.correct) !== out.correct || sum((x) => x.wrong) !== out.wrong || sum((x) => x.blank) !== out.blank) warnings.push('جمع درس‌ها با جمع کل کارنامه نمی‌خواند؛ اعداد را بررسی کن.');
  }
  sections.forEach((x) => {
    if (x.correct === null || x.wrong === null || x.blank === null) warnings.push(`اعداد درس ${x.index + 1} کامل خوانده نشد.`);
    if (x.level !== null && (x.level < 500 || x.level > 20000)) warnings.push(`تراز درس ${x.index + 1} (${x.level}) غیرعادی است.`);
  });
  if (out.level !== null && (out.level < 500 || out.level > 20000)) warnings.push(`تراز کل (${out.level}) غیرعادی است.`);
  return out;
}

/** where the «نام» and «نام خانوادگی» values are (2400-wide units, already shifted for this picture) — for the name reader and the preview crop */
export function cardNameRects(r: Raster): { x0: number; x1: number; y0: number; y1: number }[] | null {
  const g = cardGeometry(r); if (!g) return null;
  const s = r.width / 2400, il = g.infoLines;
  // the value sits at the bottom-left of its row; the grey label is at the right edge (x ≥ 640), so stop before it
  return [0, 1].map((i) => ({ x0: 110, x1: 630, y0: il[i] / s + 4, y1: (il[i + 1]) / s - 3 }));
}
