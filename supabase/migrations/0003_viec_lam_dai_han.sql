-- =====================================================================
-- SafeShift — 0003: tuyển dụng lâu dài (tin tuyển dụng + đơn ứng tuyển).
-- Theo chỉ thị của chủ dự án ngày 19/11/2026. Chạy sau 0001 và 0002, trước seed.sql (seed mới có tin và đơn mẫu).
-- Không xóa gì, không sửa 0001/0002. Chạy xong dán supabase/tests/privileges_check.sql, rồi chạy lại seed.sql.
-- Nguyên tắc như 0001: client không ghi trực tiếp bảng nào; quy tắc cốt lõi ở trigger/constraint.
-- Số điện thoại: chỉ lộ qua get_job_contacts() (ngoại lệ mới, xem AGENTS.md mục 13).
-- =====================================================================

-- ---------- ENUM ----------
create type public.employment_type    as enum ('full_time', 'part_time');
create type public.wage_type          as enum ('monthly', 'hourly');
create type public.job_post_status    as enum ('open', 'closed');
create type public.application_status as enum ('applied', 'shortlisted', 'rejected', 'hired', 'withdrawn');

-- Lương tháng tối thiểu (khóa mới trong app_config; admin_set_config đổi được ở phần dưới).
insert into public.app_config (key, value) values ('min_monthly_wage', '5310000') on conflict (key) do nothing;

-- ---------- BẢNG ----------
-- Xóa cơ sở (hoặc tài khoản chủ quán) thì tin và đơn của tin đó xóa theo (cascade).
create table public.job_posts (
  id             uuid primary key default gen_random_uuid(),
  facility_id    uuid not null references public.facilities (id) on delete cascade,
  title          text not null,
  job_type       public.job_type not null,
  employment     public.employment_type not null,
  wage_type      public.wage_type not null,
  wage_min       int not null,
  wage_max       int,
  hours_per_week int not null,
  schedule_note  text,
  description    text,
  openings       int not null default 1,
  status         public.job_post_status not null default 'open',
  expires_at     timestamptz not null,
  commitment_ack boolean not null,
  created_at     timestamptz not null default now(),
  closed_at      timestamptz,
  constraint job_posts_title      check (char_length(btrim(title)) between 1 and 120),
  constraint job_posts_wage       check (wage_min > 0 and (wage_max is null or wage_max >= wage_min)),
  constraint job_posts_wage_cap   check (coalesce(wage_max, wage_min) <= case wage_type when 'hourly' then 1000000 else 500000000 end),
  constraint job_posts_hours      check (hours_per_week between 1 and 48),
  constraint job_posts_schedule   check (schedule_note is null or char_length(schedule_note) <= 500),
  constraint job_posts_desc       check (description is null or char_length(description) <= 2000),
  constraint job_posts_openings   check (openings between 1 and 10),
  constraint job_posts_expires    check (expires_at > created_at and expires_at <= created_at + interval '30 days'),
  constraint job_posts_commitment check (commitment_ack),
  constraint job_posts_closed     check ((status = 'open') = (closed_at is null))
);
create index on public.job_posts (facility_id, created_at desc);
create index on public.job_posts (created_at desc) where status = 'open';

-- Xóa tài khoản người làm thì đơn của họ xóa theo (cascade, giống shift_claims).
create table public.job_applications (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid not null references public.job_posts (id) on delete cascade,
  worker_id         uuid not null references public.worker_profiles (user_id) on delete cascade,
  note              text check (note is null or char_length(note) <= 500),
  status            public.application_status not null default 'applied',
  created_at        timestamptz not null default now(),
  status_changed_at timestamptz not null default now()
);
-- Mỗi người làm chỉ một đơn còn hiệu lực trên một tin (rút đơn hoặc bị loại thì nộp lại được).
create unique index job_applications_one_active on public.job_applications (job_id, worker_id)
  where status in ('applied', 'shortlisted', 'hired');
create index on public.job_applications (worker_id, created_at desc);
create index on public.job_applications (job_id, status);

