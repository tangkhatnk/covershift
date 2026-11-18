import type { Area, FacilityType, JobType, PaymentAnswer } from './constants';

export type Role = 'worker' | 'employer' | 'admin';
export type ActionState = { error?: string; ok?: string } | null;

export type Profile = { id: string; role: Role; full_name: string; status: 'active' | 'locked' };

/** Kết quả của _shift_json(): dùng ở feed, chi tiết ca, ca của tôi, ca của quán, bảng điều phối. */
export type Shift = {
  id: string;
  facility_id: string;
  job_type: JobType;
  starts_at: string;
  ends_at: string;
  headcount: number;
  hourly_wage: number;
  description: string | null;
  urgent: boolean;
  allow_minor: boolean;
  status: 'open' | 'cancelled' | 'completed';
  created_at: string;
  facility_name: string;
  facility_type: FacilityType;
  area: Area;
  address: string;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  primary_count: number;
  backup_count: number;
  my_role: 'primary' | 'backup' | null;
};

export type ShiftResult = {
  id: string;
  name: string;
  attended: boolean;
  on_time: boolean | null;
  rating: number | null;
  comment: string | null;
  comment_hidden: boolean;
};

/** shift_detail(p_shift) */
export type ShiftDetail = Shift & {
  is_owner: boolean;
  my_claim?: { status: 'active' | 'cancelled'; role: 'primary' | 'backup'; cancel_kind: string | null };
  my_result?: { attended: boolean; on_time: boolean | null; rating: number | null; comment: string | null } | null;
  my_payment?: PaymentAnswer | null;
  // chỉ có khi người gọi là chủ quán của ca hoặc admin:
  confirm_token?: string | null;
  confirm_expires_at?: string | null;
  results?: ShiftResult[];
};

/** my_shifts() */
export type MyShift = Shift & {
  claim_status: 'active' | 'cancelled';
  claim_role: 'primary' | 'backup';
  cancel_kind: string | null;
  attended: boolean | null;
  my_payment: PaymentAnswer | null;
};

/** get_shift_contacts(p_shift): ném lỗi nếu chưa ghép ca. */
export type Contacts = {
  facility: { contact_name: string; phone: string } | null;
  workers:
    | { claim_id: string; worker_id: string; name: string; phone: string | null; role: 'primary' | 'backup'; slug: string | null }[]
    | null;
};

/** get_confirmation(p_token) */
export type Confirmation =
  | { state: 'invalid' | 'used' | 'expired' }
  | {
      state: 'ok';
      facility_name: string;
      job_type: JobType;
      starts_at: string;
      ends_at: string;
      expires_at: string;
      workers: { claim_id: string; name: string }[];
    };

/** get_parental_consent(p_token) */
export type ParentalConsentView = { state: 'invalid' | 'expired' | 'submitted' | 'ok'; worker_name?: string };

/** get_public_profile(p_slug): null nếu không tồn tại hoặc đang tắt chia sẻ. */
export type PublicProfile = {
  name: string;
  share_enabled: boolean;
  confirmed_shifts: number;
  total_hours: number;
  avg_rating: number | null;
  on_time_rate: number | null;
  job_types: JobType[];
  reviews: { date: string; facility_name: string; job_type: JobType; rating: number; on_time: boolean; comment: string | null }[];
} | null;

// ---------- admin ----------
export type DispatchClaim = { worker_id: string; name: string; phone: string | null; role: 'primary' | 'backup'; minor: boolean };
export type DispatchShift = Shift & { owner_name: string; owner_phone: string | null; claims: DispatchClaim[] };
export type PendingConfirmation = Shift & {
  owner_name: string;
  owner_phone: string | null;
  confirm_token: string;
  confirm_expires_at: string;
  expired: boolean;
};
/** admin_dispatch_board() */
export type DispatchBoard = { upcoming: DispatchShift[]; pending: PendingConfirmation[] };

/** admin_list_workers() */
export type AdminWorker = {
  user_id: string;
  full_name: string;
  status: 'active' | 'locked';
  phone: string | null;
  date_of_birth: string;
  age: number;
  school: string;
  class_name: string | null;
  area: Area;
  availability: string[];
  approval: 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  created_at: string;
  consent: { status: 'pending' | 'submitted' | 'approved' | 'rejected'; parent_name: string | null; parent_phone: string | null; agreed_at: string | null } | null;
  late_cancels: number;
  no_shows: number;
  confirmed: number;
};

/** admin_list_facilities() */
export type AdminFacility = {
  id: string;
  name: string;
  type: FacilityType;
  address: string;
  area: Area;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  verified: boolean;
  status: 'pending' | 'active' | 'removed';
  created_at: string;
  owner_id: string;
  owner_name: string;
  owner_phone: string | null;
  owner_status: 'active' | 'locked';
  verification: {
    address_ok: boolean;
    contact_ok: boolean;
    has_business_license: boolean;
    verified_on: string;
    verifier_name: string;
    note: string | null;
  } | null;
};

/** admin_list_reports() */
export type AdminReport = {
  id: string;
  kind: 'payment' | 'late_cancel' | 'primary_busy' | 'no_show' | 'user_report';
  status: 'open' | 'resolved';
  body: string;
  admin_note: string | null;
  created_at: string;
  shift_id: string | null;
  facility_name: string | null;
  starts_at: string | null;
  reporter_name: string | null;
  reporter_phone: string | null;
  subject_name: string | null;
  subject_phone: string | null;
};

/** admin_audit(p_limit) */
export type AuditRow = {
  id: number;
  action: string;
  target_table: string | null;
  target_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
  admin_name: string | null;
};

/** admin_kpis() */
export type Kpis = {
  verified_facilities: number;
  approved_workers: number;
  shifts_posted: number;
  shifts_cancelled: number;
  shifts_filled: number;
  fill_rate_pct: number | null;
  backup_promotions: number;
  no_show_shifts: number;
  median_minutes_to_first_claim: number | null;
  on_time_rate_pct: number | null;
  avg_rating: number | null;
  paid_full_rate_pct: number | null;
};
