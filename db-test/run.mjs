// Chạy migration + seed + test biên trên Postgres nhúng (không cần Docker/Supabase CLI).
// Dùng: cd db-test && npm install && npm test
// Giả lập tối thiểu môi trường Supabase: role anon/authenticated/service_role, schema auth, auth.uid().
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { readFileSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dataDir = join(here, '.pgdata');
const PORT = 54329;
const keep = process.argv.includes('--keep'); // giữ server chạy để tự vào psql/race test

if (existsSync(dataDir)) rmSync(dataDir, { recursive: true, force: true });

const server = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'postgres',
  password: 'postgres',
  port: PORT,
  persistent: false,
  onLog: () => {},
  onError: () => {},
});

const STUBS = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema extensions;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid, aud text, role text, email text unique,
  encrypted_password text, email_confirmed_at timestamptz,
  raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  confirmation_token text default '', recovery_token text default '',
  email_change text default '', email_change_token_new text default ''
);
create table auth.identities (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null, user_id uuid not null references auth.users(id) on delete cascade,
  identity_data jsonb not null, provider text not null,
  last_sign_in_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(),
  unique (provider_id, provider)
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'sub', '')::uuid
$$;
grant usage on schema auth, extensions to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
-- Supabase cấp sẵn quyền mặc định cho object mới trong public; giả lập để kiểm tra phần revoke của migration.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
-- Project Supabase mới (đã thấy 17/11/2026) có sẵn event trigger ensure_rls -> public.rls_auto_enable() để tự bật RLS
-- cho bảng mới; chỉ postgres được EXECUTE. Ở đây là bản rỗng, chỉ để privileges_check.sql gặp đúng hàm như trên Supabase.
create function public.rls_auto_enable() returns event_trigger language plpgsql as $fn$ begin end $fn$;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated, service_role;
create event trigger ensure_rls on ddl_command_end execute function public.rls_auto_enable();
`;

async function runFile(client, rel) {
  const sql = readFileSync(join(root, rel), 'utf8');
  try {
    return await client.query(sql);
  } catch (e) {
    const pos = Number(e.position);
    let where = '';
    if (pos) {
      const line = sql.slice(0, pos).split('\n').length;
      where = ` (dòng ~${line})`;
    }
    throw new Error(`${rel}${where}: ${e.message}${e.where ? '\n  ' + e.where : ''}`);
  }
}

let code = 0;
try {
  await server.initialise();
  await server.start();
  const client = new pg.Client({ host: 'localhost', port: PORT, user: 'postgres', password: 'postgres', database: 'postgres' });
  client.on('error', () => {}); // server tắt trước khi client đóng thì bỏ qua
  await client.connect();
  await client.query(STUBS);
  try {
    await client.query('create extension pgcrypto with schema extensions');
  } catch {
    // Bản nhúng không có contrib: giả lập crypt/gen_salt chỉ để seed chạy được.
    await client.query(`
      create function extensions.gen_salt(text) returns text language sql as $$ select 'salt' $$;
      create function extensions.crypt(text, text) returns text language sql as $$ select md5($1 || $2) $$;`);
  }

  await runFile(client, 'supabase/migrations/0001_init.sql');
  console.log('✔ migration');
  await runFile(client, 'supabase/seed.sql');
  console.log('✔ seed');
  const res = await runFile(client, 'supabase/tests/edge_cases.sql');
  const last = Array.isArray(res) ? res[res.length - 1] : res;
  let fail = 0;
  for (const r of last.rows) {
    const ok = r.passed;
    if (!ok) fail++;
    console.log(`${ok ? '✔' : '✘'} ${r.name}${r.detail ? '  — ' + r.detail : ''}`);
  }
  console.log(`\n${last.rows.length - fail}/${last.rows.length} test đạt`);
  if (fail) code = 1;

  // Kiểm quyền bảng/hàm của anon/authenticated (file chỉ đọc, một câu select).
  const priv = await runFile(client, 'supabase/tests/privileges_check.sql');
  const bad = priv.rows.filter((r) => /^(SAI|KIỂM)/.test(r.ket_luan));
  for (const r of bad) console.log(`✘ ${r.loai} ${r.doi_tuong}: ${r.ket_luan}  (${r.quyen_dang_co})`);
  console.log(`\nprivileges_check: ${priv.rows.length} dòng, ${bad.length} dòng SAI/KIỂM`);
  if (bad.length) code = 1;

  if (process.argv.includes('--race')) {
    const { raceTest } = await import('./race.mjs');
    const ok = await raceTest({ host: 'localhost', port: PORT, user: 'postgres', password: 'postgres', database: 'postgres' });
    if (!ok) code = 1;
  }
  await client.end();
  if (keep) {
    console.log(`\nServer đang chạy: postgres://postgres:postgres@localhost:${PORT}/postgres  (Ctrl+C để tắt)`);
    await new Promise((r) => process.on('SIGINT', r));
  }
} catch (e) {
  console.error('✘ ' + e.message);
  code = 1;
} finally {
  await server.stop().catch(() => {});
}
process.exit(code);
