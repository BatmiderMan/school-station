import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

// در ساخت پنل دانش‌آموز، اتصال به سرور از همان ابتدا (هم‌زمان با دانلود برنامه) باز می‌شود تا ورود/دریافت داده سریع‌تر شود.
const preconnect = (on: boolean) => ({
  name: 'ss-preconnect',
  transformIndexHtml(html: string) {
    if (!on) return html;
    try {
      const m = /SUPABASE_URL\s*=\s*'([^']+)'/.exec(fs.readFileSync(fileURLToPath(new URL('./src/config.ts', import.meta.url)), 'utf8'));
      if (!m) return html;
      const o = new URL(m[1]).origin;
      return html.replace('</head>', `<link rel="preconnect" href="${o}" crossorigin>\n<link rel="dns-prefetch" href="${o}">\n</head>`);
    } catch (e) { return html; }
  },
});

// npm run dev                → پنل مدیر روی لپ‌تاپ (localhost)
// npm run build:site         → خروجی کامل برای گیت‌هاب: پنل دانش‌آموز در ریشه، پنل مدیر در /admin/  (پوشه‌ی dist-site)
// npm run build / build:single → نسخه‌ی مدیر برای اجرای آفلاین (dist)
export default defineConfig(({ mode }) => {
  const student = mode === 'student', admin = mode === 'admin';
  return {
    base: './',
    plugins: [preconnect(student)],
    publicDir: student ? 'public-student' : 'public-admin',
    build: {
      assetsInlineLimit: 4000000,
      cssCodeSplit: false,
      outDir: student ? 'dist-site' : admin ? 'dist-site/admin' : 'dist',
      emptyOutDir: true,
      rollupOptions: { input: fileURLToPath(new URL(student ? './student.html' : './index.html', import.meta.url)) },
    },
    server: { port: 3000, open: true },
  };
});
