-- =====================================================================
-- SafeShift — seed demo. Chạy lại bao nhiêu lần cũng được (tự xóa dữ liệu demo cũ).
-- 1 admin, 9 chủ quán (mỗi chủ một quán; 9 quán thật ở Vũng Tàu, chỉ dùng tên, địa chỉ và hotline công khai của quán,
-- theo chỉ thị chủ dự án 19/11/2026; tên chủ quán là tên giả), 10 người làm (3 người dưới 18), 12 ca đủ trạng thái,
-- 6 tin tuyển dụng lâu dài và 7 đơn ứng tuyển (cần migration 0003: chạy 0003 trước seed).
-- Mọi tài khoản demo có email @demo.safeshift.test và dùng chung mật khẩu công khai `safeshift-demo`
-- (lưu bằng crypt + gen_salt('bf')), cho nút đăng nhập demo ở /dang-nhap. App chỉ là bản mô phỏng: SĐT người làm và
-- phụ huynh là số giả 0900000xxx; ngoài hotline công khai của quán ở trên không có dữ liệu thật nào.
-- Chạy lại seed để khôi phục dữ liệu mẫu. Không xóa user demo bằng tay (lỗi khóa ngoại 23503);
-- nếu cần dọn, dùng supabase/xoa_du_lieu_demo.sql.
-- =====================================================================
begin;
set local app.seed_mode = 'on';   -- bỏ qua trigger kiểm tra thời gian để tạo được ca trong quá khứ

-- Đưa cấu hình về mặc định của migration (bản mô phỏng: ai cũng vào được tài khoản admin demo và đổi được).
insert into public.app_config (key, value) values ('min_hourly_wage', '25500'), ('min_monthly_wage', '5310000'), ('weekly_hours_cap', '40')
on conflict (key) do update set value = excluded.value;

-- Dọn báo cáo / nhật ký của dữ liệu demo TRƯỚC khi xóa user demo.
-- Lý do: một dòng reports có thể trỏ tới nhiều đối tượng demo cùng lúc (người báo, người bị báo, ca). Khi xóa user,
-- Postgres chạy nhiều hành động SET NULL lên cùng một dòng trong một câu lệnh; hành động sau bị bỏ qua và để lại
-- shift_id trỏ vào ca đã bị xóa => lỗi 23503 reports_shift_id_fkey. Xóa hẳn các dòng đó trước thì không còn đụng nhau.
-- Chỉ động tới dữ liệu gắn với user @demo.safeshift.test (báo cáo hệ thống tự tạo không có người báo thì theo ca demo).
delete from public.reports r
 where r.reporter_id in (select id from auth.users where email like '%@demo.safeshift.test')
    or r.subject_id  in (select id from auth.users where email like '%@demo.safeshift.test')
    or (r.reporter_id is null and r.shift_id in (
          select s.id from public.shifts s
            join public.facilities f on f.id = s.facility_id
            join auth.users u on u.id = f.owner_id
           where u.email like '%@demo.safeshift.test'));
delete from public.admin_audit_log
 where admin_id in (select id from auth.users where email like '%@demo.safeshift.test');

delete from auth.users where email like '%@demo.safeshift.test';

-- ---------- auth.users ----------
with u(id, email) as (values
  ('00000000-0000-4000-a000-000000000001'::uuid, 'admin@demo.safeshift.test'),
  ('e0000000-0000-4000-a000-000000000001', 'quan1@demo.safeshift.test'),
  ('e0000000-0000-4000-a000-000000000002', 'quan2@demo.safeshift.test'),
  ('e0000000-0000-4000-a000-000000000003', 'quan3@demo.safeshift.test'),
  ('e0000000-0000-4000-a000-000000000004', 'quan4@demo.safeshift.test'),
  ('e0000000-0000-4000-a000-000000000005', 'quan5@demo.safeshift.test'),
  ('e0000000-0000-4000-a000-000000000006', 'quan6@demo.safeshift.test'),
  ('e0000000-0000-4000-a000-000000000007', 'quan7@demo.safeshift.test'),
  ('e0000000-0000-4000-a000-000000000008', 'quan8@demo.safeshift.test'),
  ('e0000000-0000-4000-a000-000000000009', 'quan9@demo.safeshift.test'),
  ('a0000000-0000-4000-a000-000000000001', 'nguoilam1@demo.safeshift.test'),
  ('a0000000-0000-4000-a000-000000000002', 'nguoilam2@demo.safeshift.test'),
  ('a0000000-0000-4000-a000-000000000003', 'nguoilam3@demo.safeshift.test'),
  ('a0000000-0000-4000-a000-000000000004', 'nguoilam4@demo.safeshift.test'),
  ('a0000000-0000-4000-a000-000000000005', 'nguoilam5@demo.safeshift.test'),
  ('a0000000-0000-4000-a000-000000000006', 'nguoilam6@demo.safeshift.test'),
  ('a0000000-0000-4000-a000-000000000007', 'nguoilam7@demo.safeshift.test'),
  ('a0000000-0000-4000-a000-000000000008', 'nguoilam8@demo.safeshift.test'),
  ('a0000000-0000-4000-a000-000000000009', 'nguoilam9@demo.safeshift.test'),
  ('a0000000-0000-4000-a000-000000000010', 'nguoilam10@demo.safeshift.test')
), ins as (
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change, email_change_token_new)
  select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
         extensions.crypt('safeshift-demo', extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
  from u
  returning id, email
)
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select id::text, id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), 'email', now(), now(), now()
from ins;

