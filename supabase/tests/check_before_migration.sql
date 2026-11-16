-- SafeShift — kiểm môi trường Supabase TRƯỚC khi dán migration (chỉ đọc, MỘT câu select duy nhất).
-- Chạy trên project mới trong SQL Editor, đối chiếu cột ky_vong. Chạy được trên Postgres 15 trở lên.
select n, kiem_tra, ket_qua, ky_vong from (
  select 1 as n, 'Phiên bản Postgres' as kiem_tra, version() as ket_qua, 'PostgreSQL 17.x (từ 15 trở lên là đủ)' as ky_vong
  union all select 2, 'session_user / current_user', session_user || ' / ' || current_user, 'postgres hoặc supabase_admin (để _bypass() cho seed chạy)'
  union all select 3, 'postgres: rolsuper | rolbypassrls',
    (select rolsuper::text || ' | ' || rolbypassrls::text from pg_roles where rolname = 'postgres'), 'false | true'
  union all select 4, 'postgres là member của anon, authenticated, service_role (để test dùng set local role)',
    (select (pg_has_role('postgres', 'anon', 'member') and pg_has_role('postgres', 'authenticated', 'member') and pg_has_role('postgres', 'service_role', 'member'))::text), 'true'
  union all select 5, 'postgres trên auth.users: DELETE | INSERT | SELECT | REFERENCES',
    has_table_privilege('postgres', 'auth.users', 'DELETE')::text || ' | ' || has_table_privilege('postgres', 'auth.users', 'INSERT')::text || ' | ' ||
    has_table_privilege('postgres', 'auth.users', 'SELECT')::text || ' | ' || has_table_privilege('postgres', 'auth.users', 'REFERENCES')::text, 'true | true | true | true'
  union all select 6, 'postgres trên auth.identities: INSERT | DELETE',
    has_table_privilege('postgres', 'auth.identities', 'INSERT')::text || ' | ' || has_table_privilege('postgres', 'auth.identities', 'DELETE')::text, 'true | true'
  union all select 7, 'pgcrypto nằm ở schema nào',
    coalesce((select extnamespace::regnamespace::text from pg_extension where extname = 'pgcrypto'), 'CHƯA BẬT'), 'extensions'
  union all select 8, 'Cột seed chèn vào auth.users có đủ 15 cột không',
    (select count(*)::text from information_schema.columns where table_schema = 'auth' and table_name = 'users'
       and column_name in ('instance_id','id','aud','role','email','encrypted_password','email_confirmed_at','raw_app_meta_data',
                           'raw_user_meta_data','created_at','updated_at','confirmation_token','recovery_token','email_change','email_change_token_new')), '15'
  union all select 9, 'Cột seed chèn vào auth.identities có đủ 7 cột không',
    (select count(*)::text from information_schema.columns where table_schema = 'auth' and table_name = 'identities'
       and column_name in ('provider_id','user_id','identity_data','provider','last_sign_in_at','created_at','updated_at')), '7'
  union all select 10, 'Cột NOT NULL, không default, không generated mà seed KHÔNG chèn (auth.users | auth.identities)',
    coalesce((select string_agg(table_name || '.' || column_name, ', ') from information_schema.columns
       where table_schema = 'auth' and table_name in ('users', 'identities') and is_nullable = 'NO' and column_default is null
         and coalesce(is_generated, 'NEVER') = 'NEVER' and coalesce(is_identity, 'NO') = 'NO'
         and column_name not in ('instance_id','id','aud','role','email','encrypted_password','email_confirmed_at','raw_app_meta_data',
                                 'raw_user_meta_data','created_at','updated_at','confirmation_token','recovery_token','email_change','email_change_token_new',
                                 'provider_id','user_id','identity_data','provider','last_sign_in_at')), 'không có'), 'không có'
  union all select 11, 'auth.users.confirmed_at và auth.identities.email là cột generated (seed không được chèn)',
    coalesce((select string_agg(table_name || '.' || column_name || '=' || is_generated, ', ') from information_schema.columns
       where table_schema = 'auth' and ((table_name = 'users' and column_name = 'confirmed_at') or (table_name = 'identities' and column_name = 'email'))), 'không thấy cột'), 'users.confirmed_at=ALWAYS, identities.email=ALWAYS'
  union all select 12, 'auth.uid() có đọc request.jwt.claims không',
    coalesce((select (pg_get_functiondef(p.oid) like '%request.jwt.claims%')::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace
              where s.nspname = 'auth' and p.proname = 'uid'), 'KHÔNG CÓ HÀM'), 'true'
  union all select 13, 'Default privileges đang có trong schema public (pg_default_acl)',
    coalesce((select string_agg(pg_get_userbyid(d.defaclrole) || ':' || d.defaclobjtype::text || '=' || d.defaclacl::text, ' ; ')
              from pg_default_acl d where d.defaclnamespace = 'public'::regnamespace), 'không có'),
    'project mới (sau 30/5/2026): thường không có dòng của postgres cho bảng; project cũ: có anon/authenticated/service_role'
  union all select 14, 'Số bảng đã có trong schema public (nên là 0 trước khi dán migration)',
    (select count(*)::text from pg_tables where schemaname = 'public'), '0'
) t order by n;
