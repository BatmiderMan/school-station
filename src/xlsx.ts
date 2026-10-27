// خروجی اکسل «قالب مدرسه»: همان ۴ شیت، همان ستون‌ها، همان استایل و رنگ‌آمیزی فایل اکسل شخصی (ریاضی/تجربی × قلم‌چی/ماز).
// هر دانش‌آموز × هر تاریخ آزمون یک ردیف دارد و نتیجه‌های ثبت‌شده در برنامه داخل آن پر می‌شود.
// بدون هیچ کتابخانه‌ی بیرونی: فایل xlsx یک zip از چند فایل XML است و همین‌جا ساخته می‌شود.
import { STYLES_XML, THEME_XML, COLS_XML } from './xlsxTemplate';

/* ---------- zip (بدون فشرده‌سازی) ---------- */
const CRC: number[] = (() => { const t: number[] = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t.push(c >>> 0); } return t; })();
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const enc = new TextEncoder();

function zip(files: [string, string][]): Uint8Array {
  const now = new Date(), dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff, dd = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  const parts: Uint8Array[] = [], central: Uint8Array[] = []; let off = 0;
  const u16 = (v: number) => [v & 255, (v >>> 8) & 255], u32 = (v: number) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  for (const [name, text] of files) {
    const nb = enc.encode(name), data = enc.encode(text), crc = crc32(data);
    const head = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dt), ...u16(dd), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nb.length), ...u16(0)]);
    parts.push(head, nb, data);
    central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(dt), ...u16(dd), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(nb.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nb);
    off += head.length + nb.length + data.length;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(off), ...u16(0)]);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let p = 0;
  for (const b of all) { out.set(b, p); p += b.length; }
  return out;
}

