// نقطه‌ی شروع پنل مدیر: ورود ← دریافت داده از سرور ← اجرای برنامه. اگر اینترنت نباشد، «حالت آفلاین» با کپی محلی داده‌ها.
import { cfgOk, sb } from './supa';
import { gateLogin, gateMsg, lock, offlineBtn } from './gate';
import { loadDoc, setVersion, scheduleSave, dailySnapshot, mirrorGet, mirrorSet, offlineSave } from './store';
import { start } from './main';

const empty = () => ({ students: [], exams: [], grades: {} });
const stamp = () => new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
function download(name: string, data: any) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const blank = (d: any) => !d || (!(d.students && d.students.length) && !(d.exams && d.exams.length));
function banner(noData: boolean) {
  const b = document.createElement('div'); b.id = 'offb'; b.title = 'تغییرها فقط روی همین دستگاه ذخیره می‌شوند و بعد از اتصال دوباره می‌توانید روی سرور بفرستید.';
  b.innerHTML = '<span>📴 حالت آفلاین' + (noData ? ' · هنوز داده‌ای روی این دستگاه نیست؛ از «پشتیبان‌گیری و داده» فایل پشتیبان JSON را بازیابی کنید' : '') + '</span>';
  if (location.protocol !== 'file:') { const a = document.createElement('button'); a.className = 'btn'; a.textContent = 'اتصال دوباره'; a.onclick = () => { location.href = location.pathname; }; b.appendChild(a); }
  document.body.appendChild(b);
}

(async () => {
  const W: any = window;
  // فایل باز شده از روی دیسک (file://) یا آدرس با ?offline=1 همیشه آفلاین است و ورود نمی‌خواهد
  const forced = location.protocol === 'file:' || new URLSearchParams(location.search).has('offline');
  let online = cfgOk && !forced;
  if (online) online = await gateLogin(); // false = «ادامه بدون اینترنت»

  if (online) {
    const OFF = Symbol('offline');
    let offRes: (v: any) => void = () => {};
    const offP = new Promise((r) => { offRes = r; });
    offlineBtn(() => offRes(OFF)); // اگر بعد از ورود، اینترنت قطع شد یا دریافت داده گیر کرد
    for (;;) {
      try {
        const d: any = await Promise.race([loadDoc('main'), offP]);
        if (d === OFF) { online = false; break; }
        let data = d ? d.data : empty(); const v = d ? d.version : 0;
        if (d) dailySnapshot(d.data);
        // تغییرهای ذخیره‌نشده‌ی این دستگاه (کار آفلاین، یا قطعی اینترنت وسط کار)
        const m = mirrorGet();
        const same = m && JSON.stringify(m.data) === JSON.stringify(data);
        if (m && m.dirty && m.data && !blank(m.data) && !same) {
          const sameBase = m.base === v; let useLocal: boolean;
          if (sameBase) { // سرور از زمان کپی این دستگاه تغییری نکرده؛ نسخه‌ی این دستگاه فقط جلوتر است
            useLocal = confirm('روی این دستگاه تغییرهایی هست که هنوز روی سرور ذخیره نشده (کار آفلاین یا قطعی اینترنت).\n\nتأیید = روی سرور ذخیره شود\nانصراف = دور ریخته شود (به‌صورت فایل دانلود می‌شود)');
            if (!useLocal) download(`offline-backup-${stamp()}.json`, m.data);
          } else { // هر دو طرف تغییر کرده‌اند: اول از هر دو فایل می‌گیریم تا چیزی از بین نرود
            download(`offline-backup-${stamp()}.json`, m.data); if (d) download(`server-backup-${stamp()}.json`, d.data);
            useLocal = !confirm('هم روی این دستگاه (آفلاین) و هم روی سرور (دستگاه یا تب دیگر) تغییر داده‌اید.\n\nهر دو نسخه به‌صورت فایل دانلود شد تا چیزی از بین نرود.\n\nتأیید = نسخه‌ی سرور بماند (پیشنهادی)\nانصراف = نسخه‌ی این دستگاه جایگزین سرور شود');
          }
          setVersion(v);
          if (useLocal) { data = m.data; W.__D = data; scheduleSave(data); } else { W.__D = data; mirrorSet(data, v, false); }
        } else { setVersion(v); W.__D = data; mirrorSet(data, v, false); }
        break;
      } catch (e: any) {
        gateMsg('دریافت اطلاعات ناموفق بود (' + (e?.message || 'خطا') + ')؛ دوباره تلاش می‌کنم… اگر تکرار شد، فایل supabase/update-7.sql را اجرا کرده‌اید؟ یا «ادامه بدون اینترنت» را بزنید.', true);
        if ((await Promise.race([new Promise((r) => setTimeout(r, 4000)), offP])) === OFF) { online = false; break; }
      }
    }
  }

  if (online) {
    W.__REMOTE = { save: scheduleSave };
  } else {
    const m = mirrorGet();
    W.__OFFLINE = true; W.__D = m && m.data ? m.data : empty(); W.__REMOTE = { save: offlineSave };
    try { sb?.auth.stopAutoRefresh(); } catch (e) { /* ignore */ }
    banner(!m || blank(m.data));
  }
  start();
  lock(false);
})();
