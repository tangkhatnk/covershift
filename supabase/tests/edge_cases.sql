-- =====================================================================
-- SafeShift — test các trường hợp biên ở tầng database.
-- Chạy SAU seed.sql (SQL editor của Supabase, hoặc `cd db-test && npm test`).
-- Kết quả: bảng (name, passed, detail). Test có ghi dữ liệu => chạy lại seed.sql sau khi test.
-- Giả lập người dùng bằng request.jwt.claims (auth.uid()); test RLS thì đổi hẳn sang role authenticated/anon.
-- =====================================================================
-- Chặn chạy lần hai khi chưa seed lại: test lần trước để lại ca/tài khoản test (ca ...0100, user b0000000-...), chạy tiếp sẽ lỗi khó hiểu.
do $$
begin
  if exists (select 1 from public.shifts where id = '50000000-0000-4000-a000-000000000100')
     or exists (select 1 from auth.users where id in ('b0000000-0000-4000-a000-000000000014', 'b0000000-0000-4000-a000-000000000015')) then
    raise exception 'Dữ liệu test lần trước còn lại. Chạy lại supabase/seed.sql (bản mới) rồi chạy lại file này.';
  end if;
end $$;

create temp table if not exists t_results (n serial, name text, passed boolean, detail text);
truncate t_results;

create or replace function pg_temp.as_user(p_uid uuid, p_role text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case when p_uid is null then '{}' else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, true);
  if p_role is not null then execute format('set local role %I', p_role); end if;
end $$;

-- Kỳ vọng câu lệnh BỊ TỪ CHỐI với thông báo khớp p_like.
create or replace function pg_temp.t_err(p_name text, p_uid uuid, p_sql text, p_like text, p_role text default null)
returns void language plpgsql as $$
declare v_msg text;
begin
  begin
    perform pg_temp.as_user(p_uid, p_role);
    execute p_sql;
    reset role;
    v_msg := null;
  exception when others then
    reset role;
    v_msg := sqlerrm;
  end;
  insert into t_results (name, passed, detail)
  values (p_name, v_msg is not null and v_msg ilike p_like,
          case when v_msg is null then 'KHÔNG bị chặn!' else v_msg end);
end $$;

-- Kỳ vọng biểu thức SQL (trả về boolean) là TRUE.
create or replace function pg_temp.t_true(p_name text, p_uid uuid, p_sql text, p_role text default null)
returns void language plpgsql as $$
declare v_ok boolean; v_msg text;
begin
  begin
    perform pg_temp.as_user(p_uid, p_role);
    execute p_sql into v_ok;
    reset role;
  exception when others then
    reset role;
    v_ok := false; v_msg := sqlerrm;
  end;
  insert into t_results (name, passed, detail) values (p_name, coalesce(v_ok, false), v_msg);
end $$;

-- Chạy p_action rồi kỳ vọng p_check (boolean) là TRUE. Hai câu lệnh riêng để p_check thấy dữ liệu vừa ghi.
create or replace function pg_temp.t_do(p_name text, p_uid uuid, p_action text, p_check text, p_role text default null)
returns void language plpgsql as $$
declare v_ok boolean; v_msg text;
begin
  begin
    perform pg_temp.as_user(p_uid, p_role);
    execute p_action;
    reset role;
    execute p_check into v_ok;
  exception when others then
    reset role;
    v_ok := false; v_msg := sqlerrm;
  end;
  insert into t_results (name, passed, detail) values (p_name, coalesce(v_ok, false), v_msg);
end $$;

-- Tài khoản test thêm (xóa khi chạy lại seed)
insert into auth.users (id, email) values
  ('b0000000-0000-4000-a000-000000000014', 'test14@demo.safeshift.test'),
  ('b0000000-0000-4000-a000-000000000015', 'test15@demo.safeshift.test')
on conflict do nothing;

-- ---------------------------------------------------------------
-- 1. Tuổi
-- ---------------------------------------------------------------
select pg_temp.t_err('1a. Người 14 tuổi đăng ký bị từ chối', 'b0000000-0000-4000-a000-000000000014',
  $$select register_worker('Bé Mười Bốn', (current_date - interval '14 years 11 months')::date, 'THCS Demo', '9A', '0900000414', 'trung_tam', '{}', true)$$,
  '%đủ 15 tuổi%');
select pg_temp.t_err('1b. Ghi thẳng vào bảng (bỏ qua RPC) với tuổi 14 vẫn bị trigger chặn', null,
  $$with p as (insert into profiles (id, role, full_name, consent_at) values ('b0000000-0000-4000-a000-000000000014', 'worker', 'Bé Mười Bốn', now()) returning id)
    insert into worker_profiles (user_id, date_of_birth, school, area) select id, (current_date - interval '14 years')::date, 'THCS Demo', 'khac' from p$$,
  '%đủ 15 tuổi%');
select pg_temp.t_err('1c. Không tick đồng ý xử lý dữ liệu thì không đăng ký được', 'b0000000-0000-4000-a000-000000000015',
  $$select register_worker('Em Mười Lăm', (current_date - interval '15 years 1 month')::date, 'THPT Demo', '10A', '0900000415', 'trung_tam', '{}', false)$$,
  '%đồng ý%');
select pg_temp.t_true('1d. Người 15 tuổi đăng ký được, hệ thống sinh link phụ huynh', 'b0000000-0000-4000-a000-000000000015',
  $$select (j ->> 'minor')::boolean and (j ->> 'consent_token') is not null
    from register_worker('Em Mười Lăm', (current_date - interval '15 years 1 month')::date, 'THPT Demo', '10A', '0900000415', 'trung_tam', '{cuoi_tuan_sang}', true) j$$);
