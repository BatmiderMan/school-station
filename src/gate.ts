// صفحه‌ی ورود پیش از برنامه: تا مدیر وارد نشده باشد، خودِ پنل نمایش داده نمی‌شود.
import { sb, authErrText } from './supa';

const $ = (id: string) => document.getElementById(id) as any;
export const lock = (on: boolean) => document.body.classList.toggle('locked', on);
export const gateMsg = (t: string, err = false) => { const p = $('gs'); p.textContent = t; p.classList.toggle('err', err); };
const form = (show: boolean) => { $('gfs').hidden = !show; };

async function isManager(): Promise<boolean | null> { // null = سرور در دسترس نیست
  try { const { data, error } = await sb.rpc('is_manager'); if (error) return null; return data === true; } catch (e) { return null; }
}

// دکمه‌ی «ادامه بدون اینترنت» روی صفحه‌ی ورود
export const offlineBtn = (cb: () => void) => { const b = $('go'); if (b) { b.hidden = false; b.onclick = cb; } };

// true = مدیر وارد شد (صفحه‌ی ورود همچنان باقی است تا داده‌ها بارگذاری شوند)؛ false = «ادامه بدون اینترنت» انتخاب شد
export function gateLogin(): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false, rt: any = 0;
    const fin = (v: boolean) => { if (done) return false; done = true; clearTimeout(rt); form(false); resolve(v); return true; };
    const ok = () => { if (fin(true)) gateMsg('در حال دریافت اطلاعات…'); };
    offlineBtn(() => { if (fin(false)) gateMsg('در حال باز کردن حالت آفلاین…'); });
    const ask = (t = 'برای ورود، ایمیل و رمز مدیر را وارد کنید.', err = false) => { gateMsg(t, err); form(true); lock(true); $('ge').focus(); };
    $('gf').addEventListener('submit', async (e: Event) => {
      e.preventDefault(); if (done) return; const b = $('gb'); b.disabled = true; gateMsg('در حال ورود…');
      const { error } = await sb.auth.signInWithPassword({ email: $('ge').value.trim(), password: $('gp').value });
      if (done) return;
      if (error) { b.disabled = false; gateMsg(authErrText(error, 'ایمیل یا رمز اشتباه است.'), true); return; }
      const m = await isManager(); if (done) return; b.disabled = false;
      if (m !== true) { await sb.auth.signOut(); gateMsg(m === false ? 'این حساب در جدول managers نیست.' : 'اتصال به سرور برقرار نشد.', true); return; }
      $('gp').value = ''; ok();
    });
    sb.auth.onAuthStateChange((ev: string) => { if (ev === 'SIGNED_OUT' && !(window as any).__OFFLINE) location.reload(); }); // خروج ← دوباره صفحه‌ی ورود
    (async () => {
      const { data } = await sb.auth.getSession();
      if (!data.session) { ask(); return; }
      const m = await isManager(); if (done) return;
      if (m === true) ok(); else if (m === false) { await sb.auth.signOut(); ask('این حساب مدیر نیست.', true); } else { gateMsg('اتصال به سرور برقرار نشد؛ دوباره تلاش می‌کنم…', true); rt = setTimeout(() => location.reload(), 4000); }
    })();
  });
}
