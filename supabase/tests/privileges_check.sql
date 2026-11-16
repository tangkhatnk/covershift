-- SafeShift — kiểm quyền SAU khi áp migration (chỉ đọc, MỘT câu select duy nhất).
-- Chạy được trên Supabase SQL Editor và trong db-test (run.mjs chạy file này sau edge_cases.sql).
-- Kỳ vọng: KHÔNG dòng nào có ket_luan bắt đầu bằng "SAI" hoặc "KIỂM". Các dòng như vậy được xếp lên đầu.
-- Hiểu quyền theo CỘT: authenticated chỉ có SELECT một số cột (vd. parental_consents) vẫn đúng;
-- anon/authenticated có bất kỳ quyền ghi nào (kể cả theo cột) là SAI.
select n, loai, doi_tuong, quyen_dang_co, ket_luan from (
  select 1 as n, 'BẢNG' as loai, c.relname::text as doi_tuong,
         'anon=[' || coalesce((select string_agg(p || case when p in ('SELECT','INSERT','UPDATE','REFERENCES') and not has_table_privilege('anon', c.oid, p) then '(một số cột)' else '' end, ',')
                               from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
                               where case when p in ('SELECT','INSERT','UPDATE','REFERENCES') then has_any_column_privilege('anon', c.oid, p)
                                          else has_table_privilege('anon', c.oid, p) end), '')
           || '] authenticated=[' ||
                    coalesce((select string_agg(p || case when p in ('SELECT','INSERT','UPDATE','REFERENCES') and not has_table_privilege('authenticated', c.oid, p) then '(một số cột)' else '' end, ',')
                              from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p
                              where case when p in ('SELECT','INSERT','UPDATE','REFERENCES') then has_any_column_privilege('authenticated', c.oid, p)
                                         else has_table_privilege('authenticated', c.oid, p) end), '') || ']' as quyen_dang_co,
         case
           when exists (select 1 from unnest(array['INSERT','UPDATE','REFERENCES']) p
                        where has_any_column_privilege('anon', c.oid, p) or has_any_column_privilege('authenticated', c.oid, p))
             or exists (select 1 from unnest(array['DELETE','TRUNCATE','TRIGGER']) p
                        where has_table_privilege('anon', c.oid, p) or has_table_privilege('authenticated', c.oid, p))
             then 'SAI: client có quyền ghi'
           when not c.relrowsecurity then 'SAI: chưa bật RLS'
           when c.relname = 'parental_consents' and exists (select 1 from unnest(array['parent_phone','parent_name','reviewed_by']) col
                                                           where has_column_privilege('authenticated', c.oid, col, 'SELECT')
                                                              or has_column_privilege('anon', c.oid, col, 'SELECT'))
             then 'SAI: lộ SĐT/tên phụ huynh cho client'
           when c.relname = 'app_config' and has_table_privilege('anon', c.oid, 'SELECT') and has_table_privilege('authenticated', c.oid, 'SELECT')
             then 'đúng (chỉ đọc, ai cũng đọc)'
           when c.relname = 'shift_confirmation_tokens'
                and not has_any_column_privilege('authenticated', c.oid, 'SELECT') and not has_any_column_privilege('anon', c.oid, 'SELECT')
             then 'đúng (không ai đọc)'
           when has_any_column_privilege('anon', c.oid, 'SELECT') then 'SAI: anon đọc được'
           when c.relname <> 'shift_confirmation_tokens' and has_table_privilege('authenticated', c.oid, 'SELECT')
             then 'đúng (chỉ authenticated đọc, có RLS)'
           when c.relname <> 'shift_confirmation_tokens' and has_any_column_privilege('authenticated', c.oid, 'SELECT')
             then 'đúng (authenticated đọc một số cột, có RLS)'
           else 'KIỂM LẠI'
         end as ket_luan
  from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
  union all
  select 2, 'HÀM', p.oid::regprocedure::text,
         'anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text || ' authenticated=' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
           || ' service_role=' || has_function_privilege('service_role', p.oid, 'EXECUTE')::text,
         case
           when p.proname in ('get_parental_consent','submit_parental_consent','get_confirmation','submit_confirmation','get_public_profile')
             then case when has_function_privilege('anon', p.oid, 'EXECUTE') and has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'đúng (RPC công khai)' else 'SAI: thiếu quyền' end
           when p.proname in ('_has_claim','_owns_facility','_owns_shift','_shift_open_for_me','is_admin')
             then case when has_function_privilege('anon', p.oid, 'EXECUTE') then 'SAI: anon gọi được' when has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'đúng (hàm dùng trong RLS, chỉ authenticated)' else 'SAI: RLS sẽ lỗi' end
           when p.proname in ('make_admin','generate_due_confirmation_tokens') or p.proname like '\_%'
             then case when has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'SAI: lộ hàm nội bộ' else 'đúng (không cấp client)' end
           when p.proname in ('cfg_int','vn_date','age_on')
             then case when has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'SAI: lộ hàm nội bộ' else 'đúng (chỉ nội bộ)' end
           else case when has_function_privilege('anon', p.oid, 'EXECUTE') then 'SAI: anon gọi được hàm cần đăng nhập'
                     when has_function_privilege('authenticated', p.oid, 'EXECUTE') then 'đúng (chỉ authenticated)' else 'KIỂM LẠI: authenticated không gọi được' end
         end
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
) t order by (ket_luan like 'SAI%' or ket_luan like 'KIỂM%') desc, n, doi_tuong;
