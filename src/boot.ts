// نقطه‌ی شروع پنل مدیر: ورود ← دریافت داده از سرور ← اجرای برنامه.
import { cfgOk } from './supa';
import { gateLogin, gateMsg, lock } from './gate';
import { loadDoc, setVersion, scheduleSave, dailySnapshot } from './store';
import { start } from './main';

(async () => {
  const W: any = window;
  if (cfgOk) {
    await gateLogin();
    for (;;) {
      try {
        const d = await loadDoc('main');
        W.__D = d ? d.data : { students: [], exams: [], grades: {} };
        setVersion(d ? d.version : 0);
        if (d) dailySnapshot(d.data);
        break;
      } catch (e: any) {
        gateMsg('دریافت اطلاعات ناموفق بود (' + (e?.message || 'خطا') + ')؛ دوباره تلاش می‌کنم… اگر تکرار شد، فایل supabase/update-7.sql را اجرا کرده‌اید؟', true);
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
    W.__REMOTE = { save: scheduleSave };
  }
  start();
  lock(false);
})();