-- ---------- profiles + số điện thoại ----------
insert into public.profiles (id, role, full_name, consent_at) values
  ('00000000-0000-4000-a000-000000000001', 'admin',    'Admin Demo',        now()),
  ('e0000000-0000-4000-a000-000000000001', 'employer', 'Cô Nguyễn Thị Hoa', now()),
  ('e0000000-0000-4000-a000-000000000002', 'employer', 'Chú Trần Văn Tư',   now()),
  ('e0000000-0000-4000-a000-000000000003', 'employer', 'Chị Lê Mỹ Duyên',   now()),
  ('e0000000-0000-4000-a000-000000000004', 'employer', 'Anh Phạm Quốc Việt', now()),
  ('e0000000-0000-4000-a000-000000000005', 'employer', 'Cô Võ Thị Sáu',     now()),
  ('e0000000-0000-4000-a000-000000000006', 'employer', 'Chị Hoàng Thị Lan',  now()),
  ('e0000000-0000-4000-a000-000000000007', 'employer', 'Anh Đinh Văn Khoa',  now()),
  ('e0000000-0000-4000-a000-000000000008', 'employer', 'Cô Lý Thị Mai',      now()),
  ('e0000000-0000-4000-a000-000000000009', 'employer', 'Chú Ngô Văn Bình',   now()),
  ('a0000000-0000-4000-a000-000000000001', 'worker', 'Nguyễn Minh Anh',  now()),
  ('a0000000-0000-4000-a000-000000000002', 'worker', 'Trần Quốc Bảo',    now()),
  ('a0000000-0000-4000-a000-000000000003', 'worker', 'Lê Thu Hà',        now()),
  ('a0000000-0000-4000-a000-000000000004', 'worker', 'Phạm Gia Huy',     now()),
  ('a0000000-0000-4000-a000-000000000005', 'worker', 'Võ Ngọc Lan',      now()),
  ('a0000000-0000-4000-a000-000000000006', 'worker', 'Đặng Hoàng Nam',   now()),
  ('a0000000-0000-4000-a000-000000000007', 'worker', 'Bùi Khánh Linh',   now()),
  ('a0000000-0000-4000-a000-000000000008', 'worker', 'Hồ Tuấn Kiệt',     now()),
  ('a0000000-0000-4000-a000-000000000009', 'worker', 'Đỗ Bảo Ngọc',      now()),
  ('a0000000-0000-4000-a000-000000000010', 'worker', 'Mai Đức Phúc',     now());

-- SĐT chủ quán là hotline công khai của quán (chủ dự án duyệt 19/11/2026). Ba quán (Phê La, Phuc Long, Texas Chicken) có hotline
-- 8 hoặc 11 chữ số, không qua được ràng buộc phone ~ '^0[0-9]{9}$' của 0001 nên dùng số giả 0900000xxx.
insert into public.private_contacts (user_id, phone) values
  ('e0000000-0000-4000-a000-000000000001', '0982931487'),
  ('e0000000-0000-4000-a000-000000000002', '0900000102'),
  ('e0000000-0000-4000-a000-000000000003', '0827794599'),
  ('e0000000-0000-4000-a000-000000000004', '0785337339'),
  ('e0000000-0000-4000-a000-000000000005', '0846659460'),
  ('e0000000-0000-4000-a000-000000000006', '0933528978'),
  ('e0000000-0000-4000-a000-000000000007', '0785330124'),
  ('e0000000-0000-4000-a000-000000000008', '0900000108'),
  ('e0000000-0000-4000-a000-000000000009', '0900000109'),
  ('a0000000-0000-4000-a000-000000000001', '0900000201'),
  ('a0000000-0000-4000-a000-000000000002', '0900000202'),
  ('a0000000-0000-4000-a000-000000000003', '0900000203'),
  ('a0000000-0000-4000-a000-000000000004', '0900000204'),
  ('a0000000-0000-4000-a000-000000000005', '0900000205'),
  ('a0000000-0000-4000-a000-000000000006', '0900000206'),
  ('a0000000-0000-4000-a000-000000000007', '0900000207'),
  ('a0000000-0000-4000-a000-000000000008', '0900000208'),
  ('a0000000-0000-4000-a000-000000000009', '0900000209'),
  ('a0000000-0000-4000-a000-000000000010', '0900000210');

