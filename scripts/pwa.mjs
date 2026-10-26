// بعد از build اجرا می‌شود: manifest و service worker (آفلاین/نصب‌پذیر) را داخل پوشه‌ی خروجی می‌سازد.
// استفاده: node scripts/pwa.mjs <student|admin> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [app, dir] = process.argv.slice(2);
const APPS = {
  student: { name: 'پنل دانش‌آموز', short: 'دانش‌آموز', color: '#0f766e', id: 'school-station-student', skip: ['admin/'] },
  admin: { name: 'ایستگاه مدیریت مدرسه', short: 'مدیر مدرسه', color: '#312e81', id: 'school-station-admin', skip: [] },
};
const A = APPS[app];
if (!A || !dir) { console.error('usage: node scripts/pwa.mjs <student|admin> <outDir>'); process.exit(1); }

const walk = (d, base = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name), base + e.name + '/') : [base + e.name]);
const files = walk(dir).filter((f) => !f.startsWith('sw.js') && !A.skip.some((s) => f.startsWith(s)));

const manifest = {
  id: A.id, name: A.name, short_name: A.short, lang: 'fa', dir: 'rtl',
  start_url: './', scope: './', display: 'standalone', orientation: 'any',
  background_color: '#f3f1ea', theme_color: A.color,
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(path.join(dir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
if (!files.includes('manifest.webmanifest')) files.push('manifest.webmanifest');

const hash = crypto.createHash('sha1');
for (const f of [...files].sort()) hash.update(f).update(fs.readFileSync(path.join(dir, f)));
const version = `ss-${app}-${hash.digest('hex').slice(0, 10)}`;

const precache = ['./', ...files.map((f) => './' + f)];
const sw = `// ساخته‌شده خودکار توسط scripts/pwa.mjs — دستی ویرایش نکنید
const CACHE = ${JSON.stringify(version)}, PREFIX = ${JSON.stringify('ss-' + app + '-')}, FILES = ${JSON.stringify(precache)};
const BASE = new URL(self.registration.scope).pathname, SKIP = ${JSON.stringify(A.skip.map((s) => s.replace(/\/$/, '')))};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  // فقط فایل‌های همین سایت؛ درخواست‌های سرور (Supabase) و POST هرگز کش نمی‌شوند
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  // آدرس‌های پنل مدیر (/admin) را این service worker هرگز دست نمی‌زند؛ پنل مدیر service worker و کش مخصوص خودش را دارد.
  const rel = u.pathname.startsWith(BASE) ? u.pathname.slice(BASE.length) : u.pathname;
  if (SKIP.some((s) => rel === s || rel.startsWith(s + '/'))) return;
  if (r.mode === 'navigate') {
    // صفحه‌ی اصلی بلافاصله از حافظه‌ی دستگاه باز می‌شود (بدون انتظار برای شبکه) و در پس‌زمینه به‌روز می‌شود.
    e.respondWith(caches.match('./').then((m) => { const net = fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then((x) => x.put('./', c)); } return res; }); e.waitUntil(net.catch(() => 0)); return m || net.catch(() => caches.match('./index.html')); }));
    return;
  }
  e.respondWith(caches.match(r).then((m) => m || fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then((x) => x.put(r, c)); } return res; })));
});
`;
fs.writeFileSync(path.join(dir, 'sw.js'), sw);
console.log(`PWA (${app}): ${precache.length} فایل در کش، نسخه‌ی ${version}`);
