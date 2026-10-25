// ذخیره‌ی داده‌های پنل مدیر روی Supabase (جدول admin_data). فقط آنلاین؛ با نسخه‌گذاری برای جلوگیری از رونویسی ناخواسته.
import { sb } from './supa';

export type Doc = { data: any; version: number } | null;

export async function loadDoc(key: string): Promise<Doc> {
  const { data, error } = await sb.from('admin_data').select('data,version').eq('key', key).maybeSingle();
  if (error) throw error;
  return data ? { data: data.data, version: data.version } : null;
}
// نتیجه: نسخه‌ی جدید، یا null اگر کس دیگری در این فاصله ذخیره کرده باشد (تداخل)
async function putDoc(key: string, data: any, ver: number): Promise<number | null> {
  if (ver === 0) {
    const { error } = await sb.from('admin_data').insert({ key, data, version: 1 });
    if (error) { if (error.code === '23505') return null; throw error; }
    return 1;
  }
  const { data: rows, error } = await sb.from('admin_data').update({ data, version: ver + 1, updated_at: new Date().toISOString() }).eq('key', key).eq('version', ver).select('version');
  if (error) throw error;
  return rows?.length ? ver + 1 : null;
}

/* ---------- ذخیره‌ی خودکار ---------- */
let ver = 0, latest: any = null, dirty = false, busy = false, timer: any = 0, hideT: any = 0;
export const setVersion = (v: number) => { ver = v; };

function badge(t: string, kind: 'ok' | 'wait' | 'bad') {
  let b = document.getElementById('sync'); if (!b) { b = document.createElement('div'); b.id = 'sync'; document.body.appendChild(b); }
  b.textContent = t; b.className = kind; clearTimeout(hideT); if (kind === 'ok') hideT = setTimeout(() => b!.classList.add('off'), 2200);
}
/* ---------- کپی محلی (برای کار بدون اینترنت): هر بار که داده خوانده یا ذخیره می‌شود، یک نسخه روی همین دستگاه هم می‌ماند ---------- */
const MK = 'ss_mirror';
export type Mirror = { data: any; base: number; dirty: boolean; at: string } | null;
export function mirrorGet(): Mirror { try { return JSON.parse(localStorage.getItem(MK) || 'null'); } catch (e) { return null; } }
export function mirrorSet(data: any, base: number, dirty: boolean): boolean { try { localStorage.setItem(MK, JSON.stringify({ data, base, dirty, at: new Date().toISOString() })); return true; } catch (e) { return false; } }
export function mirrorClear() { try { localStorage.removeItem(MK); } catch (e) { /* ignore */ } }
// ذخیره در حالت آفلاین: فقط روی همین دستگاه؛ base = نسخه‌ی سروری که این کپی از آن آمده، برای تشخیص تداخل هنگام اتصال دوباره
export function offlineSave(d: any) {
  const m = mirrorGet();
  if (mirrorSet(d, m ? m.base : 0, true)) badge('📴 ذخیره شد (فقط روی این دستگاه)', 'ok');
  else badge('⚠️ حافظه‌ی مرورگر پر است؛ همین حالا «پشتیبان JSON» بگیرید', 'bad');
}

export function scheduleSave(d: any) { latest = d; dirty = true; mirrorSet(d, ver, true); badge('در حال ذخیره…', 'wait'); clearTimeout(timer); timer = setTimeout(flush, 700); }
async function flush() {
  if (busy || !dirty) return; busy = true; dirty = false;
  try {
    let v = await putDoc('main', latest, ver);
    if (v === null) {
      if (confirm('اطلاعات در دستگاه یا تب دیگری تغییر کرده است.\n\nتأیید = نسخه‌ی همین صفحه جایگزین شود\nانصراف = آخرین نسخه‌ی سرور بارگذاری شود (تغییرهای همین صفحه از بین می‌رود)')) {
        const cur = await loadDoc('main'); v = await putDoc('main', latest, cur ? cur.version : 0);
      } else { dirty = false; mirrorClear(); location.reload(); return; }
    }
    if (v !== null) ver = v;
    mirrorSet(latest, ver, dirty);
    badge('☁️ ذخیره شد', 'ok');
  } catch (e) { dirty = true; badge('⚠️ ذخیره نشد؛ دوباره تلاش می‌شود…', 'bad'); clearTimeout(timer); timer = setTimeout(flush, 5000); }
  busy = false; if (dirty && !timer) timer = setTimeout(flush, 300);
}
window.addEventListener('beforeunload', (e) => { if (dirty || busy) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty) { clearTimeout(timer); timer = 0; flush(); } });

/* ---------- صندوق ورودی: هر ارسال یک ردیف جدا (چون فایل دارد) ---------- */
export async function inboxGet(): Promise<any[]> {
  const { data, error } = await sb.from('admin_data').select('data').like('key', 'inbox:%'); if (error) throw error;
  return data.map((r: any) => r.data).sort((a: any, b: any) => String(a.created_at).localeCompare(String(b.created_at)));
}
export async function inboxSet(arr: any[]) {
  const { data: ex, error } = await sb.from('admin_data').select('key').like('key', 'inbox:%'); if (error) throw error;
  const have = new Set<string>(ex.map((r: any) => r.key)), want = new Map<string, any>(arr.map((i) => ['inbox:' + i.id, i]));
  const add = [...want].filter(([k]) => !have.has(k)).map(([k, v]) => ({ key: k, data: v }));
  const del = [...have].filter((k) => !want.has(k));
  if (add.length) { const r = await sb.from('admin_data').upsert(add); if (r.error) throw r.error; }
  if (del.length) { const r = await sb.from('admin_data').delete().in('key', del); if (r.error) throw r.error; }
}

/* ---------- نسخه‌ی خودکار روزانه: وضعیت ابتدای هر روز؛ فقط امروز و دیروز نگه داشته می‌شود ---------- */
const p2 = (x: number) => String(x).padStart(2, '0');
const dayKey = (t: Date) => `${t.getFullYear()}-${p2(t.getMonth() + 1)}-${p2(t.getDate())}`;
export async function dailySnapshot(data: any) {
  try {
    const keep = ['snapshot:' + dayKey(new Date()), 'snapshot:' + dayKey(new Date(Date.now() - 864e5))];
    const { data: ex, error } = await sb.from('admin_data').select('key').like('key', 'snapshot:%'); if (error) throw error;
    const have = new Set<string>(ex.map((r: any) => r.key));
    if (!have.has(keep[0])) { const r = await sb.from('admin_data').insert({ key: keep[0], data }); if (r.error && r.error.code !== '23505') throw r.error; }
    const old = [...have].filter((k) => !keep.includes(k));
    if (old.length) await sb.from('admin_data').delete().in('key', old);
  } catch (e) { /* نسخه‌ی خودکار اختیاری است؛ خطا برنامه را متوقف نمی‌کند */ }
}
export async function snapList(): Promise<{ key: string; data: any }[]> {
  const { data, error } = await sb.from('admin_data').select('key,data').like('key', 'snapshot:%'); if (error) throw error;
  return data.sort((a: any, b: any) => (a.key < b.key ? 1 : -1));
}