-- ---------- người làm: 1–6 từ 18 tuổi đã duyệt; 7 (17t) & 8 (16t) đã duyệt + phụ huynh đồng ý;
--            9 (15t) phụ huynh đã gửi phiếu, chờ admin; 10 (20t) chờ duyệt ----------
insert into public.worker_profiles (user_id, date_of_birth, school, class_name, area, availability, approval, approved_at, approved_by, share_enabled, public_slug) values
  ('a0000000-0000-4000-a000-000000000001', (current_date - interval '20 years 2 months')::date, 'ĐH Bà Rịa - Vũng Tàu', 'Du lịch K22', 'bai_truoc', '{ngay_thuong_toi,cuoi_tuan_sang,cuoi_tuan_chieu}', 'approved', now(), '00000000-0000-4000-a000-000000000001', false, 'demo-minh-anh'),
  ('a0000000-0000-4000-a000-000000000002', (current_date - interval '19 years 5 months')::date, 'CĐ Du lịch Vũng Tàu', 'Nhà hàng K15', 'bai_sau', '{ngay_thuong_sang,cuoi_tuan_sang}', 'approved', now(), '00000000-0000-4000-a000-000000000001', false, 'demo-quoc-bao'),
  ('a0000000-0000-4000-a000-000000000003', (current_date - interval '21 years 1 month')::date, 'ĐH Bà Rịa - Vũng Tàu', 'Quản trị K21', 'thang_tam', '{ngay_thuong_chieu,ngay_thuong_toi}', 'approved', now(), '00000000-0000-4000-a000-000000000001', true, 'demo-thu-ha'),
  ('a0000000-0000-4000-a000-000000000004', (current_date - interval '18 years 3 months')::date, 'CĐ Kỹ thuật Công nghệ BR-VT', null, 'trung_tam', '{cuoi_tuan_sang,cuoi_tuan_chieu,cuoi_tuan_toi}', 'approved', now(), '00000000-0000-4000-a000-000000000001', true, 'demo-gia-huy'),
  ('a0000000-0000-4000-a000-000000000005', (current_date - interval '22 years')::date, 'ĐH Bà Rịa - Vũng Tàu', 'Ngôn ngữ Anh K20', 'bai_sau', '{ngay_thuong_toi}', 'approved', now(), '00000000-0000-4000-a000-000000000001', false, 'demo-ngoc-lan'),
  ('a0000000-0000-4000-a000-000000000006', (current_date - interval '19 years 9 months')::date, 'CĐ Du lịch Vũng Tàu', 'Lữ hành K16', 'rach_dua', '{ngay_thuong_sang,ngay_thuong_chieu}', 'approved', now(), '00000000-0000-4000-a000-000000000001', false, 'demo-hoang-nam'),
  ('a0000000-0000-4000-a000-000000000007', (current_date - interval '17 years 4 months')::date, 'THPT Vũng Tàu', '12A3', 'bai_truoc', '{cuoi_tuan_sang,cuoi_tuan_chieu}', 'approved', now(), '00000000-0000-4000-a000-000000000001', false, 'demo-khanh-linh'),
  ('a0000000-0000-4000-a000-000000000008', (current_date - interval '16 years 6 months')::date, 'THPT Đinh Tiên Hoàng', '11A1', 'thang_tam', '{cuoi_tuan_chieu}', 'approved', now(), '00000000-0000-4000-a000-000000000001', false, 'demo-tuan-kiet'),
  ('a0000000-0000-4000-a000-000000000009', (current_date - interval '15 years 2 months')::date, 'THPT Trần Nguyên Hãn', '10A5', 'trung_tam', '{cuoi_tuan_sang}', 'pending', null, null, false, 'demo-bao-ngoc'),
  ('a0000000-0000-4000-a000-000000000010', (current_date - interval '20 years 7 months')::date, 'ĐH Bà Rịa - Vũng Tàu', 'Logistics K22', 'bai_sau', '{ngay_thuong_toi,cuoi_tuan_toi}', 'pending', null, null, false, 'demo-duc-phuc');