-- ---------- HÀM NỘI BỘ ----------
-- Thống kê hồ sơ ca làm của một người (cùng nội dung hồ sơ công khai: không SĐT, ngày sinh, trường, lớp).
-- Dùng chung cho get_public_profile (có công tắc chia sẻ) và job_applicants (chủ quán xem người ứng tuyển).
create function public._worker_stats_json(p_worker uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', (select full_name from profiles where id = p_worker),
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
  from shift_results r
  join shifts s on s.id = r.shift_id
  join facilities f on f.id = s.facility_id
  where r.worker_id = p_worker
$$;

-- get_public_profile giữ nguyên hành vi, chỉ gọi hàm dùng chung (chữ ký không đổi nên giữ nguyên quyền cũ).
create or replace function public.get_public_profile(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare w worker_profiles;
begin
  select * into w from worker_profiles where public_slug = p_slug;
  if w.user_id is null then return null; end if;
  if not w.share_enabled and w.user_id is distinct from auth.uid() and not is_admin() then return null; end if;
  return _worker_stats_json(w.user_id) || jsonb_build_object('share_enabled', w.share_enabled);
end $$;

-- Người làm xem được việc làm lâu dài: đã duyệt và đủ 18 tuổi (phiên bản này chưa mở cho 15–17).
create function public._require_job_seeker() returns public.profiles
language plpgsql stable security definer set search_path = public as $$
declare p profiles; w worker_profiles;
begin
  p := _require_user();
  select * into w from worker_profiles where user_id = p.id;
  if p.role <> 'worker' or w.user_id is null then
    raise exception 'Chỉ người làm mới xem được việc làm lâu dài.';
  end if;
  if w.approval <> 'approved' then
    raise exception 'Hồ sơ của bạn cần được duyệt trước khi xem việc làm lâu dài.';
  end if;
  if age_on(w.date_of_birth, vn_date(now())) < 18 then
    raise exception 'Việc làm lâu dài hiện chỉ dành cho người từ 18 tuổi trở lên.';
  end if;
  return p;
end $$;

-- JSON một tin tuyển dụng (không có số điện thoại). my_application: đơn gần nhất của p_uid trên tin này.
create function public._job_json(j public.job_posts, p_uid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', j.id, 'facility_id', j.facility_id, 'title', j.title, 'job_type', j.job_type,
    'employment', j.employment, 'wage_type', j.wage_type, 'wage_min', j.wage_min, 'wage_max', j.wage_max,
    'hours_per_week', j.hours_per_week, 'schedule_note', j.schedule_note, 'description', j.description,
    'openings', j.openings, 'status', j.status, 'expires_at', j.expires_at,
    'expired', j.status = 'open' and j.expires_at <= now(),
    'created_at', j.created_at, 'closed_at', j.closed_at,
    'facility_name', f.name, 'facility_type', f.type, 'area', f.area,
    'address', f.address, 'maps_url', f.maps_url, 'lat', f.lat, 'lng', f.lng,
    'hired_count', (select count(*) from job_applications a where a.job_id = j.id and a.status = 'hired'),
    'my_application', (select jsonb_build_object('id', a.id, 'status', a.status)
                       from job_applications a where a.job_id = j.id and a.worker_id = p_uid
                       order by a.created_at desc limit 1))
  from facilities f where f.id = j.facility_id
$$;

-- ---------- TRIGGER KIỂM TRA ----------
create function public._job_posts_validate() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_min int;
begin
  if _bypass() then return new; end if;
  if tg_op = 'UPDATE' then
    -- Tin không sửa nội dung được (đã có người ứng tuyển thì sửa là đổi điều kiện của họ): chỉ đóng tin.
    if (new.facility_id, new.title, new.job_type, new.employment, new.wage_type, new.wage_min, new.wage_max,
        new.hours_per_week, new.schedule_note, new.description, new.openings, new.expires_at, new.commitment_ack, new.created_at)
       is distinct from
       (old.facility_id, old.title, old.job_type, old.employment, old.wage_type, old.wage_min, old.wage_max,
        old.hours_per_week, old.schedule_note, old.description, old.openings, old.expires_at, old.commitment_ack, old.created_at) then
      raise exception 'Không sửa được nội dung tin tuyển dụng. Hãy đóng tin và đăng lại.';
    end if;
    if old.status = 'closed' and new.status = 'open' then
      raise exception 'Tin đã đóng không mở lại được. Hãy đăng tin mới.';
    end if;
    return new;
  end if;
  if not exists (select 1 from facilities f where f.id = new.facility_id and f.verified and f.status = 'active') then
    raise exception 'Cơ sở chưa được xác minh nên chưa đăng tin tuyển dụng được.';
  end if;
  if new.wage_type = 'hourly' then
    v_min := cfg_int('min_hourly_wage', 25500);
    if new.wage_min < v_min then
      raise exception 'Lương/giờ phải từ % đ trở lên.', v_min;
    end if;
  else
    v_min := cfg_int('min_monthly_wage', 5310000);
    if new.wage_min < v_min then
      raise exception 'Lương/tháng phải từ % đ trở lên.', v_min;
    end if;
  end if;
  return new;
end $$;
create trigger job_posts_validate before insert or update on public.job_posts
  for each row execute function public._job_posts_validate();

-- Cơ sở bị gỡ, về chờ duyệt hoặc tắt verified (bằng cách nào cũng được) thì mọi tin đang mở của cơ sở tự đóng.
create function public._facilities_close_job_posts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update job_posts set status = 'closed', closed_at = now() where facility_id = new.id and status = 'open';
  return null;
end $$;
create trigger facilities_close_job_posts after update of verified, status on public.facilities
  for each row when (old.verified and old.status = 'active' and not (new.verified and new.status = 'active'))
  execute function public._facilities_close_job_posts();

-- Mọi đơn ứng tuyển (kể cả ghi bằng service-role) đều phải qua cửa này.
create function public._job_applications_validate() returns trigger
language plpgsql security definer set search_path = public as $$
declare j job_posts; p profiles; w worker_profiles;
begin
  if _bypass() then return new; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'applied' then
      raise exception 'Đơn mới phải ở trạng thái "đã ứng tuyển".';
    end if;
    select * into j from job_posts where id = new.job_id;
    if j.id is null then raise exception 'Không tìm thấy tin tuyển dụng.'; end if;
    if j.status <> 'open' or j.expires_at <= now()
       or not exists (select 1 from facilities f where f.id = j.facility_id and f.verified and f.status = 'active') then
      raise exception 'Tin tuyển dụng này đã đóng hoặc hết hạn.';
    end if;
    select * into p from profiles where id = new.worker_id;
    select * into w from worker_profiles where user_id = new.worker_id;
    if p.id is null or w.user_id is null or p.role <> 'worker' then
      raise exception 'Chỉ người làm mới ứng tuyển được.';
    end if;
    if p.status <> 'active' then
      raise exception 'Tài khoản đang bị khóa.';
    end if;
    if w.approval <> 'approved' then
      raise exception 'Hồ sơ của bạn chưa được duyệt nên chưa ứng tuyển được.';
    end if;
    if age_on(w.date_of_birth, vn_date(now())) < 18 then
      raise exception 'Việc làm lâu dài hiện chỉ dành cho người từ 18 tuổi trở lên.';
    end if;
    return new;
  end if;

  if (new.job_id, new.worker_id, new.note, new.created_at) is distinct from (old.job_id, old.worker_id, old.note, old.created_at) then
    raise exception 'Không sửa được nội dung đơn ứng tuyển.';
  end if;
  if new.status = old.status then return new; end if;
  -- Chủ quán: applied → shortlisted | rejected; shortlisted → hired | rejected. Người làm rút: applied | shortlisted → withdrawn.
  -- hired, rejected, withdrawn là trạng thái cuối.
  if not ((old.status = 'applied' and new.status in ('shortlisted', 'rejected', 'withdrawn'))
       or (old.status = 'shortlisted' and new.status in ('hired', 'rejected', 'withdrawn'))) then
    raise exception 'Không đổi được trạng thái đơn: đơn đã ở bước cuối hoặc bước chuyển không hợp lệ.';
  end if;
  new.status_changed_at := now();
  if new.status in ('shortlisted', 'hired') then
    select * into j from job_posts where id = new.job_id for update;  -- khóa tin để đếm người nhận không bị chạy đua
    if not exists (select 1 from facilities f where f.id = j.facility_id and f.verified and f.status = 'active') then
      raise exception 'Cơ sở chưa được xác minh hoặc đã bị gỡ nên chưa chọn người được.';
    end if;
    if not exists (select 1 from profiles p2 join worker_profiles w2 on w2.user_id = p2.id
                   where p2.id = new.worker_id and p2.status = 'active' and w2.approval = 'approved') then
      raise exception 'Tài khoản người làm này đang bị khóa hoặc chưa được duyệt.';
    end if;
    if new.status = 'hired' and (select count(*) from job_applications a
                                 where a.job_id = new.job_id and a.status = 'hired' and a.id <> new.id) >= j.openings then
      raise exception 'Tin này đã đủ % người nhận.', j.openings;
    end if;
  end if;
  return new;
end $$;
create trigger job_applications_validate before insert or update on public.job_applications
  for each row execute function public._job_applications_validate();

-- =====================================================================
-- RPC: CHỦ QUÁN
-- =====================================================================
-- p_days: số ngày tin hiển thị (1–30). Tin hết hạn thì không nhận đơn mới.
create function public.create_job_post(
  p_title text, p_job public.job_type, p_employment public.employment_type, p_wage_type public.wage_type,
  p_wage_min int, p_wage_max int, p_hours int, p_schedule text, p_description text,
  p_openings int, p_days int, p_commit boolean
) returns uuid
language plpgsql security definer set search_path = public as $$
declare me profiles; f facilities; v_id uuid; v_con text;
begin
  me := _require_user();
  select * into f from facilities where owner_id = me.id;
  if f.id is null then raise exception 'Bạn chưa có cơ sở.'; end if;
  if not f.verified or f.status <> 'active' then
    raise exception 'Cơ sở chưa được xác minh nên chưa đăng tin tuyển dụng được.';
  end if;
  if not coalesce(p_commit, false) then
    raise exception 'Bạn cần tick cam kết: không thu phí, không đặt cọc, không giữ giấy tờ người làm.';
  end if;
  if p_title is null or p_job is null or p_employment is null or p_wage_type is null or p_wage_min is null or p_hours is null then
    raise exception 'Vui lòng nhập đủ tiêu đề, loại việc, hình thức, mức lương thấp nhất và số giờ/tuần.';
  end if;
  if coalesce(p_days, 30) not between 1 and 30 then
    raise exception 'Tin được hiển thị từ 1 đến 30 ngày.';
  end if;
  insert into job_posts (facility_id, title, job_type, employment, wage_type, wage_min, wage_max, hours_per_week,
                         schedule_note, description, openings, expires_at, commitment_ack)
  values (f.id, btrim(p_title), p_job, p_employment, p_wage_type, p_wage_min, p_wage_max, p_hours,
          nullif(btrim(coalesce(p_schedule, '')), ''), nullif(btrim(coalesce(p_description, '')), ''),
          coalesce(p_openings, 1), now() + make_interval(days => coalesce(p_days, 30)), true)
  returning id into v_id;
  return v_id;
exception
  when check_violation then
    get stacked diagnostics v_con = constraint_name;
    raise exception '%', case v_con
      when 'job_posts_title'    then 'Tiêu đề tin từ 1 đến 120 ký tự.'
      when 'job_posts_wage'     then 'Mức lương cao nhất không được thấp hơn mức lương thấp nhất.'
      when 'job_posts_wage_cap' then 'Mức lương quá cao, vui lòng kiểm tra lại số liệu.'
      when 'job_posts_hours'    then 'Số giờ làm mỗi tuần từ 1 đến 48.'
      when 'job_posts_schedule' then 'Ghi chú lịch làm tối đa 500 ký tự.'
      when 'job_posts_desc'     then 'Mô tả tối đa 2000 ký tự.'
      when 'job_posts_openings' then 'Số người cần tuyển từ 1 đến 10.'
      else 'Thông tin tin tuyển dụng chưa hợp lệ.'
    end;
end $$;

create function public.close_job_post(p_job uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j job_posts;
begin
  perform _require_user();
  select * into j from job_posts where id = p_job for update;
  if j.id is null or not _owns_facility(j.facility_id) then
    raise exception 'Không tìm thấy tin tuyển dụng.';
  end if;
  if j.status <> 'open' then raise exception 'Tin này đã đóng rồi.'; end if;
  update job_posts set status = 'closed', closed_at = now() where id = p_job;
end $$;

-- Tin của cơ sở mình (nhóm vận hành: mọi tin), kèm số đơn theo trạng thái.
create function public.employer_job_posts() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles; v jsonb;
begin
  me := _require_user();
  select coalesce(jsonb_agg(_job_json(j, me.id) || jsonb_build_object(
           'applied_count',     (select count(*) from job_applications a where a.job_id = j.id and a.status = 'applied'),
           'shortlisted_count', (select count(*) from job_applications a where a.job_id = j.id and a.status = 'shortlisted'))
         order by j.created_at desc), '[]'::jsonb) into v
  from job_posts j
  where me.role = 'admin' or _owns_facility(j.facility_id);
  return v;
end $$;

-- Người ứng tuyển của một tin: họ tên, lời nhắn, thống kê hồ sơ ca làm. KHÔNG có SĐT, ngày sinh, trường, lớp, phụ huynh.
create function public.job_applicants(p_job uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles; j job_posts;
begin
  me := _require_user();
  select * into j from job_posts where id = p_job;
  if j.id is null or not (me.role = 'admin' or _owns_facility(j.facility_id)) then
    raise exception 'Không tìm thấy tin tuyển dụng.';
  end if;
  return jsonb_build_object(
    'job', _job_json(j, me.id),
    'applicants', (select coalesce(jsonb_agg(jsonb_build_object(
                     'id', a.id, 'name', p.full_name, 'note', a.note, 'status', a.status,
                     'created_at', a.created_at, 'status_changed_at', a.status_changed_at,
                     'profile', _worker_stats_json(a.worker_id))
                     order by a.created_at), '[]'::jsonb)
                   from job_applications a join profiles p on p.id = a.worker_id
                   where a.job_id = p_job));
end $$;

-- Chủ quán chọn vào vòng tiếp theo (shortlisted), loại (rejected) hoặc nhận (hired). Trigger kiểm bước chuyển và số chỗ.
create function public.set_application_status(p_application uuid, p_status public.application_status) returns void
language plpgsql security definer set search_path = public as $$
declare app job_applications;
begin
  perform _require_user();
  select a.* into app from job_applications a join job_posts j on j.id = a.job_id
   where a.id = p_application and _owns_facility(j.facility_id)
   for update of a;
  if app.id is null then raise exception 'Không tìm thấy đơn ứng tuyển.'; end if;
  if p_status is null or p_status not in ('shortlisted', 'rejected', 'hired') then
    raise exception 'Trạng thái không hợp lệ.';
  end if;
  update job_applications set status = p_status where id = app.id;
end $$;

-- =====================================================================
-- RPC: NGƯỜI LÀM
-- =====================================================================
create function public.feed_job_posts(p_job public.job_type default null, p_employment public.employment_type default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles; v jsonb;
begin
  me := _require_job_seeker();
  select coalesce(jsonb_agg(t.j order by t.created_at desc), '[]'::jsonb) into v
  from (
    select _job_json(j, me.id) as j, j.created_at
    from job_posts j join facilities f on f.id = j.facility_id
    where j.status = 'open' and j.expires_at > now() and f.verified and f.status = 'active'
      and (p_job is null or j.job_type = p_job)
      and (p_employment is null or j.employment = p_employment)
    order by j.created_at desc
    limit 200
  ) t;
  return v;
end $$;

-- Người làm đã duyệt xem tin đang mở; chủ quán xem tin của mình; nhóm vận hành xem mọi tin; người đã nộp đơn xem lại tin đó.
create function public.job_post_detail(p_job uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles; j job_posts; v_owner boolean;
begin
  me := _require_user();
  select * into j from job_posts where id = p_job;
  if j.id is null then raise exception 'Không tìm thấy tin tuyển dụng.'; end if;
  v_owner := _owns_facility(j.facility_id);
  if not (me.role = 'admin' or v_owner
          or exists (select 1 from job_applications where job_id = p_job and worker_id = me.id)) then
    perform _require_job_seeker();
    if j.status <> 'open' or j.expires_at <= now()
       or not exists (select 1 from facilities f where f.id = j.facility_id and f.verified and f.status = 'active') then
      raise exception 'Không tìm thấy tin tuyển dụng.';
    end if;
  end if;
  return _job_json(j, me.id) || jsonb_build_object('is_owner', v_owner);
end $$;

create function public.apply_job(p_job uuid, p_note text) returns uuid
language plpgsql security definer set search_path = public as $$
declare me profiles; v_id uuid;
begin
  me := _require_user();
  if exists (select 1 from job_applications where job_id = p_job and worker_id = me.id
             and status in ('applied', 'shortlisted', 'hired')) then
    raise exception 'Bạn đã ứng tuyển tin này rồi.';
  end if;
  insert into job_applications (job_id, worker_id, note)
  values (p_job, me.id, nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    raise exception 'Bạn đã ứng tuyển tin này rồi.';
  when check_violation then
    raise exception 'Lời nhắn tối đa 500 ký tự.';
end $$;

create function public.withdraw_application(p_application uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; app job_applications;
begin
  me := _require_user();
  select * into app from job_applications where id = p_application and worker_id = me.id for update;
  if app.id is null then raise exception 'Không tìm thấy đơn ứng tuyển.'; end if;
  update job_applications set status = 'withdrawn' where id = app.id;
end $$;

create function public.my_applications() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles; v jsonb;
begin
  me := _require_user();
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id, 'status', a.status, 'note', a.note,
           'created_at', a.created_at, 'status_changed_at', a.status_changed_at,
           'job', _job_json(j, me.id))
         order by a.created_at desc), '[]'::jsonb) into v
  from job_applications a join job_posts j on j.id = a.job_id
  where a.worker_id = me.id;
  return v;
end $$;

-- =====================================================================
-- SỐ ĐIỆN THOẠI: chỉ trả khi đơn đã được chủ quán chọn (shortlisted) hoặc nhận (hired).
-- Người gọi phải là chủ cơ sở của tin, chính người nộp đơn, hoặc nhóm vận hành.
-- =====================================================================
create function public.get_job_contacts(p_application uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me profiles; app job_applications; j job_posts; f facilities;
        v_admin boolean; v_owner boolean; v_worker boolean; v_fac jsonb; v_wrk jsonb;
begin
  me := _require_user();
  select * into app from job_applications where id = p_application;
  if app.id is null then raise exception 'Không tìm thấy đơn ứng tuyển.' using errcode = '42501'; end if;
  select * into j from job_posts where id = app.job_id;
  select * into f from facilities where id = j.facility_id;
  v_admin  := me.role = 'admin';
  v_owner  := f.owner_id = me.id;
  v_worker := app.worker_id = me.id;
  if not (v_admin or v_owner or v_worker) then
    raise exception 'Không tìm thấy đơn ứng tuyển.' using errcode = '42501';
  end if;
  if app.status not in ('shortlisted', 'hired') then
    raise exception 'Chỉ xem được số điện thoại khi chủ quán đã chọn người này vào vòng tiếp theo hoặc đã nhận.' using errcode = '42501';
  end if;
  if not v_admin and (not f.verified or f.status <> 'active'
                      or exists (select 1 from profiles where id = app.worker_id and status <> 'active')) then
    raise exception 'Cơ sở hoặc tài khoản người làm hiện không hoạt động nên chưa xem được số điện thoại.' using errcode = '42501';
  end if;
  if v_worker or v_admin then
    select jsonb_build_object('facility_name', f.name, 'contact_name', p.full_name, 'phone', pc.phone) into v_fac
    from profiles p join private_contacts pc on pc.user_id = p.id where p.id = f.owner_id;
  end if;
  if v_owner or v_admin then
    select jsonb_build_object('name', p.full_name, 'phone', pc.phone) into v_wrk
    from profiles p join private_contacts pc on pc.user_id = p.id where p.id = app.worker_id;
  end if;
  return jsonb_build_object('status', app.status, 'facility', v_fac, 'worker', v_wrk);
end $$;

-- =====================================================================
-- RPC: ADMIN
-- =====================================================================
create function public.admin_close_job_post(p_job uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  update job_posts set status = 'closed', closed_at = now() where id = p_job and status = 'open';
  if not found then raise exception 'Không tìm thấy tin đang mở.'; end if;
  perform _audit('close_job_post', 'job_posts', p_job, jsonb_build_object('reason', p_reason));
end $$;

-- admin_set_config: thêm khóa min_monthly_wage vào danh sách cho phép. Giữ nguyên chữ ký (giữ nguyên quyền cũ).
create or replace function public.admin_set_config(p_key text, p_value int) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin();
  if p_key not in ('min_hourly_wage', 'min_monthly_wage', 'weekly_hours_cap') or p_value is null or p_value <= 0 then
    raise exception 'Tham số không hợp lệ.';
  end if;
  update app_config set value = to_jsonb(p_value) where key = p_key;
  perform _audit('set_config', 'app_config', null, jsonb_build_object('key', p_key, 'value', p_value));
end $$;

-- =====================================================================
-- RLS + QUYỀN
-- =====================================================================
alter table public.job_posts        enable row level security;
alter table public.job_applications enable row level security;

-- Người làm đọc tin qua feed_job_posts()/job_post_detail(), không đọc bảng trực tiếp.
create policy job_posts_read on public.job_posts for select to authenticated
  using (public.is_admin() or public._owns_facility(facility_id));

-- Người nộp đọc đơn của mình; chủ quán đọc đơn của tin thuộc cơ sở mình (subquery chịu RLS của job_posts); nhóm vận hành.
create policy job_applications_read on public.job_applications for select to authenticated
  using (worker_id = auth.uid() or public.is_admin()
         or exists (select 1 from public.job_posts p where p.id = job_id and public._owns_facility(p.facility_id)));

-- Chỉ thu hồi trên hai bảng mới (không chạy lại revoke toàn schema, vì sẽ xóa grant của các bảng cũ).
revoke all on public.job_posts, public.job_applications from anon, authenticated;
grant select on public.job_posts, public.job_applications to authenticated;

-- Hàm nội bộ: không cấp cho client.
revoke execute on function
  public._worker_stats_json(uuid),
  public._require_job_seeker(),
  public._job_json(public.job_posts, uuid),
  public._job_posts_validate(),
  public._facilities_close_job_posts(),
  public._job_applications_validate()
  from public, anon, authenticated;

-- RPC cần đăng nhập (mỗi hàm tự kiểm tra vai trò).
revoke execute on function
  public.create_job_post(text, public.job_type, public.employment_type, public.wage_type, int, int, int, text, text, int, int, boolean),
  public.close_job_post(uuid),
  public.employer_job_posts(),
  public.job_applicants(uuid),
  public.set_application_status(uuid, public.application_status),
  public.feed_job_posts(public.job_type, public.employment_type),
  public.job_post_detail(uuid),
  public.apply_job(uuid, text),
  public.withdraw_application(uuid),
  public.my_applications(),
  public.get_job_contacts(uuid),
  public.admin_close_job_post(uuid, text)
  from public, anon, authenticated;
grant execute on function
  public.create_job_post(text, public.job_type, public.employment_type, public.wage_type, int, int, int, text, text, int, int, boolean),
  public.close_job_post(uuid),
  public.employer_job_posts(),
  public.job_applicants(uuid),
  public.set_application_status(uuid, public.application_status),
  public.feed_job_posts(public.job_type, public.employment_type),
  public.job_post_detail(uuid),
  public.apply_job(uuid, text),
  public.withdraw_application(uuid),
  public.my_applications(),
  public.get_job_contacts(uuid),
  public.admin_close_job_post(uuid, text)
  to authenticated;
