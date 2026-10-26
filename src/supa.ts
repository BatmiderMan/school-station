import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
export const cfgOk = !SUPABASE_URL.includes('YOUR_') && !SUPABASE_ANON_KEY.includes('YOUR_');
// پنل مدیر و پنل دانش‌آموز روی یک دامنه (github.io) هستند؛ هر کدام کلید ذخیره‌ی نشست جدا دارند تا ورود یکی، دیگری را خارج نکند.
const app = document.documentElement.dataset.app === 'student' ? 'student' : 'admin';

// اتصال از طریق پروکسی گاهی خیلی کند می‌شود. در پنل دانش‌آموز: درخواست‌های خواندنی (GET/HEAD) اگر دیر جواب بدهند یا خطا بخورند خودکار دوباره (حداکثر ۳ بار، به‌صورت موازی) فرستاده می‌شوند و اولین پاسخ موفق استفاده می‌شود.
// درخواست‌های نوشتنی (POST/PATCH/...) هرگز تکرار نمی‌شوند تا چیزی دوبار ثبت نشود؛ فقط درخواست ورود/تازه‌سازی نشست سقف زمانی دارد.
const HEDGE_AT = [0, 4500, 11000], DEADLINE = 28000, TOKEN_TIMEOUT = 25000;
const abortErr = () => new DOMException('Aborted', 'AbortError');
function withTimeout(input: any, init: any, ms: number): Promise<Response> {
  const c = new AbortController(), outer: AbortSignal | undefined = init.signal, onOuter = () => c.abort();
  if (outer) { if (outer.aborted) c.abort(); else outer.addEventListener('abort', onOuter, { once: true }); }
  const t = setTimeout(() => c.abort(), ms);
  return fetch(input, { ...init, signal: c.signal }).finally(() => { clearTimeout(t); outer?.removeEventListener('abort', onOuter); });
}
function hedged(input: any, init: any): Promise<Response> {
  return new Promise((resolve, reject) => {
    const outer: AbortSignal | undefined = init.signal, ctrls: AbortController[] = [], timers: any[] = [];
    let settled = false, launched = 0, done = 0, lastRes: Response | null = null, lastCtl: AbortController | null = null, lastErr: any = null;
    const onOuter = () => { if (settled) return; stop(); reject(abortErr()); };
    const stop = (keep?: AbortController | null) => { settled = true; timers.forEach(clearTimeout); ctrls.forEach((c) => { if (c !== keep) c.abort(); }); outer?.removeEventListener('abort', onOuter); };
    const finishBad = () => { if (lastRes) { stop(lastCtl); resolve(lastRes); } else { stop(); reject(lastErr || new TypeError('Network timeout')); } };
    if (outer) { if (outer.aborted) return reject(abortErr()); outer.addEventListener('abort', onOuter, { once: true }); }
    const launch = () => {
      if (settled || launched >= HEDGE_AT.length) return;
      const c = new AbortController(); ctrls.push(c); launched++;
      if (launched > 1) { try { window.dispatchEvent(new Event('ss-slow')); } catch (e) { /* ignore */ } }
      fetch(input, { ...init, signal: c.signal }).then((r) => {
        done++; if (settled) return;
        if (r.status >= 502 && r.status <= 599) { lastRes = r; lastCtl = c; if (launched < HEDGE_AT.length) launch(); else if (done >= launched) finishBad(); return; }
        stop(c); resolve(r);
      }, (e) => {
        done++; if (settled) return;
        lastErr = e;
        if (launched < HEDGE_AT.length) launch(); else if (done >= launched) finishBad();
      });
    };
    HEDGE_AT.forEach((ms, i) => { if (i === 0) launch(); else timers.push(setTimeout(launch, ms)); });
    timers.push(setTimeout(() => { if (!settled) { lastErr = lastErr || new TypeError('Network timeout (slow connection)'); finishBad(); } }, DEADLINE));
  });
}
function studentFetch(input: any, init: any = {}): Promise<Response> {
  const url = String(typeof input === 'string' ? input : input?.url || input);
  const method = String(init.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return hedged(input, init);
  if (url.includes('/auth/v1/token')) return withTimeout(input, init, TOKEN_TIMEOUT);
  return fetch(input, init);
}
export const sb: any = cfgOk ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: `ss-${app}-auth` }, ...(app === 'student' ? { global: { fetch: studentFetch as any } } : {}) }) : null;

// متن خطای ورود: «رمز اشتباه» فقط وقتی نشان داده می‌شود که سرور واقعاً همین را گفته باشد؛ خطای شبکه/پروکسی جدا و با متن واقعی نمایش داده می‌شود.
export function authErrText(e: any, wrong: string): string {
  const m = String(e?.message || e || ''), st = e?.status;
  if (e?.name === 'AuthRetryableFetchError' || st === 0 || /failed to fetch|networkerror|load failed|network request/i.test(m)) return 'اتصال به سرور برقرار نشد (' + m + ')؛ آدرس SUPABASE_URL در config.ts یا اینترنت/پروکسی را بررسی کنید.';
  if (e?.code === 'invalid_credentials' || /invalid login credentials/i.test(m)) return wrong;
  return 'خطای ورود: ' + m + (st ? ' [' + st + ']' : '');
}