insert into public.parental_consents (worker_id, token, status, parent_name, parent_phone, agreed_at, reviewed_by, reviewed_at) values
  ('a0000000-0000-4000-a000-000000000007', 'demo-consent-07', 'approved',  'Bùi Văn Long',  '0900000307', now() - interval '5 days', '00000000-0000-4000-a000-000000000001', now() - interval '4 days'),
  ('a0000000-0000-4000-a000-000000000008', 'demo-consent-08', 'approved',  'Hồ Thị Mai',    '0900000308', now() - interval '5 days', '00000000-0000-4000-a000-000000000001', now() - interval '4 days'),
  ('a0000000-0000-4000-a000-000000000009', 'demo-consent-09', 'submitted', 'Đỗ Thanh Tùng', '0900000309', now() - interval '1 day', null, null);

-- ---------- cơ sở: 1–4 và 6–9 đã xác minh, 5 chờ xác minh ----------
-- 9 quán thật ở Vũng Tàu (tên, địa chỉ công khai; chủ dự án duyệt 19/11/2026). lat/lng lấy từ OpenStreetMap (cột có từ
-- migration 0002: chạy 0002 trước seed): chỉ quán 3 (OASIS SEA) tra được đúng số nhà; 8 quán còn lại chỉ ra được đoạn đường hoặc số nhà gần đó nên GẦN ĐÚNG.
-- area gán theo khu gần nhất trong enum, không phải địa giới hành chính.
insert into public.facilities (id, owner_id, name, type, address, area, maps_url, not_prohibited_ack, verified, status, lat, lng) values
  ('f0000000-0000-4000-a000-000000000001', 'e0000000-0000-4000-a000-000000000001', 'SOHO Coffee',            'cafe',       '66 Hạ Long, Phường 2, Thành phố Vũng Tàu (TPHCM)',          'bai_truoc', 'https://maps.google.com/?q=SOHO+Coffee+66+Ha+Long+Vung+Tau',                  true, true,  'active',  10.3306, 107.0768),
  ('f0000000-0000-4000-a000-000000000002', 'e0000000-0000-4000-a000-000000000002', 'Phê La Vũng Tàu',        'cafe',       '2 Lê Lợi, Thành phố Vũng Tàu',                              'bai_truoc', 'https://maps.google.com/?q=Phe+La+Vung+Tau+2+Le+Loi',                         true, true,  'active',  10.3477, 107.0743),
  ('f0000000-0000-4000-a000-000000000003', 'e0000000-0000-4000-a000-000000000003', 'OASIS SEA Coffee & Tea', 'cafe',       '1A Trần Phú, Vũng Tàu, TPHCM',                              'khac',      'https://maps.google.com/?q=OASIS+SEA+Coffee+Tea+1A+Tran+Phu+Vung+Tau',        true, true,  'active',  10.3553, 107.0614),
  ('f0000000-0000-4000-a000-000000000004', 'e0000000-0000-4000-a000-000000000004', 'An Coffee Bean',         'cafe',       '488 Thống Nhất, Tam Thắng, Hồ Chí Minh',                    'thang_tam', 'https://maps.google.com/?q=An+Coffee+Bean+488+Thong+Nhat+Vung+Tau',           true, true,  'active',  10.3511, 107.0849),
  ('f0000000-0000-4000-a000-000000000005', 'e0000000-0000-4000-a000-000000000005', 'KATINAT',                'cafe',       '01 Trần Phú',                                               'khac',      'https://maps.google.com/?q=KATINAT+01+Tran+Phu+Vung+Tau',                     true, false, 'pending', 10.3556, 107.0617),
  ('f0000000-0000-4000-a000-000000000006', 'e0000000-0000-4000-a000-000000000006', 'Quán Ốc Thiên Nhiên 2',  'restaurant', '245 Trương Công Định, Vũng Tàu, Hồ Chí Minh',               'trung_tam', 'https://maps.google.com/?q=Quan+Oc+Thien+Nhien+2+245+Truong+Cong+Dinh+Vung+Tau', true, true, 'active', 10.3500, 107.0824),
  ('f0000000-0000-4000-a000-000000000007', 'e0000000-0000-4000-a000-000000000007', 'Bọt',                    'cafe',       '56 Trần Hưng Đạo, Vũng Tàu, Hồ Chí Minh',                   'bai_truoc', 'https://maps.google.com/?q=Bot+56+Tran+Hung+Dao+Vung+Tau',                    true, true,  'active',  10.3464, 107.0764),
  ('f0000000-0000-4000-a000-000000000008', 'e0000000-0000-4000-a000-000000000008', 'Phuc Long Coffee & Tea', 'cafe',       '76 Trần Hưng Đạo, Vũng Tàu, Hồ Chí Minh',                   'bai_truoc', 'https://maps.google.com/?q=Phuc+Long+Coffee+Tea+76+Tran+Hung+Dao+Vung+Tau',   true, true,  'active',  10.3459, 107.0764),
  ('f0000000-0000-4000-a000-000000000009', 'e0000000-0000-4000-a000-000000000009', 'Texas Chicken',          'restaurant', '376 – 378 Lê Hồng Phong, Vũng Tàu, Thành Phố Hồ Chí Minh',  'trung_tam', 'https://maps.google.com/?q=Texas+Chicken+376+Le+Hong+Phong+Vung+Tau',         true, true,  'active',  10.3531, 107.0871);

