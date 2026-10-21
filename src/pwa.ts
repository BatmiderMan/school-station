// ثبت service worker (فقط در نسخه‌ی منتشرشده روی http/https) و دکمه‌ی «نصب برنامه»
export function initPwa() {
  const btn = document.getElementById('inst') as HTMLButtonElement | null;
  let ev: any = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); ev = e; if (btn) btn.hidden = false; });
  window.addEventListener('appinstalled', () => { ev = null; if (btn) btn.hidden = true; });
  if (btn) btn.onclick = async () => { if (!ev) return; ev.prompt(); await ev.userChoice.catch(() => 0); ev = null; btn.hidden = true; };
  if (import.meta.env.PROD && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => { /* ignore */ }); });
  }
}
