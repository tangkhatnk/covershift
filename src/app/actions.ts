'use server';

// Toàn bộ server action của ứng dụng. Mỗi action chỉ gom dữ liệu form rồi gọi một RPC;
// mọi quy tắc nghiệp vụ được kiểm tra trong database (xem supabase/migrations/0001_init.sql).
// Chữ ký chung: (prev, formData) => ActionState — dùng với <ActionForm action={...}>.
// Ngoại lệ duy nhất không gọi RPC: demoLogin (gọi Supabase Auth để đăng nhập tài khoản demo).

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { friendlyError as friendly } from '@/lib/errors';
import { normalizePhone } from '@/lib/format';
import type { ActionState } from '@/lib/types';

const str = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim();
const strOrNull = (fd: FormData, key: string) => str(fd, key) || null;
const bool = (fd: FormData, key: string) => ['on', 'true', '1', 'yes'].includes(str(fd, key));
const intOrNull = (fd: FormData, key: string) => {
  const digits = str(fd, key).replace(/[^\d]/g, '');
  return digits ? Number.parseInt(digits, 10) : null;
};

async function call(
  fn: string,
  args: Record<string, unknown>,
  opts: { ok?: string; revalidate?: string[]; redirectTo?: string } = {},
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, args);
  if (error) return { error: friendly(error) };
  (opts.revalidate ?? []).forEach((p) => revalidatePath(p));
  if (opts.redirectTo) redirect(opts.redirectTo);
  return { ok: opts.ok ?? 'Đã lưu.' };
}

// ---------------------------------------------------------------- đăng ký / tài khoản

// Mật khẩu công khai có chủ đích, chỉ dành cho tài khoản demo của bản mô phỏng (supabase/seed.sql).
const DEMO_PASSWORD = 'safeshift-demo';
const DEMO_EMAIL = new Map<string, string>([
  ['worker', 'nguoilam1@demo.safeshift.test'],
  ['employer', 'quan1@demo.safeshift.test'],
  ['admin', 'admin@demo.safeshift.test'],
]);

/** Form: who (worker | employer | admin). Email cố định ở phía server, không nhận từ form. */
export async function demoLogin(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = DEMO_EMAIL.get(str(fd, 'who'));
  if (!email) return { error: 'Vai trò không hợp lệ. Bạn hãy chọn một trong ba nút trên trang.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) {
    console.error('demoLogin lỗi:', error.status ?? '', error.code ?? '', error.message);
    if (error.status === 429) return { error: 'Có quá nhiều lượt đăng nhập. Bạn vui lòng đợi vài phút rồi thử lại.' };
    if (error.code === 'invalid_credentials') {
      return { error: 'Tài khoản demo chưa sẵn sàng. Bạn vui lòng báo nhóm vận hành khôi phục dữ liệu mẫu.' };
    }
    return { error: 'Chưa đăng nhập được. Bạn vui lòng thử lại sau ít phút.' };
  }
  redirect('/');
}

/** Form: full_name, dob (YYYY-MM-DD), school, class_name, phone, area, availability (nhiều checkbox), consent */
export async function registerWorker(_: ActionState, fd: FormData): Promise<ActionState> {
  return call('register_worker', {
    p_full_name: str(fd, 'full_name'),
    p_dob: strOrNull(fd, 'dob'),
    p_school: str(fd, 'school'),
    p_class: strOrNull(fd, 'class_name'),
    p_phone: normalizePhone(str(fd, 'phone')),
    p_area: str(fd, 'area'),
    p_availability: fd.getAll('availability').map(String),
    p_consent: bool(fd, 'consent'),
  }, { redirectTo: '/ho-so?moi=1' });
}