/* ---------- ابزار XML ---------- */
const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const L = (i: number) => String.fromCharCode(65 + i); // ستون‌ها حداکثر تا M
const sq = (s: string) => String(s || '').normalize('NFKC').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\s]/g, '').replace(/[\u064b-\u065f]/g, '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

/* ---------- تعریف شیت‌ها (دقیقاً مثل فایل اکسل) ---------- */
type Col = { h: string; key: 'level' | 'rank' | 'school' | 'les' | 'blank' | 'note'; s: number; hs: number; al?: string[] };
type Sheet = { name: string; inst: string; math: boolean; cols: Col[] };
const les = (h: string, s: number, hs: number, al: string[]): Col => ({ h, key: 'les', s, hs, al });
const SHEETS: Sheet[] = [
  { name: 'ریاضی_قلم چی', inst: 'قلم‌چی', math: true, cols: [
    { h: 'تراز کل', key: 'level', s: 3, hs: 11 }, { h: 'رتبه کل', key: 'rank', s: 3, hs: 11 }, { h: 'رتبه در مدرسه', key: 'school', s: 15, hs: 11 },
    les('حسابان', 12, 11, ['حسابان']), les('هندسه', 12, 11, ['هندسه']), les('گسسته', 12, 11, ['گسسته', 'ریاضیات گسسته']), les('فیزیک', 12, 11, ['فیزیک']), les('شیمی', 12, 11, ['شیمی']),
    { h: '', key: 'blank', s: 3, hs: 11 }, { h: 'توضیحات', key: 'note', s: 5, hs: 11 }] },
  { name: 'تحربی_قلمچی', inst: 'قلم‌چی', math: false, cols: [
    { h: ' تراز کل', key: 'level', s: 3, hs: 2 }, { h: 'رتبه کل', key: 'rank', s: 3, hs: 2 }, { h: 'رتبه در مدرسه', key: 'school', s: 15, hs: 2 },
    les('زیست', 12, 2, ['زیست', 'زیست شناسی']), les('فیزیک', 24, 2, ['فیزیک']), les('شیمی', 24, 2, ['شیمی']), les('ریاضی', 12, 2, ['ریاضی', 'ریاضیات']), les('زمین شناسی', 12, 2, ['زمین شناسی', 'زمین']),
    { h: 'توضیحات', key: 'note', s: 5, hs: 11 }] },
  { name: 'ریاضی_ماز', inst: 'ماز', math: true, cols: [
    { h: 'رتبه', key: 'rank', s: 3, hs: 11 }, { h: 'تراز', key: 'level', s: 3, hs: 11 },
    les('ریاضیات', 23, 11, ['ریاضیات', 'ریاضی']), les('فیزیک', 23, 11, ['فیزیک']), les('شیمی', 23, 11, ['شیمی']),
    { h: 'توضیحات', key: 'note', s: 5, hs: 11 }] },
  { name: 'تجربی_ماز', inst: 'ماز', math: false, cols: [
    { h: 'رتبه ', key: 'rank', s: 3, hs: 2 }, { h: 'تراز', key: 'level', s: 3, hs: 2 },
    les('زیست شناسی', 12, 2, ['زیست شناسی', 'زیست']), les('فیزیک', 12, 2, ['فیزیک']), les('شیمی', 12, 2, ['شیمی']), les('ریاضی', 12, 2, ['ریاضی', 'ریاضیات']), les('زمین شناسی', 12, 2, ['زمین شناسی', 'زمین']),
    { h: 'توضیحات', key: 'note', s: 5, hs: 11 }] },
];
// قانون‌های رنگ‌آمیزی اکسل شما: تراز بالا = سبز، رتبه‌ی کمتر از ۱۰۰۰ = قرمز (شماره‌ی dxf از styles.xml خودتان)
const CF: Record<number, { col: string; op: string; f: string[]; dxf: number }[]> = {
  0: [{ col: 'D', op: 'greaterThan', f: ['7000'], dxf: 18 }, { col: 'E', op: 'between', f: ['1', '999'], dxf: 17 }],
  1: [{ col: 'D', op: 'greaterThan', f: ['7000'], dxf: 9 }, { col: 'E', op: 'between', f: ['1', '999'], dxf: 8 }],
  2: [{ col: 'E', op: 'greaterThan', f: ['11500'], dxf: 2 }],
  3: [{ col: 'E', op: 'greaterThan', f: ['11500'], dxf: 0 }],
};
// برنامه‌ی آزمون‌های سال (همان ۱۸ تاریخ فایل اکسل شما) + توضیحات تاریخ‌ها؛ آزمونی که در برنامه ثبت شده ولی تاریخش این‌جا نیست هم خودکار اضافه می‌شود
const DATES = ['1405/07/17', '1405/08/01', '1405/08/15', '1405/08/29', '1405/09/13', '1405/09/20', '1405/09/27', '1405/10/25', '1405/11/02', '1405/11/09', '1405/11/23', '1405/12/07', '1405/12/21', '1406/01/07', '1406/01/20', '1406/02/03', '1406/02/17', '1406/02/31'];
const NOTES: Record<string, string> = {
  '1405/09/20': 'جامع دهم و یازدهم و بودجه دوازدهم', '1405/11/02': 'جامع دهم و یازدهم - دوازدهم نیست', '1406/01/07': 'جامع دهم و یازدهم - دوازدهم نیست',
  '1406/02/31': 'آزمون جامع مطابق کنکور\n21 خرداد و 28 خرداد و 4 تیر ماه',
};
const ABSENT = 'شرکت نکردند';

/* ---------- ساخت ---------- */
export function buildSchoolXlsx(D: any, CL: string[]): Uint8Array {
  const exams: any[] = D.exams || [], students: any[] = D.students || [];
  const dates = [...new Set<string>([...DATES, ...exams.map((e) => String(e.date || '').trim()).filter((d) => /^\d{4}\/\d{2}\/\d{2}$/.test(d))])].sort();
  const cmp = (a: any, b: any) => CL.indexOf(a.cls) - CL.indexOf(b.cls) || String(a.name).localeCompare(String(b.name), 'fa');
  const expClasses = CL.filter((c) => !c.startsWith('ریاضی'));
  // رتبه‌ی مدرسه: بین دانش‌آموزان هم‌رشته که در همان آزمون نتیجه دارند (بر اساس تراز)
  const schoolRank = (e: any, sid: string, math: boolean) => {
    const me = e.res[sid]?.level; if (me == null) return null;
    return 1 + students.filter((s) => s.cls.startsWith('ریاضی') === math && e.res[s.id] && e.res[s.id].level > me).length;
  };
  const lookup = (r: any, al: string[]): number | null => {
    const want = al.map(sq);
    for (const m of [r.les, r.subj]) {
      if (!m) continue;
      for (const k of Object.keys(m)) if (want.includes(sq(k)) && typeof m[k] === 'number') return m[k];
    }
    return null;
  };

  const files: [string, string][] = [];
  const ct: string[] = [], wbSheets: string[] = [], wbNames: string[] = [], wbRels: string[] = [];
  SHEETS.forEach((sh, si) => {
    const no = si + 1, lastCol = 3 + sh.cols.length - 1, lc = L(lastCol), noteCol = sh.cols.findIndex((c) => c.key === 'note') + 3;
    const list = students.filter((s) => String(s.cls).startsWith('ریاضی') === sh.math).sort(cmp);
    const byDate = new Map<string, any[]>(); dates.forEach((d) => byDate.set(d, exams.filter((e) => e.inst === sh.inst && String(e.date).trim() === d)));
    const rows: string[] = [], comments: { ref: string; row: number; text: string }[] = [];
    const tx = (ref: string, s: number, v: string) => `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
    const nm = (ref: string, s: number, v: number) => `<c r="${ref}" s="${s}"><v>${v}</v></c>`;
    const bl = (ref: string, s: number) => `<c r="${ref}" s="${s}"/>`;
    rows.push(`<row r="1" ht="44.25" customHeight="1"><c r="B1" s="4"/><c r="C1" s="7"/></row>`);
    rows.push(`<row r="3" ht="24" customHeight="1">${tx('A3', 2, 'ردیف')}${tx('B3', 2, 'نام داوطلب')}${tx('C3', 2, 'تاریخ')}${sh.cols.map((c, i) => (c.h ? tx(`${L(3 + i)}3`, c.hs, c.h) : bl(`${L(3 + i)}3`, c.hs))).join('')}</row>`);
    let r = 4;
    list.forEach((s, k) => {
      const aS = sh.math ? 9 : expClasses.indexOf(s.cls) % 2 === 0 ? 22 : 21;
      dates.forEach((d) => {
        const ex = byDate.get(d) || [], e = ex.find((x) => x.res[s.id]) || null, res = e ? e.res[s.id] : null;
        const cells: string[] = [nm(`A${r}`, aS, k + 1), tx(`B${r}`, 8, s.name), tx(`C${r}`, 9, d)];
        sh.cols.forEach((c, i) => {
          const ref = `${L(3 + i)}${r}`; let v: number | string | null = null;
          if (res) {
            if (c.key === 'level') v = res.level ?? null;
            else if (c.key === 'rank') v = res.rank ?? null;
            else if (c.key === 'school') v = schoolRank(e, s.id, sh.math);
            else if (c.key === 'les') v = lookup(res, c.al || []);
          } else if (c.key === 'note' && ex.some((x) => Object.keys(x.res || {}).length)) v = ABSENT;
          if (typeof v === 'number' && isFinite(v)) cells.push(nm(ref, c.s, v)); else if (typeof v === 'string' && v) cells.push(tx(ref, c.s, v)); else cells.push(bl(ref, c.s));
        });
        const note = NOTES[d] || ex.map((x) => x.note).find(Boolean);
        if (note) comments.push({ ref: `C${r}`, row: r - 1, text: String(note) });
        rows.push(`<row r="${r}" ht="20.100000000000001" customHeight="1">${cells.join('')}</row>`);
        r++;
      });
    });
    const last = Math.max(r - 1, 4);
    const cf = CF[si].map((x, i) => `<conditionalFormatting sqref="${x.col}4:${x.col}1048576"><cfRule type="cellIs" dxfId="${x.dxf}" priority="${i + 1}" operator="${x.op}">${x.f.map((f) => `<formula>${f}</formula>`).join('')}</cfRule></conditionalFormatting>`).join('');
    const hasC = comments.length > 0;
    files.push([`xl/worksheets/sheet${no}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${lc}${last}"/><sheetViews><sheetView rightToLeft="1" ${si === 0 ? 'tabSelected="1" ' : ''}zoomScaleNormal="100" workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A4" sqref="A4"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>${COLS_XML[no]}<sheetData>${rows.join('')}</sheetData><autoFilter ref="A3:${lc}${last}"/>${cf}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="portrait"/>${hasC ? '<legacyDrawing r:id="rId1"/>' : ''}</worksheet>`]);
    if (hasC) {
      files.push([`xl/worksheets/_rels/sheet${no}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing" Target="../drawings/vmlDrawing${no}.vml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="../comments${no}.xml"/></Relationships>`]);
      files.push([`xl/comments${no}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><authors><author>School Station</author></authors><commentList>${comments.map((c) => `<comment ref="${c.ref}" authorId="0"><text><r><rPr><sz val="9"/><color indexed="81"/><rFont val="Tahoma"/></rPr><t xml:space="preserve">${esc(c.text)}</t></r></text></comment>`).join('')}</commentList></comments>`]);
      files.push([`xl/drawings/vmlDrawing${no}.vml`, `<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="${no}"/></o:shapelayout><v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>${comments.map((c, i) => `<v:shape id="_x0000_s${no * 1024 + i + 1}" type="#_x0000_t202" style="position:absolute;margin-left:80pt;margin-top:2pt;width:140pt;height:60pt;z-index:${i + 1};visibility:hidden" fillcolor="#ffffe1" o:insetmode="auto"><v:fill color2="#ffffe1"/><v:shadow on="t" color="black" obscured="t"/><v:path o:connecttype="none"/><v:textbox style="mso-direction-alt:auto"><div style="text-align:right"></div></v:textbox><x:ClientData ObjectType="Note"><x:MoveWithCells/><x:SizeWithCells/><x:Anchor>3, 15, ${c.row}, 2, 5, 15, ${c.row + 4}, 4</x:Anchor><x:AutoFill>False</x:AutoFill><x:Row>${c.row}</x:Row><x:Column>2</x:Column></x:ClientData></v:shape>`).join('')}</xml>`]);
      ct.push(`<Override PartName="/xl/comments${no}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml"/>`);
    }
    void noteCol;
    ct.push(`<Override PartName="/xl/worksheets/sheet${no}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
    wbSheets.push(`<sheet name="${esc(sh.name)}" sheetId="${no}" r:id="rId${no}"/>`);
    wbNames.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${si}" hidden="1">'${esc(sh.name)}'!$A$3:$${lc}$${last}</definedName>`);
    wbRels.push(`<Relationship Id="rId${no}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${no}.xml"/>`);
  });
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  return zip([
    ['[Content_Types].xml', `${head}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${ct.join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>`],
    ['_rels/.rels', `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `${head}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="-120" yWindow="-120" windowWidth="24240" windowHeight="13140" tabRatio="700" activeTab="0"/></bookViews><sheets>${wbSheets.join('')}</sheets><definedNames>${wbNames.join('')}</definedNames><calcPr calcId="191029"/></workbook>`],
    ['xl/_rels/workbook.xml.rels', `${head}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRels.join('')}<Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId11" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>`],
    ['xl/styles.xml', STYLES_XML],
    ['xl/theme/theme1.xml', THEME_XML],
    ...files,
  ]);
}
