// Chạy migration + seed + test biên trên Postgres nhúng (không cần Docker/Supabase CLI).
// Dùng: cd db-test && npm install && npm test
// Giả lập tối thiểu môi trường Supabase: role anon/authenticated/service_role, schema auth, auth.uid().
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import { readFileSync, rmSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
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

// Đếm số dòng mọi bảng public: dùng để chắc chắn seed lần cuối đưa DB về đúng trạng thái demo sạch.
async function snapshot(client) {
  const t = await client.query("select tablename from pg_tables where schemaname = 'public' order by 1");
  const out = {};
  for (const { tablename } of t.rows) out[tablename] = Number((await client.query(`select count(*) from public."${tablename}"`)).rows[0].count);
  return out;
}

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
  const cleanSnapshot = JSON.stringify(await snapshot(client));
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

  // Vòng tái chạy: quy trình README/TESTING hứa "test có ghi dữ liệu → chạy lại seed.sql".
  // seed lại → edge_cases lại (vẫn đủ test đạt) → seed lần cuối, rồi so số dòng từng bảng với lần seed đầu.
  try {
    await runFile(client, 'supabase/seed.sql');
    const res2 = await runFile(client, 'supabase/tests/edge_cases.sql');
    const last2 = Array.isArray(res2) ? res2[res2.length - 1] : res2;
    const failed2 = last2.rows.filter((r) => !r.passed);
    for (const r of failed2) console.log(`✘ (tái chạy) ${r.name}${r.detail ? '  — ' + r.detail : ''}`);
    await runFile(client, 'supabase/seed.sql');
    const same = JSON.stringify(await snapshot(client)) === cleanSnapshot;
    const okRe = failed2.length === 0 && last2.rows.length === last.rows.length && same;
    console.log(`\ntái chạy (seed → edge_cases → seed): ${last2.rows.length - failed2.length}/${last2.rows.length} test đạt, DB sau seed cuối ${same ? 'giống' : 'KHÁC'} lần seed đầu — ${okRe ? 'ĐẠT' : 'KHÔNG ĐẠT'}`);
    if (!okRe) code = 1;
  } catch (e) {
    console.log(`\ntái chạy (seed → edge_cases → seed): KHÔNG ĐẠT — ${e.message}`);
    code = 1;
  }

  if (process.argv.includes('--race')) {
    const { raceTest } = await import('./race.mjs');
    const ok = await raceTest({ host: 'localhost', port: PORT, user: 'postgres', password: 'postgres', database: 'postgres' });
    if (!ok) code = 1;
  }
  // Dọn dữ liệu demo: giả lập người dùng THẬT (gmail) cùng dữ liệu liên quan tới ca demo, rồi chạy xoa_du_lieu_demo.sql 2 lần.
  try {
    const uid = () => randomUUID();
    const [rw, re, rf, rs] = [uid(), uid(), uid(), uid()];
    await client.query(`
      begin;
      set local app.seed_mode = 'on';
      insert into auth.users (id, email, aud, role, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change, email_change_token_new)
        values ('${rw}', 'nguoi.lam.that@gmail.com', 'authenticated', 'authenticated', '', now(), '', '', '', ''),
               ('${re}', 'chu.quan.that@gmail.com', 'authenticated', 'authenticated', '', now(), '', '', '', '');
      insert into public.profiles (id, role, full_name, consent_at) values
        ('${rw}', 'worker', 'Người Làm Thật', now()), ('${re}', 'employer', 'Chủ Quán Thật', now());
      insert into public.private_contacts (user_id, phone) values ('${rw}', '0912345001'), ('${re}', '0912345002');
      insert into public.worker_profiles (user_id, date_of_birth, school, area, approval, approved_at)
        values ('${rw}', (current_date - interval '20 years')::date, 'ĐH Thật', 'trung_tam', 'approved', now());
      insert into public.facilities (id, owner_id, name, type, address, area, not_prohibited_ack, verified, status)
        values ('${rf}', '${re}', 'Quán Thật Của Chủ Dự Án', 'cafe', '1 Đường Thật, Vũng Tàu', 'trung_tam', true, true, 'active');
      insert into public.shifts (id, facility_id, job_type, starts_at, ends_at, hourly_wage, commitment_ack)
        values ('${rs}', '${rf}', 'phuc_vu', now() + interval '3 days', now() + interval '3 days 4 hours', 30000, true);
      commit;`);
    const asRealWorker = async (sql, params) => {
      await client.query('begin');
      try {
        await client.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: rw, role: 'authenticated' })]);
        await client.query(sql, params);
        await client.query('commit');
      } catch (e) { await client.query('rollback'); throw e; }
    };
    await asRealWorker(`select claim_shift('50000000-0000-4000-a000-000000000001')`);  // suất trên ca DEMO
    await asRealWorker(`select create_report('50000000-0000-4000-a000-000000000001', 'Báo cáo thật về ca demo')`);
    await asRealWorker(`select claim_shift($1)`, [rs]);                                 // suất trên ca THẬT
    await asRealWorker(`select create_report($1, 'Báo cáo thật về ca thật')`, [rs]);

    const problems = [];
    for (const lan of [1, 2]) {
      try { await runFile(client, 'supabase/xoa_du_lieu_demo.sql'); } catch (e) { problems.push(`lần dọn ${lan} lỗi: ${e.message}`); }
    }
    const n = async (sql, params) => Number((await client.query(sql, params)).rows[0].c);
    const expect = (label, got, want) => { if (got !== want) problems.push(`${label}: ${got} (kỳ vọng ${want})`); };
    expect('user demo còn lại', await n(`select count(*) c from auth.users where email like '%@demo.safeshift.test'`), 0);
    expect('hồ sơ demo còn lại', await n(`select count(*) c from public.profiles where id::text ~ '^(00000000|a0000000|e0000000|b0000000)-0000-4000-a000-'`), 0);
    expect('cơ sở demo còn lại', await n(`select count(*) c from public.facilities where id::text like 'f0000000-0000-4000-a000-%'`), 0);
    expect('ca demo/test còn lại', await n(`select count(*) c from public.shifts where id::text like '50000000-0000-4000-a000-%'`), 0);
    expect('suất trên ca demo còn lại', await n(`select count(*) c from public.shift_claims where shift_id::text like '50000000-0000-4000-a000-%'`), 0);
    expect('báo cáo mồ côi', await n(`select count(*) c from public.reports where reporter_id is null and subject_id is null and shift_id is null`), 0);
    expect('user thật còn', await n(`select count(*) c from auth.users where id in ($1, $2)`, [rw, re]), 2);
    expect('profile thật còn', await n(`select count(*) c from public.profiles where id in ($1, $2)`, [rw, re]), 2);
    expect('hồ sơ người làm thật còn', await n(`select count(*) c from public.worker_profiles where user_id = $1 and approval = 'approved'`, [rw]), 1);
    expect('cơ sở thật còn', await n(`select count(*) c from public.facilities where id = $1`, [rf]), 1);
    expect('ca thật còn', await n(`select count(*) c from public.shifts where id = $1`, [rs]), 1);
    expect('suất thật còn', await n(`select count(*) c from public.shift_claims where shift_id = $1 and worker_id = $2 and status = 'active'`, [rs, rw]), 1);
    expect('báo cáo thật về ca demo còn (shift_id null)', await n(`select count(*) c from public.reports where reporter_id = $1 and shift_id is null and body = 'Báo cáo thật về ca demo'`, [rw]), 1);
    expect('báo cáo thật về ca thật còn', await n(`select count(*) c from public.reports where reporter_id = $1 and shift_id = $2`, [rw, rs]), 1);
    expect('app_config', await n(`select count(*) c from public.app_config`), 2);
    // seed chạy lại được trên DB đã dọn, và không đụng dữ liệu thật.
    try { await runFile(client, 'supabase/seed.sql'); } catch (e) { problems.push(`seed sau dọn lỗi: ${e.message}`); }
    expect('user demo sau seed lại', await n(`select count(*) c from auth.users where email like '%@demo.safeshift.test'`), 16);
    expect('user thật còn sau seed lại', await n(`select count(*) c from auth.users where id in ($1, $2)`, [rw, re]), 2);
    expect('ca thật còn sau seed lại', await n(`select count(*) c from public.shifts where id = $1`, [rs]), 1);
    for (const x of problems) console.log(`✘ (dọn demo) ${x}`);
    console.log(`\ndọn dữ liệu demo (xoa_du_lieu_demo.sql ×2, có người dùng thật giả lập, rồi seed lại): ${problems.length ? 'KHÔNG ĐẠT (' + problems.length + ' lỗi)' : 'ĐẠT — 0 dữ liệu demo, dữ liệu thật còn nguyên, seed chạy lại được'}`);
    if (problems.length) code = 1;
  } catch (e) {
    console.log(`\ndọn dữ liệu demo: KHÔNG ĐẠT — ${e.message}`);
    code = 1;
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
