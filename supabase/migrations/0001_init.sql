-- =====================================================================
-- SafeShift — migration khởi tạo
-- Nguyên tắc: client KHÔNG có quyền INSERT/UPDATE/DELETE trực tiếp trên bảng nào.
-- Mọi thao tác ghi đi qua hàm SECURITY DEFINER; quy tắc nghiệp vụ cốt lõi
-- còn được chặn thêm bằng trigger/constraint để service-role cũng không lách được.
-- Múi giờ nghiệp vụ: Asia/Ho_Chi_Minh.
-- =====================================================================

-- ---------- ENUM ----------
create type public.user_role        as enum ('worker', 'employer', 'admin');
create type public.account_status   as enum ('active', 'locked');
create type public.approval_status  as enum ('pending', 'approved', 'rejected');
-- Allowlist loại hình cơ sở: bar, karaoke, massage, công trường, việc dưới nước,
-- giao hàng xe máy KHÔNG có trong enum => không thể tạo.
create type public.facility_type    as enum ('cafe', 'restaurant', 'homestay', 'small_hotel');
create type public.facility_status  as enum ('pending', 'active', 'removed');
create type public.area             as enum ('bai_truoc', 'bai_sau', 'thang_tam', 'trung_tam', 'rach_dua', 'khac');
create type public.job_type         as enum ('phuc_vu', 'pha_che', 'thu_ngan', 'don_phong', 'le_tan', 'phu_bep_nhe', 'ho_tro_su_kien');
create type public.shift_status     as enum ('open', 'cancelled', 'completed');
create type public.claim_role       as enum ('primary', 'backup');
create type public.claim_status     as enum ('active', 'cancelled');
create type public.cancel_kind      as enum ('worker', 'late_cancel', 'admin_busy', 'shift_cancelled', 'account');
create type public.consent_status   as enum ('pending', 'submitted', 'approved', 'rejected');
create type public.payment_answer   as enum ('full', 'partial', 'unpaid');
create type public.report_kind      as enum ('payment', 'late_cancel', 'primary_busy', 'no_show', 'user_report');
create type public.report_status    as enum ('open', 'resolved');
create type public.worker_event_kind as enum ('cancel', 'late_cancel', 'no_show', 'promoted', 'admin_busy');

-- ---------- HÀM TIỆN ÍCH THUẦN ----------
create function public.vn_date(ts timestamptz) returns date
language sql immutable as $$ select (ts at time zone 'Asia/Ho_Chi_Minh')::date $$;

create function public.age_on(dob date, d date) returns int
language sql immutable as $$ select date_part('year', age(d::timestamp, dob::timestamp))::int $$;

-- Ca an toàn cho người dưới 18: cùng một ngày, bắt đầu từ 06:00, kết thúc không muộn hơn 22:00, dài tối đa 8 giờ.
create function public._minor_safe(p_start timestamptz, p_end timestamptz) returns boolean
language sql immutable as $$
  select vn_date(p_start) = vn_date(p_end)
     and (p_start at time zone 'Asia/Ho_Chi_Minh')::time >= time '06:00'
     and (p_end   at time zone 'Asia/Ho_Chi_Minh')::time <= time '22:00'
     and p_end - p_start <= interval '8 hours'
$$;

-- Chỉ dùng cho seed: phải vừa bật app.seed_mode vừa là phiên của postgres (SQL editor / CLI).
-- Request qua API có session_user = authenticator nên không bao giờ bypass được.
create function public._bypass() returns boolean
language sql stable as $$
  select coalesce(current_setting('app.seed_mode', true), '') = 'on'
     and session_user in ('postgres', 'supabase_admin')
$$;

create function public._new_token() returns text
language sql volatile as $$
  select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
$$;

-- ---------- BẢNG ----------
create table public.app_config (
  key   text primary key,
  value jsonb not null
);
insert into public.app_config (key, value) values
  ('min_hourly_wage', '25500'),
  ('weekly_hours_cap', '40');

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  role            public.user_role not null,
  full_name       text not null check (char_length(btrim(full_name)) between 2 and 80),
  status          public.account_status not null default 'active',
  consent_at      timestamptz not null,
  consent_version text not null default 'v1',
  created_at      timestamptz not null default now()
);

-- Số điện thoại tách riêng để RLS chặn tuyệt đối; chỉ lộ qua get_shift_contacts().
create table public.private_contacts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phone   text not null check (phone ~ '^0[0-9]{9}$')
);

create table public.worker_profiles (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth date not null check (date_of_birth > date '1940-01-01'),
  school        text not null check (char_length(btrim(school)) between 2 and 120),
  class_name    text check (class_name is null or char_length(class_name) <= 40),
  area          public.area not null,
  availability  text[] not null default '{}'
    check (availability <@ array['ngay_thuong_sang','ngay_thuong_chieu','ngay_thuong_toi','cuoi_tuan_sang','cuoi_tuan_chieu','cuoi_tuan_toi']),
  approval      public.approval_status not null default 'pending',
  approved_at   timestamptz,
  approved_by   uuid,
  review_note   text,
  share_enabled boolean not null default false,
  public_slug   text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at    timestamptz not null default now()
);

create table public.parental_consents (
  id           uuid primary key default gen_random_uuid(),
  worker_id    uuid not null unique references public.worker_profiles (user_id) on delete cascade,
  token        text not null unique default public._new_token(),
  status       public.consent_status not null default 'pending',
  parent_name  text check (parent_name is null or char_length(btrim(parent_name)) between 2 and 80),
  parent_phone text check (parent_phone is null or parent_phone ~ '^0[0-9]{9}$'),
  agreed_at    timestamptz,
  expires_at   timestamptz not null default now() + interval '30 days',
  reviewed_by  uuid,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  check (status = 'pending' or (parent_name is not null and parent_phone is not null and agreed_at is not null))
);

create table public.facilities (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null unique references public.profiles (id) on delete cascade,
  name               text not null check (char_length(btrim(name)) between 2 and 100),
  type               public.facility_type not null,
  address            text not null check (char_length(btrim(address)) between 5 and 200),
  area               public.area not null,
  maps_url           text check (maps_url is null or maps_url ~* '^https://'),
  not_prohibited_ack boolean not null check (not_prohibited_ack),
  verified           boolean not null default false,
  status             public.facility_status not null default 'pending',
  created_at         timestamptz not null default now(),
  check (not verified or status = 'active')
);

create table public.facility_verifications (
  id                   uuid primary key default gen_random_uuid(),
  facility_id          uuid not null references public.facilities (id) on delete cascade,
  address_ok           boolean not null,
  contact_ok           boolean not null,
  has_business_license boolean not null,
  verified_on          date not null,
  verified_by          uuid,
  verifier_name        text not null check (char_length(btrim(verifier_name)) >= 2),
  note                 text,
  created_at           timestamptz not null default now()
);
create index on public.facility_verifications (facility_id, created_at desc);

create table public.shifts (
  id               uuid primary key default gen_random_uuid(),
  facility_id      uuid not null references public.facilities (id) on delete cascade,
  job_type         public.job_type not null,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  headcount        int not null default 1 check (headcount between 1 and 5),
  hourly_wage      int not null check (hourly_wage > 0 and hourly_wage <= 1000000),
  description      text check (description is null or char_length(description) <= 500),
  urgent           boolean not null default false,
  allow_minor      boolean not null default false,
  commitment_ack   boolean not null check (commitment_ack),
  status           public.shift_status not null default 'open',
  first_claimed_at timestamptz,
  created_at       timestamptz not null default now(),
  check (ends_at - starts_at >= interval '1 hour'),
  check (ends_at - starts_at <= interval '12 hours')
);
create index on public.shifts (starts_at) where status = 'open';
create index on public.shifts (facility_id, starts_at desc);

create table public.shift_claims (
  id               uuid primary key default gen_random_uuid(),
  shift_id         uuid not null references public.shifts (id) on delete cascade,
  worker_id        uuid not null references public.worker_profiles (user_id) on delete cascade,
  role             public.claim_role not null,
  status           public.claim_status not null default 'active',
  claimed_at       timestamptz not null default now(),
  promoted_at      timestamptz,
  cancelled_at     timestamptz,
  cancel_kind      public.cancel_kind,
  reminder_sent_at timestamptz,
  check ((status = 'active' and cancel_kind is null) or (status = 'cancelled' and cancel_kind is not null))
);
-- Mỗi người chỉ một suất còn hiệu lực trên một ca; mỗi ca tối đa một người dự phòng.
create unique index shift_claims_one_active_per_worker on public.shift_claims (shift_id, worker_id) where status = 'active';
create unique index shift_claims_one_backup on public.shift_claims (shift_id) where status = 'active' and role = 'backup';
create index on public.shift_claims (worker_id, status);

