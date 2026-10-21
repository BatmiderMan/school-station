import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config';
export const cfgOk = !SUPABASE_URL.includes('YOUR_') && !SUPABASE_ANON_KEY.includes('YOUR_');
// پنل مدیر و پنل دانش‌آموز روی یک دامنه (github.io) هستند؛ هر کدام کلید ذخیره‌ی نشست جدا دارند تا ورود یکی، دیگری را خارج نکند.
const app = document.documentElement.dataset.app === 'student' ? 'student' : 'admin';
export const sb: any = cfgOk ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: `ss-${app}-auth` } }) : null;