insert into public.facility_verifications (facility_id, address_ok, contact_ok, has_business_license, verified_on, verified_by, verifier_name, note)
select id, true, true, id <> 'f0000000-0000-4000-a000-000000000003', current_date - 7,
       '00000000-0000-4000-a000-000000000001', 'Admin Demo', 'Đã đến tận nơi, gặp chủ quán.'
from public.facilities where verified;

-- ---------- 12 ca ----------
-- vn(d, t): mốc giờ Việt Nam, d ngày tính từ hôm nay.
create or replace function pg_temp.vn(d int, t time) returns timestamptz language sql as $$
  select (((now() at time zone 'Asia/Ho_Chi_Minh')::date + d) + t) at time zone 'Asia/Ho_Chi_Minh'
$$;

insert into public.shifts (id, facility_id, job_type, starts_at, ends_at, headcount, hourly_wage, description, urgent, allow_minor, commitment_ack, status, created_at, first_claimed_at) values
  -- 01 mở, chưa ai nhận (hợp người dưới 18)
  ('50000000-0000-4000-a000-000000000001', 'f0000000-0000-4000-a000-000000000001', 'phuc_vu',  pg_temp.vn(2, '08:00'), pg_temp.vn(2, '12:00'), 1, 27000, 'Phục vụ bàn buổi sáng, có hướng dẫn.', false, true,  true, 'open', now() - interval '3 hours', null),
  -- 02 mở, GẤP
  ('50000000-0000-4000-a000-000000000002', 'f0000000-0000-4000-a000-000000000001', 'pha_che',  pg_temp.vn(1, '17:00'), pg_temp.vn(1, '21:00'), 1, 30000, 'Cần gấp người phụ pha chế tối mai.', true,  true,  true, 'open', now() - interval '1 hour', null),
  -- 03 có người chính, còn chỗ dự phòng; kết thúc 23:00 (không dành cho dưới 18)
  ('50000000-0000-4000-a000-000000000003', 'f0000000-0000-4000-a000-000000000002', 'phuc_vu',  pg_temp.vn(2, '18:00'), pg_temp.vn(2, '23:00'), 1, 30000, 'Phục vụ tiệc tối.', false, false, true, 'open', now() - interval '1 day', now() - interval '20 hours'),
  -- 04 đủ người: chính + dự phòng
  ('50000000-0000-4000-a000-000000000004', 'f0000000-0000-4000-a000-000000000004', 'le_tan',   pg_temp.vn(1, '08:00'), pg_temp.vn(1, '12:00'), 1, 28000, 'Đón khách và hỗ trợ quầy ca sáng.', false, false, true, 'open', now() - interval '2 days', now() - interval '47 hours'),
  -- 05 đủ người, cả hai đều dưới 18
  ('50000000-0000-4000-a000-000000000005', 'f0000000-0000-4000-a000-000000000002', 'phu_bep_nhe', pg_temp.vn(3, '14:00'), pg_temp.vn(3, '18:00'), 1, 26000, 'Sơ chế rau củ, không dùng dao lớn, không đứng bếp nóng.', false, true, true, 'open', now() - interval '1 day', now() - interval '23 hours'),
  -- 06 đã hủy
  ('50000000-0000-4000-a000-000000000006', 'f0000000-0000-4000-a000-000000000003', 'don_phong', pg_temp.vn(4, '09:00'), pg_temp.vn(4, '13:00'), 1, 27000, 'Quán đổi lịch nên hủy ca.', false, true, true, 'cancelled', now() - interval '1 day', null),
  -- 07 đang diễn ra
  ('50000000-0000-4000-a000-000000000007', 'f0000000-0000-4000-a000-000000000001', 'thu_ngan', now() - interval '1 hour', now() + interval '3 hours', 1, 29000, 'Thu ngân.', false, false, true, 'open', now() - interval '2 days', now() - interval '40 hours'),
  -- 08 vừa hết giờ, chờ chủ quán xác nhận (token còn hạn)
  ('50000000-0000-4000-a000-000000000008', 'f0000000-0000-4000-a000-000000000003', 'don_phong', now() - interval '6 hours', now() - interval '2 hours', 1, 27000, 'Dọn dẹp bàn ghế và quầy sau giờ cao điểm.', false, false, true, 'open', now() - interval '3 days', now() - interval '70 hours'),
  -- 09 quá 72 giờ chưa xác nhận (token hết hạn)
  ('50000000-0000-4000-a000-000000000009', 'f0000000-0000-4000-a000-000000000004', 'le_tan',   pg_temp.vn(-5, '08:00'), pg_temp.vn(-5, '12:00'), 1, 28000, null, false, false, true, 'open', now() - interval '8 days', now() - interval '7 days'),
  -- 10 đã xác nhận: đúng giờ, 5 sao, trả đủ (người dự phòng vào thay)
  ('50000000-0000-4000-a000-000000000010', 'f0000000-0000-4000-a000-000000000001', 'pha_che',  pg_temp.vn(-3, '08:00'), pg_temp.vn(-3, '12:00'), 1, 30000, null, false, false, true, 'completed', now() - interval '6 days', now() - interval '6 days' + interval '25 minutes'),
  -- 11 đã xác nhận: đi trễ, 3 sao, báo chưa trả đủ
  ('50000000-0000-4000-a000-000000000011', 'f0000000-0000-4000-a000-000000000002', 'phuc_vu',  pg_temp.vn(-2, '17:00'), pg_temp.vn(-2, '21:00'), 1, 26000, null, true,  false, true, 'completed', now() - interval '4 days', now() - interval '4 days' + interval '2 hours'),
  -- 12 đã xác nhận: không ai đến
  ('50000000-0000-4000-a000-000000000012', 'f0000000-0000-4000-a000-000000000003', 'ho_tro_su_kien', pg_temp.vn(-4, '14:00'), pg_temp.vn(-4, '18:00'), 1, 28000, null, false, false, true, 'completed', now() - interval '6 days', now() - interval '6 days' + interval '50 minutes');

