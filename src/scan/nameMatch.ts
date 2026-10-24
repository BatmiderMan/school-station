// Fuzzy student-name matching. Works with names written in another order (first/last swapped), with extra or missing words,
// typos, Arabic/Persian letter variants, glued or split words, and with letters that the PDF text layer lost («�» = any letter).
import { base } from './glyphLearn';

export interface NameStudent { id: string; name: string }
export interface NameHit { id: string; name: string; score: number; why: string }

const WILD = '\ufffd';
/** unify spelling variants that people mix up when typing names */
const loose = (w: string) => w.replace(/[ثصشڛ]/g, 'س').replace(/[ذضظ]/g, 'ز').replace(/ط/g, 'ت').replace(/ق/g, 'غ').replace(/ح/g, 'ه').replace(/[ؤ]/g, 'و').replace(/ژ/g, 'ز').replace(/گ/g, 'ک').replace(/چ/g, 'ج').replace(/پ/g, 'ب')
  .replace(/(.)\1+/g, '$1');
const clean = (s: string) => base(s).replace(/[^\u0600-\u06ff\ufffd\s]/g, ' ').replace(/[ـ]/g, '');
export const tokens = (s: string): string[] => clean(s).split(/\s+/).filter((t) => t.length > 0 && !/^[\u0660-\u0669]+$/.test(t));

/** edit distance where a wildcard letter matches anything */
function dist(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const same = a[i - 1] === b[j - 1] || a[i - 1] === WILD || b[j - 1] === WILD;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (same ? 0 : 1));
  }
  return d[a.length][b.length];
}
/** longest common subsequence length (wildcards match) — tolerant of lost letters */
function lcs(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = a[i - 1] === b[j - 1] || a[i - 1] === WILD || b[j - 1] === WILD ? d[i - 1][j - 1] + 1 : Math.max(d[i - 1][j], d[i][j - 1]);
  return d[a.length][b.length];
}
/** similarity of two single words, 0..1 */
export function wordSim(a: string, b: string): number {
  if (!a || !b) return 0;
  const m = Math.max(a.length, b.length);
  const s1 = 1 - dist(a, b) / m;
  const s2 = lcs(a, b) / m;                     // lost letters
  const la = loose(a), lb = loose(b), m2 = Math.max(la.length, lb.length) || 1;
  const s3 = 1 - dist(la, lb) / m2;             // spelling variants
  // a very short word must be (almost) exact: «علی» ≠ «علیرضا»
  const len = Math.min(a.length, b.length);
  const strict = len <= 3 ? 0.75 : 1;
  return Math.max(s1, s2 * 0.93, s3 * 0.96) * (Math.abs(a.length - b.length) > 2 && len <= 4 ? strict : 1);
}

/** best one-to-one assignment of the shorter token list into the longer (brute force; names have ≤ 5 words) */
function assign(A: string[], B: string[]): { sum: number; pairs: number } {
  const [S, L] = A.length <= B.length ? [A, B] : [B, A];
  let best = 0; const used = new Array(L.length).fill(false);
  const go = (i: number, acc: number) => {
    if (i === S.length) { best = Math.max(best, acc); return; }
    for (let j = 0; j < L.length; j++) if (!used[j]) { used[j] = true; go(i + 1, acc + wordSim(S[i], L[j])); used[j] = false; }
    go(i + 1, acc); // leave this word unmatched
  };
  go(0, 0);
  return { sum: best, pairs: S.length };
}

/** similarity between a name found in a file and a roster name, 0..1 (order-independent) */
export function nameSim(found: string, roster: string): number {
  const A = tokens(found), B = tokens(roster);
  if (!A.length || !B.length) return 0;
  const { sum } = assign(A, B);
  const tok = sum / Math.max(A.length, B.length) * 0.35 + sum / Math.min(A.length, B.length) * 0.65; // extra words cost a little, missing words cost more
  // glued / split words: compare the whole names with spaces removed, in either word order
  const ja = A.join(''), jb = B.join(''), jr = [...B].reverse().join('');
  const whole = Math.max(wordSim(ja, jb), wordSim(ja, jr));
  const coverage = Math.min(A.length, B.length) / Math.max(A.length, B.length);
  return Math.min(1, Math.max(tok * (0.85 + 0.15 * coverage), whole * 0.97));
}

/** rank roster students for one or more name candidates (text layer, file name …) */
export function matchStudents(candidates: string[], roster: NameStudent[]): NameHit[] {
  const cands = candidates.map((c) => c.trim()).filter((c) => tokens(c).length);
  return roster.map((s) => {
    let score = 0, why = '';
    cands.forEach((c, k) => { const v = nameSim(c, s.name) * (k === 0 ? 1 : 0.97); if (v > score) { score = v; why = c; } });
    return { id: s.id, name: s.name, score, why };
  }).filter((h) => h.score > 0.35).sort((a, b) => b.score - a.score);
}

/** decide whether the top hit can be chosen automatically */
export function confident(hits: NameHit[]): NameHit | null {
  if (!hits.length) return null;
  const [a, b] = hits; const margin = a.score - (b ? b.score : 0);
  return (a.score >= 0.93 && margin >= 0.04) || (a.score >= 0.78 && margin >= 0.1) ? a : null;
}

/** «ابوالفضل_رعیتی_۲.pdf» → «ابوالفضل رعیتی» */
export function nameFromFilename(fn: string): string {
  return tokens(fn.replace(/\.[^.]+$/, '').replace(/[_\-.()\[\]]+/g, ' ').replace(/[0-9۰-۹]+/g, ' ')).join(' ');
}
