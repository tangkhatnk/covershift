-- =====================================================================
-- SafeShift — 0004: thông báo trong app, trang quán công khai, đánh giá quán, chia sẻ ca, nới SĐT chủ quán.
-- Theo chỉ thị của chủ dự án ngày 19/11/2026. Chạy sau 0001, 0002, 0003, trước seed.sql (seed mới có thông báo, đánh giá, slug mẫu).
-- Không xóa gì, không sửa 0001/0002/0003. Chạy xong dán supabase/tests/privileges_check.sql, rồi chạy lại seed.sql.
-- Nguyên tắc như 0001: client không ghi trực tiếp bảng nào; quy tắc cốt lõi ở trigger/constraint.
-- Hai RPC công khai (anon) mới: get_public_facility, get_public_shift (chủ dự án đã duyệt, xem AGENTS.md mục 11 và 13).
-- =====================================================================

-- ---------- 0. SĐT: nới cột chung, người làm vẫn đúng 10 số ----------
-- Chủ quán có thể dùng số bàn (11 số) hoặc tổng đài 1800/1900. Cột private_contacts.phone dùng chung cho cả người làm
-- nên ràng buộc cột được nới chung; người làm vẫn phải đúng 10 số di động nhờ trigger theo vai trò ngay dưới.
-- Dữ liệu cũ (0 + 9 số) vẫn hợp lệ. Số điện thoại phụ huynh (parental_consents.parent_phone) giữ nguyên 10 số.
alter table public.private_contacts drop constraint private_contacts_phone_check;
alter table public.private_contacts add constraint private_contacts_phone_check
  check (phone ~ '^(0[0-9]{9,10}|1[89]00[0-9]{4,6})$');

create function public._private_contacts_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if _bypass() then return new; end if;
  if new.phone !~ '^0[0-9]{9}$' and exists (select 1 from profiles where id = new.user_id and role = 'worker') then
    raise exception 'Số điện thoại của người làm gồm 10 số, bắt đầu bằng 0.';
  end if;
  return new;
end $$;
create trigger private_contacts_guard before insert or update of phone on public.private_contacts
  for each row execute function public._private_contacts_guard();

-- register_employer: chỉ đổi câu báo lỗi (số điện thoại không còn "10 số"); chữ ký không đổi nên giữ nguyên quyền cũ.
create or replace function public.register_employer(
  p_full_name text, p_phone text, p_facility_name text, p_type public.facility_type,
  p_address text, p_area public.area, p_maps_url text, p_not_prohibited boolean, p_consent boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập.' using errcode = '42501'; end if;
  if exists (select 1 from profiles where id = v_uid) then
    raise exception 'Tài khoản này đã đăng ký rồi.';
  end if;
  if not coalesce(p_consent, false) then
    raise exception 'Bạn cần đồng ý cho xử lý dữ liệu cá nhân để tiếp tục.';
  end if;
  if not coalesce(p_not_prohibited, false) then
    raise exception 'Cơ sở thuộc nhóm bar, karaoke, massage, công trường, việc dưới nước, giao hàng xe máy không được tham gia.';
  end if;
  insert into profiles (id, role, full_name, consent_at) values (v_uid, 'employer', btrim(p_full_name), now());
  insert into private_contacts (user_id, phone) values (v_uid, p_phone);
  insert into facilities (owner_id, name, type, address, area, maps_url, not_prohibited_ack)
  values (v_uid, btrim(p_facility_name), p_type, btrim(p_address), p_area, nullif(btrim(coalesce(p_maps_url, '')), ''), true)
  returning id into v_id;
  return v_id;
exception
  when check_violation then
    raise exception 'Thông tin chưa hợp lệ. Kiểm tra lại tên, địa chỉ, số điện thoại (số di động 10 số, số bàn 11 số hoặc tổng đài 1800/1900) và link bản đồ (bắt đầu bằng https://).';
end $$;

-- ---------- 1. TRANG QUÁN CÔNG KHAI: mã công khai của cơ sở ----------
-- Mã ngẫu nhiên (không sinh từ tên, không đoán được). Cột mới có default volatile nên Postgres tính riêng cho từng dòng cũ
-- khi thêm cột: cơ sở hiện có được backfill ngay (mỗi dòng một mã riêng, không chạy trigger của bảng).
alter table public.facilities
  add column public_slug text not null default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
alter table public.facilities add constraint facilities_public_slug_key unique (public_slug);
alter table public.facilities add constraint facilities_public_slug_format check (public_slug ~ '^[a-z0-9-]{6,40}$');

-- ---------- 2. THÔNG BÁO TRONG APP ----------
-- Xóa tài khoản thì thông báo xóa theo (cascade). Thông báo không có SĐT, token, ngày sinh, tên phụ huynh:
-- payload chỉ có id đối tượng (shift_id, job_id, application_id), loại việc, tên cơ sở và trạng thái.
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  kind       text not null,
  payload    jsonb not null default '{}',
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_kind check (kind in
    ('shift_promoted', 'shift_cancelled', 'application_new', 'application_status', 'profile_reviewed', 'parental_consent_submitted')),
  constraint notifications_payload check (jsonb_typeof(payload) = 'object')
);
create index on public.notifications (user_id, created_at desc);
create index on public.notifications (user_id) where read_at is null;