insert into public.shift_claims (shift_id, worker_id, role, status, claimed_at, promoted_at, cancelled_at, cancel_kind) values
  ('50000000-0000-4000-a000-000000000003', 'a0000000-0000-4000-a000-000000000001', 'primary', 'active', now() - interval '20 hours', null, null, null),
  ('50000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000002', 'primary', 'active', now() - interval '47 hours', null, null, null),
  ('50000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000003', 'backup',  'active', now() - interval '30 hours', null, null, null),
  ('50000000-0000-4000-a000-000000000005', 'a0000000-0000-4000-a000-000000000007', 'primary', 'active', now() - interval '23 hours', null, null, null),
  ('50000000-0000-4000-a000-000000000005', 'a0000000-0000-4000-a000-000000000008', 'backup',  'active', now() - interval '22 hours', null, null, null),
  ('50000000-0000-4000-a000-000000000007', 'a0000000-0000-4000-a000-000000000006', 'primary', 'active', now() - interval '40 hours', null, null, null),
  ('50000000-0000-4000-a000-000000000008', 'a0000000-0000-4000-a000-000000000001', 'primary', 'active', now() - interval '70 hours', null, null, null),
  ('50000000-0000-4000-a000-000000000009', 'a0000000-0000-4000-a000-000000000002', 'primary', 'active', now() - interval '7 days', null, null, null),
  -- ca 10: người 6 hủy sát giờ, người 3 (dự phòng) lên thay
  ('50000000-0000-4000-a000-000000000010', 'a0000000-0000-4000-a000-000000000006', 'primary', 'cancelled', now() - interval '6 days' + interval '25 minutes', null, pg_temp.vn(-3, '07:00'), 'late_cancel'),
  ('50000000-0000-4000-a000-000000000010', 'a0000000-0000-4000-a000-000000000003', 'primary', 'active', now() - interval '5 days', pg_temp.vn(-3, '07:00'), null, null),
  ('50000000-0000-4000-a000-000000000011', 'a0000000-0000-4000-a000-000000000004', 'primary', 'active', now() - interval '4 days' + interval '2 hours', null, null, null),
  ('50000000-0000-4000-a000-000000000012', 'a0000000-0000-4000-a000-000000000005', 'primary', 'active', now() - interval '6 days' + interval '50 minutes', null, null, null);

insert into public.worker_events (worker_id, shift_id, kind, created_at) values
  ('a0000000-0000-4000-a000-000000000006', '50000000-0000-4000-a000-000000000010', 'late_cancel', pg_temp.vn(-3, '07:00')),
  ('a0000000-0000-4000-a000-000000000003', '50000000-0000-4000-a000-000000000010', 'promoted',    pg_temp.vn(-3, '07:00')),
  ('a0000000-0000-4000-a000-000000000005', '50000000-0000-4000-a000-000000000012', 'no_show',     pg_temp.vn(-4, '19:00'));

