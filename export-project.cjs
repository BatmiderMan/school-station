// export-project.cjs
const fs = require('fs');
const path = require('path');

// پوشه‌هایی که لازم نیست
const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'dev-dist', 'build', '.vite',
  'coverage', '.temp', '.branches'
]);

// پسوندهایی که ارسال می‌شوند
const EXTENSIONS = new Set([
  '.html', '.css', '.scss', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx',
  '.vue', '.json', '.md', '.sql', '.toml', '.yml', '.yaml',
  '.webmanifest', '.sh', '.txt'
]);

// فایل‌های غیرضروری
const IGNORE_FILES = new Set([
  'package-lock.json', 'export-project.cjs', 'project_dump.txt'
]);

const MAX_SIZE = 200 * 1024; // فایل‌های بزرگ‌تر از 200KB رد می‌شوند
const root = process.cwd();
let tree = '';
const files = [];

function walk(dir, depth) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name));

  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      tree += '  '.repeat(depth) + e.name + '/\n';
      walk(full, depth + 1);
    } else {
      tree += '  '.repeat(depth) + e.name + '\n';
      if (e.name.startsWith('.env')) continue;          // امنیت: هیچ فایل env ارسال نشود
      if (IGNORE_FILES.has(e.name)) continue;
      const ext = path.extname(e.name).toLowerCase();
      if (EXTENSIONS.has(ext) || e.name === '.gitignore') files.push(full);
    }
  }
}

walk(root, 0);

let out = '===== PROJECT STRUCTURE =====\n' + tree;
for (const f of files) {
  const rel = path.relative(root, f).replace(/\\/g, '/');
  const size = fs.statSync(f).size;
  if (size > MAX_SIZE) {
    out += `\n\n===== FILE: ${rel} (SKIPPED: ${Math.round(size / 1024)}KB) =====\n`;
    continue;
  }
  out += `\n\n===== FILE: ${rel} =====\n` + fs.readFileSync(f, 'utf8');
}

fs.writeFileSync('project_dump.txt', out, 'utf8');
console.log(`✅ project_dump.txt ساخته شد: ${files.length} فایل، ${Math.round(out.length / 1024)}KB`);