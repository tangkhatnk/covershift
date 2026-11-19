// Chỉ chạy lên Supabase THẬT: migration 0003 trở đi, supabase/seed.sql, supabase/tests/privileges_check.sql, và chỉ bản đã merge vào origin/main (chủ dự án duyệt 19/11/2026).
// Dùng (từ gốc repo): node db-test/apply-remote.mjs <file>. Chuỗi kết nối: SUPABASE_DB_URL trong .env.local (đã gitignore). Không in chuỗi kết nối, host hay mật khẩu.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = realpathSync(join(dirname(fileURLToPath(import.meta.url)), '..'));
const die = (msg, code = 1) => {
  console.error(msg);
  process.exit(code);
};
const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'pipe' });

// 1. Allowlist: từ chối trước khi đụng tới env hay mạng.
const arg = process.argv[2];
if (!arg || process.argv.length > 3) die('Dùng: node db-test/apply-remote.mjs <file> (đúng một file).');
let real;
try {
  real = realpathSync(resolve(root, arg)); // chống `..` và symlink
} catch {
  die(`Không tìm thấy file: ${arg}`);
}
const rel = relative(root, real).split('\\').join('/');
const m = /^supabase\/migrations\/(\d{4})_[a-z0-9_]+\.sql$/.exec(rel);
const allowed =
  (m && Number(m[1]) >= 3) || rel === 'supabase/seed.sql' || rel === 'supabase/tests/privileges_check.sql';
if (rel.startsWith('..') || isAbsolute(rel) || !allowed) {
  die(
    'Từ chối: chỉ được chạy supabase/migrations/0003_*.sql trở đi, supabase/seed.sql hoặc supabase/tests/privileges_check.sql.\n' +
      'Không chạy 0001, 0002, xoa_du_lieu_demo.sql, edge_cases.sql, check_before_migration.sql hay file nào khác.',
  );
}

// 2. Chỉ chạy bản đã merge: giống hệt origin/main, không sửa cục bộ, không untracked.
try {
  git('fetch', 'origin', 'main');
} catch {
  die('Từ chối: không chạy được `git fetch origin main`.');
}
try {
  git('cat-file', '-e', `origin/main:${rel}`);
} catch {
  die(`Từ chối: ${rel} chưa có trên origin/main (chỉ chạy file đã merge).`);
}
try {
  git('diff', '--quiet', 'origin/main', '--', rel);
} catch {
  die(`Từ chối: ${rel} khác bản trên origin/main (đã sửa cục bộ hoặc chưa merge/pull). Chỉ chạy file đã merge.`);
}

// 3. .env.local phải bị gitignore rồi mới đọc.
try {
  git('check-ignore', '-q', '.env.local');
} catch {
  die('Từ chối: .env.local không nằm trong .gitignore.');
}
const envPath = join(root, '.env.local');
let url = '';
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const k = /^\s*SUPABASE_DB_URL\s*=\s*(.*?)\s*$/.exec(line);
    if (k) url = k[1].replace(/^(['"])(.*)\1$/, '$2');
  }
}
if (!url) die('thiếu SUPABASE_DB_URL trong .env.local');

// Làm sạch mọi chỗ có thể lộ chuỗi kết nối, host, user hay mật khẩu.
const secrets = [url];
try {
  const u = new URL(url);
  secrets.push(u.hostname, u.username, decodeURIComponent(u.username), u.password, decodeURIComponent(u.password));
} catch {
  die('SUPABASE_DB_URL không đúng dạng postgresql://user:mật-khẩu@host:5432/postgres.');
}
const clean = (s) => secrets.filter(Boolean).reduce((t, x) => t.split(x).join('***'), String(s));

// 4. Chạy cả file trong một kết nối, một lần query.
const pg = createRequire(join(root, 'db-test', 'package.json'))('pg');
// shortcut: không kiểm chứng chứng chỉ (CA của Supabase không có trong kho Node); nâng cấp khi cần sslmode=verify-full.
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
client.on('error', () => {});
let res;
try {
  await client.connect();
  res = await client.query(readFileSync(real, 'utf8'));
} catch (e) {
  console.error(`Lỗi khi chạy ${rel}: ${e.code ? `[${clean(e.code)}] ` : ''}${clean(e.message)}`);
  await client.end().catch(() => {});
  process.exit(1);
}
await client.end().catch(() => {});

if (rel === 'supabase/tests/privileges_check.sql') {
  const last = Array.isArray(res) ? res[res.length - 1] : res;
  const rows = last.rows;
  console.table(rows.map(({ loai, doi_tuong, quyen_dang_co, ket_luan }) => ({ loai, doi_tuong, quyen_dang_co, ket_luan })));
  const bad = rows.filter((r) => /^(SAI|KIỂM)/.test(r.ket_luan));
  console.log(`Đã chạy ${rel} lên Supabase THẬT.`);
  console.log(`privileges_check: ${rows.length} dòng, ${bad.length} dòng SAI/KIỂM`);
  process.exit(bad.length ? 2 : 0);
}
console.log(`Đã chạy ${rel} lên Supabase THẬT.`);