insert into public.shift_confirmation_tokens (shift_id, token, expires_at, used_at) values
  ('50000000-0000-4000-a000-000000000008', 'demo-token-con-han',  now() - interval '2 hours' + interval '72 hours', null),
  ('50000000-0000-4000-a000-000000000009', 'demo-token-het-han',  pg_temp.vn(-5, '12:00') + interval '72 hours', null),
  ('50000000-0000-4000-a000-000000000010', 'demo-token-da-dung-10', pg_temp.vn(-3, '12:00') + interval '72 hours', pg_temp.vn(-3, '13:00')),
  ('50000000-0000-4000-a000-000000000011', 'demo-token-da-dung-11', pg_temp.vn(-2, '21:00') + interval '72 hours', pg_temp.vn(-2, '21:30')),
  ('50000000-0000-4000-a000-000000000012', 'demo-token-da-dung-12', pg_temp.vn(-4, '18:00') + interval '72 hours', pg_temp.vn(-4, '19:00'));

insert into public.shift_results (shift_id, worker_id, attended, on_time, rating, comment, confirmed_at) values
  ('50000000-0000-4000-a000-000000000010', 'a0000000-0000-4000-a000-000000000003', true,  true,  5,    'Nhanh nhẹn, lễ phép, vào thay gấp mà làm rất tốt.', pg_temp.vn(-3, '13:00')),
  ('50000000-0000-4000-a000-000000000011', 'a0000000-0000-4000-a000-000000000004', true,  false, 3,    'Đến trễ 20 phút nhưng làm chăm.', pg_temp.vn(-2, '21:30')),
  ('50000000-0000-4000-a000-000000000012', 'a0000000-0000-4000-a000-000000000005', false, null,  null, null, pg_temp.vn(-4, '19:00'));

-- Trả lời "đã được trả đủ chưa": ca 11 "chưa đủ" => trigger tự tạo báo cáo cho admin.
insert into public.payment_feedback (shift_id, worker_id, answer) values
  ('50000000-0000-4000-a000-000000000010', 'a0000000-0000-4000-a000-000000000003', 'full'),
  ('50000000-0000-4000-a000-000000000011', 'a0000000-0000-4000-a000-000000000004', 'partial');

insert into public.reports (kind, shift_id, subject_id, body) values
  ('no_show', '50000000-0000-4000-a000-000000000012', 'a0000000-0000-4000-a000-000000000005', 'Chủ quán xác nhận: người làm KHÔNG ĐẾN ca.');

-- Báo cáo đã xử lý, gắn với cơ sở số 3 (chủ quán e…03) để test 11b kiểm tra luồng "chủ quán tự xóa tài khoản":
-- dòng trỏ tới chính chủ quán (người báo / người bị báo) và tới ca của họ. Phải nằm trong seed (đã commit) vì
-- Postgres chỉ kiểm lại khóa ngoại kiểu này với dòng do chính giao dịch tạo ra, nên test không tự dựng được trong cùng giao dịch.
insert into public.reports (kind, status, shift_id, reporter_id, subject_id, body) values
  ('late_cancel',  'resolved', '50000000-0000-4000-a000-000000000008', null,                                   'e0000000-0000-4000-a000-000000000003', 'Demo-11b: ca bị hủy sát giờ, người bị báo là chủ quán.'),
  ('user_report',  'resolved', '50000000-0000-4000-a000-000000000008', 'e0000000-0000-4000-a000-000000000003', null,                                   'Demo-11b: chủ quán gửi báo cáo về ca của mình.'),
  ('user_report',  'resolved', '50000000-0000-4000-a000-000000000012', 'e0000000-0000-4000-a000-000000000003', 'a0000000-0000-4000-a000-000000000005', 'Demo-11b: chủ quán báo người làm vắng mặt.'),
  ('primary_busy', 'resolved', '50000000-0000-4000-a000-000000000012', '00000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000005', 'Demo-11b: admin ghi sự cố người chính báo bận.');