/** Form: full_name, phone, facility_name, type, address, area, maps_url, not_prohibited, consent */
export async function registerEmployer(_: ActionState, fd: FormData): Promise<ActionState> {
  return call('register_employer', {
    p_full_name: str(fd, 'full_name'),
    p_phone: normalizePhone(str(fd, 'phone')),
    p_facility_name: str(fd, 'facility_name'),
    p_type: str(fd, 'type'),
    p_address: str(fd, 'address'),
    p_area: str(fd, 'area'),
    p_maps_url: strOrNull(fd, 'maps_url'),
    p_not_prohibited: bool(fd, 'not_prohibited'),
    p_consent: bool(fd, 'consent'),
  }, { redirectTo: '/quan' });
}

/** Form: school, class_name, phone, area, availability[] */
export async function updateWorkerProfile(_: ActionState, fd: FormData): Promise<ActionState> {
  return call('update_worker_profile', {
    p_school: str(fd, 'school'),
    p_class: strOrNull(fd, 'class_name'),
    p_phone: normalizePhone(str(fd, 'phone')),
    p_area: str(fd, 'area'),
    p_availability: fd.getAll('availability').map(String),
  }, { ok: 'Đã lưu hồ sơ.', revalidate: ['/ho-so'] });
}

/** Form: enabled ("true" | "false") */
export async function setSharing(_: ActionState, fd: FormData): Promise<ActionState> {
  const enabled = str(fd, 'enabled') === 'true';
  return call('set_profile_sharing', { p_enabled: enabled }, {
    ok: enabled ? 'Đã bật chia sẻ hồ sơ ca làm.' : 'Đã tắt chia sẻ.',
    revalidate: ['/ho-so'],
  });
}

export async function regenerateConsent(_: ActionState, _fd: FormData): Promise<ActionState> {
  return call('regenerate_consent_link', {}, { ok: 'Đã tạo link mới.', revalidate: ['/ho-so'] });
}

/** Form: confirm (checkbox). Xóa tài khoản + toàn bộ dữ liệu, rồi đăng xuất. */
export async function deleteAccount(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!bool(fd, 'confirm')) return { error: 'Hãy tick xác nhận trước khi xóa.' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { error: friendly(error) };
  await supabase.auth.signOut();
  redirect('/?da-xoa=1');
}

// ---------------------------------------------------------------- phụ huynh (không đăng nhập)

/** Form: token, parent_name, parent_phone, agree */
export async function submitParentalConsent(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = str(fd, 'token');
  return call('submit_parental_consent', {
    p_token: token,
    p_parent_name: str(fd, 'parent_name'),
    p_parent_phone: normalizePhone(str(fd, 'parent_phone')),
    p_agree: bool(fd, 'agree'),
  }, { ok: 'Đã ghi nhận. Cảm ơn anh/chị!', revalidate: [`/dong-y/${token}`] });
}

// ---------------------------------------------------------------- ca làm

/** Form: date, start (HH:MM), end (HH:MM), job_type, headcount, wage, description, urgent, allow_minor, commit */
export async function createShift(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_shift', {
    p_date: strOrNull(fd, 'date'),
    p_start: strOrNull(fd, 'start'),
    p_end: strOrNull(fd, 'end'),
    p_job: str(fd, 'job_type'),
    p_headcount: intOrNull(fd, 'headcount') ?? 1,
    p_wage: intOrNull(fd, 'wage'),
    p_description: strOrNull(fd, 'description'),
    p_urgent: bool(fd, 'urgent'),
    p_allow_minor: bool(fd, 'allow_minor'),
    p_commit: bool(fd, 'commit'),
  });
  if (error) return { error: friendly(error) };
  revalidatePath('/quan');
  redirect(`/quan/ca/${data}?moi=1`);
}

/** Form: shift_id. Chủ quán (hoặc admin) hủy ca. */
export async function cancelShift(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, 'shift_id');
  return call('cancel_shift', { p_shift: id }, { ok: 'Đã hủy ca.', revalidate: ['/quan', `/quan/ca/${id}`, '/admin'] });
}

