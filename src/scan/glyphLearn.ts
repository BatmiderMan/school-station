// Some PDF generators (Qt/wkhtmltopdf) leave a few glyph forms out of the font's ToUnicode map (e.g. the initial «ی»).
// pdfText.ts keeps those glyphs as private-use characters. Here the sheet's own known vocabulary (headers, lesson names,
// grade words, the student roster) is used to learn which letter each of those glyphs is — then every word, including
// the student's name, can be read in full.
import type { TextItem } from './pdfText';
import { isUnk } from './pdfText';

const FA = '۰۱۲۳۴۵۶۷۸۹', AR = '٠١٢٣٤٥٦٧٨٩';
/** base letters only: presentation forms → letters, Arabic variants → Persian, no spaces / ZWNJ / diacritics */
export const base = (s: string): string => s.normalize('NFKC').replace(/[يىئ]/g, 'ی').replace(/ك/g, 'ک').replace(/[ۀة]/g, 'ه').replace(/[أإٱ]/g, 'ا')
  .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d))).replace(/[٠-٩]/g, (d) => String(AR.indexOf(d))).replace(/[\u200c\u200d\u064b-\u065f\u0640]/g, '');

export const VOCAB = ['تاریخ', 'آزمون', 'نمایندگی', 'مدیر', 'پشتیبان', 'گروه', 'نام', 'میانگین', 'تراز', 'تعداد', 'شرکت', 'کرده', 'غیبت', 'زمان', 'دریافت', 'وضعیت', 'کلی', 'رتبه', 'کشوری', 'منطقه', 'شهر',
  'اختصاصی', 'کل', 'دفترچه', 'دهم', 'یازدهم', 'دوازدهم', 'کننده', 'این', 'آخرین', 'پردازش', 'نفر', 'سوالات', 'تفاوت', 'چند', 'شما', 'با', 'بازه', 'درس', 'درصد', 'پاسخ', 'دهنده', 'از', 'تا',
  'هوش', 'استعداد', 'مجموع', 'درست', 'اشتباه', 'گویی', 'سوال', 'سوالها', 'ریاضی', 'ریاضیات', 'گسسته', 'حسابان', 'هندسه', 'آمار', 'احتمال', 'فیزیک', 'شیمی', 'زیست', 'شناسی', 'ادبیات', 'عربی',
  'دین', 'زندگی', 'زبان', 'انگلیسی', 'اقتصاد', 'تاریخ', 'جغرافیا', 'منطق', 'فلسفه', 'علوم', 'اجتماعی', 'روانشناسی', 'تجربی', 'انسانی', 'پسران', 'دختران', 'یزد', 'فروردین', 'اردیبهشت', 'خرداد', 'تیر',
  'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند', 'نمره', 'کلید', 'ساده', 'درجه', 'سختی', 'امتحانی', 'دام', 'آموزشی', 'صحیح', 'پایه', 'هفتم', 'هشتم', 'نهم', 'سرعت', 'کارنامه'].map(base);

const wildcard = (c: string) => isUnk(c);
/** words of an item (split at spaces) as base-letter strings that still contain private-use placeholders */
const words = (t: string) => base(t).split(/[\s:،,()\-]+/).filter(Boolean);

/** learn glyph → letter votes from words that have exactly the vocabulary's length and agree on every known letter */
export function learnGlyphs(items: TextItem[], extra: string[] = []): Map<string, string> {
  const fixed = new Set(VOCAB);
  const vocab = [...new Set([...VOCAB, ...extra.map(base).filter((w) => w.length >= 2)])];
  const byLen = new Map<number, string[]>();
  vocab.forEach((w) => { const a = byLen.get(w.length) || []; a.push(w); byLen.set(w.length, a); });
  const known = new Map<string, string>();
  const allWords = items.flatMap((i) => words(i.text)).filter((w) => [...w].some(wildcard));
  for (let pass = 0; pass < 4; pass++) {
    const votes = new Map<string, Map<string, number>>();
    for (const w0 of allWords) {
      const w = [...w0].map((c) => (wildcard(c) && known.has(c) ? known.get(c)! : c)).join('');
      if (![...w].some(wildcard) || w.length < 2) continue;
      const cands = (byLen.get(w.length) || []).filter((v) => [...w].every((c, i) => wildcard(c) || c === v[i]));
      if (!cands.length || cands.length > 6) continue;
      cands.forEach((v) => [...w].forEach((c, i) => { if (!wildcard(c)) return; const m = votes.get(c) || new Map(); m.set(v[i], (m.get(v[i]) || 0) + (fixed.has(v) ? 1 : 0.5) / cands.length); votes.set(c, m); }));
    }
    let changed = false;
    votes.forEach((m, g) => {
      const top = [...m.entries()].sort((a, b) => b[1] - a[1]);
      const total = top.reduce((a, x) => a + x[1], 0);
      if (top[0][1] >= 0.8 && top[0][1] / total >= 0.7 && known.get(g) !== top[0][0]) { known.set(g, top[0][0]); changed = true; }
    });
    if (!changed) break;
  }
  return known;
}

/** replace learned glyphs by their letter; glyphs still unknown become «�» (a wildcard for the fuzzy matchers) */
export function decodeItems(items: TextItem[], extra: string[] = []): { items: TextItem[]; learned: number; unknown: number } {
  const known = learnGlyphs(items, extra); let unknown = 0;
  const out = items.map((it) => ({ ...it, text: [...it.text].map((c) => { if (!isUnk(c)) return c; const k = known.get(c); if (k) return k; unknown++; return '\ufffd'; }).join('') }));
  return { items: out, learned: known.size, unknown };
}