-- ---------- tuyển dụng lâu dài (migration 0003) ----------
-- Tin 04 (An Coffee Bean, cơ sở số 4) đang mở; test 10j gỡ cơ sở này nên tin tự đóng (trigger). Tin 05 hết hạn, tin 06 đã đóng.
insert into public.job_posts (id, facility_id, title, job_type, employment, wage_type, wage_min, wage_max, hours_per_week,
                              schedule_note, description, openings, status, expires_at, commitment_ack, created_at, closed_at) values
  ('c0000000-0000-4000-a000-000000000001', 'f0000000-0000-4000-a000-000000000001', 'Nhân viên pha chế toàn thời gian', 'pha_che', 'full_time', 'monthly', 7000000, 9000000, 48,
   'Sáng 7h–15h hoặc chiều 14h–22h, nghỉ một ngày giữa tuần.', 'Pha chế cà phê, trà và nước ép, có người hướng dẫn tuần đầu. Ưu tiên bạn đã làm quán.', 2, 'open', now() + interval '25 days', true, now(), null),
  ('c0000000-0000-4000-a000-000000000002', 'f0000000-0000-4000-a000-000000000002', 'Phục vụ bàn bán thời gian', 'phuc_vu', 'part_time', 'hourly', 28000, 32000, 24,
   'Tối thứ Sáu đến Chủ nhật, 17h–22h.', 'Phục vụ khách buổi tối, bê món, dọn bàn. Có ăn nhẹ giữa ca.', 3, 'open', now() + interval '20 days', true, now(), null),
  ('c0000000-0000-4000-a000-000000000003', 'f0000000-0000-4000-a000-000000000003', 'Nhân viên đón khách và hỗ trợ quầy', 'le_tan', 'full_time', 'monthly', 6500000, null, 44,
   'Ca sáng hoặc ca tối luân phiên theo tuần.', 'Đón khách, hướng dẫn chọn món, trả lời tin nhắn đặt bàn, giữ quầy gọn gàng.', 1, 'open', now() + interval '15 days', true, now(), null),
  ('c0000000-0000-4000-a000-000000000004', 'f0000000-0000-4000-a000-000000000004', 'Dọn dẹp quán (bán thời gian)', 'don_phong', 'part_time', 'hourly', 27000, null, 20,
   'Sáng 8h–12h, 5 buổi mỗi tuần.', 'Dọn bàn ghế, quầy và khu vệ sinh trước giờ mở cửa.', 1, 'open', now() + interval '18 days', true, now(), null),
  ('c0000000-0000-4000-a000-000000000005', 'f0000000-0000-4000-a000-000000000001', 'Phụ bếp (tin cũ, đã hết hạn)', 'phu_bep_nhe', 'part_time', 'hourly', 26000, null, 16,
   null, 'Tin này đã hết hạn nhận đơn.', 1, 'open', now() - interval '10 days', true, now() - interval '40 days', null),
  ('c0000000-0000-4000-a000-000000000006', 'f0000000-0000-4000-a000-000000000002', 'Thu ngân cuối tuần (đã đóng)', 'thu_ngan', 'part_time', 'hourly', 29000, null, 12,
   'Thứ Bảy, Chủ nhật 10h–18h.', 'Chủ quán đã tuyển đủ người nên đóng tin.', 1, 'closed', now() + interval '10 days', true, now() - interval '20 days', now() - interval '5 days');

-- Đơn mẫu: đủ các trạng thái (applied, shortlisted, hired, withdrawn, rejected).
insert into public.job_applications (id, job_id, worker_id, note, status, created_at, status_changed_at) values
  ('d0000000-0000-4000-a000-000000000001', 'c0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000001', 'Em đã làm phục vụ ở quán cà phê gần trường một năm, muốn học thêm pha chế.', 'applied',     now() - interval '2 days', now() - interval '2 days'),
  ('d0000000-0000-4000-a000-000000000002', 'c0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000002', 'Em rảnh sáng các ngày trong tuần.',                                              'shortlisted', now() - interval '3 days', now() - interval '1 day'),
  ('d0000000-0000-4000-a000-000000000003', 'c0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000005', null,                                                                          'hired',       now() - interval '6 days', now() - interval '4 days'),
  ('d0000000-0000-4000-a000-000000000004', 'c0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000006', 'Em xin rút vì trùng lịch học.',                                                'withdrawn',   now() - interval '5 days', now() - interval '3 days'),
  ('d0000000-0000-4000-a000-000000000005', 'c0000000-0000-4000-a000-000000000003', 'a0000000-0000-4000-a000-000000000003', 'Em biết tiếng Anh giao tiếp cơ bản.',                                           'applied',     now() - interval '1 day',  now() - interval '1 day'),
  ('d0000000-0000-4000-a000-000000000006', 'c0000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000001', null,                                                                          'hired',       now() - interval '8 days', now() - interval '6 days'),
  ('d0000000-0000-4000-a000-000000000007', 'c0000000-0000-4000-a000-000000000006', 'a0000000-0000-4000-a000-000000000004', null,                                                                          'rejected',    now() - interval '15 days', now() - interval '12 days');

commit;