/** Form: shift_id. Người làm nhận ca. */
export async function claimShift(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, 'shift_id');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('claim_shift', { p_shift: id });
  if (error) return { error: friendly(error) };
  revalidatePath('/ca');
  revalidatePath(`/ca/${id}`);
  revalidatePath('/ca-cua-toi');
  return {
    ok: data === 'primary'
      ? 'Nhận ca thành công! Bạn là NGƯỜI CHÍNH. Số điện thoại của quán hiện ở bên dưới.'
      : 'Bạn là NGƯỜI DỰ PHÒNG. Nếu người chính hủy, bạn sẽ được lên thay. Hãy để ý điện thoại.',
  };
}

/** Form: shift_id. Người làm hủy suất của mình. */
export async function cancelClaim(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, 'shift_id');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('cancel_claim', { p_shift: id });
  if (error) return { error: friendly(error) };
  revalidatePath('/ca');
  revalidatePath(`/ca/${id}`);
  revalidatePath('/ca-cua-toi');
  return {
    ok: data === 'late_cancel'
      ? 'Đã hủy. Vì hủy khi còn dưới 2 tiếng nên lần này được ghi vào lịch sử là "hủy sát giờ".'
      : 'Đã hủy suất của bạn.',
  };
}

/** Form: shift_id, worker_id (người chính sẽ đổi chỗ với người dự phòng) */
export async function swapRoles(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, 'shift_id');
  return call('swap_roles', { p_shift: id, p_primary_worker: str(fd, 'worker_id') }, {
    ok: 'Đã đổi thứ tự.', revalidate: [`/quan/ca/${id}`, '/admin'],
  });
}

/** Form: shift_id, answer (full | partial | unpaid) */
export async function submitPayment(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = str(fd, 'shift_id');
  const answer = str(fd, 'answer');
  return call('submit_payment_feedback', { p_shift: id, p_answer: answer }, {
    ok: answer === 'full' ? 'Cảm ơn bạn đã trả lời.' : 'Đã ghi nhận và báo cho nhóm vận hành. Chúng tôi sẽ liên hệ bạn.',
    revalidate: [`/ca/${id}`, '/ca-cua-toi'],
  });
}

/** Form: shift_id (có thể trống), body */
export async function createReport(_: ActionState, fd: FormData): Promise<ActionState> {
  return call('create_report', { p_shift: strOrNull(fd, 'shift_id'), p_body: str(fd, 'body') }, {
    ok: 'Đã gửi báo cáo cho nhóm vận hành.',
  });
}

// ---------------------------------------------------------------- xác nhận sau ca (không đăng nhập)

/**
 * Form: token, claim_id (lặp lại cho từng người), và với mỗi claim_id:
 * attended_<id> ("yes" | "no"), on_time_<id> ("yes" | "no"), rating_<id> (1–5), comment_<id>
 */
export async function submitConfirmation(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = str(fd, 'token');
  const yn = (v: string) => (v === 'yes' ? true : v === 'no' ? false : null);
  const results = fd.getAll('claim_id').map(String).map((id) => {
    const attended = yn(str(fd, `attended_${id}`));
    return {
      claim_id: id,
      attended,
      on_time: attended ? yn(str(fd, `on_time_${id}`)) : null,
      rating: attended ? intOrNull(fd, `rating_${id}`) : null,
      comment: str(fd, `comment_${id}`),
    };
  });
  return call('submit_confirmation', { p_token: token, p_results: results }, {
    ok: 'Đã xác nhận. Cảm ơn anh/chị!', revalidate: [`/xac-nhan/${token}`],
  });
}

// ---------------------------------------------------------------- admin