-- ---------- 3. ĐÁNH GIÁ QUÁN ----------
-- Xóa cơ sở, ca hoặc người làm thì đánh giá xóa theo (cascade). hidden_by/hidden_at không cấp cho client.
create table public.facility_reviews (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  shift_id    uuid not null references public.shifts (id) on delete cascade,
  worker_id   uuid not null references public.worker_profiles (user_id) on delete cascade,
  stars       int not null,
  comment     text,
  hidden      boolean not null default false,
  hidden_by   uuid,
  hidden_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique (shift_id, worker_id),
  constraint facility_reviews_stars   check (stars between 1 and 5),
  constraint facility_reviews_comment check (comment is null or char_length(comment) <= 500)
);
create index on public.facility_reviews (facility_id) where not hidden;
create index on public.facility_reviews (worker_id);

-- ---------- HÀM NỘI BỘ ----------
-- Ghi một thông báo. Không bao giờ làm hỏng luồng chính (lỗi chỉ thành cảnh báo). Seed (chế độ _bypass) không sinh thông báo.
create function public._notify(p_user uuid, p_kind text, p_payload jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if _bypass() then return; end if;
  insert into notifications (user_id, kind, payload) values (p_user, p_kind, coalesce(p_payload, '{}'));
exception when others then
  raise warning 'Không ghi được thông báo %: %', p_kind, sqlerrm;
end $$;

-- Người dự phòng lên chính (tự động hoặc chủ quán đổi chỗ), hoặc ca bị hủy khi người làm đang giữ suất.
create function public._notify_claim_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare s shifts; v_kind text; v_fac text;
begin
  if _bypass() then return null; end if;
  if old.status = 'active' and new.status = 'cancelled' and new.cancel_kind = 'shift_cancelled' then
    v_kind := 'shift_cancelled';
  elsif old.role = 'backup' and new.role = 'primary' and new.status = 'active' then
    v_kind := 'shift_promoted';
  else
    return null;
  end if;
  select * into s from shifts where id = new.shift_id;
  select name into v_fac from facilities where id = s.facility_id;
  perform _notify(new.worker_id, v_kind,
    jsonb_build_object('shift_id', s.id, 'job_type', s.job_type, 'facility_name', v_fac));
  return null;
end $$;
create trigger notify_claim_change after update of status, role on public.shift_claims
  for each row execute function public._notify_claim_change();

-- Đơn ứng tuyển: đơn mới báo chủ quán; chủ quán chọn/loại/nhận báo người làm (người làm tự rút đơn thì không báo).
create function public._notify_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare j job_posts; f facilities;
begin
  if _bypass() then return null; end if;
  select * into j from job_posts where id = new.job_id;
  select * into f from facilities where id = j.facility_id;
  if tg_op = 'INSERT' then
    perform _notify(f.owner_id, 'application_new',
      jsonb_build_object('application_id', new.id, 'job_id', j.id, 'job_type', j.job_type, 'facility_name', f.name));
  elsif new.status is distinct from old.status and new.status in ('shortlisted', 'rejected', 'hired') then
    perform _notify(new.worker_id, 'application_status',
      jsonb_build_object('application_id', new.id, 'job_id', j.id, 'job_type', j.job_type,
                         'facility_name', f.name, 'status', new.status));
  end if;
  return null;
end $$;
create trigger notify_application_insert after insert on public.job_applications
  for each row execute function public._notify_application();
create trigger notify_application_update after update of status on public.job_applications
  for each row execute function public._notify_application();

-- Hồ sơ người làm được duyệt hoặc từ chối (không kèm ghi chú của nhóm vận hành).
create function public._notify_worker_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if _bypass() then return null; end if;
  perform _notify(new.user_id, 'profile_reviewed', jsonb_build_object('status', new.approval));
  return null;
end $$;
create trigger notify_worker_review after update of approval on public.worker_profiles
  for each row when (old.approval is distinct from new.approval and new.approval in ('approved', 'rejected'))
  execute function public._notify_worker_review();

-- Phụ huynh gửi phiếu đồng ý (không kèm tên, SĐT phụ huynh).
create function public._notify_consent_submitted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if _bypass() then return null; end if;
  perform _notify(new.worker_id, 'parental_consent_submitted', jsonb_build_object('status', 'submitted'));
  return null;
end $$;
create trigger notify_consent_submitted after update of status on public.parental_consents
  for each row when (old.status = 'pending' and new.status = 'submitted')
  execute function public._notify_consent_submitted();

-- Mọi đánh giá (kể cả ghi bằng service-role) đều phải qua cửa này.
create function public._facility_reviews_validate() returns trigger
language plpgsql security definer set search_path = public as $$
declare s shifts;
begin
  if _bypass() then return new; end if;
  if tg_op = 'UPDATE' then
    -- Đánh giá đã gửi không sửa được; nhóm vận hành chỉ ẩn/hiện.
    if (new.facility_id, new.shift_id, new.worker_id, new.stars, new.comment, new.created_at)
       is distinct from (old.facility_id, old.shift_id, old.worker_id, old.stars, old.comment, old.created_at) then
      raise exception 'Không sửa được đánh giá đã gửi.';
    end if;
    return new;
  end if;
  select * into s from shifts where id = new.shift_id;
  if s.id is null then raise exception 'Không tìm thấy ca.'; end if;
  if s.facility_id <> new.facility_id then
    raise exception 'Quán được đánh giá không khớp với quán của ca.';
  end if;
  if s.status <> 'completed' then
    raise exception 'Ca này chưa được chủ quán xác nhận nên chưa đánh giá quán được.';
  end if;
  if not exists (select 1 from shift_results r where r.shift_id = new.shift_id and r.worker_id = new.worker_id and r.attended) then
    raise exception 'Chỉ người đã làm ca này mới đánh giá được quán.';
  end if;
  return new;
end $$;
create trigger facility_reviews_validate before insert or update on public.facility_reviews
  for each row execute function public._facility_reviews_validate();

-- JSON công khai của một ca: không SĐT, không danh sách người nhận, không id chủ quán.
-- primary_left: số chỗ người chính còn trống; backup_open: còn chỗ dự phòng; adults_only: ca không dành cho dưới 18 tuổi.
create function public._public_shift_json(s public.shifts) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', s.id, 'job_type', s.job_type, 'starts_at', s.starts_at, 'ends_at', s.ends_at,
    'hourly_wage', s.hourly_wage, 'urgent', s.urgent, 'headcount', s.headcount,
    'primary_left', greatest(s.headcount - (select count(*) from shift_claims c
                     where c.shift_id = s.id and c.status = 'active' and c.role = 'primary'), 0),
    'backup_open', not exists (select 1 from shift_claims c where c.shift_id = s.id and c.status = 'active' and c.role = 'backup'),
    'adults_only', not (s.allow_minor and _minor_safe(s.starts_at, s.ends_at)))