select pg_temp.t_err('1e. Chưa được duyệt thì không nhận ca', 'b0000000-0000-4000-a000-000000000015',
  $$select claim_shift('50000000-0000-4000-a000-000000000001')$$, '%chưa được duyệt%');
select pg_temp.t_err('1f. Admin không duyệt được người dưới 18 khi phụ huynh chưa gửi phiếu', '00000000-0000-4000-a000-000000000001',
  $$select admin_review_worker('b0000000-0000-4000-a000-000000000015', true, null)$$, '%phụ huynh%');
select pg_temp.t_do('1g. Phụ huynh gửi phiếu đồng ý qua token', null,
  $$select submit_parental_consent((select token from parental_consents where worker_id = 'b0000000-0000-4000-a000-000000000015'), 'Phụ Huynh Test', '0900000515', true)$$,
  $$select status = 'submitted' and agreed_at is not null from parental_consents where worker_id = 'b0000000-0000-4000-a000-000000000015'$$);
select pg_temp.t_true('1g2. Trang phụ huynh mở được khi không đăng nhập (anon)', null,
  $$select get_parental_consent('demo-consent-09') ->> 'state' = 'submitted' and get_parental_consent('bịa') ->> 'state' = 'invalid'$$, 'anon');
select pg_temp.t_err('1h. Token phụ huynh chỉ dùng một lần', null,
  $$select submit_parental_consent((select token from parental_consents where worker_id = 'b0000000-0000-4000-a000-000000000015'), 'Người Khác', '0900000516', true)$$,
  '%đã được gửi%');
select pg_temp.t_do('1i. Sau khi có phiếu, admin duyệt được', '00000000-0000-4000-a000-000000000001',
  $$select admin_review_worker('b0000000-0000-4000-a000-000000000015', true, 'ok')$$,
  $$select w.approval = 'approved' and c.status = 'approved' from worker_profiles w join parental_consents c on c.worker_id = w.user_id where w.user_id = 'b0000000-0000-4000-a000-000000000015'$$);

-- ---------------------------------------------------------------
-- 2. Người dưới 18 và ca kết thúc 23:00
-- ---------------------------------------------------------------
select pg_temp.t_err('2a. Người 17 tuổi nhận ca kết thúc 23:00 bị từ chối', 'a0000000-0000-4000-a000-000000000007',
  $$select claim_shift('50000000-0000-4000-a000-000000000003')$$, '%dưới 18 tuổi%');
select pg_temp.t_true('2b. Ca 23:00 không xuất hiện trong feed của người 17 tuổi', 'a0000000-0000-4000-a000-000000000007',
  $$select not exists (select 1 from jsonb_array_elements(feed_shifts()) e where e ->> 'id' = '50000000-0000-4000-a000-000000000003')
       and exists (select 1 from jsonb_array_elements(feed_shifts()) e where e ->> 'id' = '50000000-0000-4000-a000-000000000001')$$);
select pg_temp.t_true('2c. RLS: người 17 tuổi select thẳng bảng shifts cũng không thấy ca 23:00', 'a0000000-0000-4000-a000-000000000007',
  $$select count(*) = 0 from shifts where id = '50000000-0000-4000-a000-000000000003'$$, 'authenticated');
select pg_temp.t_true('2d. Người từ 18 tuổi thấy ca 23:00', 'a0000000-0000-4000-a000-000000000005',
  $$select count(*) = 1 from shifts where id = '50000000-0000-4000-a000-000000000003'$$, 'authenticated');
select pg_temp.t_err('2e. Chủ quán không đăng được ca "cho dưới 18" kết thúc 23:00', 'e0000000-0000-4000-a000-000000000001',
  $$select create_shift(current_date + 5, '18:00', '23:00', 'phuc_vu', 1, 30000, null, false, true, true)$$, '%06:00–22:00%');
