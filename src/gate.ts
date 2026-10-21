// صفحه‌ی ورود پیش از برنامه: تا مدیر وارد نشده باشد، خودِ پنل نمایش داده نمی‌شود.
import { sb } from './supa';

const $ = (id: string) => document.getElementById(id) as any;
export const lock = (on: boolean) => document.body.classList.toggle('locked', on);
export const gateMsg = (t: string, err = false) => { const p = $('gs'); p.textContent = t; p.classList.toggle('err', err); };
const form = (show: boolean) => { $('gfs').hidden = !show; };

async function isManager(): Promise<boolean | null> { // null = سرور در دسترس نیست
  try { const { data, error } = await sb.rpc('is_manager'); if (error) return null; return data === true; } catch (e) { return null; }
}

// وقتی مدیر وارد شده باشد resolve می‌شود (صفحه‌ی ورود همچنان باقی است تا داده‌ها بارگذاری شوند)
export function gateLogin(): Promise<void> {
  return new Promise((resolve) => {
    let done = false; const ok = () => { if (!done) { done = true; form(false); gateMsg('در حال دریافت اطلاعات…'); resolve(); } };
    const ask = (t = 'برای ورود، ایمیل و رمز مدیر را وارد کنید.', err = false) => { gateMsg(t, err); form(true); lock(true); $('ge').focus(); };
    $('gf').addEventListener('submit', async (e: Event) => {
      e.preventDefault(); if (done) return; const b = $('gb'); b.disabled = true; gateMsg('در حال ورود…');
      const { error } = await sb.auth.signInWithPassword({ email: $('ge').value.trim(), password: $('gp').value });
      if (error) { b.disabled = false; gateMsg('ایمیل یا رمز اشتباه است.', true); return; }
      const m = await isManager(); b.disabled = false;
      if (m !== true) { await sb.auth.signOut(); gateMsg(m === false ? 'این حساب در جدول managers نیست.' : 'اتصال به سرور برقرار نشد.', true); return; }
      $('gp').value = ''; ok();
    });
    sb.auth.onAuthStateChange((ev: string) => { if (ev === 'SIGNED_OUT') location.reload(); }); // خروج ← دوباره صفحه‌ی ورود
    (async () => {
      const { data } = await sb.auth.getSession();
      if (!data.session) { ask(); return; }
      const m = await isManager();
      if (m === true) ok(); else if (m === false) { await sb.auth.signOut(); ask('این حساب مدیر نیست.', true); } else { gateMsg('اتصال به سرور برقرار نشد؛ دوباره تلاش می‌کنم…', true); setTimeout(() => location.reload(), 4000); }
    })();
  });
}
