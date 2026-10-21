import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// npm run dev                → پنل مدیر روی لپ‌تاپ (localhost)
// npm run build:site         → خروجی کامل برای گیت‌هاب: پنل دانش‌آموز در ریشه، پنل مدیر در /admin/  (پوشه‌ی dist-site)
// npm run build / build:single → نسخه‌ی مدیر برای اجرای آفلاین (dist)
export default defineConfig(({ mode }) => {
  const student = mode === 'student', admin = mode === 'admin';
  return {
    base: './',
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
