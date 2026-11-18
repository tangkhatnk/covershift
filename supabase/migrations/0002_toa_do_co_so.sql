-- =====================================================================
-- SafeShift — 0002: tọa độ cơ sở (cho bản đồ).
-- Chạy sau 0001_init.sql, trước seed.sql (seed mới ghi lat/lng). Không xóa gì, không có cột not null mới.
-- Tọa độ là vị trí quán kinh doanh, không phải dữ liệu cá nhân; client vẫn đọc qua RLS cũ của `facilities`.
-- =====================================================================

alter table public.facilities
  add column lat double precision,
  add column lng double precision;

-- Quy tắc cốt lõi ở constraint (ghi bằng service-role cũng không lách được): cùng null hoặc cùng có, trong khung Bà Rịa - Vũng Tàu.
alter table public.facilities add constraint facilities_location_check check (
  (lat is null and lng is null)
  or (lat is not null and lng is not null
      and lat between 10.30 and 10.80 and lng between 107.00 and 107.60));  -- is not null: null trong check coi như đạt

-- Chủ cơ sở hoặc nhóm vận hành đặt/xóa ghim. Truyền cả hai null = xóa ghim.
create function public.set_facility_location(p_facility uuid, p_lat double precision, p_lng double precision) returns void
language plpgsql security definer set search_path = public as $$
declare me profiles; f facilities;
begin
  me := _require_user();
  select * into f from facilities where id = p_facility;
  if not found or (f.owner_id <> me.id and me.role <> 'admin') then
    raise exception 'Bạn không có quyền sửa vị trí cơ sở này.' using errcode = '42501';
  end if;
  if f.status = 'removed' then
    raise exception 'Cơ sở đã bị gỡ nên không sửa được vị trí.';
  end if;
  if (p_lat is null) <> (p_lng is null) then
    raise exception 'Cần nhập đủ vĩ độ và kinh độ, hoặc để trống cả hai để xóa vị trí.';
  end if;
  if p_lat is not null and not (p_lat between 10.30 and 10.80 and p_lng between 107.00 and 107.60) then
    raise exception 'Vị trí phải nằm trong khu vực Vũng Tàu.';
  end if;
  update facilities set lat = p_lat, lng = p_lng where id = p_facility;
  if me.role = 'admin' then
    perform _audit('set_facility_location', 'facilities', p_facility, jsonb_build_object('lat', p_lat, 'lng', p_lng));
  end if;
end $$;

-- _shift_json (dùng chung cho feed_shifts, shift_detail, my_shifts, employer_shifts...): thêm lat, lng của cơ sở. Giữ nguyên chữ ký.
create or replace function public._shift_json(s public.shifts, p_uid uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', s.id, 'facility_id', s.facility_id, 'job_type', s.job_type,
    'starts_at', s.starts_at, 'ends_at', s.ends_at, 'headcount', s.headcount,
    'hourly_wage', s.hourly_wage, 'description', s.description, 'urgent', s.urgent,
    'allow_minor', s.allow_minor, 'status', s.status, 'created_at', s.created_at,
    'facility_name', f.name, 'facility_type', f.type, 'area', f.area,
    'address', f.address, 'maps_url', f.maps_url, 'lat', f.lat, 'lng', f.lng,
    'primary_count', (select count(*) from shift_claims c where c.shift_id = s.id and c.status = 'active' and c.role = 'primary'),
    'backup_count',  (select count(*) from shift_claims c where c.shift_id = s.id and c.status = 'active' and c.role = 'backup'),
    'my_role', (select c.role from shift_claims c where c.shift_id = s.id and c.status = 'active' and c.worker_id = p_uid))
  from facilities f where f.id = s.facility_id
$$;

create or replace function public.admin_list_facilities() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  perform _require_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', f.id, 'name', f.name, 'type', f.type, 'address', f.address, 'area', f.area, 'maps_url', f.maps_url,
    'lat', f.lat, 'lng', f.lng,
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

revoke execute on function public.set_facility_location(uuid, double precision, double precision) from public, anon, authenticated;
grant execute on function public.set_facility_location(uuid, double precision, double precision) to authenticated;