/** Form: facility_id, address_ok, contact_ok, has_license, verified_on, verifier_name, note */
export async function verifyFacility(_: ActionState, fd: FormData): Promise<ActionState> {
  return call('admin_verify_facility', {
    p_facility: str(fd, 'facility_id'),
    p_address_ok: bool(fd, 'address_ok'),
    p_contact_ok: bool(fd, 'contact_ok'),
    p_has_license: bool(fd, 'has_license'),
    p_verified_on: strOrNull(fd, 'verified_on'),
    p_verifier_name: str(fd, 'verifier_name'),
    p_note: strOrNull(fd, 'note'),
  }, { ok: 'Đã xác minh cơ sở. Cơ sở này đăng ca được rồi.', revalidate: ['/admin/co-so'] });
}

/** Form: facility_id, status (removed | pending), reason */
export async function setFacilityStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  return call('admin_set_facility_status', {
    p_facility: str(fd, 'facility_id'), p_status: str(fd, 'status'), p_reason: strOrNull(fd, 'reason'),
  }, { ok: 'Đã cập nhật cơ sở.', revalidate: ['/admin/co-so', '/admin'] });
}

/** Form: worker_id, decision (approve | reject), note */
export async function reviewWorker(_: ActionState, fd: FormData): Promise<ActionState> {
  const approve = str(fd, 'decision') === 'approve';
  return call('admin_review_worker', {
    p_worker: str(fd, 'worker_id'), p_approve: approve, p_note: strOrNull(fd, 'note'),
  }, { ok: approve ? 'Đã duyệt người làm.' : 'Đã từ chối.', revalidate: ['/admin/nguoi-lam'] });
}

/** Form: user_id, status (locked | active), reason */
export async function setAccountStatus(_: ActionState, fd: FormData): Promise<ActionState> {
  const status = str(fd, 'status');
  return call('admin_set_account_status', {
    p_user: str(fd, 'user_id'), p_status: status, p_reason: strOrNull(fd, 'reason'),
  }, { ok: status === 'locked' ? 'Đã khóa tài khoản.' : 'Đã mở khóa.', revalidate: ['/admin/nguoi-lam', '/admin/co-so', '/admin'] });
}

/** Form: shift_id, worker_id (người chính báo bận), note */
export async function primaryBusy(_: ActionState, fd: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_primary_busy', {
    p_shift: str(fd, 'shift_id'), p_worker: str(fd, 'worker_id'), p_note: strOrNull(fd, 'note'),
  });
  if (error) return { error: friendly(error) };
  revalidatePath('/admin');
  revalidatePath('/admin/bao-cao');
  // Form nằm trong dòng của người chính; dòng đó biến mất sau khi tải lại nên báo kết quả ở đầu trang /admin.
  redirect(`/admin?bao-ban=${data ? 'da-thay' : 'khong-du-phong'}`);
}

/** Form: report_id, note */
export async function resolveReport(_: ActionState, fd: FormData): Promise<ActionState> {
  return call('admin_resolve_report', { p_report: str(fd, 'report_id'), p_note: strOrNull(fd, 'note') }, {
    ok: 'Đã đánh dấu xử lý xong.', revalidate: ['/admin/bao-cao'],
  });
}

/** Form: result_id, hidden ("true" | "false"), shift_id (để tải lại trang ca sau khi đổi) */
export async function hideComment(_: ActionState, fd: FormData): Promise<ActionState> {
  const shiftId = str(fd, 'shift_id');
  return call('admin_hide_comment', { p_result: str(fd, 'result_id'), p_hidden: str(fd, 'hidden') === 'true' }, {
    ok: 'Đã cập nhật nhận xét.',
    revalidate: shiftId ? [`/quan/ca/${shiftId}`] : [],
  });
}

/** Form: key (min_hourly_wage | weekly_hours_cap), value */
export async function setConfig(_: ActionState, fd: FormData): Promise<ActionState> {
  return call('admin_set_config', { p_key: str(fd, 'key'), p_value: intOrNull(fd, 'value') }, {
    ok: 'Đã lưu cấu hình.', revalidate: ['/admin/kpi'],
  });
}