create table public.shift_confirmation_tokens (
  shift_id   uuid primary key references public.shifts (id) on delete cascade,
  token      text not null unique default public._new_token(),
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create table public.shift_results (
  id             uuid primary key default gen_random_uuid(),
  shift_id       uuid not null references public.shifts (id) on delete cascade,
  worker_id      uuid not null references public.worker_profiles (user_id) on delete cascade,
  attended       boolean not null,
  on_time        boolean,
  rating         int,
  comment        text check (comment is null or char_length(comment) <= 500),
  comment_hidden boolean not null default false,
  confirmed_at   timestamptz not null default now(),
  unique (shift_id, worker_id),
  check ((attended and on_time is not null and rating between 1 and 5)
      or (not attended and on_time is null and rating is null))
);
create index on public.shift_results (worker_id);

create table public.payment_feedback (
  shift_id   uuid not null references public.shifts (id) on delete cascade,
  worker_id  uuid not null references public.worker_profiles (user_id) on delete cascade,
  answer     public.payment_answer not null,
  created_at timestamptz not null default now(),
  primary key (shift_id, worker_id)
);

create table public.reports (
  id          uuid primary key default gen_random_uuid(),
  kind        public.report_kind not null,
  status      public.report_status not null default 'open',
  shift_id    uuid references public.shifts (id) on delete set null,
  reporter_id uuid references public.profiles (id) on delete set null,
  subject_id  uuid references public.profiles (id) on delete set null,
  body        text not null check (char_length(btrim(body)) between 1 and 1000),
  admin_note  text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index on public.reports (status, created_at desc);

create table public.worker_events (
  id         uuid primary key default gen_random_uuid(),
  worker_id  uuid not null references public.worker_profiles (user_id) on delete cascade,
  shift_id   uuid references public.shifts (id) on delete set null,
  kind       public.worker_event_kind not null,
  created_at timestamptz not null default now()
);
create index on public.worker_events (worker_id, kind);

create table public.admin_audit_log (
  id           bigint generated always as identity primary key,
  admin_id     uuid,
  action       text not null,
  target_table text,
  target_id    uuid,
  detail       jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index on public.admin_audit_log (created_at desc);

-- ---------- HÀM NỘI BỘ ----------
create function public.cfg_int(p_key text, p_default int) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::int from app_config where key = p_key), p_default)
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active')
$$;

create function public._require_user() returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare p profiles;
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập.' using errcode = '42501';
  end if;
  select * into p from profiles where id = auth.uid();
  if not found then
    raise exception 'Bạn chưa hoàn tất đăng ký.' using errcode = '42501';
  end if;
  if p.status <> 'active' then
    raise exception 'Tài khoản đang bị khóa. Vui lòng liên hệ nhóm vận hành.' using errcode = '42501';
  end if;
  return p;
end $$;

create function public._require_admin() returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare p profiles;
begin
  p := _require_user();
  if p.role <> 'admin' then
    raise exception 'Chỉ nhóm vận hành mới làm được việc này.' using errcode = '42501';
  end if;
  return p;
end $$;

create function public._audit(p_action text, p_table text, p_id uuid, p_detail jsonb default '{}') returns void
language sql security definer set search_path = public as $$
  insert into admin_audit_log (admin_id, action, target_table, target_id, detail)
  values (auth.uid(), p_action, p_table, p_id, coalesce(p_detail, '{}'))
$$;

create function public._owns_facility(p_facility uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from facilities where id = p_facility and owner_id = auth.uid())
$$;

create function public._owns_shift(p_shift uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from shifts s join facilities f on f.id = s.facility_id
                 where s.id = p_shift and f.owner_id = auth.uid())
$$;

create function public._has_claim(p_shift uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from shift_claims where shift_id = p_shift and worker_id = auth.uid())
$$;

-- Ca đang mở mà người gọi (người làm) được phép thấy; người dưới 18 chỉ thấy ca an toàn.
create function public._shift_open_for_me(p_facility uuid, p_status public.shift_status, p_start timestamptz,
                                          p_end timestamptz, p_allow_minor boolean) returns boolean
language sql stable security definer set search_path = public as $$
  select p_status = 'open' and p_start > now()
     and exists (select 1 from facilities f where f.id = p_facility and f.verified and f.status = 'active')
     and exists (select 1 from profiles p where p.id = auth.uid() and p.status = 'active')
     and not exists (
       select 1 from worker_profiles w
       where w.user_id = auth.uid()
         and age_on(w.date_of_birth, vn_date(p_start)) < 18
         and not (p_allow_minor and _minor_safe(p_start, p_end)))
$$;

-- ---------- TRIGGER KIỂM TRA ----------
create function public._worker_profiles_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if _bypass() then return new; end if;
  if tg_op = 'INSERT' then
    if new.date_of_birth > vn_date(now()) or age_on(new.date_of_birth, vn_date(now())) < 15 then
      raise exception 'Bạn cần đủ 15 tuổi để đăng ký.';
    end if;
  elsif new.date_of_birth <> old.date_of_birth then
    raise exception 'Không thể đổi ngày sinh. Vui lòng liên hệ nhóm vận hành.';
  end if;
  return new;
end $$;
create trigger worker_profiles_guard before insert or update on public.worker_profiles
  for each row execute function public._worker_profiles_guard();

create function public._facilities_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if _bypass() then return new; end if;
  if lower(new.name) ~ '\m(bar|pub|club|karaoke|massage|mát[- ]?xa|matxa|vũ trường)\M' then
    raise exception 'Loại hình cơ sở này không được phép tham gia (bar, karaoke, massage...).';
  end if;
  if new.verified and not exists (
       select 1 from facility_verifications v
       where v.facility_id = new.id and v.address_ok and v.contact_ok) then
    raise exception 'Chỉ bật "đã xác minh" sau khi có phiếu xác minh thực tế đạt yêu cầu.';
  end if;
  return new;
end $$;
create trigger facilities_guard before insert or update on public.facilities
  for each row execute function public._facilities_guard();

create function public._shifts_validate() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_min int;
begin
  if _bypass() then return new; end if;
  if tg_op = 'UPDATE' then
    if new.facility_id <> old.facility_id then
      raise exception 'Không thể chuyển ca sang cơ sở khác.';
    end if;
    if (new.starts_at, new.ends_at, new.hourly_wage, new.allow_minor, new.job_type, new.headcount)
       is not distinct from
       (old.starts_at, old.ends_at, old.hourly_wage, old.allow_minor, old.job_type, old.headcount) then
      return new; -- chỉ đổi trạng thái / mô tả
    end if;
    if exists (select 1 from shift_claims where shift_id = new.id and status = 'active') then
      raise exception 'Ca đã có người nhận, không sửa được. Hãy hủy ca và đăng lại.';
    end if;
  end if;
  if not exists (select 1 from facilities f where f.id = new.facility_id and f.verified and f.status = 'active') then
    raise exception 'Cơ sở chưa được xác minh nên chưa đăng ca được.';
  end if;
  if new.starts_at <= now() then
    raise exception 'Giờ bắt đầu ca phải ở tương lai.';
  end if;
  if new.starts_at > now() + interval '60 days' then
    raise exception 'Chỉ đăng ca trong vòng 60 ngày tới.';
  end if;
  v_min := cfg_int('min_hourly_wage', 25500);
  if new.hourly_wage < v_min then
    raise exception 'Lương/giờ phải từ % đ trở lên.', v_min;
  end if;
  if new.allow_minor and not _minor_safe(new.starts_at, new.ends_at) then
    raise exception 'Ca cho người dưới 18 tuổi phải nằm trong 06:00–22:00 và dài tối đa 8 giờ.';
  end if;
  return new;
end $$;
create trigger shifts_validate before insert or update on public.shifts
  for each row execute function public._shifts_validate();

-- Mọi suất nhận ca (kể cả ghi bằng service-role) đều phải qua cửa này.
create function public._claims_validate() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s shifts; w worker_profiles; p profiles;
  v_age int; v_local_start timestamp; v_hours numeric; v_week numeric; v_cap int; v_prim int; v_back int;
begin
  if _bypass() then return new; end if;
  select * into s from shifts where id = new.shift_id for update;
  if not found then raise exception 'Không tìm thấy ca.'; end if;
  if s.status <> 'open' or s.starts_at <= now() then
    raise exception 'Ca này đã đóng, không nhận được nữa.';
  end if;
  select * into p from profiles where id = new.worker_id;
  select * into w from worker_profiles where user_id = new.worker_id;
  if p.id is null or w.user_id is null or p.role <> 'worker' then
    raise exception 'Chỉ người làm mới nhận được ca.';
  end if;
  if p.status <> 'active' then
    raise exception 'Tài khoản đang bị khóa.';
  end if;
  if w.approval <> 'approved' then
    raise exception 'Hồ sơ của bạn chưa được duyệt nên chưa nhận ca được.';
  end if;

  v_local_start := s.starts_at at time zone 'Asia/Ho_Chi_Minh';
  v_age := age_on(w.date_of_birth, v_local_start::date);
  if v_age < 15 then
    raise exception 'Chưa đủ 15 tuổi vào ngày làm.';
  end if;
  if v_age < 18 then
    if not exists (select 1 from parental_consents where worker_id = new.worker_id and status = 'approved') then
      raise exception 'Cần phụ huynh đồng ý và nhóm vận hành duyệt trước khi nhận ca.';
    end if;
    if not s.allow_minor or not _minor_safe(s.starts_at, s.ends_at) then
      raise exception 'Người dưới 18 tuổi chỉ nhận được ca kết thúc trước 22:00 và dài tối đa 8 giờ.';
    end if;
  end if;

  if exists (
    select 1 from shift_claims c join shifts x on x.id = c.shift_id
    where c.worker_id = new.worker_id and c.status = 'active' and x.status <> 'cancelled'
      and x.id <> s.id and x.starts_at < s.ends_at and x.ends_at > s.starts_at) then
    raise exception 'Bạn đã có ca khác trùng giờ.';
  end if;

  v_hours := extract(epoch from (s.ends_at - s.starts_at)) / 3600.0;
  select coalesce(sum(extract(epoch from (x.ends_at - x.starts_at)) / 3600.0), 0) into v_week
  from shift_claims c join shifts x on x.id = c.shift_id
  where c.worker_id = new.worker_id and c.status = 'active' and x.status <> 'cancelled' and x.id <> s.id
    and date_trunc('week', x.starts_at at time zone 'Asia/Ho_Chi_Minh') = date_trunc('week', v_local_start);
  v_cap := cfg_int('weekly_hours_cap', 40);
  if v_week + v_hours > v_cap then
    raise exception 'Vượt quá % giờ/tuần: tuần đó bạn đã nhận % giờ, ca này thêm % giờ.',
      v_cap, round(v_week, 1), round(v_hours, 1);
  end if;

  select count(*) filter (where role = 'primary'), count(*) filter (where role = 'backup')
    into v_prim, v_back
  from shift_claims where shift_id = s.id and status = 'active';
  if new.role = 'primary' and v_prim >= s.headcount then
    raise exception 'Ca đã đủ người chính.';
  end if;
  if new.role = 'backup' and v_back >= 1 then
    raise exception 'Ca đã có người dự phòng.';
  end if;
  return new;
end $$;
create trigger claims_validate before insert on public.shift_claims
  for each row execute function public._claims_validate();

-- Trả lời khác "Đủ" => tự tạo báo cáo cho admin.
create function public._payment_feedback_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.answer <> 'full' then
    insert into reports (kind, shift_id, reporter_id, body)
    values ('payment', new.shift_id, new.worker_id,
            case new.answer when 'partial' then 'Người làm báo: CHƯA ĐƯỢC TRẢ ĐỦ tiền ca này.'
                            else 'Người làm báo: CHƯA NHẬN ĐƯỢC tiền ca này.' end);
  end if;
  return new;
end $$;
create trigger payment_feedback_report after insert on public.payment_feedback
  for each row execute function public._payment_feedback_report();

-- ---------- NGHIỆP VỤ NỘI BỘ ----------
create function public._promote_backup(p_shift uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare s shifts; v_prim int; v_worker uuid;
begin
  select * into s from shifts where id = p_shift for update;
  select count(*) into v_prim from shift_claims where shift_id = p_shift and status = 'active' and role = 'primary';
  if v_prim >= s.headcount then return null; end if;
  update shift_claims set role = 'primary', promoted_at = now()
   where shift_id = p_shift and status = 'active' and role = 'backup'
  returning worker_id into v_worker;
  if v_worker is not null then
    insert into worker_events (worker_id, shift_id, kind) values (v_worker, p_shift, 'promoted');
  end if;
  return v_worker;
end $$;

create function public._cancel_claim_internal(p_claim uuid, p_kind public.cancel_kind) returns void
language plpgsql security definer set search_path = public as $$
declare c shift_claims;
begin
  update shift_claims set status = 'cancelled', cancelled_at = now(), cancel_kind = p_kind
   where id = p_claim and status = 'active'
  returning * into c;
  if c.id is null then return; end if;
  if p_kind in ('worker', 'late_cancel', 'admin_busy') then
    insert into worker_events (worker_id, shift_id, kind)
    values (c.worker_id, c.shift_id,
            case p_kind when 'worker' then 'cancel' when 'late_cancel' then 'late_cancel' else 'admin_busy' end::worker_event_kind);
  end if;
  if c.role = 'primary' and p_kind <> 'shift_cancelled' then
    perform _promote_backup(c.shift_id);
  end if;
end $$;

create function public._cancel_future_claims(p_worker uuid, p_kind public.cancel_kind) returns void
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select c.id, c.shift_id from shift_claims c join shifts s on s.id = c.shift_id
    where c.worker_id = p_worker and c.status = 'active' and s.status = 'open' and s.starts_at > now()
    order by c.shift_id
  loop
    perform 1 from shifts where id = r.shift_id for update;
    perform _cancel_claim_internal(r.id, p_kind);
  end loop;
end $$;

create function public._cancel_shift_internal(p_shift uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform 1 from shifts where id = p_shift for update;
  update shift_claims set status = 'cancelled', cancelled_at = now(), cancel_kind = 'shift_cancelled'
   where shift_id = p_shift and status = 'active';
  update shifts set status = 'cancelled' where id = p_shift;
end $$;

-- Link xác nhận sau ca: hết hạn = giờ kết thúc ca + 72 giờ, dù được sinh lúc nào.
create function public._ensure_token(p_shift uuid) returns text
language plpgsql security definer set search_path = public as $$
declare s shifts; v_token text;
begin
  select * into s from shifts where id = p_shift;
  if s.id is null or s.status <> 'open' or s.ends_at > now() then return null; end if;
  if not exists (select 1 from shift_claims where shift_id = p_shift and status = 'active' and role = 'primary') then
    return null;
  end if;
  insert into shift_confirmation_tokens (shift_id, expires_at)
  values (p_shift, s.ends_at + interval '72 hours')
  on conflict (shift_id) do nothing;
  select token into v_token from shift_confirmation_tokens where shift_id = p_shift;
  return v_token;
end $$;

-- Cho pg_cron (tùy chọn): sinh token cho mọi ca vừa hết giờ.
create function public.generate_due_confirmation_tokens() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select s.id from shifts s
    where s.status = 'open' and s.ends_at <= now() and s.ends_at > now() - interval '72 hours'
      and not exists (select 1 from shift_confirmation_tokens t where t.shift_id = s.id)
  loop
    if _ensure_token(r.id) is not null then n := n + 1; end if;
  end loop;
  return n;
end $$;

create function public._shift_json(s public.shifts, p_uid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', s.id, 'facility_id', s.facility_id, 'job_type', s.job_type,
    'starts_at', s.starts_at, 'ends_at', s.ends_at, 'headcount', s.headcount,
    'hourly_wage', s.hourly_wage, 'description', s.description, 'urgent', s.urgent,
    'allow_minor', s.allow_minor, 'status', s.status, 'created_at', s.created_at,
    'facility_name', f.name, 'facility_type', f.type, 'area', f.area,
    'address', f.address, 'maps_url', f.maps_url,
    'primary_count', (select count(*) from shift_claims c where c.shift_id = s.id and c.status = 'active' and c.role = 'primary'),
    'backup_count',  (select count(*) from shift_claims c where c.shift_id = s.id and c.status = 'active' and c.role = 'backup'),
    'my_role', (select c.role from shift_claims c where c.shift_id = s.id and c.status = 'active' and c.worker_id = p_uid))
  from facilities f where f.id = s.facility_id
$$;

-- =====================================================================
-- RPC: ĐĂNG KÝ / TÀI KHOẢN
-- =====================================================================
create function public.register_worker(
  p_full_name text, p_dob date, p_school text, p_class text, p_phone text,
  p_area public.area, p_availability text[], p_consent boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_minor boolean; v_token text;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập.' using errcode = '42501'; end if;
  if exists (select 1 from profiles where id = v_uid) then
    raise exception 'Tài khoản này đã đăng ký rồi.';
  end if;
  if not coalesce(p_consent, false) then
    raise exception 'Bạn cần đồng ý cho xử lý dữ liệu cá nhân để tiếp tục.';
  end if;
  if p_dob is null then raise exception 'Vui lòng nhập ngày sinh.'; end if;
  if p_dob > vn_date(now()) or age_on(p_dob, vn_date(now())) < 15 then
    raise exception 'Bạn cần đủ 15 tuổi để đăng ký.';
  end if;
  insert into profiles (id, role, full_name, consent_at) values (v_uid, 'worker', btrim(p_full_name), now());
  insert into private_contacts (user_id, phone) values (v_uid, p_phone);
  insert into worker_profiles (user_id, date_of_birth, school, class_name, area, availability)
  values (v_uid, p_dob, btrim(p_school), nullif(btrim(coalesce(p_class, '')), ''), p_area, coalesce(p_availability, '{}'));
  v_minor := age_on(p_dob, vn_date(now())) < 18;
  if v_minor then
    insert into parental_consents (worker_id) values (v_uid) returning token into v_token;
  end if;
  return jsonb_build_object('minor', v_minor, 'consent_token', v_token);
exception
  when check_violation then
    raise exception 'Thông tin chưa hợp lệ. Kiểm tra lại họ tên, trường và số điện thoại (10 số, bắt đầu bằng 0).';
end $$;

create function public.register_employer(
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
    raise exception 'Thông tin chưa hợp lệ. Kiểm tra lại tên, địa chỉ, số điện thoại (10 số) và link bản đồ (bắt đầu bằng https://).';
end $$;

create function public.update_worker_profile(
  p_school text, p_class text, p_phone text, p_area public.area, p_availability text[]
) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles;
begin
  me := _require_user();
  if me.role <> 'worker' then raise exception 'Chỉ dành cho người làm.'; end if;
  update worker_profiles
     set school = btrim(p_school), class_name = nullif(btrim(coalesce(p_class, '')), ''),
         area = p_area, availability = coalesce(p_availability, '{}')
   where user_id = me.id;
  update private_contacts set phone = p_phone where user_id = me.id;
exception
  when check_violation then
    raise exception 'Thông tin chưa hợp lệ. Kiểm tra lại trường và số điện thoại (10 số, bắt đầu bằng 0).';
end $$;

create function public.set_profile_sharing(p_enabled boolean) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles;
begin
  me := _require_user();
  update worker_profiles set share_enabled = coalesce(p_enabled, false) where user_id = me.id;
end $$;

create function public.regenerate_consent_link() returns text
language plpgsql security definer set search_path = public as $$
declare me profiles; v_token text;
begin
  me := _require_user();
  update parental_consents
     set token = _new_token(), status = 'pending', parent_name = null, parent_phone = null,
         agreed_at = null, expires_at = now() + interval '30 days'
   where worker_id = me.id and status in ('pending', 'rejected')
  returning token into v_token;
  if v_token is null then raise exception 'Phiếu đồng ý đã được gửi, không cần tạo link mới.'; end if;
  return v_token;
end $$;

-- Xóa tài khoản và toàn bộ dữ liệu (cascade từ auth.users).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); p profiles; r record;
begin
  if v_uid is null then raise exception 'Bạn cần đăng nhập.' using errcode = '42501'; end if;
  select * into p from profiles where id = v_uid;
  if p.role = 'admin' then
    raise exception 'Tài khoản vận hành không tự xóa được trong ứng dụng.';
  end if;
  if p.role = 'worker' then
    perform _cancel_future_claims(v_uid, 'account');
  elsif p.role = 'employer' then
    for r in select s.id from shifts s join facilities f on f.id = s.facility_id
             where f.owner_id = v_uid and s.status = 'open' and s.starts_at > now() loop
      perform _cancel_shift_internal(r.id);
    end loop;
  end if;
  delete from auth.users where id = v_uid;
end $$;

-- =====================================================================
-- RPC: PHỤ HUYNH ĐỒNG Ý (không cần đăng nhập)
-- =====================================================================
create function public.get_parental_consent(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c parental_consents; v_name text;
begin
  select * into c from parental_consents where token = p_token;
  if c.id is null then return jsonb_build_object('state', 'invalid'); end if;
  select full_name into v_name from profiles where id = c.worker_id;
  if c.status <> 'pending' then return jsonb_build_object('state', 'submitted', 'worker_name', v_name); end if;
  if c.expires_at < now() then return jsonb_build_object('state', 'expired'); end if;
  return jsonb_build_object('state', 'ok', 'worker_name', v_name);
end $$;

create function public.submit_parental_consent(p_token text, p_parent_name text, p_parent_phone text, p_agree boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare c parental_consents;
begin
  select * into c from parental_consents where token = p_token for update;
  if c.id is null then raise exception 'Link không hợp lệ.'; end if;
  if c.status <> 'pending' then raise exception 'Phiếu đồng ý này đã được gửi rồi.'; end if;
  if c.expires_at < now() then raise exception 'Link đã hết hạn. Nhờ con tạo link mới.'; end if;
  if not coalesce(p_agree, false) then raise exception 'Phụ huynh cần tick đồng ý.'; end if;
  if p_parent_phone is null or p_parent_phone !~ '^0[0-9]{9}$' then
    raise exception 'Số điện thoại gồm 10 số, bắt đầu bằng 0.';
  end if;
  if char_length(btrim(coalesce(p_parent_name, ''))) < 2 then raise exception 'Vui lòng nhập họ tên phụ huynh.'; end if;
  update parental_consents
     set status = 'submitted', parent_name = btrim(p_parent_name), parent_phone = p_parent_phone, agreed_at = now()
   where id = c.id;
end $$;

-- =====================================================================
-- RPC: CA LÀM
-- =====================================================================
create function public.create_shift(
  p_date date, p_start time, p_end time, p_job public.job_type, p_headcount int, p_wage int,
  p_description text, p_urgent boolean, p_allow_minor boolean, p_commit boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare me profiles; f facilities; v_start timestamptz; v_end timestamptz; v_id uuid;
begin
  me := _require_user();
  select * into f from facilities where owner_id = me.id;
  if f.id is null then raise exception 'Bạn chưa có cơ sở.'; end if;
  if not f.verified or f.status <> 'active' then
    raise exception 'Cơ sở chưa được xác minh nên chưa đăng ca được.';
  end if;
  if not coalesce(p_commit, false) then
    raise exception 'Bạn cần tick cam kết: không thu phí, không đặt cọc, không giữ giấy tờ người làm.';
  end if;
  if p_date is null or p_start is null or p_end is null or p_wage is null then
    raise exception 'Vui lòng nhập đủ ngày, giờ và lương/giờ.';
  end if;
  v_start := (p_date + p_start) at time zone 'Asia/Ho_Chi_Minh';
  v_end   := (p_date + p_end)   at time zone 'Asia/Ho_Chi_Minh';
  if p_end <= p_start then v_end := v_end + interval '1 day'; end if; -- ca qua đêm
  insert into shifts (facility_id, job_type, starts_at, ends_at, headcount, hourly_wage, description, urgent, allow_minor, commitment_ack)
  values (f.id, p_job, v_start, v_end, coalesce(p_headcount, 1), p_wage,
          nullif(btrim(coalesce(p_description, '')), ''), coalesce(p_urgent, false), coalesce(p_allow_minor, false), true)
  returning id into v_id;
  return v_id;
exception
  when check_violation then
    raise exception 'Ca phải dài từ 1 đến 12 giờ, cần 1–5 người, mô tả tối đa 500 ký tự.';
end $$;

create function public.cancel_shift(p_shift uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; s shifts; v_has boolean;
begin
  me := _require_user();
  select * into s from shifts where id = p_shift for update;
  if s.id is null or not (me.role = 'admin' or _owns_shift(p_shift)) then
    raise exception 'Không tìm thấy ca.';
  end if;
  if s.status <> 'open' then raise exception 'Ca này đã đóng.'; end if;
  if s.starts_at <= now() then raise exception 'Ca đã bắt đầu, không hủy được.'; end if;
  select exists (select 1 from shift_claims where shift_id = p_shift and status = 'active') into v_has;
  perform _cancel_shift_internal(p_shift);
  if v_has and s.starts_at - now() <= interval '2 hours' then
    insert into reports (kind, shift_id, reporter_id, subject_id, body)
    values ('late_cancel', p_shift, null, me.id, 'Ca bị HỦY SÁT GIỜ (dưới 2 tiếng) khi đã có người nhận. Cần báo cho người làm.');
  end if;
  if me.role = 'admin' then perform _audit('cancel_shift', 'shifts', p_shift); end if;
end $$;

-- Nhận ca: khóa dòng ca => hai người bấm cùng lúc được xếp hàng tuần tự.
create function public.claim_shift(p_shift uuid) returns public.claim_role
language plpgsql security definer set search_path = public as $$
declare me profiles; s shifts; v_prim int; v_back int; v_role claim_role;
begin
  me := _require_user();
  select * into s from shifts where id = p_shift for update;
  if s.id is null then raise exception 'Không tìm thấy ca.'; end if;
  if exists (select 1 from shift_claims where shift_id = p_shift and worker_id = me.id and status = 'active') then
    raise exception 'Bạn đã nhận ca này rồi.';
  end if;
  select count(*) filter (where role = 'primary'), count(*) filter (where role = 'backup')
    into v_prim, v_back
  from shift_claims where shift_id = p_shift and status = 'active';
  if v_prim < s.headcount then v_role := 'primary';
  elsif v_back < 1 then v_role := 'backup';
  else raise exception 'Ca đã đủ người. Bạn xem ca khác nhé.';
  end if;
  insert into shift_claims (shift_id, worker_id, role) values (p_shift, me.id, v_role);
  update shifts set first_claimed_at = now() where id = p_shift and first_claimed_at is null;
  return v_role;
end $$;

create function public.cancel_claim(p_shift uuid) returns text
language plpgsql security definer set search_path = public as $$
declare me profiles; s shifts; c shift_claims; v_late boolean;
begin
  me := _require_user();
  select * into s from shifts where id = p_shift for update;
  select * into c from shift_claims where shift_id = p_shift and worker_id = me.id and status = 'active';
  if s.id is null or c.id is null then raise exception 'Bạn không có suất nào ở ca này.'; end if;
  if s.status <> 'open' then raise exception 'Ca này đã đóng.'; end if;
  if s.starts_at <= now() then
    raise exception 'Ca đã bắt đầu, không hủy được. Hãy gọi ngay cho nhóm vận hành.';
  end if;
  v_late := s.starts_at - now() <= interval '2 hours';
  perform _cancel_claim_internal(c.id, case when v_late then 'late_cancel' else 'worker' end::cancel_kind);
  if v_late then
    insert into reports (kind, shift_id, reporter_id, subject_id, body)
    values ('late_cancel', p_shift, null, me.id,
            case when c.role = 'primary' then 'Người CHÍNH hủy sát giờ (dưới 2 tiếng). Cần gọi xác nhận với người dự phòng và chủ quán.'
                 else 'Người dự phòng hủy sát giờ (dưới 2 tiếng).' end);
    return 'late_cancel';
  end if;
  return 'cancelled';
end $$;

-- Chủ quán / admin đổi chỗ người dự phòng với một người chính.
create function public.swap_roles(p_shift uuid, p_primary_worker uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; s shifts; v_backup uuid; v_primary uuid;
begin
  me := _require_user();
  select * into s from shifts where id = p_shift for update;
  if s.id is null or not (me.role = 'admin' or _owns_shift(p_shift)) then
    raise exception 'Không tìm thấy ca.';
  end if;
  if s.status <> 'open' or s.starts_at <= now() then raise exception 'Ca đã bắt đầu hoặc đã đóng.'; end if;
  select id into v_backup from shift_claims where shift_id = p_shift and status = 'active' and role = 'backup';
  select id into v_primary from shift_claims
   where shift_id = p_shift and status = 'active' and role = 'primary' and worker_id = p_primary_worker;
  if v_backup is null or v_primary is null then
    raise exception 'Cần có cả người chính và người dự phòng mới đổi được.';
  end if;
  update shift_claims set role = 'primary', promoted_at = now() where id = v_backup;
  update shift_claims set role = 'backup', promoted_at = null where id = v_primary;
  if me.role = 'admin' then perform _audit('swap_roles', 'shifts', p_shift); end if;
end $$;

-- Số điện thoại: CHỈ trả về cho hai bên đã ghép ca (suất còn hiệu lực), hoặc admin.
create function public.get_shift_contacts(p_shift uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles; s shifts; v_owner boolean; v_worker boolean; v_admin boolean; v_fac jsonb; v_workers jsonb;
begin
  me := _require_user();
  select * into s from shifts where id = p_shift;
  if s.id is null then raise exception 'Không tìm thấy ca.' using errcode = '42501'; end if;
  v_admin  := me.role = 'admin';
  v_owner  := _owns_shift(p_shift);
  v_worker := exists (select 1 from shift_claims where shift_id = p_shift and worker_id = me.id and status = 'active');
  if not v_admin then
    if not (v_owner or v_worker) or s.status = 'cancelled' or s.ends_at < now() - interval '7 days' then
      raise exception 'Bạn chưa được ghép ca này nên không xem được số điện thoại.' using errcode = '42501';
    end if;
  end if;
  if v_worker or v_admin then
    select jsonb_build_object('contact_name', p.full_name, 'phone', pc.phone) into v_fac
    from facilities f join profiles p on p.id = f.owner_id join private_contacts pc on pc.user_id = p.id
    where f.id = s.facility_id;
  end if;
  if v_owner or v_admin then
    select coalesce(jsonb_agg(jsonb_build_object(
             'claim_id', c.id, 'worker_id', c.worker_id, 'name', p.full_name, 'phone', pc.phone, 'role', c.role,
             'slug', case when w.share_enabled then w.public_slug end)
             order by c.role, c.claimed_at), '[]'::jsonb) into v_workers
    from shift_claims c
    join profiles p on p.id = c.worker_id
    join worker_profiles w on w.user_id = c.worker_id
    left join private_contacts pc on pc.user_id = c.worker_id
    where c.shift_id = p_shift and c.status = 'active';
  end if;
  return jsonb_build_object('facility', v_fac, 'workers', v_workers);
end $$;

create function public.feed_shifts(p_date date default null, p_area public.area default null, p_job public.job_type default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles; v_dob date; v jsonb;
begin
  me := _require_user();
  select date_of_birth into v_dob from worker_profiles where user_id = me.id;
  select coalesce(jsonb_agg(t.j order by t.urgent desc, t.starts_at), '[]'::jsonb) into v
  from (
    select _shift_json(s, me.id) as j, s.urgent, s.starts_at
    from shifts s join facilities f on f.id = s.facility_id
    where s.status = 'open' and s.starts_at > now() and f.verified and f.status = 'active'
      and (p_date is null or vn_date(s.starts_at) = p_date)
      and (p_area is null or f.area = p_area)
      and (p_job is null or s.job_type = p_job)
      and (v_dob is null or age_on(v_dob, vn_date(s.starts_at)) >= 18
           or (s.allow_minor and _minor_safe(s.starts_at, s.ends_at)))
    order by s.urgent desc, s.starts_at
    limit 200
  ) t
  where (t.j ->> 'my_role') is not null
     or (t.j ->> 'primary_count')::int < (t.j ->> 'headcount')::int
     or (t.j ->> 'backup_count')::int < 1;
  return v;
end $$;

create function public.shift_detail(p_shift uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me profiles; s shifts; v_owner boolean; v_admin boolean; j jsonb; c shift_claims;
begin
  me := _require_user();
  select * into s from shifts where id = p_shift;
  if s.id is null then raise exception 'Không tìm thấy ca.'; end if;
  v_admin := me.role = 'admin';
  v_owner := _owns_shift(p_shift);
  if not (v_admin or v_owner or _has_claim(p_shift)
          or _shift_open_for_me(s.facility_id, s.status, s.starts_at, s.ends_at, s.allow_minor)) then
    raise exception 'Không tìm thấy ca.';
  end if;
  j := _shift_json(s, me.id) || jsonb_build_object('is_owner', v_owner);
  select * into c from shift_claims where shift_id = p_shift and worker_id = me.id order by claimed_at desc limit 1;
  if c.id is not null then
    j := j || jsonb_build_object(
      'my_claim', jsonb_build_object('status', c.status, 'role', c.role, 'cancel_kind', c.cancel_kind),
      'my_result', (select jsonb_build_object('attended', r.attended, 'on_time', r.on_time, 'rating', r.rating,
                                              'comment', case when r.comment_hidden then null else r.comment end)
                    from shift_results r where r.shift_id = p_shift and r.worker_id = me.id),
      'my_payment', (select answer from payment_feedback where shift_id = p_shift and worker_id = me.id));
  end if;
  if v_owner or v_admin then
    j := j || jsonb_build_object(
      'confirm_token', _ensure_token(p_shift),
      'confirm_expires_at', (select expires_at from shift_confirmation_tokens where shift_id = p_shift),
      'results', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', r.id, 'name', p.full_name, 'attended', r.attended, 'on_time', r.on_time,
                    'rating', r.rating, 'comment', r.comment, 'comment_hidden', r.comment_hidden)), '[]'::jsonb)
                  from shift_results r join profiles p on p.id = r.worker_id where r.shift_id = p_shift));
  end if;
  return j;
end $$;

create function public.my_shifts() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles; v jsonb;
begin
  me := _require_user();
  select coalesce(jsonb_agg(t.j order by t.starts_at desc), '[]'::jsonb) into v
  from (
    select distinct on (c.shift_id)
      _shift_json(s, me.id) || jsonb_build_object(
        'claim_status', c.status, 'claim_role', c.role, 'cancel_kind', c.cancel_kind,
        'attended', (select r.attended from shift_results r where r.shift_id = s.id and r.worker_id = me.id),
        'my_payment', (select answer from payment_feedback where shift_id = s.id and worker_id = me.id)) as j,
      s.starts_at
    from shift_claims c join shifts s on s.id = c.shift_id
    where c.worker_id = me.id
    order by c.shift_id, c.claimed_at desc
  ) t;
  return v;
end $$;

create function public.employer_shifts() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles; v jsonb;
begin
  me := _require_user();
  select coalesce(jsonb_agg(_shift_json(s, me.id) order by s.starts_at desc), '[]'::jsonb) into v
  from shifts s join facilities f on f.id = s.facility_id
  where f.owner_id = me.id;
  return v;
end $$;

-- =====================================================================
-- RPC: XÁC NHẬN SAU CA (không cần đăng nhập, token dùng một lần)
-- =====================================================================
create function public.get_confirmation(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t shift_confirmation_tokens; s shifts; v_fac text;
begin
  select * into t from shift_confirmation_tokens where token = p_token;
  if t.shift_id is null then return jsonb_build_object('state', 'invalid'); end if;
  if t.used_at is not null then return jsonb_build_object('state', 'used'); end if;
  if t.expires_at < now() then return jsonb_build_object('state', 'expired'); end if;
  select * into s from shifts where id = t.shift_id;
  if s.status <> 'open' then return jsonb_build_object('state', 'invalid'); end if;
  select name into v_fac from facilities where id = s.facility_id;
  return jsonb_build_object(
    'state', 'ok', 'facility_name', v_fac, 'job_type', s.job_type,
    'starts_at', s.starts_at, 'ends_at', s.ends_at, 'expires_at', t.expires_at,
    'workers', (select coalesce(jsonb_agg(jsonb_build_object('claim_id', c.id, 'name', p.full_name) order by c.claimed_at), '[]'::jsonb)
                from shift_claims c join profiles p on p.id = c.worker_id
                where c.shift_id = s.id and c.status = 'active' and c.role = 'primary'));
end $$;

-- p_results: [{ "claim_id": uuid, "attended": bool, "on_time": bool, "rating": 1-5, "comment": text }]
create function public.submit_confirmation(p_token text, p_results jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare t shift_confirmation_tokens; s shifts; c shift_claims; r jsonb;
        v_att boolean; v_on boolean; v_rating int; v_comment text;
begin
  select * into t from shift_confirmation_tokens where token = p_token for update;
  if t.shift_id is null then raise exception 'Link không hợp lệ.'; end if;
  if t.used_at is not null then raise exception 'Link này đã được dùng rồi.'; end if;
  if t.expires_at < now() then raise exception 'Link đã hết hạn (quá 72 giờ sau ca).'; end if;
  select * into s from shifts where id = t.shift_id for update;
  if s.status <> 'open' then raise exception 'Ca này không còn chờ xác nhận.'; end if;
  if jsonb_typeof(p_results) is distinct from 'array' then raise exception 'Dữ liệu không hợp lệ.'; end if;

  for c in select * from shift_claims where shift_id = s.id and status = 'active' and role = 'primary' loop
    select e into r from jsonb_array_elements(p_results) e where e ->> 'claim_id' = c.id::text limit 1;
    if r is null or (r ->> 'attended') is null then
      raise exception 'Vui lòng chọn Đã làm / Không đến cho từng người.';
    end if;
    v_att := (r ->> 'attended')::boolean;
    v_comment := nullif(btrim(left(coalesce(r ->> 'comment', ''), 500)), '');
    if v_att then
      if (r ->> 'on_time') is null or (r ->> 'rating') is null then
        raise exception 'Vui lòng chọn Đúng giờ / Trễ và số sao.';
      end if;
      v_on := (r ->> 'on_time')::boolean;
      v_rating := (r ->> 'rating')::int;
      if v_rating not between 1 and 5 then raise exception 'Số sao từ 1 đến 5.'; end if;
    else
      v_on := null; v_rating := null;
      insert into worker_events (worker_id, shift_id, kind) values (c.worker_id, s.id, 'no_show');
      insert into reports (kind, shift_id, subject_id, body)
      values ('no_show', s.id, c.worker_id, 'Chủ quán xác nhận: người làm KHÔNG ĐẾN ca.');
    end if;
    insert into shift_results (shift_id, worker_id, attended, on_time, rating, comment)
    values (s.id, c.worker_id, v_att, v_on, v_rating, v_comment);
  end loop;

  update shift_confirmation_tokens set used_at = now() where shift_id = s.id;
  update shifts set status = 'completed' where id = s.id;
end $$;

create function public.submit_payment_feedback(p_shift uuid, p_answer public.payment_answer) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; s shifts;
begin
  me := _require_user();
  select * into s from shifts where id = p_shift;
  if s.id is null or s.status = 'cancelled' or s.ends_at > now()
     or not exists (select 1 from shift_claims where shift_id = p_shift and worker_id = me.id
                    and status = 'active' and role = 'primary') then
    raise exception 'Chỉ người làm chính của ca đã kết thúc mới trả lời được.';
  end if;
  if exists (select 1 from shift_results where shift_id = p_shift and worker_id = me.id and not attended) then
    raise exception 'Ca này được ghi nhận là bạn không đến. Nếu sai, hãy gửi báo cáo.';
  end if;
  if exists (select 1 from payment_feedback where shift_id = p_shift and worker_id = me.id) then
    raise exception 'Bạn đã trả lời rồi.';
  end if;
  insert into payment_feedback (shift_id, worker_id, answer) values (p_shift, me.id, p_answer);
end $$;

create function public.create_report(p_shift uuid, p_body text) returns uuid
language plpgsql security definer set search_path = public as $$
declare me profiles; v_id uuid;
begin
  me := _require_user();
  if char_length(btrim(coalesce(p_body, ''))) < 5 then raise exception 'Vui lòng mô tả rõ hơn (ít nhất 5 ký tự).'; end if;
  if (select count(*) from reports where reporter_id = me.id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Bạn đã gửi quá nhiều báo cáo hôm nay.';
  end if;
  insert into reports (kind, shift_id, reporter_id, body)
  values ('user_report', p_shift, me.id, left(btrim(p_body), 1000)) returning id into v_id;
  return v_id;
end $$;

-- Hồ sơ ca làm công khai: không bao giờ có số điện thoại, ngày sinh, trường lớp.
create function public.get_public_profile(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare w worker_profiles; v_name text; j jsonb;
begin
  select * into w from worker_profiles where public_slug = p_slug;
  if w.user_id is null then return null; end if;
  if not w.share_enabled and w.user_id is distinct from auth.uid() and not is_admin() then return null; end if;
  select full_name into v_name from profiles where id = w.user_id;
  select jsonb_build_object(
    'name', v_name,
    'share_enabled', w.share_enabled,
    'confirmed_shifts', count(*) filter (where r.attended),
    'total_hours', coalesce(round((sum(extract(epoch from (s.ends_at - s.starts_at))) filter (where r.attended) / 3600.0)::numeric, 1), 0),
    'avg_rating', round(avg(r.rating) filter (where r.attended), 1),
    'on_time_rate', round(100.0 * count(*) filter (where r.attended and r.on_time) / nullif(count(*) filter (where r.attended), 0)),
    'job_types', coalesce(jsonb_agg(distinct s.job_type) filter (where r.attended), '[]'::jsonb),
    'reviews', coalesce(jsonb_agg(jsonb_build_object(
                 'date', vn_date(s.starts_at), 'facility_name', f.name, 'job_type', s.job_type,
                 'rating', r.rating, 'on_time', r.on_time,
                 'comment', case when r.comment_hidden then null else r.comment end)
                 order by s.starts_at desc) filter (where r.attended), '[]'::jsonb))
  into j
  from shift_results r
  join shifts s on s.id = r.shift_id
  join facilities f on f.id = s.facility_id
  where r.worker_id = w.user_id;
  return j;
end $$;

-- =====================================================================
-- RPC: ADMIN (mọi thao tác ghi đều vào audit log)
-- =====================================================================
create function public.admin_verify_facility(
  p_facility uuid, p_address_ok boolean, p_contact_ok boolean, p_has_license boolean,
  p_verified_on date, p_verifier_name text, p_note text
) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles;
begin
  me := _require_admin();
  if not coalesce(p_address_ok, false) or not coalesce(p_contact_ok, false) then
    raise exception 'Phải xác minh đúng địa chỉ và đúng người liên hệ mới duyệt được.';
  end if;
  if p_verified_on is null or p_verified_on > vn_date(now()) then
    raise exception 'Ngày xác minh không hợp lệ.';
  end if;
  if char_length(btrim(coalesce(p_verifier_name, ''))) < 2 then raise exception 'Nhập tên người đi xác minh.'; end if;
  if not exists (select 1 from facilities where id = p_facility) then raise exception 'Không tìm thấy cơ sở.'; end if;
  insert into facility_verifications (facility_id, address_ok, contact_ok, has_business_license, verified_on, verified_by, verifier_name, note)
  values (p_facility, true, true, coalesce(p_has_license, false), p_verified_on, me.id, btrim(p_verifier_name), nullif(btrim(coalesce(p_note, '')), ''));
  update facilities set verified = true, status = 'active' where id = p_facility;
  perform _audit('verify_facility', 'facilities', p_facility,
                 jsonb_build_object('has_business_license', coalesce(p_has_license, false), 'verified_on', p_verified_on));
end $$;

-- Gỡ cơ sở (removed) hoặc đưa về chờ duyệt (pending). Cả hai đều tắt cờ verified.
create function public.admin_set_facility_status(p_facility uuid, p_status public.facility_status, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; r record;
begin
  me := _require_admin();
  if p_status = 'active' then raise exception 'Muốn kích hoạt lại, hãy làm phiếu xác minh.'; end if;
  update facilities set verified = false, status = p_status where id = p_facility;
  if not found then raise exception 'Không tìm thấy cơ sở.'; end if;
  for r in select id from shifts where facility_id = p_facility and status = 'open' and starts_at > now() loop
    perform _cancel_shift_internal(r.id);
  end loop;
  perform _audit('set_facility_status', 'facilities', p_facility, jsonb_build_object('status', p_status, 'reason', p_reason));
end $$;

create function public.admin_review_worker(p_worker uuid, p_approve boolean, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; w worker_profiles; c parental_consents;
begin
  me := _require_admin();
  select * into w from worker_profiles where user_id = p_worker for update;
  if w.user_id is null then raise exception 'Không tìm thấy người làm.'; end if;
  select * into c from parental_consents where worker_id = p_worker;
  if p_approve then
    if age_on(w.date_of_birth, vn_date(now())) < 18 then
      if c.id is null or c.status not in ('submitted', 'approved') then
        raise exception 'Người dưới 18 tuổi: phụ huynh chưa gửi phiếu đồng ý nên chưa duyệt được.';
      end if;
      update parental_consents set status = 'approved', reviewed_by = me.id, reviewed_at = now() where id = c.id;
    end if;
    update worker_profiles set approval = 'approved', approved_at = now(), approved_by = me.id, review_note = p_note
     where user_id = p_worker;
  else
    update worker_profiles set approval = 'rejected', approved_at = null, approved_by = me.id, review_note = p_note
     where user_id = p_worker;
    if c.id is not null and c.status in ('submitted', 'approved') then
      update parental_consents set status = 'rejected', reviewed_by = me.id, reviewed_at = now() where id = c.id;
    end if;
    perform _cancel_future_claims(p_worker, 'account');
  end if;
  perform _audit(case when p_approve then 'approve_worker' else 'reject_worker' end, 'worker_profiles', p_worker,
                 jsonb_build_object('note', p_note));
end $$;

create function public.admin_set_account_status(p_user uuid, p_status public.account_status, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; p profiles;
begin
  me := _require_admin();
  select * into p from profiles where id = p_user for update;
  if p.id is null then raise exception 'Không tìm thấy tài khoản.'; end if;
  if p.role = 'admin' then raise exception 'Không khóa được tài khoản vận hành tại đây.'; end if;
  update profiles set status = p_status where id = p_user;
  if p_status = 'locked' and p.role = 'worker' then
    perform _cancel_future_claims(p_user, 'account');
  end if;
  perform _audit(case when p_status = 'locked' then 'lock_account' else 'unlock_account' end, 'profiles', p_user,
                 jsonb_build_object('reason', p_reason));
end $$;

-- "Người chính báo bận": hủy suất người chính, đưa người dự phòng lên, ghi sự cố.
create function public.admin_primary_busy(p_shift uuid, p_worker uuid, p_note text) returns boolean
language plpgsql security definer set search_path = public as $$
declare me profiles; s shifts; c shift_claims; v_had_backup boolean;
begin
  me := _require_admin();
  select * into s from shifts where id = p_shift for update;
  if s.id is null or s.status <> 'open' or s.ends_at <= now() then raise exception 'Ca không còn hiệu lực.'; end if;
  select * into c from shift_claims
   where shift_id = p_shift and worker_id = p_worker and status = 'active' and role = 'primary';
  if c.id is null then raise exception 'Người này không phải người chính của ca.'; end if;
  select exists (select 1 from shift_claims where shift_id = p_shift and status = 'active' and role = 'backup') into v_had_backup;
  perform _cancel_claim_internal(c.id, 'admin_busy');
  insert into reports (kind, status, shift_id, reporter_id, subject_id, body)
  values ('primary_busy', case when v_had_backup then 'resolved' else 'open' end::report_status, p_shift, me.id, p_worker,
          'Sự cố: người chính báo bận. ' ||
          case when v_had_backup then 'Đã chuyển người dự phòng lên.' else 'KHÔNG có người dự phòng — cần tìm người thay.' end ||
          coalesce(' Ghi chú: ' || nullif(btrim(p_note), ''), ''));
  perform _audit('primary_busy', 'shifts', p_shift, jsonb_build_object('had_backup', v_had_backup, 'note', p_note));
  return v_had_backup;
end $$;

create function public.admin_resolve_report(p_report uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles;
begin
  me := _require_admin();
  update reports set status = 'resolved', admin_note = nullif(btrim(coalesce(p_note, '')), ''),
                     resolved_by = me.id, resolved_at = now()
   where id = p_report;
  if not found then raise exception 'Không tìm thấy báo cáo.'; end if;
  perform _audit('resolve_report', 'reports', p_report, jsonb_build_object('note', p_note));
end $$;

create function public.admin_hide_comment(p_result uuid, p_hidden boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  update shift_results set comment_hidden = coalesce(p_hidden, true) where id = p_result;
  if not found then raise exception 'Không tìm thấy nhận xét.'; end if;
  perform _audit('hide_comment', 'shift_results', p_result, jsonb_build_object('hidden', p_hidden));
end $$;

create function public.admin_set_config(p_key text, p_value int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  if p_key not in ('min_hourly_wage', 'weekly_hours_cap') or p_value is null or p_value <= 0 then
    raise exception 'Tham số không hợp lệ.';
  end if;
  update app_config set value = to_jsonb(p_value) where key = p_key;
  perform _audit('set_config', 'app_config', null, jsonb_build_object('key', p_key, 'value', p_value));
end $$;

create function public.admin_dispatch_board() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me profiles; v_upcoming jsonb; v_pending jsonb; r record;
begin
  me := _require_admin();
  select coalesce(jsonb_agg(
    _shift_json(s, me.id) || jsonb_build_object(
      'owner_name', op.full_name, 'owner_phone', opc.phone,
      'claims', (select coalesce(jsonb_agg(jsonb_build_object(
                   'worker_id', c.worker_id, 'name', p.full_name, 'phone', pc.phone, 'role', c.role,
                   'minor', age_on(w.date_of_birth, vn_date(s.starts_at)) < 18)
                   order by c.role, c.claimed_at), '[]'::jsonb)
                 from shift_claims c
                 join profiles p on p.id = c.worker_id
                 join worker_profiles w on w.user_id = c.worker_id
                 left join private_contacts pc on pc.user_id = c.worker_id
                 where c.shift_id = s.id and c.status = 'active'))
    order by s.starts_at), '[]'::jsonb) into v_upcoming
  from shifts s
  join facilities f on f.id = s.facility_id
  join profiles op on op.id = f.owner_id
  left join private_contacts opc on opc.user_id = op.id
  where s.status = 'open' and s.ends_at > now() and s.starts_at < now() + interval '24 hours';

  for r in select id from shifts where status = 'open' and ends_at <= now() and ends_at > now() - interval '14 days' loop
    perform _ensure_token(r.id);
  end loop;
  select coalesce(jsonb_agg(
    _shift_json(s, me.id) || jsonb_build_object(
      'owner_name', op.full_name, 'owner_phone', opc.phone,
      'confirm_token', t.token, 'confirm_expires_at', t.expires_at, 'expired', t.expires_at < now())
    order by s.ends_at desc), '[]'::jsonb) into v_pending
  from shifts s
  join shift_confirmation_tokens t on t.shift_id = s.id and t.used_at is null
  join facilities f on f.id = s.facility_id
  join profiles op on op.id = f.owner_id
  left join private_contacts opc on opc.user_id = op.id
  where s.status = 'open' and s.ends_at <= now();

  return jsonb_build_object('upcoming', v_upcoming, 'pending', v_pending);
end $$;

create function public.admin_list_workers() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform _require_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', p.id, 'full_name', p.full_name, 'status', p.status, 'phone', pc.phone,
    'date_of_birth', w.date_of_birth, 'age', age_on(w.date_of_birth, vn_date(now())),
    'school', w.school, 'class_name', w.class_name, 'area', w.area, 'availability', w.availability,
    'approval', w.approval, 'review_note', w.review_note, 'created_at', w.created_at,
    'consent', (select jsonb_build_object('status', c.status, 'parent_name', c.parent_name,
                                          'parent_phone', c.parent_phone, 'agreed_at', c.agreed_at)
                from parental_consents c where c.worker_id = p.id),
    'late_cancels', (select count(*) from worker_events e where e.worker_id = p.id and e.kind = 'late_cancel'),
    'no_shows', (select count(*) from worker_events e where e.worker_id = p.id and e.kind = 'no_show'),
    'confirmed', (select count(*) from shift_results r where r.worker_id = p.id and r.attended))
    order by (w.approval = 'pending') desc, w.created_at desc), '[]'::jsonb) into v
  from worker_profiles w
  join profiles p on p.id = w.user_id
  left join private_contacts pc on pc.user_id = p.id;
  return v;
end $$;

create function public.admin_list_facilities() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform _require_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id, 'name', f.name, 'type', f.type, 'address', f.address, 'area', f.area, 'maps_url', f.maps_url,
    'verified', f.verified, 'status', f.status, 'created_at', f.created_at,
    'owner_id', p.id, 'owner_name', p.full_name, 'owner_phone', pc.phone, 'owner_status', p.status,
    'verification', (select to_jsonb(x) from (
        select v.address_ok, v.contact_ok, v.has_business_license, v.verified_on, v.verifier_name, v.note
        from facility_verifications v where v.facility_id = f.id order by v.created_at desc limit 1) x))
    order by (f.status = 'pending') desc, f.created_at desc), '[]'::jsonb) into v
  from facilities f
  join profiles p on p.id = f.owner_id
  left join private_contacts pc on pc.user_id = p.id;
  return v;
end $$;

create function public.admin_list_reports() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform _require_admin();
  select coalesce(jsonb_agg(t.j order by t.is_open desc, t.created_at desc), '[]'::jsonb) into v
  from (
    select jsonb_build_object(
      'id', r.id, 'kind', r.kind, 'status', r.status, 'body', r.body, 'admin_note', r.admin_note,
      'created_at', r.created_at, 'shift_id', r.shift_id,
      'facility_name', f.name, 'starts_at', s.starts_at,
      'reporter_name', rp.full_name, 'reporter_phone', rpc.phone,
      'subject_name', sp.full_name, 'subject_phone', spc.phone) as j,
      r.status = 'open' as is_open, r.created_at
    from reports r
    left join shifts s on s.id = r.shift_id
    left join facilities f on f.id = s.facility_id
    left join profiles rp on rp.id = r.reporter_id
    left join private_contacts rpc on rpc.user_id = r.reporter_id
    left join profiles sp on sp.id = r.subject_id
    left join private_contacts spc on spc.user_id = r.subject_id
    order by (r.status = 'open') desc, r.created_at desc  -- báo cáo đang mở không bao giờ bị cắt mất
    limit 300
  ) t;
  return v;
end $$;

create function public.admin_audit(p_limit int default 200) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform _require_admin();
  select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc), '[]'::jsonb) into v
  from (
    select a.id, a.action, a.target_table, a.target_id, a.detail, a.created_at, p.full_name as admin_name
    from admin_audit_log a left join profiles p on p.id = a.admin_id
    order by a.created_at desc
    limit least(greatest(coalesce(p_limit, 200), 1), 1000)
  ) t;
  return v;
end $$;

create function public.admin_kpis() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform _require_admin();
  with sh as (
    select s.*,
      (select count(*) from shift_claims c where c.shift_id = s.id and c.status = 'active' and c.role = 'primary') as prim
    from shifts s
  ), res as (
    select * from shift_results
  )
  select jsonb_build_object(
    'verified_facilities', (select count(*) from facilities where verified and status = 'active'),
    'approved_workers',    (select count(*) from worker_profiles where approval = 'approved'),
    'shifts_posted',       (select count(*) from sh),
    'shifts_cancelled',    (select count(*) from sh where status = 'cancelled'),
    'shifts_filled',       (select count(*) from sh where status <> 'cancelled' and prim >= headcount),
    'fill_rate_pct',       (select round(100.0 * count(*) filter (where prim >= headcount) / nullif(count(*), 0), 1)
                            from sh where status <> 'cancelled'),
    'backup_promotions',   (select count(*) from worker_events where kind = 'promoted'),
    'no_show_shifts',      (select count(*) from sh where status = 'completed'
                              and not exists (select 1 from res r where r.shift_id = sh.id and r.attended)),
    'median_minutes_to_first_claim',
                           (select round((percentile_cont(0.5) within group (
                                     order by extract(epoch from (first_claimed_at - created_at)) / 60.0))::numeric, 1)
                            from sh where first_claimed_at is not null),
    'on_time_rate_pct',    (select round(100.0 * count(*) filter (where on_time) / nullif(count(*), 0), 1) from res where attended),
    'avg_rating',          (select round(avg(rating), 2) from res where attended),
    'paid_full_rate_pct',  (select round(100.0 * count(*) filter (where answer = 'full') / nullif(count(*), 0), 1) from payment_feedback)
  ) into v;
  return v;
end $$;

-- Chạy trong SQL editor để cấp quyền admin cho một email đã đăng nhập ít nhất một lần.
create function public.make_admin(p_email text, p_full_name text default 'Nhóm vận hành') returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(p_email);
  if v_id is null then raise exception 'Chưa có tài khoản %: hãy đăng nhập một lần trước.', p_email; end if;
  insert into profiles (id, role, full_name, consent_at) values (v_id, 'admin', p_full_name, now())
  on conflict (id) do update set role = 'admin', status = 'active';
end $$;

-- =====================================================================
-- RLS: bật cho MỌI bảng. Chỉ có policy SELECT; không có policy ghi nào.
-- =====================================================================
alter table public.app_config                enable row level security;
alter table public.profiles                  enable row level security;
alter table public.private_contacts          enable row level security;
alter table public.worker_profiles           enable row level security;
alter table public.parental_consents         enable row level security;
alter table public.facilities                enable row level security;
alter table public.facility_verifications    enable row level security;
alter table public.shifts                    enable row level security;
alter table public.shift_claims              enable row level security;
alter table public.shift_confirmation_tokens enable row level security;
alter table public.shift_results             enable row level security;
alter table public.payment_feedback          enable row level security;
alter table public.reports                   enable row level security;
alter table public.worker_events             enable row level security;
alter table public.admin_audit_log           enable row level security;

-- app_config: ai cũng đọc được (hiển thị mức lương tối thiểu); chỉ admin_set_config() ghi.
create policy app_config_read on public.app_config for select to anon, authenticated using (true);

-- profiles: worker/employer chỉ đọc dòng của mình; admin đọc tất cả.
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- private_contacts (SĐT): chỉ chính chủ và admin. Bên còn lại phải qua get_shift_contacts().
create policy private_contacts_read on public.private_contacts for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- worker_profiles (ngày sinh, trường lớp): chính chủ và admin. Chủ quán KHÔNG đọc được.
create policy worker_profiles_read on public.worker_profiles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- parental_consents: người làm đọc phiếu của mình (để lấy link); admin đọc tất cả.
create policy parental_consents_read on public.parental_consents for select to authenticated
  using (worker_id = auth.uid() or public.is_admin());

-- facilities: chủ quán đọc cơ sở của mình; admin đọc tất cả; người đăng nhập khác chỉ thấy cơ sở đã xác minh.
create policy facilities_read on public.facilities for select to authenticated
  using (owner_id = auth.uid() or public.is_admin() or (verified and status = 'active'));

-- facility_verifications: chỉ admin.
create policy facility_verifications_read on public.facility_verifications for select to authenticated
  using (public.is_admin());

-- shifts: admin; chủ quán của ca; người làm đã từng nhận ca; người làm khác chỉ thấy ca mở hợp lệ với tuổi.
create policy shifts_read on public.shifts for select to authenticated
  using (public.is_admin()
      or public._owns_facility(facility_id)
      or public._has_claim(id)
      or public._shift_open_for_me(facility_id, status, starts_at, ends_at, allow_minor));

-- shift_claims: người làm đọc suất của mình; chủ quán đọc suất trên ca của mình; admin.
create policy shift_claims_read on public.shift_claims for select to authenticated
  using (worker_id = auth.uid() or public.is_admin() or public._owns_shift(shift_id));

-- shift_confirmation_tokens: KHÔNG có policy => không ai đọc trực tiếp được (kể cả admin); chỉ qua RPC.

-- shift_results: người làm đọc kết quả của mình; chủ quán đọc kết quả ca của mình; admin.
create policy shift_results_read on public.shift_results for select to authenticated
  using (worker_id = auth.uid() or public.is_admin() or public._owns_shift(shift_id));

-- payment_feedback: chỉ người làm đó và admin (chủ quán không thấy).
create policy payment_feedback_read on public.payment_feedback for select to authenticated
  using (worker_id = auth.uid() or public.is_admin());

-- reports: người gửi đọc báo cáo của mình; admin đọc tất cả.
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- worker_events (lịch sử hủy trễ, không đến...): chính chủ và admin.
create policy worker_events_read on public.worker_events for select to authenticated
  using (worker_id = auth.uid() or public.is_admin());

-- admin_audit_log: chỉ admin.
create policy admin_audit_log_read on public.admin_audit_log for select to authenticated
  using (public.is_admin());

-- =====================================================================
-- QUYỀN: thu hồi hết rồi cấp lại đúng những gì cần.
-- =====================================================================
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.app_config to anon, authenticated;
grant select on public.profiles, public.private_contacts, public.worker_profiles, public.parental_consents,
                public.facilities, public.facility_verifications, public.shifts, public.shift_claims,
                public.shift_results, public.payment_feedback, public.reports, public.worker_events,
                public.admin_audit_log
  to authenticated;

-- Hàm dùng trong biểu thức RLS
grant execute on function public.is_admin(), public._owns_facility(uuid), public._owns_shift(uuid), public._has_claim(uuid),
  public._shift_open_for_me(uuid, public.shift_status, timestamptz, timestamptz, boolean)
  to authenticated;

-- RPC không cần đăng nhập (bảo vệ bằng token / slug ngẫu nhiên)
grant execute on function
  public.get_parental_consent(text),
  public.submit_parental_consent(text, text, text, boolean),
  public.get_confirmation(text),
  public.submit_confirmation(text, jsonb),
  public.get_public_profile(text)
  to anon, authenticated;

-- RPC cần đăng nhập (mỗi hàm tự kiểm tra vai trò)
grant execute on function
  public.register_worker(text, date, text, text, text, public.area, text[], boolean),
  public.register_employer(text, text, text, public.facility_type, text, public.area, text, boolean, boolean),
  public.update_worker_profile(text, text, text, public.area, text[]),
  public.set_profile_sharing(boolean),
  public.regenerate_consent_link(),
  public.delete_my_account(),
  public.create_shift(date, time, time, public.job_type, int, int, text, boolean, boolean, boolean),
  public.cancel_shift(uuid),
  public.claim_shift(uuid),
  public.cancel_claim(uuid),
  public.swap_roles(uuid, uuid),
  public.get_shift_contacts(uuid),
  public.feed_shifts(date, public.area, public.job_type),
  public.shift_detail(uuid),
  public.my_shifts(),
  public.employer_shifts(),
  public.submit_payment_feedback(uuid, public.payment_answer),
  public.create_report(uuid, text),
  public.admin_verify_facility(uuid, boolean, boolean, boolean, date, text, text),
  public.admin_set_facility_status(uuid, public.facility_status, text),
  public.admin_review_worker(uuid, boolean, text),
  public.admin_set_account_status(uuid, public.account_status, text),
  public.admin_primary_busy(uuid, uuid, text),
  public.admin_resolve_report(uuid, text),
  public.admin_hide_comment(uuid, boolean),
  public.admin_set_config(text, int),
  public.admin_dispatch_board(),
  public.admin_list_workers(),
  public.admin_list_facilities(),
  public.admin_list_reports(),
  public.admin_audit(int),
  public.admin_kpis()
  to authenticated;

-- make_admin, generate_due_confirmation_tokens và mọi hàm "_" KHÔNG cấp cho client.
grant execute on function public.generate_due_confirmation_tokens() to service_role;
