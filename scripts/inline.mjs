// بعد از build، همه‌ی فایل‌ها را داخل یک فایل HTML می‌گذارد تا با دابل‌کلیک (بدون npm و بدون سرور) باز شود.
import fs from 'node:fs';
const dir = 'dist';
let html = fs.readFileSync(`${dir}/index.html`, 'utf8');
const rd = (f) => fs.readFileSync(`${dir}/${f.replace(/^\.?\//, '')}`, 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g, (m, f) => `<style>${rd(f)}</style>`);
html = html.replace(/<script type="module"[^>]*src="([^"]+\.js)"[^>]*><\/script>/g, (m, f) => `<script type="module">${rd(f).replace(/<\/script/gi, '<\\/script')}</script>`);
if (/src="\.?\/?assets\//.test(html) || /href="\.?\/?assets\//.test(html)) { console.error('هنوز فایل خارجی باقی مانده است'); process.exit(1); }
fs.writeFileSync(`${dir}/school-station.html`, html);
console.log('ساخته شد: dist/school-station.html', Math.round(html.length / 1024) + ' KB');
