// کش محلی + صف ارسال برای بخش‌هایی که با سرور کار می‌کنند (روز من، مشاوره، تماس‌ها).
// بدون اینترنت: آخرین داده‌ی دریافتی از کش خوانده می‌شود و هر تغییر در صف می‌ماند؛ با برگشتن اینترنت، به ترتیب برای سرور فرستاده می‌شود.
import { sb, cfgOk } from './supa';

const W: any = window;
export type Op =
  | { k: 'rpc'; fn: string; args: any }
  | { k: 'upsert'; table: string; rows: any[]; onConflict: string }
  | { k: 'update'; table: string; id: string; patch: any }
  | { k: 'delete'; table: string; id: string };
type QOp = Op & { qid: string; qat: number };

/* ---------- IndexedDB (جدا از localStorage تا جا برای داده‌ی اصلی بماند) ---------- */
const db = () => new Promise<IDBDatabase>((res, rej) => { const o = indexedDB.open('station-q', 1); o.onupgradeneeded = () => o.result.createObjectStore('kv'); o.onsuccess = () => res(o.result); o.onerror = () => rej(o.error); });
async function kv(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<any> {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction('kv', mode), r = f(t.objectStore('kv')); t.oncomplete = () => { d.close(); res(r.result); }; t.onerror = () => { d.close(); rej(t.error); }; });
}
export const cacheGet = async (k: string): Promise<any> => { try { return (await kv('readonly', (s) => s.get(k))) ?? null; } catch (e) { return null; } };
export const cacheSet = async (k: string, v: any): Promise<void> => { try { await kv('readwrite', (s) => s.put(JSON.parse(JSON.stringify(v)), k)); } catch (e) { /* حافظه‌ی مرورگر پر یا بسته است؛ برنامه ادامه می‌دهد */ } };

/* ---------- وضعیت اتصال ---------- */
export const explicitOffline = () => !!W.__OFFLINE;
export const online = () => cfgOk && !!sb && !W.__OFFLINE;
let downUntil = 0; // بعد از یک خطای شبکه، چند ثانیه سراغ سرور نمی‌رویم تا هر کلیک منتظر timeout نماند
export const down = () => Date.now() < downUntil;
export const markDown = () => { downUntil = Date.now() + 20000; };
export const isNet = (e: any) => !!e && (e.__net === true || e.status === 0 || /failed to fetch|networkerror|load failed|network request|fetch failed|timed? ?out|econn|err_internet|offline/i.test(String(e.message || e)) || /fetcherror/i.test(String(e.name || '')));
export const isAuth = (e: any) => !!e && (e.status === 401 || e.code === 'PGRST301' || /jwt expired|invalid jwt|not authenticated|jwt/i.test(String(e.message || '')));
export const retryable = (e: any) => isNet(e) || isAuth(e);
export function withTimeout<X>(p: PromiseLike<X>, ms = 9000): Promise<X> {
  return Promise.race([Promise.resolve(p), new Promise<X>((_, rej) => setTimeout(() => rej({ __net: true, message: 'timeout' }), ms))]);
}

/* ---------- صف ---------- */
let Qs: QOp[] = [], flushing = false;
const listeners: Array<() => void> = [];
export const onSynced = (f: () => void) => { listeners.push(f); };
const ready: Promise<void> = (async () => { const q = await cacheGet('outbox'); Qs = Array.isArray(q) ? q : []; render(); })();
export const pending = () => Qs.length;
const persist = () => cacheSet('outbox', Qs);
const fa = (x: number) => String(x).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

function render() {
  if (!document.body) return;
  let b = document.getElementById('qb') as HTMLButtonElement | null;
  if (!Qs.length) { b?.remove(); return; }
  if (!b) { b = document.createElement('button'); b.id = 'qb'; b.onclick = () => { if (online()) flush(); else W.alert?.('بدون اینترنت‌اید؛ بعد از «اتصال دوباره» و ورود، تغییرها خودکار فرستاده می‌شوند.'); }; document.body.appendChild(b); }
  b.textContent = `⏳ ${fa(Qs.length)} تغییر منتظر ارسال به سرور`;
}

export async function queue(op: Op) {
  await ready; Qs.push({ ...op, qid: Math.random().toString(36).slice(2), qat: Date.now() } as QOp); await persist(); render();
}

// null = موفق؛ در غیر این صورت خطا (با __net یا code)
async function exec(op: Op): Promise<any> {
  try {
    let r: any;
    if (op.k === 'rpc') r = await withTimeout(sb.rpc(op.fn, op.args));
    else if (op.k === 'upsert') r = await withTimeout(sb.from(op.table).upsert(op.rows, { onConflict: op.onConflict }));
    else if (op.k === 'update') {
      r = await withTimeout(sb.from(op.table).update(op.patch).eq('id', op.id).select('id'));
      if (!r.error && !(r.data && r.data.length)) r = { error: { message: 'ردیف روی سرور پیدا نشد (شاید دانش‌آموز آن را حذف کرده است).', code: 'ROW_MISSING' } };
    } else r = await withTimeout(sb.from(op.table).delete().eq('id', op.id));
    return r.error || null;
  } catch (e: any) { return e && e.__net ? e : { __net: true, message: String(e?.message || e) }; }
}

// تغییری را بفرست؛ اگر اینترنت نبود در صف بگذار. ترتیب همیشه حفظ می‌شود (تا تغییر قدیمی‌تر نرفته، تغییر تازه نمی‌رود).
export async function send(op: Op): Promise<{ ok?: true; queued?: true; error?: string }> {
  await ready;
  if (!online() || down()) { await queue(op); return { queued: true }; }
  if (Qs.length) { await flush(); if (Qs.length) { await queue(op); return { queued: true }; } }
  const e = await exec(op);
  if (!e) return { ok: true };
  if (retryable(e)) { markDown(); await queue(op); return { queued: true }; }
  return { error: e.message || String(e) };
}

export async function flush(): Promise<{ sent: number; failed: number }> {
  await ready;
  if (flushing || !online() || !Qs.length) return { sent: 0, failed: 0 };
  flushing = true; let sent = 0; const bad: Array<{ op: Op; msg: string; at: number }> = [];
  try {
    while (Qs.length) {
      const op = Qs[0], e = await exec(op);
      if (e && retryable(e)) { markDown(); break; }
      Qs.shift(); if (e) bad.push({ op, msg: e.message || String(e), at: Date.now() }); else sent++;
      await persist(); render();
    }
  } finally { flushing = false; }
  if (!bad.length && !sent) return { sent, failed: 0 };
  if (bad.length) { const old = (await cacheGet('failed')) || []; await cacheSet('failed', [...bad, ...old].slice(0, 30)); W.alert?.(`${fa(bad.length)} تغییر آفلاین روی سرور پذیرفته نشد: ${bad[0].msg}`); }
  if (!Qs.length) downUntil = 0;
  render(); listeners.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
  return { sent, failed: bad.length };
}

window.addEventListener('online', () => { downUntil = 0; flush(); });
setInterval(() => { if (Qs.length && online()) flush(); }, 20000);