$$;

-- =====================================================================
-- RPC: THÔNG BÁO
-- =====================================================================
create function public.my_notifications(p_limit int default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles;
begin
  me := _require_user();
  return jsonb_build_object(
    'unread', (select count(*) from notifications where user_id = me.id and read_at is null),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', n.id, 'kind', n.kind, 'payload', n.payload, 'read_at', n.read_at, 'created_at', n.created_at)
                order by n.created_at desc, n.id), '[]'::jsonb)
              from (select * from notifications where user_id = me.id
                    order by created_at desc, id
                    limit least(greatest(coalesce(p_limit, 30), 1), 100)) n));
end $$;

-- p_ids null = đánh dấu đã đọc tất cả. Chỉ đụng thông báo của chính mình. Trả về số thông báo vừa đổi.
create function public.mark_notifications_read(p_ids uuid[] default null) returns int
language plpgsql security definer set search_path = public as $$
declare me profiles; v_n int;
begin
  me := _require_user();
  update notifications set read_at = now()
   where user_id = me.id and read_at is null and (p_ids is null or id = any (p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- =====================================================================
-- RPC: TRANG QUÁN CÔNG KHAI (không cần đăng nhập, bảo vệ bằng mã ngẫu nhiên)
-- =====================================================================
-- Không có tên hay SĐT chủ quán, không có nhận xét (chỉ điểm trung bình và số lượt). Mã sai, cơ sở chưa xác minh,
-- đang chờ duyệt hoặc đã bị gỡ trả cùng một lỗi (không lộ cơ sở có tồn tại hay không).
create function public.get_public_facility(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare f facilities;
begin
  select * into f from facilities where public_slug = p_slug and verified and status = 'active';
  if f.id is null then raise exception 'Không tìm thấy trang quán này.'; end if;
  return jsonb_build_object(
    'slug', f.public_slug, 'name', f.name, 'type', f.type, 'area', f.area, 'address', f.address,
    'maps_url', f.maps_url, 'lat', f.lat, 'lng', f.lng,
    'completed_shifts', (select count(*) from shifts s where s.facility_id = f.id and s.status = 'completed'
                           and exists (select 1 from shift_results r where r.shift_id = s.id and r.attended)),
    'review_count', (select count(*) from facility_reviews r where r.facility_id = f.id and not r.hidden),
    'avg_stars', (select round(avg(r.stars), 1) from facility_reviews r where r.facility_id = f.id and not r.hidden),
    'open_shifts', (select coalesce(jsonb_agg(x.j order by x.starts_at), '[]'::jsonb) from (
                      select y.j, y.starts_at from (
                        select _public_shift_json(s) as j, s.starts_at from shifts s
                        where s.facility_id = f.id and s.status = 'open' and s.starts_at > now()) y
                      where (y.j ->> 'primary_left')::int > 0 or (y.j ->> 'backup_open')::boolean
                      order by y.starts_at limit 20) x));
end $$;

-- Chỉ ca đang mở, bắt đầu trong tương lai, của cơ sở đã xác minh. Ca không đủ điều kiện trả cùng một lỗi.
create function public.get_public_shift(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare s shifts; f facilities;
begin
  select s2.* into s from shifts s2 join facilities f2 on f2.id = s2.facility_id
   where s2.id = p_id and s2.status = 'open' and s2.starts_at > now() and f2.verified and f2.status = 'active';
  if s.id is null then raise exception 'Không tìm thấy ca này.'; end if;
  select * into f from facilities where id = s.facility_id;
  return _public_shift_json(s) || jsonb_build_object(
    'description', s.description, 'facility_name', f.name, 'facility_type', f.type, 'area', f.area,
    'address', f.address, 'lat', f.lat, 'lng', f.lng, 'facility_slug', f.public_slug);
end $$;

-- =====================================================================
-- RPC: ĐÁNH GIÁ QUÁN
-- =====================================================================
-- Người làm đã làm ca (chủ quán xác nhận "đã làm") đánh giá quán, mỗi ca một lần. Trigger kiểm điều kiện.
create function public.create_facility_review(p_shift uuid, p_stars int, p_comment text) returns uuid
language plpgsql security definer set search_path = public as $$
declare me profiles; s shifts; v_id uuid; v_con text;
begin
  me := _require_user();
  if me.role <> 'worker' then raise exception 'Chỉ người làm mới đánh giá được quán.'; end if;
  select * into s from shifts where id = p_shift;
  if s.id is null then raise exception 'Không tìm thấy ca.'; end if;
  if p_stars is null then raise exception 'Vui lòng chọn số sao từ 1 đến 5.'; end if;
  insert into facility_reviews (facility_id, shift_id, worker_id, stars, comment)
  values (s.facility_id, s.id, me.id, p_stars, nullif(btrim(coalesce(p_comment, '')), ''))
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    raise exception 'Bạn đã đánh giá quán cho ca này rồi.';
  when check_violation then
    get stacked diagnostics v_con = constraint_name;
    raise exception '%', case v_con
      when 'facility_reviews_stars' then 'Số sao từ 1 đến 5.'
      else 'Nhận xét tối đa 500 ký tự.'
    end;
end $$;

create function public.admin_hide_facility_review(p_id uuid, p_hidden boolean, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles;
begin
  me := _require_admin();
  update facility_reviews
     set hidden = coalesce(p_hidden, true),
         hidden_by = case when coalesce(p_hidden, true) then me.id end,
         hidden_at = case when coalesce(p_hidden, true) then now() end
   where id = p_id;
  if not found then raise exception 'Không tìm thấy đánh giá.'; end if;
  perform _audit('hide_facility_review', 'facility_reviews', p_id,
                 jsonb_build_object('hidden', coalesce(p_hidden, true), 'reason', p_reason));
end $$;

-- Nhóm vận hành xem mọi đánh giá (kèm nhận xét và tên người làm) để ẩn khi cần. Không có SĐT.
create function public.admin_list_facility_reviews() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform _require_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'facility_id', r.facility_id, 'facility_name', f.name, 'shift_id', r.shift_id,
    'starts_at', s.starts_at, 'worker_name', p.full_name, 'stars', r.stars, 'comment', r.comment,
    'hidden', r.hidden, 'hidden_at', r.hidden_at, 'created_at', r.created_at)
    order by r.created_at desc), '[]'::jsonb) into v
  from facility_reviews r
  join facilities f on f.id = r.facility_id
  join shifts s on s.id = r.shift_id
  join profiles p on p.id = r.worker_id;
  return v;
end $$;

-- =====================================================================
-- RLS + QUYỀN
-- =====================================================================
alter table public.notifications     enable row level security;
alter table public.facility_reviews  enable row level security;

create policy notifications_read on public.notifications for select to authenticated
  using (user_id = auth.uid());

-- Người làm đọc đánh giá của chính mình (để biết ca nào đã đánh giá); nhóm vận hành đọc tất cả. Chủ quán và người khác không đọc.
create policy facility_reviews_read on public.facility_reviews for select to authenticated
  using (worker_id = auth.uid() or public.is_admin());

-- Chỉ thu hồi trên bảng mới (không chạy lại revoke toàn schema, vì sẽ xóa grant của các bảng cũ).
revoke all on public.notifications, public.facility_reviews from anon, authenticated;
grant select on public.notifications to authenticated;
-- facility_reviews: cấp theo CỘT; hidden_by (id nhóm vận hành) không cấp cho client.
grant select (id, facility_id, shift_id, worker_id, stars, comment, hidden, created_at) on public.facility_reviews to authenticated;

-- Hàm nội bộ và hàm trigger: không cấp cho client.
revoke execute on function
  public._private_contacts_guard(),
  public._notify(uuid, text, jsonb),
  public._notify_claim_change(),
  public._notify_application(),
  public._notify_worker_review(),
  public._notify_consent_submitted(),
  public._facility_reviews_validate(),
  public._public_shift_json(public.shifts)
  from public, anon, authenticated;

-- RPC cần đăng nhập (mỗi hàm tự kiểm tra vai trò).
revoke execute on function
  public.my_notifications(int),
  public.mark_notifications_read(uuid[]),
  public.create_facility_review(uuid, int, text),
  public.admin_hide_facility_review(uuid, boolean, text),
  public.admin_list_facility_reviews()
  from public, anon, authenticated;
grant execute on function
  public.my_notifications(int),
  public.mark_notifications_read(uuid[]),
  public.create_facility_review(uuid, int, text),
  public.admin_hide_facility_review(uuid, boolean, text),
  public.admin_list_facility_reviews()
  to authenticated;

-- RPC công khai mới (không cần đăng nhập): chủ dự án duyệt ngày 19/11/2026. Danh sách công khai nay có bảy hàm.
revoke execute on function public.get_public_facility(text), public.get_public_shift(uuid) from public, anon, authenticated;
grant execute on function public.get_public_facility(text), public.get_public_shift(uuid) to anon, authenticated;
