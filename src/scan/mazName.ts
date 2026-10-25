// Reads the student's name from a Maz sheet picture. The sheet is an image (no text layer), so the two name cards
// («نام» and «نام خانوادگی») are cut out, split into words, and every word is compared — as a picture — with the same
// word drawn in the sheet's own font (Vazirmatn) for every name that occurs in the roster. It is a closed-set reader:
// it can only answer with names you already have, which is exactly what is needed to pick the student.
import type { Raster } from './raster';

export interface Gray { w: number; h: number; d: Float32Array }
export interface OcrWord { token: string | null; score: number; second: number }

const H = 28; // every word picture is brought to this height before comparing

/* ---------- small image helpers ---------- */
const percentile = (a: Float32Array, p: number) => { const s = Float32Array.from(a).sort(); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
function bands(on: ArrayLike<number>, min = 1): [number, number][] {
  const out: [number, number][] = []; let st = -1;
  for (let i = 0; i <= on.length; i++) { const v = i < on.length && on[i] >= min; if (v && st < 0) st = i; if (!v && st >= 0) { out.push([st, i - 1]); st = -1; } }
  return out;
}
function bilinear(m: Float32Array, w: number, h: number, nw: number, nh: number): Float32Array {
  const o = new Float32Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    const fy = Math.min(h - 1, Math.max(0, ((y + 0.5) * h) / nh - 0.5)), y0 = Math.floor(fy), y1 = Math.min(h - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < nw; x++) {
      const fx = Math.min(w - 1, Math.max(0, ((x + 0.5) * w) / nw - 0.5)), x0 = Math.floor(fx), x1 = Math.min(w - 1, x0 + 1), tx = fx - x0;
      o[y * nw + x] = (m[y0 * w + x0] * (1 - tx) + m[y0 * w + x1] * tx) * (1 - ty) + (m[y1 * w + x0] * (1 - tx) + m[y1 * w + x1] * tx) * ty;
    }
  }
  return o;
}
function blur(m: Float32Array, w: number, h: number, sigma = 0.8): Float32Array {
  const r = 2, k: number[] = []; let sum = 0; for (let i = -r; i <= r; i++) { const v = Math.exp(-(i * i) / (2 * sigma * sigma)); k.push(v); sum += v; } for (let i = 0; i < k.length; i++) k[i] /= sum;
  const t = new Float32Array(m.length), o = new Float32Array(m.length);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let i = -r; i <= r; i++) a += m[y * w + Math.min(w - 1, Math.max(0, x + i))] * k[i + r]; t[y * w + x] = a; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let i = -r; i <= r; i++) a += t[Math.min(h - 1, Math.max(0, y + i)) * w + x] * k[i + r]; o[y * w + x] = a; }
  return o;
}
/** tight box around the ink of a darkness map */
function cropInk(m: Float32Array, w: number, h: number, thr = 0.3): Gray | null {
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x] > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const nw = x1 - x0 + 1, nh = y1 - y0 + 1, o = new Float32Array(nw * nh);
  for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) o[y * nw + x] = m[(y0 + y) * w + x0 + x];
  return { w: nw, h: nh, d: o };
}
/** darkness map → height-H, slightly blurred picture of the word */
function normWord(g: Gray): Gray {
  const nw = Math.max(4, Math.round((g.w * H) / g.h)), r = bilinear(g.d, g.w, g.h, nw, H);
  return { w: nw, h: H, d: blur(r, nw, H) };
}
function ncc(a: Float32Array, b: Float32Array): number {
  let ma = 0, mb = 0; for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; } ma /= a.length; mb /= b.length;
  let s = 0, sa = 0, sb = 0; for (let i = 0; i < a.length; i++) { const x = a[i] - ma, y = b[i] - mb; s += x * y; sa += x * x; sb += y * y; }
  const d = Math.sqrt(sa * sb); return d > 0 ? s / d : 0;
}
/** how much a word picture looks like a (normalised) candidate: 0..1 */
function similarity(img: Gray, cand: Gray): number {
  if (Math.abs(cand.w - img.w) > 0.22 * Math.max(cand.w, img.w)) return 0;
  return Math.max(0, ncc(img.d, bilinear(cand.d, cand.w, H, img.w, H)));
}