select pg_temp.t_err('2f. Ca "cho dưới 18" dài 9 giờ bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_shift(current_date + 5, '08:00', '17:00', 'phuc_vu', 1, 30000, null, false, true, true)$$, '%tối đa 8 giờ%');

-- ---------------------------------------------------------------
-- 3. Giới hạn 40 giờ/tuần: dựng sẵn 32 giờ, nhận ca 8 giờ (=40) được, thêm 1 giờ (=41) bị chặn
-- ---------------------------------------------------------------
do $$
declare v_mon date := (date_trunc('week', (now() at time zone 'Asia/Ho_Chi_Minh')) + interval '14 days')::date; i int; v_id uuid;
begin
  perform set_config('app.seed_mode', 'on', true);
  for i in 0..5 loop
    v_id := ('50000000-0000-4000-a000-0000000001' || lpad(i::text, 2, '0'))::uuid;
    insert into shifts (id, facility_id, job_type, starts_at, ends_at, hourly_wage, commitment_ack)
    values (v_id, 'f0000000-0000-4000-a000-000000000001', 'phuc_vu',
            ((v_mon + i) + time '08:00') at time zone 'Asia/Ho_Chi_Minh',
            ((v_mon + i) + case when i = 5 then time '09:00' else time '16:00' end) at time zone 'Asia/Ho_Chi_Minh',
            27000, true);
    if i < 4 then
      insert into shift_claims (shift_id, worker_id, role) values (v_id, 'a0000000-0000-4000-a000-000000000005', 'primary');
    end if;
  end loop;
  insert into shifts (id, facility_id, job_type, starts_at, ends_at, hourly_wage, commitment_ack)
  values ('50000000-0000-4000-a000-000000000300', 'f0000000-0000-4000-a000-000000000004', 'le_tan',
          (select starts_at + interval '1 hour' from shifts where id = '50000000-0000-4000-a000-000000000003'),
          (select ends_at - interval '1 hour' from shifts where id = '50000000-0000-4000-a000-000000000003'), 28000, true);
  perform set_config('app.seed_mode', 'off', true);
end $$;
select pg_temp.t_true('3a. Nhận ca làm tròn đúng 40 giờ/tuần: được', 'a0000000-0000-4000-a000-000000000005',
  $$select claim_shift('50000000-0000-4000-a000-000000000104') = 'primary'$$);
select pg_temp.t_err('3b. Giờ thứ 41 trong tuần bị từ chối', 'a0000000-0000-4000-a000-000000000005',
  $$select claim_shift('50000000-0000-4000-a000-000000000105')$$, '%40 giờ/tuần%');
select pg_temp.t_err('3c. Nhận ca trùng giờ với ca đã nhận bị từ chối', 'a0000000-0000-4000-a000-000000000001',
  $$select claim_shift('50000000-0000-4000-a000-000000000300')$$, '%trùng giờ%');

-- ---------------------------------------------------------------
-- 4. Lương tối thiểu, cơ sở chưa xác minh, cam kết
-- ---------------------------------------------------------------
select pg_temp.t_err('4a. Lương 25.499đ (dưới mức tối thiểu) bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_shift(current_date + 5, '08:00', '12:00', 'phuc_vu', 1, 25499, null, false, false, true)$$, '%Lương/giờ phải từ 25500%');
select pg_temp.t_true('4b. Lương đúng 25.500đ: đăng được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_shift(current_date + 5, '08:00', '12:00', 'phuc_vu', 1, 25500, null, false, false, true) is not null$$);
select pg_temp.t_err('4c. Ghi thẳng vào bảng shifts với lương thấp vẫn bị trigger chặn', null,
  $$insert into shifts (facility_id, job_type, starts_at, ends_at, hourly_wage, commitment_ack)
    values ('f0000000-0000-4000-a000-000000000001', 'phuc_vu', now() + interval '3 days', now() + interval '3 days 4 hours', 20000, true)$$,
  '%Lương/giờ%');
select pg_temp.t_err('4d. Lương để trống bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_shift(current_date + 5, '08:00', '12:00', 'phuc_vu', 1, null, null, false, false, true)$$, '%lương/giờ%');
select pg_temp.t_err('4e. Cơ sở chưa xác minh không đăng được ca', 'e0000000-0000-4000-a000-000000000005',
  $$select create_shift(current_date + 5, '08:00', '12:00', 'phuc_vu', 1, 30000, null, false, false, true)$$, '%chưa được xác minh%');
select pg_temp.t_err('4f. Không tick cam kết (không thu phí/đặt cọc/giữ giấy tờ) thì không đăng được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_shift(current_date + 5, '08:00', '12:00', 'phuc_vu', 1, 30000, null, false, false, false)$$, '%cam kết%');
select pg_temp.t_err('4g. Loại việc ngoài enum (vd. giao hàng) không thể đăng', 'e0000000-0000-4000-a000-000000000001',
  $$select create_shift(current_date + 5, '08:00', '12:00', 'giao_hang', 1, 30000, null, false, false, true)$$, '%invalid input value for enum%');
select pg_temp.t_err('4h. Loại hình cơ sở bị cấm (karaoke) không có trong enum', null,
  $$select 'karaoke'::facility_type$$, '%invalid input value for enum%');
select pg_temp.t_err('4i. Tên cơ sở chứa "karaoke" bị trigger chặn', 'b0000000-0000-4000-a000-000000000014',
  $$select register_employer('Chủ Test', '0900000614', 'Karaoke Biển Xanh', 'cafe', '1 Đường Test, Vũng Tàu', 'khac', null, true, true)$$, '%không được phép%');
select pg_temp.t_err('4j. Admin không bật verified được nếu checklist không đạt', '00000000-0000-4000-a000-000000000001',
  $$select admin_verify_facility('f0000000-0000-4000-a000-000000000005', true, false, true, current_date, 'Admin Demo', null)$$, '%đúng địa chỉ%');
select pg_temp.t_err('4k. Ghi thẳng verified = true khi chưa có phiếu xác minh bị trigger chặn', null,
  $$update facilities set verified = true, status = 'active' where id = 'f0000000-0000-4000-a000-000000000005'$$, '%phiếu xác minh%');

-- ---------------------------------------------------------------
-- 5. Token xác nhận sau ca
-- ---------------------------------------------------------------
select pg_temp.t_true('5a. Token còn hạn: mở được không cần đăng nhập, không lộ số điện thoại', null,
  $$select j ->> 'state' = 'ok' and jsonb_array_length(j -> 'workers') = 1 and j::text not like '%0900000%' from get_confirmation('demo-token-con-han') j$$, 'anon');
select pg_temp.t_err('5b. Gửi thiếu đánh giá bị từ chối', null,
  $$select submit_confirmation('demo-token-con-han', '[]'::jsonb)$$, '%Đã làm / Không đến%', 'anon');
select pg_temp.t_do('5c. Chủ quán xác nhận (anon): đã làm, đúng giờ, 4 sao => ca completed, có kết quả', null,
  $$select submit_confirmation('demo-token-con-han',
      (select jsonb_agg(w || '{"attended": true, "on_time": true, "rating": 4, "comment": "Làm tốt"}'::jsonb)
       from jsonb_array_elements(get_confirmation('demo-token-con-han') -> 'workers') w))$$,
  $$select (select status = 'completed' from shifts where id = '50000000-0000-4000-a000-000000000008')
       and exists (select 1 from shift_results where shift_id = '50000000-0000-4000-a000-000000000008' and attended and on_time and rating = 4)$$, 'anon');
select pg_temp.t_err('5d. Token đã dùng: gửi lần hai bị từ chối', null,
  $$select submit_confirmation('demo-token-con-han', '[]'::jsonb)$$, '%đã được dùng%', 'anon');
select pg_temp.t_true('5e. Token đã dùng: trang báo "used"; ca chuyển completed', null,
  $$select get_confirmation('demo-token-con-han') ->> 'state' = 'used'
       and (select status = 'completed' from shifts where id = '50000000-0000-4000-a000-000000000008')$$);
select pg_temp.t_true('5f. Token hết hạn (quá 72 giờ): trang báo "expired"', null,
  $$select get_confirmation('demo-token-het-han') ->> 'state' = 'expired'$$, 'anon');
select pg_temp.t_err('5g. Token hết hạn: gửi bị từ chối', null,
  $$select submit_confirmation('demo-token-het-han', '[]'::jsonb)$$, '%hết hạn%', 'anon');
select pg_temp.t_true('5h. Token bịa: "invalid"', null,
  $$select get_confirmation('khong-co-token-nay') ->> 'state' = 'invalid'$$, 'anon');
select pg_temp.t_err('5i. anon không đọc được bảng token', null,
  $$select count(*) from shift_confirmation_tokens$$, '%permission denied%', 'anon');
select pg_temp.t_err('5j. Người đăng nhập cũng không đọc được bảng token', 'a0000000-0000-4000-a000-000000000001',
  $$select count(*) from shift_confirmation_tokens$$, '%permission denied%', 'authenticated');
select pg_temp.t_true('5k. Ca đã xác nhận xuất hiện trong hồ sơ ca làm', 'a0000000-0000-4000-a000-000000000001',
  $$select (get_public_profile('demo-minh-anh') ->> 'confirmed_shifts')::int = 1$$);

-- ---------------------------------------------------------------
-- 6. Nhận ca / chỗ cuối cùng (kiểm tra tuần tự; chạy đua thật: `npm run race` trong db-test)
-- ---------------------------------------------------------------
select pg_temp.t_err('6a. Ca đã đủ chính + dự phòng: người thứ ba bị từ chối', 'a0000000-0000-4000-a000-000000000005',
  $$select claim_shift('50000000-0000-4000-a000-000000000004')$$, '%đủ người%');
select pg_temp.t_err('6b. Ghi thẳng suất dự phòng thứ hai vào bảng bị chặn', null,
  $$insert into shift_claims (shift_id, worker_id, role) values ('50000000-0000-4000-a000-000000000004', 'a0000000-0000-4000-a000-000000000005', 'backup')$$,
  '%đã có người dự phòng%');
select pg_temp.t_err('6c. Chủ quán không nhận ca được', 'e0000000-0000-4000-a000-000000000002',
  $$select claim_shift('50000000-0000-4000-a000-000000000001')$$, '%Chỉ người làm%');
select pg_temp.t_true('6d. Người đầu tiên nhận là người CHÍNH', 'a0000000-0000-4000-a000-000000000004',
  $$select claim_shift('50000000-0000-4000-a000-000000000001') = 'primary'$$);
select pg_temp.t_true('6e. Người thứ hai nhận là người DỰ PHÒNG', 'a0000000-0000-4000-a000-000000000007',
  $$select claim_shift('50000000-0000-4000-a000-000000000001') = 'backup'$$);
select pg_temp.t_err('6f. Bấm nhận hai lần bị từ chối', 'a0000000-0000-4000-a000-000000000007',
  $$select claim_shift('50000000-0000-4000-a000-000000000001')$$, '%đã nhận ca này%');
select pg_temp.t_do('6g. Chủ quán đổi thứ tự chính ⇄ dự phòng', 'e0000000-0000-4000-a000-000000000001',
  $$select swap_roles('50000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000004')$$,
  $$select (select role = 'primary' from shift_claims where shift_id = '50000000-0000-4000-a000-000000000001' and worker_id = 'a0000000-0000-4000-a000-000000000007' and status = 'active')
       and (select role = 'backup' from shift_claims where shift_id = '50000000-0000-4000-a000-000000000001' and worker_id = 'a0000000-0000-4000-a000-000000000004' and status = 'active')$$);
select pg_temp.t_err('6h. Chủ quán khác không đổi được thứ tự ca của người khác', 'e0000000-0000-4000-a000-000000000002',
  $$select swap_roles('50000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000007')$$, '%Không tìm thấy ca%');

-- ---------------------------------------------------------------
-- 7. Số điện thoại
-- ---------------------------------------------------------------
select pg_temp.t_err('7a. Người CHƯA ghép ca gọi API lấy số điện thoại bị từ chối', 'a0000000-0000-4000-a000-000000000005',
  $$select get_shift_contacts('50000000-0000-4000-a000-000000000004')$$, '%chưa được ghép%', 'authenticated');
select pg_temp.t_err('7b. Chủ quán khác gọi API lấy số điện thoại bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select get_shift_contacts('50000000-0000-4000-a000-000000000004')$$, '%chưa được ghép%', 'authenticated');
select pg_temp.t_true('7c. RLS: người làm select bảng private_contacts chỉ thấy đúng 1 dòng của mình', 'a0000000-0000-4000-a000-000000000005',
  $$select count(*) = 1 and bool_and(user_id = 'a0000000-0000-4000-a000-000000000005') from private_contacts$$, 'authenticated');
select pg_temp.t_true('7d. RLS: chủ quán không đọc được worker_profiles (ngày sinh, trường lớp)', 'e0000000-0000-4000-a000-000000000004',
  $$select count(*) = 0 from worker_profiles$$, 'authenticated');
select pg_temp.t_err('7e. anon không đọc được private_contacts', null,
  $$select count(*) from private_contacts$$, '%permission denied%', 'anon');
select pg_temp.t_true('7f. Người chính đã ghép thấy số của quán', 'a0000000-0000-4000-a000-000000000002',
  $$select j -> 'facility' ->> 'phone' = '0900000104' and (j -> 'workers') = 'null'::jsonb from get_shift_contacts('50000000-0000-4000-a000-000000000004') j$$, 'authenticated');
select pg_temp.t_true('7g. Chủ quán thấy số của người chính + dự phòng trên ca của mình', 'e0000000-0000-4000-a000-000000000004',
  $$select jsonb_array_length(j -> 'workers') = 2 and (j -> 'facility') = 'null'::jsonb from get_shift_contacts('50000000-0000-4000-a000-000000000004') j$$, 'authenticated');
select pg_temp.t_true('7h. Feed ca và chi tiết ca không chứa số điện thoại', 'a0000000-0000-4000-a000-000000000005',
  $$select feed_shifts()::text not like '%0900000%' and shift_detail('50000000-0000-4000-a000-000000000004')::text not like '%0900000%'$$);
select pg_temp.t_true('7i. Hồ sơ công khai không có số điện thoại, ngày sinh', null,
  $$select j is not null and j::text not like '%0900000%' and not (j ? 'date_of_birth') from get_public_profile('demo-thu-ha') j$$, 'anon');
select pg_temp.t_true('7j. Hồ sơ đang tắt chia sẻ: người ngoài không xem được', null,
  $$select get_public_profile('demo-quoc-bao') is null$$, 'anon');
select pg_temp.t_err('7k. Người làm không đọc được parent_phone trong phiếu của chính mình (grant theo cột)', 'a0000000-0000-4000-a000-000000000007',
  $$select parent_phone from parental_consents where worker_id = 'a0000000-0000-4000-a000-000000000007'$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('7l. Người làm không đọc được parent_name trong phiếu của chính mình', 'a0000000-0000-4000-a000-000000000007',
  $$select parent_name from parental_consents where worker_id = 'a0000000-0000-4000-a000-000000000007'$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('7m. select * trên parental_consents bị chặn vì có cột parent_phone', 'a0000000-0000-4000-a000-000000000007',
  $$select * from parental_consents$$, '%permission denied%', 'authenticated');
select pg_temp.t_true('7n. Người làm vẫn đọc được token, status, expires_at của phiếu mình: đúng 1 dòng', 'a0000000-0000-4000-a000-000000000007',
  $$select count(*) = 1 and bool_and(token is not null and status = 'approved' and expires_at is not null)
    from (select token, status, expires_at from parental_consents where worker_id = 'a0000000-0000-4000-a000-000000000007') x$$, 'authenticated');
select pg_temp.t_true('7o. Người làm chỉ thấy phiếu của mình (RLS còn hiệu lực với cột được cấp)', 'a0000000-0000-4000-a000-000000000007',
  $$select count(*) = 1 from (select worker_id, status from parental_consents) x$$, 'authenticated');

-- ---------------------------------------------------------------
-- 8. Hủy ca
-- ---------------------------------------------------------------
select pg_temp.t_do('8a. Hủy trước hơn 2 tiếng: người dự phòng tự lên làm người chính', 'a0000000-0000-4000-a000-000000000002',
  $$select cancel_claim('50000000-0000-4000-a000-000000000004')$$,
  $$select not exists (select 1 from worker_events where shift_id = '50000000-0000-4000-a000-000000000004' and kind = 'late_cancel')
       and (select role = 'primary' and promoted_at is not null from shift_claims
            where shift_id = '50000000-0000-4000-a000-000000000004' and worker_id = 'a0000000-0000-4000-a000-000000000003' and status = 'active')$$);
select pg_temp.t_err('8b. Sau khi hủy, không còn xem được số điện thoại của quán', 'a0000000-0000-4000-a000-000000000002',
  $$select get_shift_contacts('50000000-0000-4000-a000-000000000004')$$, '%chưa được ghép%');
do $$
begin
  perform set_config('app.seed_mode', 'on', true);
  insert into shifts (id, facility_id, job_type, starts_at, ends_at, hourly_wage, commitment_ack)
  values ('50000000-0000-4000-a000-000000000200', 'f0000000-0000-4000-a000-000000000002', 'phuc_vu', now() + interval '1 hour', now() + interval '4 hours', 27000, true);
  insert into shift_claims (shift_id, worker_id, role) values
    ('50000000-0000-4000-a000-000000000200', 'a0000000-0000-4000-a000-000000000002', 'primary'),
    ('50000000-0000-4000-a000-000000000200', 'a0000000-0000-4000-a000-000000000004', 'backup');
  perform set_config('app.seed_mode', 'off', true);
end $$;
select pg_temp.t_do('8c. Hủy khi còn dưới 2 tiếng: ghi late_cancel vào lịch sử + báo cáo cho admin', 'a0000000-0000-4000-a000-000000000002',
  $$select cancel_claim('50000000-0000-4000-a000-000000000200')$$,
  $$select exists (select 1 from worker_events where worker_id = 'a0000000-0000-4000-a000-000000000002' and shift_id = '50000000-0000-4000-a000-000000000200' and kind = 'late_cancel')
       and exists (select 1 from reports where shift_id = '50000000-0000-4000-a000-000000000200' and kind = 'late_cancel' and status = 'open')$$);
select pg_temp.t_err('8d. Ca đã bắt đầu thì không tự hủy được', 'a0000000-0000-4000-a000-000000000006',
  $$select cancel_claim('50000000-0000-4000-a000-000000000007')$$, '%đã bắt đầu%');

-- ---------------------------------------------------------------
-- 9. "Đã được trả đủ chưa?"
-- ---------------------------------------------------------------
select pg_temp.t_do('9a. Trả lời "Chưa nhận" => tự tạo báo cáo cho admin', 'a0000000-0000-4000-a000-000000000001',
  $$select submit_payment_feedback('50000000-0000-4000-a000-000000000008', 'unpaid')$$,
  $$select exists (select 1 from reports where shift_id = '50000000-0000-4000-a000-000000000008' and kind = 'payment' and status = 'open')$$);
select pg_temp.t_err('9b. Người không làm ca đó không trả lời được', 'a0000000-0000-4000-a000-000000000002',
  $$select submit_payment_feedback('50000000-0000-4000-a000-000000000008', 'full')$$, '%Chỉ người làm chính%');
select pg_temp.t_err('9c. Chủ quán không đọc được câu trả lời về tiền công', 'e0000000-0000-4000-a000-000000000003',
  $$select 1 / (select count(*) from payment_feedback)$$, '%division by zero%', 'authenticated');

-- ---------------------------------------------------------------
-- 10. Phân quyền
-- ---------------------------------------------------------------
select pg_temp.t_err('10a. Người dùng không tự nâng mình lên admin được', 'a0000000-0000-4000-a000-000000000001',
  $$update profiles set role = 'admin' where id = 'a0000000-0000-4000-a000-000000000001'$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('10b. Không insert thẳng vào shift_claims qua API được', 'a0000000-0000-4000-a000-000000000001',
  $$insert into shift_claims (shift_id, worker_id, role) values ('50000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000001', 'primary')$$,
  '%permission denied%', 'authenticated');
select pg_temp.t_err('10c. Người thường gọi RPC admin bị từ chối', 'a0000000-0000-4000-a000-000000000001',
  $$select admin_kpis()$$, '%nhóm vận hành%', 'authenticated');
select pg_temp.t_err('10d. Client không gọi được make_admin', 'a0000000-0000-4000-a000-000000000001',
  $$select make_admin('nguoilam1@demo.safeshift.test')$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('10e. Client không gọi được hàm nội bộ', 'a0000000-0000-4000-a000-000000000001',
  $$select _cancel_shift_internal('50000000-0000-4000-a000-000000000002')$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('10f. Client không tự bật seed_mode để lách trigger', 'e0000000-0000-4000-a000-000000000001',
  $$select _bypass()$$, '%permission denied%', 'authenticated');
select pg_temp.t_do('10g. "Người chính báo bận": dự phòng lên thay, ghi sự cố + audit log', '00000000-0000-4000-a000-000000000001',
  $$select admin_primary_busy('50000000-0000-4000-a000-000000000005', 'a0000000-0000-4000-a000-000000000007', 'Bận thi')$$,
  $$select (select role = 'primary' from shift_claims where shift_id = '50000000-0000-4000-a000-000000000005' and worker_id = 'a0000000-0000-4000-a000-000000000008' and status = 'active')
       and exists (select 1 from reports where shift_id = '50000000-0000-4000-a000-000000000005' and kind = 'primary_busy')
       and exists (select 1 from admin_audit_log where action = 'primary_busy' and target_id = '50000000-0000-4000-a000-000000000005')$$);
select pg_temp.t_do('10h. Khóa tài khoản: suất tương lai bị hủy, có audit log', '00000000-0000-4000-a000-000000000001',
  $$select admin_set_account_status('a0000000-0000-4000-a000-000000000004', 'locked', 'test')$$,
  $$select not exists (select 1 from shift_claims c join shifts s on s.id = c.shift_id
                       where c.worker_id = 'a0000000-0000-4000-a000-000000000004' and c.status = 'active' and s.starts_at > now())
       and exists (select 1 from admin_audit_log where action = 'lock_account')$$);
select pg_temp.t_err('10i. Tài khoản bị khóa không nhận ca được', 'a0000000-0000-4000-a000-000000000004',
  $$select claim_shift('50000000-0000-4000-a000-000000000002')$$, '%bị khóa%');
select pg_temp.t_do('10j. Gỡ cơ sở: tắt verified, hủy các ca sắp tới', '00000000-0000-4000-a000-000000000001',
  $$select admin_set_facility_status('f0000000-0000-4000-a000-000000000004', 'removed', 'test')$$,
  $$select (select not verified from facilities where id = 'f0000000-0000-4000-a000-000000000004')
       and (select status = 'cancelled' from shifts where id = '50000000-0000-4000-a000-000000000004')$$);
select pg_temp.t_true('10k. KPI trả đủ 12 chỉ số', '00000000-0000-4000-a000-000000000001',
  $$select (select count(*) from jsonb_object_keys(admin_kpis())) = 12$$);
select pg_temp.t_true('10l. Bảng điều phối 24 giờ tới chạy được', '00000000-0000-4000-a000-000000000001',
  $$select jsonb_typeof(admin_dispatch_board() -> 'upcoming') = 'array'$$);
select pg_temp.t_true('10m. 16 user demo của seed đều có mật khẩu demo; user @demo khác (tài khoản test) không có', null,
  $$select count(*) filter (where email ~ '^(admin|quan[1-5]|nguoilam([1-9]|10))@demo\.safeshift\.test$') = 16
       and count(*) filter (where email ~ '^(admin|quan[0-9]+|nguoilam[0-9]+)@demo\.safeshift\.test$'
                              and (email_confirmed_at is null or confirmation_token is null or recovery_token is null
                                   or email_change is null or email_change_token_new is null
                                   or not exists (select 1 from auth.identities i
                                                  where i.user_id = auth.users.id and i.provider = 'email'))) = 0
       and count(*) filter (where email ~ '^(admin|quan[0-9]+|nguoilam[0-9]+)@demo\.safeshift\.test$'
                              and coalesce(encrypted_password, '') = '') = 0
       and count(*) filter (where email !~ '^(admin|quan[0-9]+|nguoilam[0-9]+)@demo\.safeshift\.test$'
                              and coalesce(encrypted_password, '') <> '') = 0
    from auth.users where email like '%@demo.safeshift.test'$$);

-- ---------------------------------------------------------------
-- 11. Xóa tài khoản và toàn bộ dữ liệu
-- ---------------------------------------------------------------
select pg_temp.t_do('11a. Người làm tự xóa tài khoản: mất sạch dữ liệu ở mọi bảng', 'b0000000-0000-4000-a000-000000000015',
  $$select delete_my_account()$$,
  $$select not exists (select 1 from auth.users where id = 'b0000000-0000-4000-a000-000000000015')
       and not exists (select 1 from profiles where id = 'b0000000-0000-4000-a000-000000000015')
       and not exists (select 1 from private_contacts where user_id = 'b0000000-0000-4000-a000-000000000015')
       and not exists (select 1 from worker_profiles where user_id = 'b0000000-0000-4000-a000-000000000015')
       and not exists (select 1 from parental_consents where worker_id = 'b0000000-0000-4000-a000-000000000015')$$);

-- 11b. Chủ quán tự xóa tài khoản khi ca của họ có đủ loại báo cáo + worker_events.
-- Báo cáo mẫu 'Demo-11b: ...' do seed.sql tạo (đã commit từ trước). Không dựng trong test vì Postgres chỉ kiểm lại khóa ngoại
-- kiểu này với dòng do chính giao dịch tạo ra => sẽ báo lỗi giả. Thêm báo cáo late_cancel/payment/user_report tạo bằng RPC ở
-- các test trước (cùng giao dịch) cũng không dùng được cho mục đích này.
select pg_temp.t_do('11b. Chủ quán xóa tài khoản khi ca có báo cáo (late_cancel, primary_busy, user_report) + worker_events: thành công, dữ liệu chủ quán sạch, báo cáo còn lại không trỏ tới ca đã xóa', 'e0000000-0000-4000-a000-000000000003',
  $$select delete_my_account()$$,
  $$select not exists (select 1 from auth.users where id = 'e0000000-0000-4000-a000-000000000003')
       and not exists (select 1 from profiles where id = 'e0000000-0000-4000-a000-000000000003')
       and not exists (select 1 from private_contacts where user_id = 'e0000000-0000-4000-a000-000000000003')
       and not exists (select 1 from facilities where owner_id = 'e0000000-0000-4000-a000-000000000003')
       and not exists (select 1 from shifts where facility_id = 'f0000000-0000-4000-a000-000000000003')
       and not exists (select 1 from shift_claims where shift_id in ('50000000-0000-4000-a000-000000000008', '50000000-0000-4000-a000-000000000012'))
       and (select count(*) from reports where body like 'Demo-11b:%') = 4
       and not exists (select 1 from reports where body like 'Demo-11b:%' and shift_id is not null)
       and not exists (select 1 from reports where reporter_id = 'e0000000-0000-4000-a000-000000000003' or subject_id = 'e0000000-0000-4000-a000-000000000003')
       and (select count(*) from reports where body like 'Demo-11b:%' and reporter_id is null and subject_id is null) = 2
       and exists (select 1 from worker_events where worker_id = 'a0000000-0000-4000-a000-000000000005' and kind = 'no_show' and shift_id is null)
       and exists (select 1 from worker_profiles where user_id = 'a0000000-0000-4000-a000-000000000005')$$);
-- Dọn báo cáo mồ côi do chính test này tạo (không để lại rác sau test; chỉ báo cáo mẫu 'Demo-11b:' không còn trỏ tới ai).
delete from reports where body like 'Demo-11b:%' and reporter_id is null and subject_id is null and shift_id is null;

-- ---------------------------------------------------------------
-- 12. Tọa độ cơ sở (migration 0002)
-- ---------------------------------------------------------------
select pg_temp.t_err('12a. Vĩ độ ngoài khung Vũng Tàu (10.2999) bị chặn', 'e0000000-0000-4000-a000-000000000001',
  $$select set_facility_location('f0000000-0000-4000-a000-000000000001', 10.2999, 107.05)$$, '%khu vực Vũng Tàu%');
select pg_temp.t_err('12b. Kinh độ ngoài khung (107.61) bị chặn', 'e0000000-0000-4000-a000-000000000001',
  $$select set_facility_location('f0000000-0000-4000-a000-000000000001', 10.5, 107.61)$$, '%khu vực Vũng Tàu%');
select pg_temp.t_do('12c. Góc dưới-trái của khung (10.30, 107.00) được nhận', 'e0000000-0000-4000-a000-000000000001',
  $$select set_facility_location('f0000000-0000-4000-a000-000000000001', 10.30, 107.00)$$,
  $$select lat = 10.30 and lng = 107.00 from facilities where id = 'f0000000-0000-4000-a000-000000000001'$$);
select pg_temp.t_do('12d. Góc trên-phải của khung (10.80, 107.60) được nhận', 'e0000000-0000-4000-a000-000000000001',
  $$select set_facility_location('f0000000-0000-4000-a000-000000000001', 10.80, 107.60)$$,
  $$select lat = 10.80 and lng = 107.60 from facilities where id = 'f0000000-0000-4000-a000-000000000001'$$);
select pg_temp.t_err('12e. Chỉ nhập vĩ độ, thiếu kinh độ: bị chặn', 'e0000000-0000-4000-a000-000000000001',
  $$select set_facility_location('f0000000-0000-4000-a000-000000000001', 10.5, null)$$, '%đủ vĩ độ và kinh độ%');
select pg_temp.t_err('12f. Chủ quán khác không sửa được vị trí cơ sở này', 'e0000000-0000-4000-a000-000000000002',
  $$select set_facility_location('f0000000-0000-4000-a000-000000000001', 10.5, 107.1)$$, '%không có quyền sửa vị trí%');
select pg_temp.t_err('12g. Người làm không sửa được vị trí cơ sở', 'a0000000-0000-4000-a000-000000000001',
  $$select set_facility_location('f0000000-0000-4000-a000-000000000001', 10.5, 107.1)$$, '%không có quyền sửa vị trí%');
select pg_temp.t_do('12h. Chủ quán xóa ghim của mình (cả hai null)', 'e0000000-0000-4000-a000-000000000001',
  $$select set_facility_location('f0000000-0000-4000-a000-000000000001', null, null)$$,
  $$select lat is null and lng is null from facilities where id = 'f0000000-0000-4000-a000-000000000001'$$);
select pg_temp.t_do('12i. Chủ quán đặt lại vị trí của mình, không có dòng audit (không phải admin)', 'e0000000-0000-4000-a000-000000000001',
  $$select set_facility_location('f0000000-0000-4000-a000-000000000001', 10.3441, 107.0749)$$,
  $$select lat = 10.3441 and lng = 107.0749 from facilities where id = 'f0000000-0000-4000-a000-000000000001'
       and not exists (select 1 from admin_audit_log where action = 'set_facility_location' and target_id = 'f0000000-0000-4000-a000-000000000001')$$);
select pg_temp.t_do('12j. Admin đặt vị trí cơ sở bất kỳ, có dòng audit set_facility_location', '00000000-0000-4000-a000-000000000001',
  $$select set_facility_location('f0000000-0000-4000-a000-000000000002', 10.34, 107.09)$$,
  $$select (select lat = 10.34 and lng = 107.09 from facilities where id = 'f0000000-0000-4000-a000-000000000002')
       and exists (select 1 from admin_audit_log where action = 'set_facility_location' and target_id = 'f0000000-0000-4000-a000-000000000002')$$);
select pg_temp.t_do('12k. (chuẩn bị) Admin gỡ Quán Demo 5', '00000000-0000-4000-a000-000000000001',
  $$select admin_set_facility_status('f0000000-0000-4000-a000-000000000005', 'removed', 'test 12')$$,
  $$select status = 'removed' from facilities where id = 'f0000000-0000-4000-a000-000000000005'$$);
select pg_temp.t_err('12l. Cơ sở đã gỡ: chủ quán không sửa được vị trí', 'e0000000-0000-4000-a000-000000000005',
  $$select set_facility_location('f0000000-0000-4000-a000-000000000005', 10.4, 107.1)$$, '%đã bị gỡ%');
select pg_temp.t_err('12m. anon không gọi được set_facility_location', null,
  $$select set_facility_location('f0000000-0000-4000-a000-000000000001', 10.5, 107.1)$$, '%permission denied%', 'anon');
select pg_temp.t_err('12n. Người đăng nhập ghi thẳng bảng facilities (bỏ qua RPC) bị chặn', 'e0000000-0000-4000-a000-000000000001',
  $$update facilities set lat = 10.5, lng = 107.1 where id = 'f0000000-0000-4000-a000-000000000001'$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('12o. Constraint ở bảng chặn tọa độ ngoài khung kể cả khi ghi bằng quyền cao (không qua RPC)', null,
  $$update facilities set lat = 50, lng = 107.1 where id = 'f0000000-0000-4000-a000-000000000001'$$, '%facilities_location_check%');
select pg_temp.t_err('12p. Constraint ở bảng chặn lệch cặp (có lat, lng null)', null,
  $$update facilities set lat = 10.5, lng = null where id = 'f0000000-0000-4000-a000-000000000001'$$, '%facilities_location_check%');
select pg_temp.t_true('12q. feed_shifts có lat/lng ở mọi ca, vẫn không có số điện thoại', 'a0000000-0000-4000-a000-000000000005',
  $$select count(*) > 0 and bool_and(e ? 'lat' and e ? 'lng') and feed_shifts()::text not like '%0900000%'
    from jsonb_array_elements(feed_shifts()) e$$);
select pg_temp.t_true('12r. admin_list_facilities trả lat/lng của Quán Demo 1', '00000000-0000-4000-a000-000000000001',
  $$select (e ->> 'lat')::float8 = 10.3441 and (e ->> 'lng')::float8 = 107.0749
    from jsonb_array_elements(admin_list_facilities()) e where e ->> 'id' = 'f0000000-0000-4000-a000-000000000001'$$);

select pg_temp.as_user(null, null);
select name, passed, detail from t_results order by n;
