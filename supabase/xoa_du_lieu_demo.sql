-- =====================================================================
-- SafeShift — XÓA SẠCH dữ liệu demo/test, KHÔNG đụng dữ liệu thật.
-- Dán nguyên file vào SQL Editor (không bôi đen một phần) và chạy. Chạy lại nhiều lần không lỗi.
-- Chỉ xóa: user có email @demo.safeshift.test (và 2 user test cố định b0000000-...14/15), cơ sở/ca/suất/token/kết quả
-- của họ (xóa theo), ca test cố định, báo cáo + nhật ký admin gắn với họ.
-- Dữ liệu của người thật được giữ: tài khoản, hồ sơ, cơ sở, ca, suất, nhật ký admin thật, app_config.
-- Báo cáo của người thật về ca demo vẫn còn (shift_id tự về null).
--
-- VÌ SAO KHÔNG DÙNG `delete from auth.users where email like ...` TRỰC TIẾP: một dòng reports có thể trỏ tới nhiều
-- đối tượng bị xóa cùng lúc (người báo + người bị báo + ca) => Postgres báo 23503 reports_shift_id_fkey.
-- File này xóa báo cáo gắn demo TRƯỚC, rồi mới xóa user.
-- Kết quả cuối file: một bảng tổng kết (nhóm "CÒN LẠI DEMO" kỳ vọng 0; nhóm "SỐ DÒNG" là dữ liệu còn lại của mọi bảng).
-- =====================================================================
begin;

-- 1. Báo cáo gắn demo: người báo hoặc người bị báo là user demo; hoặc báo cáo hệ thống (không người báo) về ca của quán demo.
delete from public.reports r
 where r.reporter_id in (select id from auth.users
                          where email like '%@demo.safeshift.test'
                             or id in ('b0000000-0000-4000-a000-000000000014', 'b0000000-0000-4000-a000-000000000015'))
    or r.subject_id  in (select id from auth.users
                          where email like '%@demo.safeshift.test'
                             or id in ('b0000000-0000-4000-a000-000000000014', 'b0000000-0000-4000-a000-000000000015'))
    or (r.reporter_id is null and r.shift_id in (
          select s.id from public.shifts s
            join public.facilities f on f.id = s.facility_id
            join auth.users u on u.id = f.owner_id
           where u.email like '%@demo.safeshift.test'));

-- 2. Nhật ký thao tác của admin demo (nhật ký của admin thật được giữ nguyên).
delete from public.admin_audit_log
 where admin_id in (select id from auth.users where email like '%@demo.safeshift.test');

-- 3. Ca test/seed có id cố định (nếu còn sót mà không thuộc quán demo thì vẫn xóa; suất, token, kết quả xóa theo).
delete from public.shifts
 where id::text like '50000000-0000-4000-a000-0000000000__'
    or id::text like '50000000-0000-4000-a000-0000000001__'
    or id::text in ('50000000-0000-4000-a000-000000000200', '50000000-0000-4000-a000-000000000300');

-- 4. User demo + 2 user test cố định (hồ sơ, SĐT, cơ sở, phiếu phụ huynh... xóa theo nhờ ON DELETE CASCADE).
delete from auth.users
 where email like '%@demo.safeshift.test'
    or id in ('b0000000-0000-4000-a000-000000000014', 'b0000000-0000-4000-a000-000000000015');

-- (Không xóa hàng loạt "báo cáo mồ côi": không phân biệt được báo cáo mồ côi do demo với báo cáo thật của tài khoản đã bị xóa.
--  Báo cáo gắn demo đã bị xóa ở bước 1 nên không tạo ra mồ côi mới. Nếu dòng "báo cáo mồ côi" cuối file > 0, xem lại từng dòng trước khi xóa tay.)

commit;

-- Tổng kết (câu cuối, chỉ đọc).
select nhom, ten, so_dong, ky_vong from (
  select 1 as o, 'CÒN LẠI DEMO' as nhom, 'user demo/test (auth.users)' as ten,
         (select count(*) from auth.users where email like '%@demo.safeshift.test' or id in ('b0000000-0000-4000-a000-000000000014', 'b0000000-0000-4000-a000-000000000015'))::bigint as so_dong, '0' as ky_vong
  union all select 2, 'CÒN LẠI DEMO', 'hồ sơ demo (profiles)',
         (select count(*) from public.profiles where id::text like '00000000-0000-4000-a000-0000000000__' or id::text like 'e0000000-0000-4000-a000-0000000000__' or id::text like 'a0000000-0000-4000-a000-0000000000__' or id::text like 'b0000000-0000-4000-a000-0000000000__'), '0'
  union all select 3, 'CÒN LẠI DEMO', 'cơ sở demo (id f0000000-...)',
         (select count(*) from public.facilities where id::text like 'f0000000-0000-4000-a000-0000000000__'), '0'
  union all select 4, 'CÒN LẠI DEMO', 'ca demo/test (id 50000000-...)',
         (select count(*) from public.shifts where id::text like '50000000-0000-4000-a000-0000000%'), '0'
  union all select 5, 'CÒN LẠI DEMO', 'suất nhận ca trên ca demo/test',
         (select count(*) from public.shift_claims where shift_id::text like '50000000-0000-4000-a000-0000000%'), '0'
  union all select 6, 'CÒN LẠI DEMO', 'báo cáo gắn demo (ca 50000000-...)',
         (select count(*) from public.reports where shift_id::text like '50000000-0000-4000-a000-0000000%'), '0'
  union all select 7, 'CÒN LẠI DEMO', 'báo cáo mồ côi (không trỏ tới ai/ca nào; nếu > 0 thì xem lại trước khi xóa tay)',
         (select count(*) from public.reports where reporter_id is null and subject_id is null and shift_id is null), '0'
  union all select 8, 'CÒN LẠI DEMO', 'phiếu phụ huynh / token demo (demo-%)',
         (select count(*) from public.parental_consents where token like 'demo-%') + (select count(*) from public.shift_confirmation_tokens where token like 'demo-%'), '0'
  union all select 9, 'SỐ DÒNG (dữ liệu thật còn lại)', t.tablename::text,
         (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', t.tablename), false, true, '')))[1]::text::bigint,
         case when t.tablename = 'app_config' then '2' else 'tùy dữ liệu thật' end
    from pg_tables t where t.schemaname = 'public'
  union all select 10, 'SỐ DÒNG (dữ liệu thật còn lại)', 'auth.users (tất cả tài khoản còn lại)', (select count(*) from auth.users), 'chỉ còn tài khoản thật'
) x order by o, ten;