/* ---------- cutting words out of a name card ---------- */
/** the value line of a card («ابوالفضل») split into words, right → left; plus the merge of every two neighbours (for names the roster writes glued) */
export function cardWords(card: Gray): { words: Gray[]; pairs: Gray[] } {
  const bg = percentile(card.d, 0.9), ink = new Float32Array(card.d.length);
  for (let i = 0; i < ink.length; i++) ink[i] = Math.min(1, Math.max(0, (bg - card.d[i]) / Math.max(30, bg - 40)));
  const rows = new Float32Array(card.h), mask = (i: number) => (ink[i] > 0.45 ? 1 : 0);
  for (let y = 0; y < card.h; y++) { let c = 0; for (let x = 0; x < card.w; x++) c += mask(y * card.w + x); rows[y] = c; }
  const bs = bands(rows, 2).filter(([a, b]) => b - a >= 11); if (!bs.length) return { words: [], pairs: [] };
  const [y0, y1] = bs[bs.length - 1], bh = y1 - y0 + 1, cols = new Float32Array(card.w);
  for (let x = 0; x < card.w; x++) { let c = 0; for (let y = y0; y <= y1; y++) c += mask(y * card.w + x); cols[x] = c; }
  const segs = bands(cols, 1); if (!segs.length) return { words: [], pairs: [] };
  const thr = Math.max(6, 0.3 * bh), groups: [number, number][] = []; let cur: [number, number] = [...segs[0]] as [number, number];
  for (const s of segs.slice(1)) { if (s[0] - cur[1] - 1 > thr) { groups.push(cur); cur = [...s] as [number, number]; } else cur[1] = s[1]; }
  groups.push(cur);
  const cut = (x0: number, x1: number): Gray | null => { const w = x1 - x0 + 1, h = y1 - y0 + 1, o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = ink[(y0 + y) * card.w + x0 + x]; const c = cropInk(o, w, h); return c ? normWord(c) : null; };
  const words = groups.map(([a, b]) => cut(a, b)).reverse().filter(Boolean) as Gray[];
  const pairs: Gray[] = []; const g2 = [...groups].reverse();
  for (let i = 0; i + 1 < g2.length; i++) { const p = cut(g2[i + 1][0], g2[i][1]); if (p) pairs.push(p); }
  return { words, pairs };
}

/* ---------- recognising ---------- */
export type Renderer = (token: string) => Gray | null; // darkness map (0..1) of the token drawn in the sheet's font
const cache = new Map<string, Gray | null>();
const cand = (t: string, render: Renderer): Gray | null => {
  if (!cache.has(t)) { const r = render(t); const c = r && cropInk(r.d, r.w, r.h); cache.set(t, c ? normWord(c) : null); }
  return cache.get(t)!;
};
function best(img: Gray, vocab: string[], render: Renderer): OcrWord {
  let b = 0, s2 = 0, tok: string | null = null;
  for (const t of vocab) { const c = cand(t, render); if (!c) continue; const v = similarity(img, c); if (v > b) { s2 = b; b = v; tok = t; } else if (v > s2) s2 = v; }
  return { token: tok, score: b, second: s2 };
}
/** read the words of the given name cards; only confident answers come back (otherwise token = null) */
export function recognize(cards: Gray[], vocab: string[], render: Renderer): OcrWord[] {
  const out: OcrWord[] = [];
  for (const card of cards) {
    const { words, pairs } = cardWords(card); let i = 0;
    while (i < words.length) {
      const one = best(words[i], vocab, render), two = i + 1 < words.length ? best(pairs[i], vocab, render) : { token: null, score: 0, second: 0 };
      if (two.token && two.score >= 0.72 && two.score - two.second >= 0.08 && two.score > one.score - 0.02) { out.push(two); i += 2; continue; }
      out.push(one.score >= 0.62 && one.score - one.second >= 0.1 ? one : { token: null, score: one.score, second: one.second }); i++;
    }
  }
  return out;
}

/* ---------- browser glue ---------- */
async function canvasRenderer(): Promise<Renderer> {
  try { await (document as any).fonts.load('400 40px Vazirmatn', 'ابوالفضل'); await (document as any).fonts.ready; } catch (e) { /* fall back to whatever font exists */ }
  const W = 1200, Hh = 160, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const ctx = cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D;
  return (t: string) => {
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, Hh); ctx.fillStyle = '#000'; ctx.font = '400 40px Vazirmatn'; (ctx as any).direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(t, W - 80, 100);
    const px = ctx.getImageData(0, 0, W, Hh).data, d = new Float32Array(W * Hh); for (let i = 0; i < d.length; i++) d[i] = 1 - px[i * 4] / 255;
    return { w: W, h: Hh, d };
  };
}
/** the vocabulary: every roster word, plus neighbouring words glued together («محمد»+«رضا» → «محمدرضا») */
export function vocabOf(roster: string[], tokens: (s: string) => string[]): string[] {
  const set = new Set<string>();
  roster.forEach((n) => { const t = tokens(n); t.forEach((x) => x.length >= 2 && set.add(x)); for (let i = 0; i + 1 < t.length; i++) set.add(t[i] + t[i + 1]); });
  return [...set];
}
/** returns the words found in the name cards, in reading order, as plain text ('' for words that are not in the roster) */
export async function readMazName(r: Raster, vocab: string[]): Promise<{ text: string; words: OcrWord[] }> {
  const s = r.width / 2400, y0 = Math.round(430 * s), y1 = Math.min(r.height, Math.round(640 * s)), g = new Float32Array(r.width * r.height);
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * r.data[i * 4] + 0.587 * r.data[i * 4 + 1] + 0.114 * r.data[i * 4 + 2];
  const card = (a: number, b: number): Gray => { const x0 = Math.round(a * s), x1 = Math.min(r.width, Math.round(b * s)), w = x1 - x0, h = y1 - y0, o = new Float32Array(w * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) o[y * w + x] = g[(y0 + y) * r.width + x0 + x]; return { w, h, d: o }; };
  const words = recognize([card(2040, 2380), card(1700, 2045)], vocab, await canvasRenderer());
  return { text: words.filter((w) => w.token).map((w) => w.token).join(' '), words };
}
