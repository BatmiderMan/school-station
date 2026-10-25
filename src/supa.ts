import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
export const cfgOk = !SUPABASE_URL.includes('YOUR_') && !SUPABASE_ANON_KEY.includes('YOUR_');
// پنل مدیر و پنل دانش‌آموز روی یک دامنه (github.io) هستند؛ هر کدام کلید ذخیره‌ی نشست جدا دارند تا ورود یکی، دیگری را خارج نکند.
const app = document.documentElement.dataset.app === 'student' ? 'student' : 'admin';
export const sb: any = cfgOk ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: `ss-${app}-auth` } }) : null;

// متن خطای ورود: «رمز اشتباه» فقط وقتی نشان داده می‌شود که سرور واقعاً همین را گفته باشد؛ خطای شبکه/پروکسی جدا و با متن واقعی نمایش داده می‌شود.
export function authErrText(e: any, wrong: string): string {
  const m = String(e?.message || e || ''), st = e?.status;
  if (e?.name === 'AuthRetryableFetchError' || st === 0 || /failed to fetch|networkerror|load failed|network request/i.test(m)) return 'اتصال به سرور برقرار نشد (' + m + ')؛ آدرس SUPABASE_URL در config.ts یا اینترنت/پروکسی را بررسی کنید.';
  if (e?.code === 'invalid_credentials' || /invalid login credentials/i.test(m)) return wrong;
  return 'خطای ورود: ' + m + (st ? ' [' + st + ']' : '');
}
