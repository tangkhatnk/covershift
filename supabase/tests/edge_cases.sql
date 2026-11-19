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
  $$select j -> 'facility' ->> 'phone' = '0785337339' and (j -> 'workers') = 'null'::jsonb from get_shift_contacts('50000000-0000-4000-a000-000000000004') j$$, 'authenticated');
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
select pg_temp.t_true('10m. 20 user demo của seed đều có mật khẩu demo; user @demo khác (tài khoản test) không có', null,
  $$select count(*) filter (where email ~ '^(admin|quan[1-9]|nguoilam([1-9]|10))@demo\.safeshift\.test$') = 20
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
-- 10n. Tên 9 quán thật của seed (seed chạy ở chế độ bỏ qua trigger) đều qua _facilities_guard khi không bypass (không dính bar, pub, club, karaoke, massage...).
select pg_temp.t_do('10n. Ghi lại tên 9 cơ sở của seed ngoài chế độ seed: trigger _facilities_guard không chặn tên nào', null,
  $$update facilities set name = name where id::text like 'f0000000-0000-4000-a000-0000000000__'$$,
  $$select count(*) = 9 and count(distinct owner_id) = 9 and bool_and(address <> '')
       and (select count(*) = 9 from private_contacts pc join profiles p on p.id = pc.user_id
             where p.role = 'employer' and pc.user_id in (select owner_id from facilities where id::text like 'f0000000-0000-4000-a000-0000000000__'))
    from facilities where id::text like 'f0000000-0000-4000-a000-0000000000__'$$);

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
       and exists (select 1 from worker_profiles where user_id = 'a0000000-0000-4000-a000-000000000005')
       and not exists (select 1 from job_posts where facility_id = 'f0000000-0000-4000-a000-000000000003')
       and not exists (select 1 from job_applications where id = 'd0000000-0000-4000-a000-000000000005')
       and exists (select 1 from worker_profiles where user_id = 'a0000000-0000-4000-a000-000000000003')$$);
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
select pg_temp.t_do('12k. (chuẩn bị) Admin gỡ cơ sở số 5 (KATINAT)', '00000000-0000-4000-a000-000000000001',
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
select pg_temp.t_true('12r. admin_list_facilities trả lat/lng của cơ sở số 1 (SOHO Coffee)', '00000000-0000-4000-a000-000000000001',
  $$select (e ->> 'lat')::float8 = 10.3441 and (e ->> 'lng')::float8 = 107.0749
    from jsonb_array_elements(admin_list_facilities()) e where e ->> 'id' = 'f0000000-0000-4000-a000-000000000001'$$);


-- ---------------------------------------------------------------
-- 13. Tuyển dụng lâu dài (migration 0003)
-- ---------------------------------------------------------------
create or replace function pg_temp.jp(p_title text) returns uuid language sql as $$ select id from public.job_posts where title = p_title $$;
create or replace function pg_temp.ja(p_title text, p_worker uuid) returns uuid language sql as $$
  select a.id from public.job_applications a join public.job_posts j on j.id = a.job_id
  where j.title = p_title and a.worker_id = p_worker order by a.created_at desc limit 1 $$;
-- Hai người làm đã duyệt, ngày sinh sát mốc 18 tuổi: B16 đủ 18 hôm nay, B17 đủ 18 vào ngày mai.
do $$
begin
  perform set_config('app.seed_mode', 'on', true);
  insert into auth.users (id, email) values
    ('b0000000-0000-4000-a000-000000000016', 'test16@demo.safeshift.test'), ('b0000000-0000-4000-a000-000000000017', 'test17@demo.safeshift.test');
  insert into profiles (id, role, full_name, consent_at) values
    ('b0000000-0000-4000-a000-000000000016', 'worker', 'Test Mười Tám', now()), ('b0000000-0000-4000-a000-000000000017', 'worker', 'Test Gần Mười Tám', now());
  insert into private_contacts (user_id, phone) values ('b0000000-0000-4000-a000-000000000016', '0900000816'), ('b0000000-0000-4000-a000-000000000017', '0900000817');
  insert into worker_profiles (user_id, date_of_birth, school, area, approval, approved_at) values
    ('b0000000-0000-4000-a000-000000000016', (vn_date(now()) - interval '18 years')::date, 'ĐH Demo', 'trung_tam', 'approved', now()),
    ('b0000000-0000-4000-a000-000000000017', (vn_date(now()) - interval '18 years')::date + 1, 'ĐH Demo', 'trung_tam', 'approved', now());
  perform set_config('app.seed_mode', 'off', true);
end $$;

select pg_temp.t_err('13a. Cơ sở chưa xác minh không đăng được tin tuyển dụng', 'e0000000-0000-4000-a000-000000000005',
  $$select create_job_post('Test13 chưa xác minh', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 1, 30, true)$$, '%chưa được xác minh%');
select pg_temp.t_err('13b. Ghi thẳng vào bảng (bỏ qua RPC) cho cơ sở chưa xác minh vẫn bị trigger chặn', null,
  $$insert into job_posts (facility_id, title, job_type, employment, wage_type, wage_min, hours_per_week, expires_at, commitment_ack) values ('f0000000-0000-4000-a000-000000000005', 'x', 'phuc_vu', 'part_time', 'hourly', 30000, 10, now() + interval '5 days', true)$$, '%chưa được xác minh%');
select pg_temp.t_err('13c. Lương giờ 25.499đ (dưới mức tối thiểu) bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'part_time', 'hourly', 25499, null, 20, null, null, 1, 30, true)$$, '%Lương/giờ phải từ 25500%');
select pg_temp.t_true('13d. Lương giờ đúng 25.500đ: đăng được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 hourly min', 'phuc_vu', 'part_time', 'hourly', 25500, null, 20, null, null, 1, 30, true) is not null$$ );
select pg_temp.t_err('13e. Lương tháng 5.309.999đ bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'full_time', 'monthly', 5309999, null, 44, null, null, 1, 30, true)$$, '%Lương/tháng phải từ 5310000%');
select pg_temp.t_true('13f. Lương tháng đúng 5.310.000đ: đăng được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 monthly min', 'phuc_vu', 'full_time', 'monthly', 5310000, null, 44, null, null, 1, 30, true) is not null$$ );
select pg_temp.t_err('13g. Ghi thẳng bảng với lương giờ thấp vẫn bị trigger chặn', null,
  $$insert into job_posts (facility_id, title, job_type, employment, wage_type, wage_min, hours_per_week, expires_at, commitment_ack) values ('f0000000-0000-4000-a000-000000000001', 'x', 'phuc_vu', 'part_time', 'hourly', 20000, 10, now() + interval '5 days', true)$$, '%Lương/giờ%');
select pg_temp.t_err('13h. Lương cao nhất thấp hơn lương thấp nhất bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'part_time', 'hourly', 30000, 29999, 20, null, null, 1, 30, true)$$, '%cao nhất%');
select pg_temp.t_true('13i. Lương cao nhất bằng lương thấp nhất: được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 wage eq', 'phuc_vu', 'part_time', 'hourly', 30000, 30000, 20, null, null, 1, 30, true) is not null$$ );
select pg_temp.t_err('13j. 0 giờ/tuần bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'part_time', 'hourly', 26000, null, 0, null, null, 1, 30, true)$$, '%1 đến 48%');
select pg_temp.t_true('13k. 1 giờ/tuần: được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 hours1', 'phuc_vu', 'part_time', 'hourly', 26000, null, 1, null, null, 1, 30, true) is not null$$ );
select pg_temp.t_err('13l. 49 giờ/tuần bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'part_time', 'hourly', 26000, null, 49, null, null, 1, 30, true)$$, '%1 đến 48%');
select pg_temp.t_true('13m. 48 giờ/tuần: được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 hours48', 'phuc_vu', 'part_time', 'hourly', 26000, null, 48, null, null, 1, 30, true) is not null$$ );
select pg_temp.t_err('13n. Cần tuyển 0 người bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 0, 30, true)$$, '%từ 1 đến 10%');
select pg_temp.t_true('13o. Cần tuyển 1 người: được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 openings1', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 1, 30, true) is not null$$ );
select pg_temp.t_err('13p. Cần tuyển 11 người bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 11, 30, true)$$, '%từ 1 đến 10%');
select pg_temp.t_true('13q. Cần tuyển 10 người: được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 openings10', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 10, 30, true) is not null$$ );
select pg_temp.t_err('13r. Tiêu đề 121 ký tự bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post(repeat('a', 121), 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 1, 30, true)$$, '%1 đến 120%');
select pg_temp.t_true('13s. Tiêu đề 120 ký tự: được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post(repeat('b', 120), 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 1, 30, true) is not null$$ );
select pg_temp.t_err('13t. Tiêu đề toàn khoảng trắng bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('   ', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 1, 30, true)$$, '%1 đến 120%');
select pg_temp.t_err('13u. Mô tả 2001 ký tự bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, repeat('x', 2001), 1, 30, true)$$, '%2000 ký tự%');
select pg_temp.t_true('13v. Mô tả 2000 ký tự: được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 desc2000', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, repeat('x', 2000), 1, 30, true) is not null$$ );
select pg_temp.t_err('13w. Ghi chú lịch làm 501 ký tự bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, repeat('x', 501), null, 1, 30, true)$$, '%500 ký tự%');
select pg_temp.t_true('13x. Ghi chú lịch làm 500 ký tự: được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 sched500', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, repeat('x', 500), null, 1, 30, true) is not null$$ );
select pg_temp.t_err('13y. Tin hiển thị 31 ngày bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 1, 31, true)$$, '%từ 1 đến 30 ngày%');
select pg_temp.t_err('13z. Tin hiển thị 0 ngày bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 1, 0, true)$$, '%từ 1 đến 30 ngày%');
select pg_temp.t_true('13aa. Tin hiển thị đúng 30 ngày: được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 days30', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 1, 30, true) is not null$$ );
select pg_temp.t_err('13ab. Ghi thẳng bảng với hạn 31 ngày bị constraint chặn', null,
  $$insert into job_posts (facility_id, title, job_type, employment, wage_type, wage_min, hours_per_week, expires_at, commitment_ack) values ('f0000000-0000-4000-a000-000000000001', 'x', 'phuc_vu', 'part_time', 'hourly', 30000, 10, now() + interval '31 days', true)$$, '%job_posts_expires%');
select pg_temp.t_err('13ac. Không tick cam kết thì không đăng được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 1, 30, false)$$, '%cam kết%');
select pg_temp.t_err('13ad. Ghi thẳng bảng với commitment_ack = false bị constraint chặn', null,
  $$insert into job_posts (facility_id, title, job_type, employment, wage_type, wage_min, hours_per_week, expires_at, commitment_ack) values ('f0000000-0000-4000-a000-000000000001', 'x', 'phuc_vu', 'part_time', 'hourly', 30000, 10, now() + interval '5 days', false)$$, '%job_posts_commitment%');
select pg_temp.t_err('13ae. Người làm không đăng tin được (không có cơ sở)', 'a0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'part_time', 'hourly', 26000, null, 20, null, null, 1, 30, true)$$, '%chưa có cơ sở%');
select pg_temp.t_err('13af. Loại việc ngoài enum không đăng được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'giao_hang', 'part_time', 'hourly', 26000, null, 20, null, null, 1, 30, true)$$, '%invalid input value for enum%');
select pg_temp.t_do('13ag. Admin đổi lương tháng tối thiểu (khóa min_monthly_wage), có audit', '00000000-0000-4000-a000-000000000001',
  $$select admin_set_config('min_monthly_wage', 5400000)$$,
  $$select (select value from app_config where key = 'min_monthly_wage') = '5400000'::jsonb and exists (select 1 from admin_audit_log where action = 'set_config' and detail ->> 'key' = 'min_monthly_wage')$$ );
select pg_temp.t_err('13ah. Lương tháng 5.310000đ bị chặn khi mức tối thiểu đã đổi thành 5.400.000đ', 'e0000000-0000-4000-a000-000000000001',
  $$select create_job_post('Test13 x', 'phuc_vu', 'full_time', 'monthly', 5310000, null, 44, null, null, 1, 30, true)$$, '%Lương/tháng phải từ 5400000%');
select pg_temp.t_do('13ai. Admin đặt lại lương tháng tối thiểu 5.310.000đ', '00000000-0000-4000-a000-000000000001',
  $$select admin_set_config('min_monthly_wage', 5310000)$$,
  $$select (select value from app_config where key = 'min_monthly_wage') = '5310000'::jsonb$$ );
select pg_temp.t_err('13aj. Khóa cấu hình lạ vẫn bị từ chối', '00000000-0000-4000-a000-000000000001',
  $$select admin_set_config('khong_co_khoa_nay', 1)$$, '%Tham số không hợp lệ%');
select pg_temp.t_true('13ak. Cơ sở số 4 (An Coffee Bean) bị gỡ ở 10j: tin của quán tự đóng; tin quán khác vẫn mở', null,
  $$select (select status = 'closed' and closed_at is not null from job_posts where id = 'c0000000-0000-4000-a000-000000000004') and (select status = 'open' from job_posts where id = 'c0000000-0000-4000-a000-000000000001')$$ );
select pg_temp.t_err('13al. Người làm chưa được duyệt không nộp đơn được', 'a0000000-0000-4000-a000-000000000010',
  $$select apply_job('c0000000-0000-4000-a000-000000000001', null)$$, '%chưa được duyệt%');
select pg_temp.t_err('13am. Người 17 tuổi (đã duyệt, có phụ huynh) không nộp đơn được', 'a0000000-0000-4000-a000-000000000007',
  $$select apply_job('c0000000-0000-4000-a000-000000000001', null)$$, '%từ 18 tuổi%');
select pg_temp.t_err('13an. Người sinh nhật 18 vào ngày mai: chưa nộp được', 'b0000000-0000-4000-a000-000000000017',
  $$select apply_job('c0000000-0000-4000-a000-000000000001', null)$$, '%từ 18 tuổi%');
select pg_temp.t_do('13ao. Người đủ 18 tuổi đúng hôm nay: nộp được', 'b0000000-0000-4000-a000-000000000016',
  $$select apply_job('c0000000-0000-4000-a000-000000000001', 'Em mới đủ 18 tuổi, muốn làm lâu dài.')$$,
  $$select exists (select 1 from job_applications where job_id = 'c0000000-0000-4000-a000-000000000001' and worker_id = 'b0000000-0000-4000-a000-000000000016' and status = 'applied' and note is not null)$$ );
select pg_temp.t_err('13ap. Nộp hai lần vào cùng một tin bị từ chối', 'b0000000-0000-4000-a000-000000000016',
  $$select apply_job('c0000000-0000-4000-a000-000000000001', null)$$, '%đã ứng tuyển%');
select pg_temp.t_err('13aq. Tin đã đóng (cơ sở bị gỡ) không nhận đơn', 'a0000000-0000-4000-a000-000000000002',
  $$select apply_job('c0000000-0000-4000-a000-000000000004', null)$$, '%đã đóng hoặc hết hạn%');
select pg_temp.t_err('13ar. Tin hết hạn không nhận đơn', 'a0000000-0000-4000-a000-000000000002',
  $$select apply_job('c0000000-0000-4000-a000-000000000005', null)$$, '%đã đóng hoặc hết hạn%');
select pg_temp.t_err('13as. Tài khoản bị khóa không nộp đơn được', 'a0000000-0000-4000-a000-000000000004',
  $$select apply_job('c0000000-0000-4000-a000-000000000002', null)$$, '%bị khóa%');
select pg_temp.t_err('13at. Chủ quán không nộp đơn được', 'e0000000-0000-4000-a000-000000000002',
  $$select apply_job('c0000000-0000-4000-a000-000000000001', null)$$, '%Chỉ người làm%');
select pg_temp.t_err('13au. anon không gọi được apply_job', null,
  $$select apply_job('c0000000-0000-4000-a000-000000000001', null)$$, '%permission denied%', 'anon');
select pg_temp.t_err('13av. Ghi thẳng bảng đơn cho người 17 tuổi vẫn bị trigger chặn', null,
  $$insert into job_applications (job_id, worker_id) values ('c0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000007')$$, '%từ 18 tuổi%');
select pg_temp.t_err('13aw. Ghi thẳng bảng đơn với trạng thái hired ngay từ đầu bị chặn', null,
  $$insert into job_applications (job_id, worker_id, status) values ('c0000000-0000-4000-a000-000000000001', 'a0000000-0000-4000-a000-000000000003', 'hired')$$, '%trạng thái%đã ứng tuyển%');
select pg_temp.t_err('13ax. Đơn mới nộp (applied): chủ quán chưa xem được SĐT', 'e0000000-0000-4000-a000-000000000001',
  $$select get_job_contacts('d0000000-0000-4000-a000-000000000001')$$, '%vòng tiếp theo%', 'authenticated');
select pg_temp.t_err('13ay. Đơn mới nộp (applied): chính người nộp cũng chưa xem được SĐT chủ quán', 'a0000000-0000-4000-a000-000000000001',
  $$select get_job_contacts('d0000000-0000-4000-a000-000000000001')$$, '%vòng tiếp theo%', 'authenticated');
select pg_temp.t_err('13az. Đơn đã bị loại (rejected): chủ quán không xem được SĐT', 'e0000000-0000-4000-a000-000000000002',
  $$select get_job_contacts('d0000000-0000-4000-a000-000000000007')$$, '%vòng tiếp theo%');
select pg_temp.t_err('13ba. Đơn đã rút (withdrawn): chủ quán không xem được SĐT', 'e0000000-0000-4000-a000-000000000002',
  $$select get_job_contacts('d0000000-0000-4000-a000-000000000004')$$, '%vòng tiếp theo%');
select pg_temp.t_err('13bb. Đơn đã chọn nhưng người gọi là chủ quán khác: bị từ chối', 'e0000000-0000-4000-a000-000000000002',
  $$select get_job_contacts('d0000000-0000-4000-a000-000000000002')$$, '%Không tìm thấy đơn%');
select pg_temp.t_err('13bc. Đơn đã chọn nhưng người gọi là người làm khác: bị từ chối', 'a0000000-0000-4000-a000-000000000003',
  $$select get_job_contacts('d0000000-0000-4000-a000-000000000002')$$, '%Không tìm thấy đơn%');
select pg_temp.t_err('13bd. Nhóm vận hành cũng không xem SĐT khi đơn mới ở applied', '00000000-0000-4000-a000-000000000001',
  $$select get_job_contacts('d0000000-0000-4000-a000-000000000001')$$, '%vòng tiếp theo%');
select pg_temp.t_err('13be. anon không gọi được get_job_contacts', null,
  $$select get_job_contacts('d0000000-0000-4000-a000-000000000002')$$, '%permission denied%', 'anon');
select pg_temp.t_true('13bf. Đơn shortlisted: chủ quán thấy SĐT người làm, không có phần của quán', 'e0000000-0000-4000-a000-000000000001',
  $$select j -> 'worker' ->> 'phone' = '0900000202' and j -> 'facility' = 'null'::jsonb from get_job_contacts('d0000000-0000-4000-a000-000000000002') j$$, 'authenticated');
select pg_temp.t_true('13bg. Đơn shortlisted: người nộp thấy SĐT quán, không có phần của người làm', 'a0000000-0000-4000-a000-000000000002',
  $$select j -> 'facility' ->> 'phone' = '0982931487' and j -> 'worker' = 'null'::jsonb from get_job_contacts('d0000000-0000-4000-a000-000000000002') j$$, 'authenticated');
select pg_temp.t_true('13bh. Đơn hired: chủ quán thấy SĐT người làm', 'e0000000-0000-4000-a000-000000000002',
  $$select j -> 'worker' ->> 'phone' = '0900000205' from get_job_contacts('d0000000-0000-4000-a000-000000000003') j$$ );
select pg_temp.t_true('13bi. Đơn hired: người làm thấy SĐT quán', 'a0000000-0000-4000-a000-000000000005',
  $$select j -> 'facility' ->> 'phone' = (select phone from private_contacts where user_id = 'e0000000-0000-4000-a000-000000000002') from get_job_contacts('d0000000-0000-4000-a000-000000000003') j$$ );
select pg_temp.t_true('13bj. Đơn hired: nhóm vận hành thấy cả hai phía', '00000000-0000-4000-a000-000000000001',
  $$select j -> 'worker' ->> 'phone' = '0900000205' and j -> 'facility' ->> 'phone' = (select phone from private_contacts where user_id = 'e0000000-0000-4000-a000-000000000002') from get_job_contacts('d0000000-0000-4000-a000-000000000003') j$$ );
select pg_temp.t_err('13bk. Quán đã bị gỡ: dù đơn hired, chủ quán và người làm không xem được SĐT', 'e0000000-0000-4000-a000-000000000004',
  $$select get_job_contacts('d0000000-0000-4000-a000-000000000006')$$, '%không hoạt động%');
select pg_temp.t_err('13bl. Quán đã bị gỡ: người làm cũng không xem được SĐT quán', 'a0000000-0000-4000-a000-000000000001',
  $$select get_job_contacts('d0000000-0000-4000-a000-000000000006')$$, '%không hoạt động%');
select pg_temp.t_true('13bm. Người làm: feed chỉ có tin mở còn hạn (không có tin hết hạn, tin đã đóng)', 'a0000000-0000-4000-a000-000000000001',
  $$select exists (select 1 from jsonb_array_elements(feed_job_posts()) e where e ->> 'id' = 'c0000000-0000-4000-a000-000000000001') and exists (select 1 from jsonb_array_elements(feed_job_posts()) e where e ->> 'id' = 'c0000000-0000-4000-a000-000000000002') and not exists (select 1 from jsonb_array_elements(feed_job_posts()) e where e ->> 'id' in ('c0000000-0000-4000-a000-000000000004', 'c0000000-0000-4000-a000-000000000005', 'c0000000-0000-4000-a000-000000000006'))$$ );
select pg_temp.t_true('13bn. Feed lọc theo hình thức làm việc (full_time)', 'a0000000-0000-4000-a000-000000000001',
  $$select count(*) > 0 and bool_and(e ->> 'employment' = 'full_time') from jsonb_array_elements(feed_job_posts(null, 'full_time')) e$$ );
select pg_temp.t_true('13bo. Feed lọc theo loại việc (pha chế): chỉ tin pha chế', 'a0000000-0000-4000-a000-000000000001',
  $$select count(*) = 1 and bool_and(e ->> 'job_type' = 'pha_che') from jsonb_array_elements(feed_job_posts('pha_che')) e$$ );
select pg_temp.t_err('13bp. Người làm chưa duyệt không xem được feed', 'a0000000-0000-4000-a000-000000000010',
  $$select feed_job_posts()$$, '%cần được duyệt%');
select pg_temp.t_err('13bq. Người 17 tuổi không xem được feed', 'a0000000-0000-4000-a000-000000000007',
  $$select feed_job_posts()$$, '%từ 18 tuổi%');
select pg_temp.t_err('13br. Chủ quán không xem được feed của người làm', 'e0000000-0000-4000-a000-000000000001',
  $$select feed_job_posts()$$, '%Chỉ người làm%');
select pg_temp.t_err('13bs. anon không gọi được feed_job_posts', null,
  $$select feed_job_posts()$$, '%permission denied%', 'anon');
select pg_temp.t_true('13bt. Chi tiết tin mở: người làm xem được; có hired_count', 'a0000000-0000-4000-a000-000000000001',
  $$select job_post_detail('c0000000-0000-4000-a000-000000000001') ->> 'title' is not null and (job_post_detail('c0000000-0000-4000-a000-000000000002') ->> 'hired_count')::int = 1$$ );
select pg_temp.t_err('13bu. Tin đã đóng mà mình chưa nộp đơn: người làm không xem chi tiết được', 'a0000000-0000-4000-a000-000000000001',
  $$select job_post_detail('c0000000-0000-4000-a000-000000000006')$$, '%Không tìm thấy tin%');
select pg_temp.t_true('13bv. Tin đã đóng mà mình đã nộp đơn: người làm vẫn xem lại được', 'a0000000-0000-4000-a000-000000000001',
  $$select job_post_detail('c0000000-0000-4000-a000-000000000004') ->> 'status' = 'closed' and job_post_detail('c0000000-0000-4000-a000-000000000004') -> 'my_application' ->> 'status' = 'hired'$$);
select pg_temp.t_err('13bw. Chủ quán khác không xem chi tiết tin này', 'e0000000-0000-4000-a000-000000000001',
  $$select job_post_detail('c0000000-0000-4000-a000-000000000002')$$, '%Chỉ người làm%');
select pg_temp.t_true('13bx. Chủ quán xem tin của mình và là chủ (is_owner)', 'e0000000-0000-4000-a000-000000000002',
  $$select (job_post_detail('c0000000-0000-4000-a000-000000000002') ->> 'is_owner')::boolean$$ );
select pg_temp.t_true('13by. Chủ quán chỉ thấy tin của cơ sở mình, kèm số đơn', 'e0000000-0000-4000-a000-000000000001',
  $$select count(*) >= 2 and bool_and(e ->> 'facility_id' = 'f0000000-0000-4000-a000-000000000001') and bool_and(e ? 'applied_count' and e ? 'shortlisted_count') from jsonb_array_elements(employer_job_posts()) e$$ );
select pg_temp.t_true('13bz. Nhóm vận hành thấy tin của nhiều cơ sở', '00000000-0000-4000-a000-000000000001',
  $$select count(distinct e ->> 'facility_id') >= 3 from jsonb_array_elements(employer_job_posts()) e$$ );
select pg_temp.t_err('13ca. Chủ quán khác không xem được danh sách người ứng tuyển', 'e0000000-0000-4000-a000-000000000002',
  $$select job_applicants('c0000000-0000-4000-a000-000000000001')$$, '%Không tìm thấy tin%');
select pg_temp.t_err('13cb. Người làm không xem được danh sách người ứng tuyển', 'a0000000-0000-4000-a000-000000000001',
  $$select job_applicants('c0000000-0000-4000-a000-000000000001')$$, '%Không tìm thấy tin%');
select pg_temp.t_true('13cc. Chủ quán thấy thống kê hồ sơ ca làm của người ứng tuyển dù họ không bật chia sẻ; không có ngày sinh, trường, lớp, phụ huynh, SĐT', 'e0000000-0000-4000-a000-000000000001',
  $$select jsonb_array_length(j -> 'applicants') >= 3 and j::text not like '%0900000%' and j::text not like '%date_of_birth%' and j::text not like '%school%' and j::text not like '%class_name%' and j::text not like '%parent%' and j::text not like '%Bà Rịa%' and (select (e -> 'profile') ?& array['confirmed_shifts', 'total_hours', 'avg_rating', 'on_time_rate', 'job_types', 'reviews'] from jsonb_array_elements(j -> 'applicants') e where e ->> 'name' = 'Nguyễn Minh Anh') and not (select share_enabled from worker_profiles where user_id = 'a0000000-0000-4000-a000-000000000001') from job_applicants('c0000000-0000-4000-a000-000000000001') j$$ );
select pg_temp.t_true('13cc2. Thống kê hồ sơ ca làm có số thật (1 ca đã xác nhận, 3 sao) của người ứng tuyển', 'e0000000-0000-4000-a000-000000000002',
  $$select (e -> 'profile' ->> 'confirmed_shifts')::int = 1 and (e -> 'profile' ->> 'avg_rating')::numeric = 3.0
    from jsonb_array_elements(job_applicants('c0000000-0000-4000-a000-000000000006') -> 'applicants') e where e ->> 'name' = 'Phạm Gia Huy'$$);
select pg_temp.t_true('13cd. RLS: chủ quán khác select thẳng bảng đơn không thấy đơn của tin này', 'e0000000-0000-4000-a000-000000000002',
  $$select count(*) = 0 from job_applications where job_id = 'c0000000-0000-4000-a000-000000000001'$$, 'authenticated');
select pg_temp.t_true('13ce. RLS: chủ quán thấy đơn của tin mình', 'e0000000-0000-4000-a000-000000000001',
  $$select count(*) >= 3 from job_applications where job_id = 'c0000000-0000-4000-a000-000000000001'$$, 'authenticated');
select pg_temp.t_true('13cf. RLS: người làm chỉ thấy đơn của chính mình', 'a0000000-0000-4000-a000-000000000002',
  $$select count(*) >= 1 and bool_and(worker_id = 'a0000000-0000-4000-a000-000000000002') from job_applications$$, 'authenticated');
select pg_temp.t_true('13cg. RLS: người làm không đọc thẳng bảng job_posts (phải qua feed)', 'a0000000-0000-4000-a000-000000000001',
  $$select count(*) = 0 from job_posts$$, 'authenticated');
select pg_temp.t_err('13ch. anon không đọc được bảng job_posts', null,
  $$select count(*) from job_posts$$, '%permission denied%', 'anon');
select pg_temp.t_err('13ci. Người đăng nhập không insert thẳng vào job_applications được', 'a0000000-0000-4000-a000-000000000001',
  $$insert into job_applications (job_id, worker_id) values ('c0000000-0000-4000-a000-000000000002', 'a0000000-0000-4000-a000-000000000001')$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('13cj. Chủ quán không update thẳng job_posts được', 'e0000000-0000-4000-a000-000000000001',
  $$update job_posts set status = 'closed' where id = 'c0000000-0000-4000-a000-000000000001'$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('13ck. Chủ quán không delete thẳng job_applications được', 'e0000000-0000-4000-a000-000000000001',
  $$delete from job_applications where id = 'd0000000-0000-4000-a000-000000000001'$$, '%permission denied%', 'authenticated');
select pg_temp.t_true('13cl. Người làm: feed, chi tiết, đơn của tôi không chứa SĐT (kể cả khi có đơn shortlisted)', 'a0000000-0000-4000-a000-000000000002',
  $$select feed_job_posts()::text not like '%0900000%' and job_post_detail('c0000000-0000-4000-a000-000000000001')::text not like '%0900000%' and my_applications()::text not like '%0900000%' and jsonb_array_length(my_applications()) >= 1$$ );
select pg_temp.t_true('13cm. Chủ quán: danh sách tin, danh sách người ứng tuyển không chứa SĐT (kể cả đơn hired, withdrawn)', 'e0000000-0000-4000-a000-000000000002',
  $$select employer_job_posts()::text not like '%0900000%' and job_applicants('c0000000-0000-4000-a000-000000000002')::text not like '%0900000%' and jsonb_array_length(job_applicants('c0000000-0000-4000-a000-000000000002') -> 'applicants') = 2$$ );
select pg_temp.t_true('13cn. Nhóm vận hành: danh sách tin và người ứng tuyển không chứa SĐT', '00000000-0000-4000-a000-000000000001',
  $$select employer_job_posts()::text not like '%0900000%' and job_applicants('c0000000-0000-4000-a000-000000000001')::text not like '%0900000%'$$ );
select pg_temp.t_true('13co. Hồ sơ công khai vẫn chạy bằng hàm dùng chung: bật chia sẻ mới xem được, không SĐT/ngày sinh', null,
  $$select get_public_profile('demo-thu-ha') is not null and get_public_profile('demo-quoc-bao') is null and get_public_profile('demo-thu-ha')::text not like '%0900000%' and (get_public_profile('demo-thu-ha') ->> 'share_enabled')::boolean$$, 'anon');
select pg_temp.t_err('13cp. Chủ quán không chuyển thẳng applied → hired', 'e0000000-0000-4000-a000-000000000001',
  $$select set_application_status('d0000000-0000-4000-a000-000000000001', 'hired')$$, '%Không đổi được trạng thái%');
select pg_temp.t_err('13cq. Chủ quán khác không đổi được trạng thái đơn của quán này', 'e0000000-0000-4000-a000-000000000002',
  $$select set_application_status('d0000000-0000-4000-a000-000000000001', 'shortlisted')$$, '%Không tìm thấy đơn%');
select pg_temp.t_err('13cr. Người làm không dùng được set_application_status', 'a0000000-0000-4000-a000-000000000001',
  $$select set_application_status('d0000000-0000-4000-a000-000000000001', 'shortlisted')$$, '%Không tìm thấy đơn%');
select pg_temp.t_err('13cs. Chủ quán không đặt trạng thái withdrawn', 'e0000000-0000-4000-a000-000000000001',
  $$select set_application_status('d0000000-0000-4000-a000-000000000001', 'withdrawn')$$, '%Trạng thái không hợp lệ%');
select pg_temp.t_do('13ct. Chủ quán chọn đơn applied → shortlisted, có mốc thời gian đổi trạng thái', 'e0000000-0000-4000-a000-000000000001',
  $$select set_application_status('d0000000-0000-4000-a000-000000000001', 'shortlisted')$$,
  $$select status = 'shortlisted' and status_changed_at >= created_at from job_applications where id = 'd0000000-0000-4000-a000-000000000001'$$ );
select pg_temp.t_do('13cu. shortlisted → rejected', 'e0000000-0000-4000-a000-000000000001',
  $$select set_application_status('d0000000-0000-4000-a000-000000000001', 'rejected')$$,
  $$select status = 'rejected' from job_applications where id = 'd0000000-0000-4000-a000-000000000001'$$ );
select pg_temp.t_err('13cv. rejected là bước cuối: không chọn lại được', 'e0000000-0000-4000-a000-000000000001',
  $$select set_application_status('d0000000-0000-4000-a000-000000000001', 'shortlisted')$$, '%Không đổi được trạng thái%');
select pg_temp.t_err('13cw. Người làm không rút được đơn của người khác', 'a0000000-0000-4000-a000-000000000001',
  $$select withdraw_application('d0000000-0000-4000-a000-000000000002')$$, '%Không tìm thấy đơn%');
select pg_temp.t_err('13cx. Đơn hired: người làm không rút được', 'a0000000-0000-4000-a000-000000000005',
  $$select withdraw_application('d0000000-0000-4000-a000-000000000003')$$, '%Không đổi được trạng thái%');
select pg_temp.t_do('13cy. Đơn shortlisted: người nộp rút được', 'a0000000-0000-4000-a000-000000000002',
  $$select withdraw_application('d0000000-0000-4000-a000-000000000002')$$,
  $$select status = 'withdrawn' from job_applications where id = 'd0000000-0000-4000-a000-000000000002'$$ );
select pg_temp.t_err('13cz. withdrawn là bước cuối: chủ quán không nhận được', 'e0000000-0000-4000-a000-000000000001',
  $$select set_application_status('d0000000-0000-4000-a000-000000000002', 'hired')$$, '%Không đổi được trạng thái%');
select pg_temp.t_err('13da. Đơn hired không chuyển sang rejected được', 'e0000000-0000-4000-a000-000000000002',
  $$select set_application_status('d0000000-0000-4000-a000-000000000003', 'rejected')$$, '%Không đổi được trạng thái%');
select pg_temp.t_do('13db. Rút đơn rồi nộp lại được (đơn cũ không còn hiệu lực)', 'a0000000-0000-4000-a000-000000000002',
  $$select apply_job('c0000000-0000-4000-a000-000000000001', 'Nộp lại')$$,
  $$select count(*) = 2 and count(*) filter (where status = 'applied') = 1 from job_applications where job_id = 'c0000000-0000-4000-a000-000000000001' and worker_id = 'a0000000-0000-4000-a000-000000000002'$$ );
select pg_temp.t_do('13dc. (chuẩn bị) hai người nộp vào tin chỉ cần 1 người', 'a0000000-0000-4000-a000-000000000001',
  $$select apply_job(pg_temp.jp('Test13 openings1'), null)$$,
  $$select pg_temp.ja('Test13 openings1', 'a0000000-0000-4000-a000-000000000001') is not null$$ );
select pg_temp.t_do('13dd. (chuẩn bị) người thứ hai nộp', 'a0000000-0000-4000-a000-000000000005',
  $$select apply_job(pg_temp.jp('Test13 openings1'), null)$$,
  $$select pg_temp.ja('Test13 openings1', 'a0000000-0000-4000-a000-000000000005') is not null$$ );
select pg_temp.t_do('13de. (chuẩn bị) chủ quán chọn người thứ nhất', 'e0000000-0000-4000-a000-000000000001',
  $$select set_application_status(pg_temp.ja('Test13 openings1', 'a0000000-0000-4000-a000-000000000001'), 'shortlisted')$$,
  $$select status = 'shortlisted' from job_applications where id = pg_temp.ja('Test13 openings1', 'a0000000-0000-4000-a000-000000000001')$$ );
select pg_temp.t_do('13df. (chuẩn bị) chủ quán chọn người thứ hai', 'e0000000-0000-4000-a000-000000000001',
  $$select set_application_status(pg_temp.ja('Test13 openings1', 'a0000000-0000-4000-a000-000000000005'), 'shortlisted')$$,
  $$select status = 'shortlisted' from job_applications where id = pg_temp.ja('Test13 openings1', 'a0000000-0000-4000-a000-000000000005')$$ );
select pg_temp.t_do('13dg. Nhận người thứ nhất vào tin 1 chỗ: được (đúng mốc openings)', 'e0000000-0000-4000-a000-000000000001',
  $$select set_application_status(pg_temp.ja('Test13 openings1', 'a0000000-0000-4000-a000-000000000001'), 'hired')$$,
  $$select status = 'hired' from job_applications where id = pg_temp.ja('Test13 openings1', 'a0000000-0000-4000-a000-000000000001')$$ );
select pg_temp.t_err('13dh. Nhận người thứ hai vượt openings bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select set_application_status(pg_temp.ja('Test13 openings1', 'a0000000-0000-4000-a000-000000000005'), 'hired')$$, '%đủ 1 người%');
select pg_temp.t_err('13di. Chủ quán khác không đóng được tin của quán này', 'e0000000-0000-4000-a000-000000000002',
  $$select close_job_post(pg_temp.jp('Test13 monthly min'))$$, '%Không tìm thấy tin%');
select pg_temp.t_do('13dj. Chủ quán đóng tin của mình', 'e0000000-0000-4000-a000-000000000001',
  $$select close_job_post(pg_temp.jp('Test13 monthly min'))$$,
  $$select status = 'closed' and closed_at is not null from job_posts where title = 'Test13 monthly min'$$ );
select pg_temp.t_err('13dk. Đóng tin lần hai bị từ chối', 'e0000000-0000-4000-a000-000000000001',
  $$select close_job_post(pg_temp.jp('Test13 monthly min'))$$, '%đã đóng rồi%');
select pg_temp.t_err('13dl. Tin đã đóng không nhận đơn mới', 'a0000000-0000-4000-a000-000000000003',
  $$select apply_job(pg_temp.jp('Test13 monthly min'), null)$$, '%đã đóng hoặc hết hạn%');
select pg_temp.t_err('13dm. Tin đã đóng không mở lại được (ghi thẳng bảng)', null,
  $$update job_posts set status = 'open', closed_at = null where title = 'Test13 monthly min'$$, '%không mở lại được%');
select pg_temp.t_err('13dn. Không sửa nội dung tin (ghi thẳng bảng)', null,
  $$update job_posts set wage_min = 99999999 where id = 'c0000000-0000-4000-a000-000000000001'$$, '%Không sửa được nội dung%');
select pg_temp.t_err('13do. Chủ quán không gọi được admin_close_job_post', 'e0000000-0000-4000-a000-000000000001',
  $$select admin_close_job_post('c0000000-0000-4000-a000-000000000001', 'thử')$$, '%nhóm vận hành%');
select pg_temp.t_do('13dp. Nhóm vận hành đóng tin bất kỳ, có dòng audit close_job_post', '00000000-0000-4000-a000-000000000001',
  $$select admin_close_job_post(pg_temp.jp('Test13 hourly min'), 'Nội dung không phù hợp')$$,
  $$select (select status = 'closed' from job_posts where title = 'Test13 hourly min') and exists (select 1 from admin_audit_log where action = 'close_job_post' and target_id = pg_temp.jp('Test13 hourly min'))$$ );
select pg_temp.t_err('13dq. Đóng tin đã đóng qua admin: báo không tìm thấy tin đang mở', '00000000-0000-4000-a000-000000000001',
  $$select admin_close_job_post(pg_temp.jp('Test13 hourly min'), 'lần hai')$$, '%Không tìm thấy tin đang mở%');
select pg_temp.t_do('13dr. Người làm có đơn ứng tuyển tự xóa tài khoản: đơn xóa theo, tin và đơn của người khác còn', 'b0000000-0000-4000-a000-000000000016',
  $$select delete_my_account()$$,
  $$select not exists (select 1 from auth.users where id = 'b0000000-0000-4000-a000-000000000016') and not exists (select 1 from job_applications where worker_id = 'b0000000-0000-4000-a000-000000000016') and exists (select 1 from job_posts where id = 'c0000000-0000-4000-a000-000000000001') and exists (select 1 from job_applications where id = 'd0000000-0000-4000-a000-000000000001')$$ );
select pg_temp.t_do('13ds. Tắt verified của cơ sở số 2 (Phê La Vũng Tàu) bằng ghi thẳng bảng: tin đang mở của quán tự đóng', null,
  $$update facilities set verified = false where id = 'f0000000-0000-4000-a000-000000000002'$$,
  $$select (select status = 'closed' from job_posts where id = 'c0000000-0000-4000-a000-000000000002') and (select status = 'open' from job_posts where id = 'c0000000-0000-4000-a000-000000000001')$$ );
update facilities set verified = true where id = 'f0000000-0000-4000-a000-000000000002';
select pg_temp.t_true('13dt. Đã khôi phục cơ sở số 2; tin đã đóng không tự mở lại', null,
  $$select (select verified from facilities where id = 'f0000000-0000-4000-a000-000000000002') and (select status = 'closed' from job_posts where id = 'c0000000-0000-4000-a000-000000000002')$$ );

-- ---------------------------------------------------------------
-- 14. Thông báo, trang quán công khai, đánh giá quán, chia sẻ ca, SĐT chủ quán (migration 0004)
-- ---------------------------------------------------------------
-- Dữ liệu dựng thêm (chế độ seed để tạo ca trong quá khứ): chủ quán b…19 + Quán Test 19 (mã công khai do default sinh),
-- worker b…18 chỉ có tài khoản đăng nhập (tự đăng ký bằng RPC bên dưới); ca 150–158 như ghi chú.
do $$
begin
  perform set_config('app.seed_mode', 'on', true);
  insert into auth.users (id, email) values
    ('b0000000-0000-4000-a000-000000000018', 'test18@demo.safeshift.test'), ('b0000000-0000-4000-a000-000000000019', 'test19@demo.safeshift.test');
  insert into profiles (id, role, full_name, consent_at) values ('b0000000-0000-4000-a000-000000000019', 'employer', 'Chủ Test Mười Chín', now());
  insert into private_contacts (user_id, phone) values ('b0000000-0000-4000-a000-000000000019', '0900000819');
  insert into facilities (id, owner_id, name, type, address, area, not_prohibited_ack, verified, status)
  values ('f0000000-0000-4000-a000-000000000019', 'b0000000-0000-4000-a000-000000000019', 'Quán Test 19', 'cafe', '19 Đường Test, Vũng Tàu', 'khac', true, false, 'pending');
  insert into shifts (id, facility_id, job_type, starts_at, ends_at, hourly_wage, commitment_ack, status) values
    -- 150: SOHO Coffee, đã xác nhận, người 1 đã làm. 151: đã xác nhận nhưng người 2 KHÔNG đến. 152: SOHO Coffee, chưa xác nhận.
    ('50000000-0000-4000-a000-000000000150', 'f0000000-0000-4000-a000-000000000001', 'phuc_vu', now() - interval '5 days', now() - interval '5 days' + interval '4 hours', 27000, true, 'completed'),
    ('50000000-0000-4000-a000-000000000151', 'f0000000-0000-4000-a000-000000000001', 'phuc_vu', now() - interval '5 days', now() - interval '5 days' + interval '4 hours', 27000, true, 'completed'),
    ('50000000-0000-4000-a000-000000000152', 'f0000000-0000-4000-a000-000000000001', 'phuc_vu', now() - interval '4 days', now() - interval '4 days' + interval '4 hours', 27000, true, 'open'),
    -- 153, 154: Phê La Vũng Tàu, đã xác nhận, người 1 đã làm. 155: Quán Test 19.
    ('50000000-0000-4000-a000-000000000153', 'f0000000-0000-4000-a000-000000000002', 'phuc_vu', now() - interval '5 days', now() - interval '5 days' + interval '4 hours', 27000, true, 'completed'),
    ('50000000-0000-4000-a000-000000000154', 'f0000000-0000-4000-a000-000000000002', 'phuc_vu', now() - interval '6 days', now() - interval '6 days' + interval '4 hours', 27000, true, 'completed'),
    ('50000000-0000-4000-a000-000000000155', 'f0000000-0000-4000-a000-000000000019', 'phuc_vu', now() - interval '5 days', now() - interval '5 days' + interval '4 hours', 27000, true, 'completed'),
    -- 156: bắt đầu đúng lúc này (không còn là "tương lai"). 157: bắt đầu sau 1 giây. 158: ca tương lai chưa ai nhận.
    ('50000000-0000-4000-a000-000000000156', 'f0000000-0000-4000-a000-000000000001', 'phuc_vu', now(), now() + interval '4 hours', 27000, true, 'open'),
    ('50000000-0000-4000-a000-000000000157', 'f0000000-0000-4000-a000-000000000001', 'phuc_vu', now() + interval '1 second', now() + interval '4 hours', 27000, true, 'open'),
    ('50000000-0000-4000-a000-000000000158', 'f0000000-0000-4000-a000-000000000001', 'phuc_vu', now() + interval '3 days', now() + interval '3 days 4 hours', 27000, true, 'open');
  insert into shift_results (shift_id, worker_id, attended, on_time, rating) values
    ('50000000-0000-4000-a000-000000000150', 'a0000000-0000-4000-a000-000000000001', true, true, 4),
    ('50000000-0000-4000-a000-000000000151', 'a0000000-0000-4000-a000-000000000002', false, null, null),
    ('50000000-0000-4000-a000-000000000153', 'a0000000-0000-4000-a000-000000000001', true, true, 5),
    ('50000000-0000-4000-a000-000000000154', 'a0000000-0000-4000-a000-000000000001', true, true, 5),
    ('50000000-0000-4000-a000-000000000155', 'a0000000-0000-4000-a000-000000000001', true, true, 5);
  perform set_config('app.seed_mode', 'off', true);
end $$;

-- Bảng SĐT (mọi SĐT đang có trong DB) để test không lộ SĐT chạy được dưới role anon.
drop table if exists t_phones;
create temp table t_phones as select phone from public.private_contacts;
grant select on t_phones to anon, authenticated;

-- ===== 14.1 SĐT chủ quán (cột dùng chung được nới; người làm vẫn đúng 10 số) =====
select pg_temp.t_err('14a. SĐT chủ quán 9 số bị chặn', null,
  $$update private_contacts set phone = '090000081' where user_id = 'b0000000-0000-4000-a000-000000000019'$$, '%private_contacts_phone_check%');
select pg_temp.t_err('14b. SĐT có chữ cái bị chặn', null,
  $$update private_contacts set phone = '09000008a9' where user_id = 'b0000000-0000-4000-a000-000000000019'$$, '%private_contacts_phone_check%');
select pg_temp.t_err('14c. Tổng đài 1900 chỉ 2 số sau (190012) bị chặn', null,
  $$update private_contacts set phone = '190012' where user_id = 'b0000000-0000-4000-a000-000000000019'$$, '%private_contacts_phone_check%');
select pg_temp.t_err('14d. 19001 bị chặn', null,
  $$update private_contacts set phone = '19001' where user_id = 'b0000000-0000-4000-a000-000000000019'$$, '%private_contacts_phone_check%');
select pg_temp.t_err('14e. Tổng đài 1900 với 7 số sau bị chặn', null,
  $$update private_contacts set phone = '19001234567' where user_id = 'b0000000-0000-4000-a000-000000000019'$$, '%private_contacts_phone_check%');
select pg_temp.t_err('14f. Đầu số 17xx không phải tổng đài 1800/1900: bị chặn', null,
  $$update private_contacts set phone = '1700123456' where user_id = 'b0000000-0000-4000-a000-000000000019'$$, '%private_contacts_phone_check%');
select pg_temp.t_do('14g. Số bàn 11 số (0 + 10 số) được nhận', null,
  $$update private_contacts set phone = '09000008191' where user_id = 'b0000000-0000-4000-a000-000000000019'$$,
  $$select phone = '09000008191' from private_contacts where user_id = 'b0000000-0000-4000-a000-000000000019'$$);
select pg_temp.t_do('14h. Số di động 10 số vẫn được nhận', null,
  $$update private_contacts set phone = '0900000819' where user_id = 'b0000000-0000-4000-a000-000000000019'$$,
  $$select phone = '0900000819' from private_contacts where user_id = 'b0000000-0000-4000-a000-000000000019'$$);
select pg_temp.t_do('14i. Tổng đài 1900 với 4 số sau được nhận', null,
  $$update private_contacts set phone = '19001234' where user_id = 'b0000000-0000-4000-a000-000000000019'$$,
  $$select phone = '19001234' from private_contacts where user_id = 'b0000000-0000-4000-a000-000000000019'$$);
select pg_temp.t_do('14j. Tổng đài 1900 với 6 số sau được nhận', null,
  $$update private_contacts set phone = '1900123456' where user_id = 'b0000000-0000-4000-a000-000000000019'$$,
  $$select phone = '1900123456' from private_contacts where user_id = 'b0000000-0000-4000-a000-000000000019'$$);
select pg_temp.t_do('14k. Tổng đài 1800 được nhận', null,
  $$update private_contacts set phone = '1800123456' where user_id = 'b0000000-0000-4000-a000-000000000019'$$,
  $$select phone = '1800123456' from private_contacts where user_id = 'b0000000-0000-4000-a000-000000000019'$$);
select pg_temp.t_err('14l. Đăng ký chủ quán với SĐT sai báo lỗi nêu rõ các dạng số được nhận', 'b0000000-0000-4000-a000-000000000014',
  $$select register_employer('Chủ Test', '19001', 'Cà Phê Test Hotline', 'cafe', '1 Đường Test, Vũng Tàu', 'khac', null, true, true)$$, '%số bàn 11 số hoặc tổng đài%');
select pg_temp.t_do('14m. Đăng ký chủ quán bằng tổng đài 1900 được', 'b0000000-0000-4000-a000-000000000014',
  $$select register_employer('Chủ Test', '1900123456', 'Cà Phê Test Hotline', 'cafe', '1 Đường Test, Vũng Tàu', 'khac', null, true, true)$$,
  $$select phone = '1900123456' from private_contacts where user_id = 'b0000000-0000-4000-a000-000000000014'$$);
select pg_temp.t_err('14n. Đăng ký người làm với SĐT 11 số bị chặn (người làm vẫn đúng 10 số)', 'b0000000-0000-4000-a000-000000000018',
  $$select register_worker('Test Mười Tám Hai', (current_date - interval '20 years')::date, 'ĐH Demo', null, '09000008181', 'trung_tam', '{}', true)$$, '%10 số%');
select pg_temp.t_err('14o. Đăng ký người làm bằng tổng đài 1900 bị chặn', 'b0000000-0000-4000-a000-000000000018',
  $$select register_worker('Test Mười Tám Hai', (current_date - interval '20 years')::date, 'ĐH Demo', null, '1900123456', 'trung_tam', '{}', true)$$, '%10 số%');
select pg_temp.t_true('14p. Đăng ký người làm với SĐT 10 số được', 'b0000000-0000-4000-a000-000000000018',
  $$select not (j ->> 'minor')::boolean from register_worker('Test Mười Tám Hai', (current_date - interval '20 years')::date, 'ĐH Demo', null, '0900000818', 'trung_tam', '{}', true) j$$);
select pg_temp.t_err('14q. Người làm đổi SĐT thành số 11 số bị chặn', 'b0000000-0000-4000-a000-000000000018',
  $$select update_worker_profile('ĐH Demo', null, '09000008181', 'trung_tam', '{}')$$, '%10 số%');
select pg_temp.t_err('14r. Ghi thẳng bảng: SĐT người làm là tổng đài bị trigger chặn', null,
  $$update private_contacts set phone = '1800123456' where user_id = 'b0000000-0000-4000-a000-000000000018'$$, '%10 số%');
select pg_temp.t_do('14s. Người làm đổi SĐT 10 số được', 'b0000000-0000-4000-a000-000000000018',
  $$select update_worker_profile('ĐH Demo', null, '0900000828', 'trung_tam', '{}')$$,
  $$select phone = '0900000828' from private_contacts where user_id = 'b0000000-0000-4000-a000-000000000018'$$);

-- ===== 14.2 Mã công khai của quán =====
select pg_temp.t_true('14t. Cơ sở thêm mới có mã ngẫu nhiên 12 ký tự (default của cột)', null,
  $$select public_slug ~ '^[0-9a-f]{12}$' from facilities where id = 'f0000000-0000-4000-a000-000000000019'$$);
select pg_temp.t_true('14u. Mọi cơ sở có mã khác nhau, mã mẫu cố định của seed không sinh từ tên mới', null,
  $$select count(distinct public_slug) = count(*) and bool_and(public_slug is not null) from facilities$$);
select pg_temp.t_err('14v. Hai cơ sở không trùng mã', null,
  $$update facilities set public_slug = 'demo-quan-1' where id = 'f0000000-0000-4000-a000-000000000019'$$, '%facilities_public_slug_key%');
select pg_temp.t_err('14w. Mã 5 ký tự (ngắn hơn mức tối thiểu 6) bị chặn', null,
  $$update facilities set public_slug = 'abcde' where id = 'f0000000-0000-4000-a000-000000000019'$$, '%facilities_public_slug_format%');
select pg_temp.t_do('14x. Mã đúng 6 ký tự được nhận', null,
  $$update facilities set public_slug = 'abcdef' where id = 'f0000000-0000-4000-a000-000000000019'$$,
  $$select public_slug = 'abcdef' from facilities where id = 'f0000000-0000-4000-a000-000000000019'$$);
select pg_temp.t_err('14y. Mã 41 ký tự bị chặn', null,
  $$update facilities set public_slug = repeat('a', 41) where id = 'f0000000-0000-4000-a000-000000000019'$$, '%facilities_public_slug_format%');
select pg_temp.t_do('14z. Mã đúng 40 ký tự được nhận', null,
  $$update facilities set public_slug = repeat('a', 40) where id = 'f0000000-0000-4000-a000-000000000019'$$,
  $$select char_length(public_slug) = 40 from facilities where id = 'f0000000-0000-4000-a000-000000000019'$$);
select pg_temp.t_err('14aa. Mã có chữ hoa hoặc ký tự lạ bị chặn', null,
  $$update facilities set public_slug = 'Abc_def' where id = 'f0000000-0000-4000-a000-000000000019'$$, '%facilities_public_slug_format%');

-- ===== 14.3 Trang quán công khai (anon) =====
select pg_temp.t_true('14ab. Trang quán mở được khi chưa đăng nhập: tên, vị trí, số ca (ca chỉ có người vắng mặt không tính), điểm đánh giá của ca đã có', null,
  $$select j ->> 'name' = 'SOHO Coffee' and j ->> 'slug' = 'demo-quan-1' and j ? 'lat' and j ? 'lng'
       and (j ->> 'completed_shifts')::int = 2 and (j ->> 'review_count')::int = 1 and (j ->> 'avg_stars')::numeric = 5.0
    from get_public_facility('demo-quan-1') j$$, 'anon');
select pg_temp.t_true('14ac. Trang quán không có tên/SĐT chủ quán, id cơ sở, nhận xét của người làm', null,
  $$select not exists (select 1 from t_phones pc where j::text like '%' || pc.phone || '%') and j::text not like '%Nguyễn Thị Hoa%'
       and not (j ? 'owner_id') and not (j ? 'owner_name') and not (j ? 'phone') and not (j ? 'id') and not (j ? 'facility_id')
       and j::text not like '%hướng dẫn tận tình%' and not (j ? 'reviews') and not (j ? 'comment')
    from get_public_facility('demo-quan-1') j$$, 'anon');
select pg_temp.t_true('14ad. Ca đang mở trên trang quán: ca còn chỗ chính có primary_left 1; ca chính đã đủ nhưng còn chỗ dự phòng vẫn hiện; ca đã xong/đã hủy/bắt đầu rồi không hiện', null,
  $$select exists (select 1 from jsonb_array_elements(j -> 'open_shifts') e where e ->> 'id' = '50000000-0000-4000-a000-000000000002'
                     and (e ->> 'primary_left')::int = 1 and (e ->> 'backup_open')::boolean and not (e ->> 'adults_only')::boolean)
       and exists (select 1 from jsonb_array_elements(j -> 'open_shifts') e where e ->> 'id' = '50000000-0000-4000-a000-000000000001'
                     and (e ->> 'primary_left')::int = 0 and (e ->> 'backup_open')::boolean)
       and not exists (select 1 from jsonb_array_elements(j -> 'open_shifts') e where e ->> 'id' in
                     ('50000000-0000-4000-a000-000000000010', '50000000-0000-4000-a000-000000000007', '50000000-0000-4000-a000-000000000156', '50000000-0000-4000-a000-000000000152'))
       and exists (select 1 from jsonb_array_elements(j -> 'open_shifts') e where e ->> 'id' = '50000000-0000-4000-a000-000000000157')
    from get_public_facility('demo-quan-1') j$$, 'anon');
select pg_temp.t_true('14ae. Thẻ ca trên trang quán không có SĐT, người nhận, mô tả, id cơ sở', null,
  $$select jsonb_array_length(j -> 'open_shifts') > 0 and not exists (
       select 1 from jsonb_array_elements(j -> 'open_shifts') e, jsonb_object_keys(e) k
       where k not in ('id', 'job_type', 'starts_at', 'ends_at', 'hourly_wage', 'urgent', 'headcount', 'primary_left', 'backup_open', 'adults_only'))
    from get_public_facility('demo-quan-1') j$$, 'anon');
select pg_temp.t_true('14af. Ca không dành cho dưới 18 (kết thúc 23:00) có adults_only', null,
  $$select exists (select 1 from jsonb_array_elements(j -> 'open_shifts') e where e ->> 'id' = '50000000-0000-4000-a000-000000000003' and (e ->> 'adults_only')::boolean)
       and exists (select 1 from jsonb_array_elements(j -> 'open_shifts') e where e ->> 'id' = '50000000-0000-4000-a000-000000000005' and not (e ->> 'adults_only')::boolean)
    from get_public_facility('demo-quan-2') j$$, 'anon');
select pg_temp.t_err('14ag. Mã không tồn tại: báo không tìm thấy', null,
  $$select get_public_facility('khong-co-ma-nay')$$, '%Không tìm thấy trang quán này%', 'anon');
select pg_temp.t_err('14ah. Mã null: cùng lỗi', null,
  $$select get_public_facility(null)$$, '%Không tìm thấy trang quán này%', 'anon');
select pg_temp.t_err('14ai. Cơ sở đã bị gỡ (An Coffee Bean): cùng lỗi, không lộ cơ sở có tồn tại', null,
  $$select get_public_facility('demo-quan-4')$$, '%Không tìm thấy trang quán này%', 'anon');
select pg_temp.t_err('14aj. Cơ sở chưa xác minh/đã gỡ (KATINAT): cùng lỗi', null,
  $$select get_public_facility('demo-quan-5')$$, '%Không tìm thấy trang quán này%', 'anon');
update facilities set verified = false where id = 'f0000000-0000-4000-a000-000000000001';
select pg_temp.t_err('14ak. Cơ sở còn active nhưng bị tắt xác minh: cùng lỗi', null,
  $$select get_public_facility('demo-quan-1')$$, '%Không tìm thấy trang quán này%', 'anon');
select pg_temp.t_err('14al. Ca của cơ sở bị tắt xác minh không chia sẻ được', null,
  $$select get_public_shift('50000000-0000-4000-a000-000000000002')$$, '%Không tìm thấy ca này%', 'anon');
update facilities set verified = true where id = 'f0000000-0000-4000-a000-000000000001';
select pg_temp.t_true('14am. Đã xác minh lại: trang quán mở lại được', null,
  $$select get_public_facility('demo-quan-1') ->> 'name' = 'SOHO Coffee'$$, 'anon');
select pg_temp.t_true('14an. Người đã đăng nhập (chủ quán khác) cũng mở được trang quán', 'e0000000-0000-4000-a000-000000000002',
  $$select get_public_facility('demo-quan-1') ->> 'name' = 'SOHO Coffee'$$, 'authenticated');

-- ===== 14.4 Chia sẻ ca (anon) =====
select pg_temp.t_true('14ao. Ca mở trong tương lai: mở được khi chưa đăng nhập, ca cho dưới 18 không có adults_only', null,
  $$select j ->> 'facility_name' = 'SOHO Coffee' and j ->> 'facility_slug' = 'demo-quan-1' and j ->> 'job_type' = 'pha_che'
       and (j ->> 'hourly_wage')::int = 30000 and (j ->> 'primary_left')::int = 1 and not (j ->> 'adults_only')::boolean
       and j ->> 'description' like 'Cần gấp%' and j ? 'lat'
    from get_public_shift('50000000-0000-4000-a000-000000000002') j$$, 'anon');
select pg_temp.t_true('14ap. Ca kết thúc 23:00: adults_only; chính đã đủ, còn chỗ dự phòng', null,
  $$select (j ->> 'adults_only')::boolean and (j ->> 'primary_left')::int = 0 and (j ->> 'backup_open')::boolean
    from get_public_shift('50000000-0000-4000-a000-000000000003') j$$, 'anon');
select pg_temp.t_true('14aq. Ca chia sẻ không có SĐT, id cơ sở, id chủ quán, danh sách người nhận', null,
  $$select not exists (select 1 from t_phones pc where j::text like '%' || pc.phone || '%') and j::text not like '%Nguyễn Thị Hoa%'
       and not exists (select 1 from jsonb_object_keys(j) k where k in ('facility_id', 'owner_id', 'owner_name', 'phone', 'claims', 'workers', 'my_role', 'allow_minor', 'maps_url'))
    from get_public_shift('50000000-0000-4000-a000-000000000003') j$$, 'anon');
select pg_temp.t_err('14ar. Ca đã hủy (cơ sở bị gỡ) không chia sẻ được', null,
  $$select get_public_shift('50000000-0000-4000-a000-000000000004')$$, '%Không tìm thấy ca này%', 'anon');
select pg_temp.t_err('14as. Ca đã xác nhận xong không chia sẻ được', null,
  $$select get_public_shift('50000000-0000-4000-a000-000000000010')$$, '%Không tìm thấy ca này%', 'anon');
select pg_temp.t_err('14at. Ca đang diễn ra (đã bắt đầu) không chia sẻ được', null,
  $$select get_public_shift('50000000-0000-4000-a000-000000000007')$$, '%Không tìm thấy ca này%', 'anon');
select pg_temp.t_err('14au. Ca bắt đầu đúng lúc này: không còn là tương lai, bị chặn', null,
  $$select get_public_shift('50000000-0000-4000-a000-000000000156')$$, '%Không tìm thấy ca này%', 'anon');
select pg_temp.t_true('14av. Ca bắt đầu sau 1 giây: vẫn chia sẻ được', null,
  $$select get_public_shift('50000000-0000-4000-a000-000000000157') ->> 'id' = '50000000-0000-4000-a000-000000000157'$$, 'anon');
select pg_temp.t_err('14aw. Id ca không tồn tại: cùng lỗi', null,
  $$select get_public_shift('00000000-0000-4000-a000-0000000000ff')$$, '%Không tìm thấy ca này%', 'anon');
select pg_temp.t_err('14ax. Id ca null: cùng lỗi', null,
  $$select get_public_shift(null)$$, '%Không tìm thấy ca này%', 'anon');

-- ===== 14.5 Đánh giá quán =====
select pg_temp.t_err('14ay. Ca chưa được chủ quán xác nhận: chưa đánh giá được', 'a0000000-0000-4000-a000-000000000001',
  $$select create_facility_review('50000000-0000-4000-a000-000000000152', 5, null)$$, '%chưa được chủ quán xác nhận%');
select pg_temp.t_err('14az. Người bị ghi nhận KHÔNG đến không đánh giá được', 'a0000000-0000-4000-a000-000000000002',
  $$select create_facility_review('50000000-0000-4000-a000-000000000151', 5, null)$$, '%Chỉ người đã làm ca này%');
select pg_temp.t_err('14ba. Người không làm ca đó không đánh giá được', 'a0000000-0000-4000-a000-000000000005',
  $$select create_facility_review('50000000-0000-4000-a000-000000000150', 5, null)$$, '%Chỉ người đã làm ca này%');
select pg_temp.t_err('14bb. Chủ quán không đánh giá được', 'e0000000-0000-4000-a000-000000000001',
  $$select create_facility_review('50000000-0000-4000-a000-000000000150', 5, null)$$, '%Chỉ người làm%');
select pg_temp.t_err('14bc. anon không gọi được create_facility_review', null,
  $$select create_facility_review('50000000-0000-4000-a000-000000000150', 5, null)$$, '%permission denied%', 'anon');
select pg_temp.t_err('14bd. Tài khoản bị khóa không đánh giá được', 'a0000000-0000-4000-a000-000000000004',
  $$select create_facility_review('50000000-0000-4000-a000-000000000011', 5, null)$$, '%bị khóa%');
select pg_temp.t_err('14be. Ca không tồn tại', 'a0000000-0000-4000-a000-000000000001',
  $$select create_facility_review('00000000-0000-4000-a000-0000000000ff', 5, null)$$, '%Không tìm thấy ca%');
select pg_temp.t_err('14bf. 0 sao bị từ chối', 'a0000000-0000-4000-a000-000000000001',
  $$select create_facility_review('50000000-0000-4000-a000-000000000154', 0, null)$$, '%từ 1 đến 5%');
select pg_temp.t_err('14bg. 6 sao bị từ chối', 'a0000000-0000-4000-a000-000000000001',
  $$select create_facility_review('50000000-0000-4000-a000-000000000154', 6, null)$$, '%từ 1 đến 5%');
select pg_temp.t_err('14bh. Không chọn sao bị từ chối', 'a0000000-0000-4000-a000-000000000001',
  $$select create_facility_review('50000000-0000-4000-a000-000000000154', null, null)$$, '%từ 1 đến 5%');
select pg_temp.t_err('14bi. Nhận xét 501 ký tự bị từ chối', 'a0000000-0000-4000-a000-000000000001',
  $$select create_facility_review('50000000-0000-4000-a000-000000000154', 3, repeat('a', 501))$$, '%500 ký tự%');
select pg_temp.t_do('14bj. Đúng ranh giới: 1 sao, nhận xét đúng 500 ký tự được', 'a0000000-0000-4000-a000-000000000001',
  $$select create_facility_review('50000000-0000-4000-a000-000000000150', 1, repeat('a', 500))$$,
  $$select stars = 1 and char_length(comment) = 500 and facility_id = 'f0000000-0000-4000-a000-000000000001'
    from facility_reviews where shift_id = '50000000-0000-4000-a000-000000000150' and worker_id = 'a0000000-0000-4000-a000-000000000001'$$);
select pg_temp.t_err('14bk. Một ca đánh giá một lần', 'a0000000-0000-4000-a000-000000000001',
  $$select create_facility_review('50000000-0000-4000-a000-000000000150', 5, null)$$, '%đã đánh giá%');
select pg_temp.t_do('14bl. 5 sao, nhận xét toàn khoảng trắng lưu thành trống', 'a0000000-0000-4000-a000-000000000001',
  $$select create_facility_review('50000000-0000-4000-a000-000000000153', 5, '   ')$$,
  $$select stars = 5 and comment is null from facility_reviews where shift_id = '50000000-0000-4000-a000-000000000153' and worker_id = 'a0000000-0000-4000-a000-000000000001'$$);
select pg_temp.t_err('14bm. Ghi thẳng bảng (bỏ qua RPC) cho người vắng mặt vẫn bị trigger chặn', null,
  $$insert into facility_reviews (facility_id, shift_id, worker_id, stars) values ('f0000000-0000-4000-a000-000000000001', '50000000-0000-4000-a000-000000000151', 'a0000000-0000-4000-a000-000000000002', 3)$$, '%Chỉ người đã làm ca này%');
select pg_temp.t_err('14bn. Ghi thẳng bảng cho ca chưa xác nhận vẫn bị trigger chặn', null,
  $$insert into facility_reviews (facility_id, shift_id, worker_id, stars) values ('f0000000-0000-4000-a000-000000000001', '50000000-0000-4000-a000-000000000152', 'a0000000-0000-4000-a000-000000000001', 3)$$, '%chưa được chủ quán xác nhận%');
select pg_temp.t_err('14bo. Ghi thẳng bảng với quán không khớp ca bị trigger chặn', null,
  $$insert into facility_reviews (facility_id, shift_id, worker_id, stars) values ('f0000000-0000-4000-a000-000000000001', '50000000-0000-4000-a000-000000000154', 'a0000000-0000-4000-a000-000000000001', 3)$$, '%không khớp%');
select pg_temp.t_err('14bp. Ghi thẳng bảng 6 sao bị constraint chặn', null,
  $$insert into facility_reviews (facility_id, shift_id, worker_id, stars) values ('f0000000-0000-4000-a000-000000000002', '50000000-0000-4000-a000-000000000154', 'a0000000-0000-4000-a000-000000000001', 6)$$, '%facility_reviews_stars%');
select pg_temp.t_err('14bq. Ghi thẳng bảng nhận xét 501 ký tự bị constraint chặn', null,
  $$insert into facility_reviews (facility_id, shift_id, worker_id, stars, comment) values ('f0000000-0000-4000-a000-000000000002', '50000000-0000-4000-a000-000000000154', 'a0000000-0000-4000-a000-000000000001', 3, repeat('a', 501))$$, '%facility_reviews_comment%');
select pg_temp.t_err('14br. Đánh giá đã gửi không sửa được số sao', null,
  $$update facility_reviews set stars = 5 where shift_id = '50000000-0000-4000-a000-000000000150' and worker_id = 'a0000000-0000-4000-a000-000000000001'$$, '%Không sửa được đánh giá%');
select pg_temp.t_err('14bs. Đánh giá đã gửi không sửa được nhận xét', null,
  $$update facility_reviews set comment = 'x' where shift_id = '50000000-0000-4000-a000-000000000150' and worker_id = 'a0000000-0000-4000-a000-000000000001'$$, '%Không sửa được đánh giá%');
select pg_temp.t_true('14bt. RLS: người làm chỉ đọc đánh giá của chính mình (2 dòng)', 'a0000000-0000-4000-a000-000000000001',
  $$select count(*) = 2 and bool_and(worker_id = 'a0000000-0000-4000-a000-000000000001') from facility_reviews$$, 'authenticated');
select pg_temp.t_true('14bu. RLS: người làm khác chỉ thấy đánh giá của mình (người 3: 1 dòng)', 'a0000000-0000-4000-a000-000000000003',
  $$select count(*) = 1 from facility_reviews$$, 'authenticated');
select pg_temp.t_true('14bv. RLS: chủ quán không đọc được đánh giá nào', 'e0000000-0000-4000-a000-000000000001',
  $$select count(*) = 0 from facility_reviews$$, 'authenticated');
select pg_temp.t_err('14bw. Cột hidden_by không cấp cho client', 'a0000000-0000-4000-a000-000000000001',
  $$select hidden_by from facility_reviews$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('14bx. select * trên facility_reviews bị chặn vì có cột hidden_by', 'a0000000-0000-4000-a000-000000000001',
  $$select * from facility_reviews$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('14by. anon không đọc được facility_reviews', null,
  $$select count(*) from facility_reviews$$, '%permission denied%', 'anon');
select pg_temp.t_err('14bz. Người làm không insert thẳng vào facility_reviews qua API', 'a0000000-0000-4000-a000-000000000001',
  $$insert into facility_reviews (facility_id, shift_id, worker_id, stars) values ('f0000000-0000-4000-a000-000000000002', '50000000-0000-4000-a000-000000000154', 'a0000000-0000-4000-a000-000000000001', 3)$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('14ca. Người làm không update thẳng facility_reviews', 'a0000000-0000-4000-a000-000000000001',
  $$update facility_reviews set stars = 5$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('14cb. Người làm không delete thẳng facility_reviews', 'a0000000-0000-4000-a000-000000000001',
  $$delete from facility_reviews$$, '%permission denied%', 'authenticated');
select pg_temp.t_true('14cc. Điểm công khai của SOHO Coffee gồm đánh giá mẫu (5 sao) và đánh giá mới (1 sao): 2 lượt, trung bình 3.0', null,
  $$select (j ->> 'review_count')::int = 2 and (j ->> 'avg_stars')::numeric = 3.0 from get_public_facility('demo-quan-1') j$$, 'anon');
select pg_temp.t_true('14cd. Điểm công khai của Phê La Vũng Tàu: 2 lượt (3 và 5 sao), trung bình 4.0; nhận xét không lộ', null,
  $$select (j ->> 'review_count')::int = 2 and (j ->> 'avg_stars')::numeric = 4.0 and j::text not like '%trả tiền đúng hẹn%' from get_public_facility('demo-quan-2') j$$, 'anon');

-- Nhóm vận hành ẩn đánh giá
select pg_temp.t_err('14ce. Người làm không ẩn được đánh giá', 'a0000000-0000-4000-a000-000000000001',
  $$select admin_hide_facility_review((select id from facility_reviews where shift_id = '50000000-0000-4000-a000-000000000150'), true, 'thử')$$, '%nhóm vận hành%');
select pg_temp.t_err('14cf. Chủ quán không ẩn được đánh giá', 'e0000000-0000-4000-a000-000000000001',
  $$select admin_hide_facility_review('00000000-0000-4000-a000-0000000000ff', true, 'thử')$$, '%nhóm vận hành%');
select pg_temp.t_err('14cg. Ẩn đánh giá không tồn tại', '00000000-0000-4000-a000-000000000001',
  $$select admin_hide_facility_review('00000000-0000-4000-a000-0000000000ff', true, 'thử')$$, '%Không tìm thấy đánh giá%');
select pg_temp.t_do('14ch. Nhóm vận hành ẩn một đánh giá: có audit, điểm công khai bỏ đánh giá đó', '00000000-0000-4000-a000-000000000001',
  $$select admin_hide_facility_review((select id from facility_reviews where shift_id = '50000000-0000-4000-a000-000000000150'), true, 'Nội dung không phù hợp')$$,
  $$select (select hidden and hidden_by = '00000000-0000-4000-a000-000000000001' and hidden_at is not null from facility_reviews where shift_id = '50000000-0000-4000-a000-000000000150')
       and exists (select 1 from admin_audit_log where action = 'hide_facility_review' and detail ->> 'reason' = 'Nội dung không phù hợp')
       and (select (j ->> 'review_count')::int = 1 and (j ->> 'avg_stars')::numeric = 5.0 from get_public_facility('demo-quan-1') j)$$);
select pg_temp.t_true('14ci. Đánh giá bị ẩn: người viết vẫn thấy của mình, nhóm vận hành xem được kèm nhận xét và tên, không SĐT', 'a0000000-0000-4000-a000-000000000001',
  $$select (select hidden from facility_reviews where shift_id = '50000000-0000-4000-a000-000000000150')$$, 'authenticated');
select pg_temp.t_true('14cj. admin_list_facility_reviews: đủ 4 đánh giá, có tên người làm, nhận xét, không SĐT', '00000000-0000-4000-a000-000000000001',
  $$select jsonb_array_length(admin_list_facility_reviews()) = 4
       and exists (select 1 from jsonb_array_elements(admin_list_facility_reviews()) e where e ->> 'worker_name' = 'Nguyễn Minh Anh' and (e ->> 'hidden')::boolean and char_length(e ->> 'comment') = 500)
       and not exists (select 1 from t_phones pc where admin_list_facility_reviews()::text like '%' || pc.phone || '%')$$);
select pg_temp.t_err('14ck. Người làm không gọi được admin_list_facility_reviews', 'a0000000-0000-4000-a000-000000000001',
  $$select admin_list_facility_reviews()$$, '%nhóm vận hành%');
select pg_temp.t_do('14cl. Bỏ ẩn: hidden_by/hidden_at về null, điểm công khai tính lại', '00000000-0000-4000-a000-000000000001',
  $$select admin_hide_facility_review((select id from facility_reviews where shift_id = '50000000-0000-4000-a000-000000000150'), false, null)$$,
  $$select (select not hidden and hidden_by is null and hidden_at is null from facility_reviews where shift_id = '50000000-0000-4000-a000-000000000150')
       and (select (j ->> 'review_count')::int = 2 and (j ->> 'avg_stars')::numeric = 3.0 from get_public_facility('demo-quan-1') j)$$);

-- Đánh giá của người làm tự xóa tài khoản biến mất theo; điểm công khai tính lại
do $$
begin
  perform set_config('app.seed_mode', 'on', true);
  insert into shift_results (shift_id, worker_id, attended, on_time, rating)
  values ('50000000-0000-4000-a000-000000000150', 'b0000000-0000-4000-a000-000000000018', true, true, 4);
  perform set_config('app.seed_mode', 'off', true);
end $$;
select pg_temp.t_do('14cm. Người làm thứ hai đánh giá cùng ca (4 sao): điểm SOHO Coffee là 3 lượt, trung bình 3.3', 'b0000000-0000-4000-a000-000000000018',
  $$select create_facility_review('50000000-0000-4000-a000-000000000150', 4, 'Ổn')$$,
  $$select (select (j ->> 'review_count')::int = 3 and (j ->> 'avg_stars')::numeric = 3.3 from get_public_facility('demo-quan-1') j)$$);
select pg_temp.t_do('14cn. Admin duyệt người làm b…18 (đủ 18 tuổi): người này có thông báo hồ sơ được duyệt', '00000000-0000-4000-a000-000000000001',
  $$select admin_review_worker('b0000000-0000-4000-a000-000000000018', true, 'ok')$$,
  $$select exists (select 1 from notifications where user_id = 'b0000000-0000-4000-a000-000000000018' and kind = 'profile_reviewed' and payload = '{"status":"approved"}')$$);
select pg_temp.t_do('14co. Người làm xóa tài khoản: đánh giá và thông báo của họ mất, điểm công khai về 2 lượt trung bình 3.0, đánh giá người khác còn', 'b0000000-0000-4000-a000-000000000018',
  $$select delete_my_account()$$,
  $$select not exists (select 1 from facility_reviews where worker_id = 'b0000000-0000-4000-a000-000000000018')
       and not exists (select 1 from notifications where user_id = 'b0000000-0000-4000-a000-000000000018')
       and not exists (select 1 from shift_results where worker_id = 'b0000000-0000-4000-a000-000000000018')
       and (select (j ->> 'review_count')::int = 2 and (j ->> 'avg_stars')::numeric = 3.0 from get_public_facility('demo-quan-1') j)$$);

-- Chủ quán xóa tài khoản: cơ sở, ca, đánh giá, thông báo của họ mất; đánh giá của người làm ở quán khác còn
do $$
begin
  perform set_config('app.seed_mode', 'on', true);
  insert into facility_reviews (facility_id, shift_id, worker_id, stars, comment)
  values ('f0000000-0000-4000-a000-000000000019', '50000000-0000-4000-a000-000000000155', 'a0000000-0000-4000-a000-000000000001', 5, 'Quán test 19');
  insert into notifications (user_id, kind, payload)
  values ('b0000000-0000-4000-a000-000000000019', 'application_new', '{"job_type":"phuc_vu"}');
  perform set_config('app.seed_mode', 'off', true);
end $$;
select pg_temp.t_do('14cp. Chủ quán xóa tài khoản: cơ sở, ca, đánh giá, thông báo xóa theo; đánh giá của người làm ở quán khác còn', 'b0000000-0000-4000-a000-000000000019',
  $$select delete_my_account()$$,
  $$select not exists (select 1 from facilities where id = 'f0000000-0000-4000-a000-000000000019')
       and not exists (select 1 from shifts where id = '50000000-0000-4000-a000-000000000155')
       and not exists (select 1 from facility_reviews where comment = 'Quán test 19')
       and not exists (select 1 from notifications where user_id = 'b0000000-0000-4000-a000-000000000019')
       and (select count(*) = 2 from facility_reviews where worker_id = 'a0000000-0000-4000-a000-000000000001')$$);

-- ===== 14.6 Thông báo trong app =====
-- Các thông báo dưới đây do trigger sinh từ những hành động ở các nhóm test trước (swap_roles 6g, hủy 8a, báo bận 10g, gỡ cơ sở 10j,
-- đơn ứng tuyển nhóm 13). Seed chạy ở chế độ _bypass nên không sinh thông báo; chỉ có 6 thông báo mẫu viết tay trong seed.
select pg_temp.t_true('14cq. Đổi chỗ (swap_roles): người dự phòng lên chính được báo, người bị chuyển xuống không', null,
  $$select exists (select 1 from notifications where user_id = 'a0000000-0000-4000-a000-000000000007' and kind = 'shift_promoted'
                    and payload = jsonb_build_object('shift_id', '50000000-0000-4000-a000-000000000001', 'job_type', 'phuc_vu', 'facility_name', 'SOHO Coffee'))
       and not exists (select 1 from notifications where user_id = 'a0000000-0000-4000-a000-000000000004' and payload ->> 'shift_id' = '50000000-0000-4000-a000-000000000001')$$);
select pg_temp.t_true('14cr. Người chính hủy sớm: người dự phòng tự lên chính được báo (kèm tên quán)', null,
  $$select exists (select 1 from notifications where user_id = 'a0000000-0000-4000-a000-000000000003' and kind = 'shift_promoted'
                    and payload ->> 'shift_id' = '50000000-0000-4000-a000-000000000004' and payload ->> 'facility_name' = 'An Coffee Bean')$$);
select pg_temp.t_true('14cs. Nhóm vận hành cho người chính báo bận: người dự phòng lên chính được báo', null,
  $$select exists (select 1 from notifications where user_id = 'a0000000-0000-4000-a000-000000000008' and kind = 'shift_promoted'
                    and payload ->> 'shift_id' = '50000000-0000-4000-a000-000000000005' and payload ->> 'facility_name' = 'Phê La Vũng Tàu')
       and not exists (select 1 from notifications where user_id = 'a0000000-0000-4000-a000-000000000007' and payload ->> 'shift_id' = '50000000-0000-4000-a000-000000000005')$$);
select pg_temp.t_true('14ct. Cơ sở bị gỡ hủy ca: người đang giữ suất được báo ca bị hủy; người đã tự hủy trước đó thì không', null,
  $$select exists (select 1 from notifications where user_id = 'a0000000-0000-4000-a000-000000000003' and kind = 'shift_cancelled'
                    and payload ->> 'shift_id' = '50000000-0000-4000-a000-000000000004')
       and not exists (select 1 from notifications where user_id = 'a0000000-0000-4000-a000-000000000002' and payload ->> 'shift_id' = '50000000-0000-4000-a000-000000000004')$$);
drop table if exists t_nc;
create temp table t_nc as select count(*)::int as c from public.notifications;
select pg_temp.t_do('14cu. Chủ quán hủy ca chưa có ai nhận: không sinh thông báo nào', 'e0000000-0000-4000-a000-000000000001',
  $$select cancel_shift('50000000-0000-4000-a000-000000000158')$$,
  $$select (select status = 'cancelled' from shifts where id = '50000000-0000-4000-a000-000000000158') and (select count(*) = (select c from t_nc) from notifications)$$);
select pg_temp.t_true('14cv. Đơn mới (nộp lại sau khi rút): chủ quán được báo, kèm id đơn, id tin, loại việc, tên quán', null,
  $$select exists (select 1 from notifications n where n.user_id = 'e0000000-0000-4000-a000-000000000001' and n.kind = 'application_new'
                    and n.payload = jsonb_build_object('application_id', (select id from job_applications where job_id = 'c0000000-0000-4000-a000-000000000001'
                                                         and worker_id = 'a0000000-0000-4000-a000-000000000002' and status = 'applied'),
                                                       'job_id', 'c0000000-0000-4000-a000-000000000001', 'job_type', 'pha_che', 'facility_name', 'SOHO Coffee'))
       and not exists (select 1 from notifications n join profiles p on p.id = n.user_id where n.kind = 'application_new' and p.role <> 'employer')$$);
select pg_temp.t_true('14cw. Chủ quán chọn rồi loại đơn: người làm nhận đúng hai thông báo (shortlisted, rejected) cho đơn đó', null,
  $$select count(*) = 2 and count(*) filter (where payload ->> 'status' = 'shortlisted') = 1 and count(*) filter (where payload ->> 'status' = 'rejected') = 1
    from notifications where user_id = 'a0000000-0000-4000-a000-000000000001' and kind = 'application_status'
     and payload ->> 'application_id' = 'd0000000-0000-4000-a000-000000000001'$$);
select pg_temp.t_true('14cx. Người làm tự rút đơn không sinh thông báo; đơn do seed (chế độ bypass) cũng không có thông báo tự sinh', null,
  $$select not exists (select 1 from notifications where payload ->> 'status' in ('withdrawn', 'applied'))
       and not exists (select 1 from notifications where payload ->> 'application_id' in
            ('d0000000-0000-4000-a000-000000000002', 'd0000000-0000-4000-a000-000000000003', 'd0000000-0000-4000-a000-000000000004', 'd0000000-0000-4000-a000-000000000007')
            and created_at >= now())$$);
select pg_temp.t_do('14cy. Duyệt hồ sơ người làm: người đó được báo "approved"', '00000000-0000-4000-a000-000000000001',
  $$select admin_review_worker('a0000000-0000-4000-a000-000000000010', true, 'ok')$$,
  $$select exists (select 1 from notifications where user_id = 'a0000000-0000-4000-a000-000000000010' and kind = 'profile_reviewed' and payload = '{"status":"approved"}')$$);
select pg_temp.t_do('14cz. Từ chối hồ sơ: người đó được báo "rejected", không kèm ghi chú của nhóm vận hành', '00000000-0000-4000-a000-000000000001',
  $$select admin_review_worker('a0000000-0000-4000-a000-000000000009', false, 'Ghi chú nội bộ không được lộ')$$,
  $$select exists (select 1 from notifications where user_id = 'a0000000-0000-4000-a000-000000000009' and kind = 'profile_reviewed' and payload = '{"status":"rejected"}')
       and not exists (select 1 from notifications where payload::text like '%Ghi chú nội bộ%')$$);
select pg_temp.t_do('14da. (chuẩn bị) Người làm xin link phụ huynh mới sau khi bị từ chối', 'a0000000-0000-4000-a000-000000000009',
  $$select regenerate_consent_link()$$,
  $$select status = 'pending' from parental_consents where worker_id = 'a0000000-0000-4000-a000-000000000009'$$);
select pg_temp.t_err('14db. Phụ huynh nhập SĐT 11 số bị chặn (phụ huynh vẫn đúng 10 số), chưa có thông báo mới', null,
  $$select submit_parental_consent((select token from parental_consents where worker_id = 'a0000000-0000-4000-a000-000000000009'), 'Phụ Huynh Test', '09000005099', true)$$, '%10 số%');
select pg_temp.t_do('14dc. Phụ huynh gửi phiếu (SĐT 10 số): người làm được báo, thông báo không có tên/SĐT phụ huynh', null,
  $$select submit_parental_consent((select token from parental_consents where worker_id = 'a0000000-0000-4000-a000-000000000009'), 'Phụ Huynh Test', '0900000509', true)$$,
  $$select exists (select 1 from notifications where user_id = 'a0000000-0000-4000-a000-000000000009' and kind = 'parental_consent_submitted'
                    and payload = '{"status":"submitted"}' and created_at >= now())
       and not exists (select 1 from notifications where payload::text like '%Phụ Huynh Test%' or payload::text like '%0900000509%')$$);
select pg_temp.t_true('14dd. Payload mọi thông báo chỉ có khóa cho phép; không có SĐT, token, ngày sinh, tên phụ huynh', null,
  $$select count(*) > 8
       and not exists (select 1 from notifications n, jsonb_object_keys(n.payload) k
                       where k not in ('shift_id', 'job_id', 'application_id', 'job_type', 'facility_name', 'status'))
       and not exists (select 1 from notifications n, private_contacts pc where n.payload::text like '%' || pc.phone || '%')
       and not exists (select 1 from notifications n, parental_consents c where n.payload::text like '%' || c.token || '%' or n.payload::text like '%' || c.parent_phone || '%' or n.payload::text like '%' || c.parent_name || '%')
       and not exists (select 1 from notifications n, shift_confirmation_tokens t where n.payload::text like '%' || t.token || '%')
       and not exists (select 1 from notifications n, worker_profiles w where n.payload::text like '%' || w.date_of_birth::text || '%')
       and not exists (select 1 from notifications where payload::text ilike '%token%' or payload::text ilike '%phone%')
    from notifications$$);
select pg_temp.t_err('14de. Loại thông báo ngoài danh sách bị constraint chặn', null,
  $$insert into notifications (user_id, kind) values ('a0000000-0000-4000-a000-000000000001', 'tu_do')$$, '%notifications_kind%');
select pg_temp.t_err('14df. Payload không phải object bị constraint chặn', null,
  $$insert into notifications (user_id, kind, payload) values ('a0000000-0000-4000-a000-000000000001', 'profile_reviewed', '[1]')$$, '%notifications_payload%');

select pg_temp.t_true('14dg. my_notifications: người 3 có 3 thông báo, 2 chưa đọc, mới nhất trước (thông báo mẫu của seed đã đọc nằm cuối)', 'a0000000-0000-4000-a000-000000000003',
  $$select (j ->> 'unread')::int = 2 and jsonb_array_length(j -> 'items') = 3 and (j -> 'items' -> -1 ->> 'read_at') is not null
       and (j -> 'items' -> 0 ->> 'read_at') is null and not (j -> 'items' -> 0 ? 'user_id')
    from my_notifications() j$$);
select pg_temp.t_true('14dh. my_notifications: giới hạn 1 và 0 (nâng lên 1), null dùng mặc định, 1000 bị chặn ở 100 (vẫn đủ 3)', 'a0000000-0000-4000-a000-000000000003',
  $$select jsonb_array_length(my_notifications(1) -> 'items') = 1 and jsonb_array_length(my_notifications(0) -> 'items') = 1
       and jsonb_array_length(my_notifications(null) -> 'items') = 3 and jsonb_array_length(my_notifications(1000) -> 'items') = 3$$);
select pg_temp.t_true('14di. my_notifications: chủ quán chỉ thấy thông báo của mình', 'e0000000-0000-4000-a000-000000000001',
  $$select jsonb_array_length(j -> 'items') >= 2 and not exists (select 1 from jsonb_array_elements(j -> 'items') e where e ->> 'kind' not in ('application_new'))
    from my_notifications() j$$);
select pg_temp.t_err('14dj. anon không gọi được my_notifications', null,
  $$select my_notifications()$$, '%permission denied%', 'anon');
select pg_temp.t_err('14dk. Tài khoản bị khóa không xem được thông báo', 'a0000000-0000-4000-a000-000000000004',
  $$select my_notifications()$$, '%bị khóa%');
select pg_temp.t_do('14dl. Đánh dấu đã đọc một thông báo: trả về 1, số chưa đọc giảm còn 1', 'a0000000-0000-4000-a000-000000000003',
  $$select mark_notifications_read(array[(select id from notifications where user_id = 'a0000000-0000-4000-a000-000000000003' and kind = 'shift_promoted' and payload ->> 'shift_id' = '50000000-0000-4000-a000-000000000004')])$$,
  $$select (select count(*) = 1 from notifications where user_id = 'a0000000-0000-4000-a000-000000000003' and read_at is null)$$);
select pg_temp.t_true('14dm. Đánh dấu lại thông báo đã đọc: trả về 0', 'a0000000-0000-4000-a000-000000000003',
  $$select mark_notifications_read(array[(select id from notifications where user_id = 'a0000000-0000-4000-a000-000000000003' and kind = 'shift_promoted' and payload ->> 'shift_id' = '50000000-0000-4000-a000-000000000004')]) = 0$$);
select pg_temp.t_true('14dn. Không đánh dấu hộ thông báo của người khác: trả về 0, thông báo vẫn chưa đọc', 'a0000000-0000-4000-a000-000000000001',
  $$select mark_notifications_read(array[(select id from notifications where user_id = 'a0000000-0000-4000-a000-000000000003' and kind = 'shift_cancelled')]) = 0
       and (select read_at is null from notifications where user_id = 'a0000000-0000-4000-a000-000000000003' and kind = 'shift_cancelled')$$);
select pg_temp.t_do('14do. Đánh dấu tất cả (null): chỉ thông báo của mình, số chưa đọc về 0, thông báo người khác còn nguyên', 'a0000000-0000-4000-a000-000000000003',
  $$select mark_notifications_read()$$,
  $$select (select (my_notifications() ->> 'unread')::int = 0) and (select count(*) > 0 from notifications where user_id <> 'a0000000-0000-4000-a000-000000000003' and read_at is null)$$);
select pg_temp.t_err('14dp. anon không gọi được mark_notifications_read', null,
  $$select mark_notifications_read()$$, '%permission denied%', 'anon');
select pg_temp.t_true('14dq. RLS: người làm select thẳng bảng notifications chỉ thấy thông báo của mình', 'a0000000-0000-4000-a000-000000000003',
  $$select count(*) = 3 and bool_and(user_id = 'a0000000-0000-4000-a000-000000000003') from notifications$$, 'authenticated');
select pg_temp.t_true('14dr. RLS: nhóm vận hành cũng không đọc thông báo của người khác', '00000000-0000-4000-a000-000000000001',
  $$select count(*) = 0 from notifications$$, 'authenticated');
select pg_temp.t_err('14ds. anon không đọc được bảng notifications', null,
  $$select count(*) from notifications$$, '%permission denied%', 'anon');
select pg_temp.t_err('14dt. Người đăng nhập không insert thẳng vào notifications', 'a0000000-0000-4000-a000-000000000003',
  $$insert into notifications (user_id, kind) values ('a0000000-0000-4000-a000-000000000003', 'profile_reviewed')$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('14du. Người đăng nhập không update thẳng notifications (giả đã đọc, sửa payload)', 'a0000000-0000-4000-a000-000000000003',
  $$update notifications set payload = '{}'$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('14dv. Người đăng nhập không delete thẳng notifications', 'a0000000-0000-4000-a000-000000000003',
  $$delete from notifications$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('14dw. Client không gọi được hàm nội bộ _notify', 'a0000000-0000-4000-a000-000000000003',
  $$select _notify('a0000000-0000-4000-a000-000000000003', 'profile_reviewed', '{}')$$, '%permission denied%', 'authenticated');
select pg_temp.t_err('14dx. anon không gọi được get_public_* qua hàm nội bộ _public_shift_json', null,
  $$select _public_shift_json((select s from shifts s limit 1))$$, '%permission denied%', 'anon');

select pg_temp.as_user(null, null);
select name, passed, detail from t_results order by n;
