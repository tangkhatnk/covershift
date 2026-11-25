import { JOB_LABEL, TZ } from './constants';
import type { AppNotification, ApplicationStatus, JobPost, Shift } from './types';

// Server Vercel chạy giờ UTC => LUÔN định dạng theo múi giờ Việt Nam.
// Mọi chữ hiển thị tự ghép từ SỐ (Intl chỉ cho ra chữ số), không dùng tên thứ/tháng của Intl: ICU của Node và của từng
// trình duyệt cho chữ khác nhau ("Thứ 5" và "Th 5") nên trang dựng ở server rồi hydrate trên client sẽ lệch (React #418).
// hourCycle 'h23' (không dùng hour12: false) để nửa đêm luôn là "00:00", không bao giờ "24:00" — giá trị
// này còn được điền vào <input type="time"> ở form nhân bản ca.
const partsFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});
const WEEKDAY: Record<string, string> = { Sun: 'CN', Mon: 'Thứ 2', Tue: 'Thứ 3', Wed: 'Thứ 4', Thu: 'Thứ 5', Fri: 'Thứ 6', Sat: 'Thứ 7' };
/** Các thành phần ngày giờ theo giờ Việt Nam. */
function vn(d: Date | string | number) {
  const o: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(new Date(d))) o[p.type] = p.value;
  return o;
}

/** "Thứ 7, 21/11" ("CN, 22/11" cho Chủ nhật) */
export const fmtDate = (iso: string) => { const p = vn(iso); return `${WEEKDAY[p.weekday]}, ${p.day}/${p.month}`; };
/** Như `fmtDate`, nhưng ngày hôm nay và ngày mai (theo giờ Việt Nam, so với `now` tính bằng ms) ghi "Hôm nay, 26/11" / "Ngày mai, 27/11". */
export const fmtDateRel = (iso: string, now: number) => {
  const day = vnDateInput(iso);
  const tag = day === vnDateInput(now) ? 'Hôm nay' : day === vnDateInput(now + 86_400_000) ? 'Ngày mai' : null;
  if (!tag) return fmtDate(iso);
  const p = vn(iso);
  return `${tag}, ${p.day}/${p.month}`;
};
/** "08:00" */
export const fmtTime = (iso: string) => { const p = vn(iso); return `${p.hour}:${p.minute}`; };
/** "Thứ 7, 21/11 · 08:00–12:00" */
export const fmtRange = (start: string, end: string) => `${fmtDate(start)} · ${fmtTime(start)}–${fmtTime(end)}`;
/** "08:00 21/11/2026" */
export const fmtDateTime = (iso: string) => { const p = vn(iso); return `${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}`; };
/** "2026-11-21" theo giờ Việt Nam, dùng cho <input type="date"> và tham số ngày của RPC */
export const vnDateInput = (d: Date | string | number = new Date()) => { const p = vn(d); return `${p.year}-${p.month}-${p.day}`; };
/** Tuổi tròn tại ngày `onYmd` (cả hai dạng YYYY-MM-DD). Khớp age_on() ở database. */
export function ageOn(dobYmd: string, onYmd: string) {
  const years = Number(onYmd.slice(0, 4)) - Number(dobYmd.slice(0, 4));
  return onYmd.slice(5) < dobYmd.slice(5) ? years - 1 : years;
}
/** "21/11/2026" từ chuỗi ngày thuần "2026-11-21" */
export const fmtPlainDate = (ymd: string) => ymd.split('-').reverse().join('/');
/** "27.000đ" (số nguyên tự ghép dấu chấm hàng nghìn, để server và trình duyệt giống nhau) */
export const fmtMoney = (n: number) =>
  `${Number.isInteger(n) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : new Intl.NumberFormat('vi-VN').format(n)}đ`;
/** Số giờ của ca (1 chữ số thập phân) */
export const hoursBetween = (start: string, end: string) =>
  Math.round(((new Date(end).getTime() - new Date(start).getTime()) / 3_600_000) * 10) / 10;

export type ShiftState = 'open' | 'filled' | 'in_progress' | 'awaiting_confirm' | 'expired' | 'unfilled' | 'confirmed' | 'cancelled';

/** Trạng thái hiển thị của ca, suy ra từ dữ liệu + thời điểm hiện tại. */
export function shiftState(s: Pick<Shift, 'status' | 'starts_at' | 'ends_at' | 'primary_count' | 'headcount'>, now = Date.now()): ShiftState {
  if (s.status === 'cancelled') return 'cancelled';
  if (s.status === 'completed') return 'confirmed';
  const start = new Date(s.starts_at).getTime();
  const end = new Date(s.ends_at).getTime();
  if (now < start) return s.primary_count >= s.headcount ? 'filled' : 'open';
  if (s.primary_count === 0) return 'unfilled';
  if (now < end) return 'in_progress';
  return now > end + 72 * 3_600_000 ? 'expired' : 'awaiting_confirm';
}

export const SHIFT_STATE_LABEL: Record<ShiftState, string> = {
  open: 'Đang tìm người',
  filled: 'Đã đủ người',
  in_progress: 'Đang diễn ra',
  awaiting_confirm: 'Chờ xác nhận',
  expired: 'Quá hạn xác nhận',
  unfilled: 'Không có người nhận',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
};

export const SHIFT_STATE_TONE: Record<ShiftState, 'green' | 'amber' | 'red' | 'gray' | 'blue'> = {
  open: 'amber',
  filled: 'green',
  in_progress: 'blue',
  awaiting_confirm: 'amber',
  expired: 'red',
  unfilled: 'red',
  confirmed: 'green',
  cancelled: 'gray',
};

export const APPLICATION_STATUS_LABEL: Record<ApplicationStatus, string> = {
  applied: 'Đã nộp',
  shortlisted: 'Được chọn vào vòng tiếp',
  rejected: 'Chưa phù hợp',
  hired: 'Đã nhận',
  withdrawn: 'Đã rút',
};

export const APPLICATION_STATUS_TONE: Record<ApplicationStatus, 'green' | 'amber' | 'red' | 'gray' | 'blue'> = {
  applied: 'blue',
  shortlisted: 'amber',
  rejected: 'gray',
  hired: 'green',
  withdrawn: 'gray',
};

/** "từ 6.000.000đ/tháng" hoặc "25.500–30.000đ/giờ" (không có mức cao nhất, hoặc bằng mức thấp nhất, thì ghi "từ"). */
export function fmtWageRange(p: Pick<JobPost, 'wage_type' | 'wage_min' | 'wage_max'>) {
  const unit = p.wage_type === 'monthly' ? 'tháng' : 'giờ';
  if (p.wage_max == null || p.wage_max === p.wage_min) return `từ ${fmtMoney(p.wage_min)}/${unit}`;
  return `${fmtMoney(p.wage_min).slice(0, -1)}–${fmtMoney(p.wage_max)}/${unit}`;
}

/** Tiêu đề và dòng mô tả của một thông báo, chỉ từ kind và các trường có trong payload (migration 0004). */
export function notificationText(n: Pick<AppNotification, 'kind' | 'payload'>): { title: string; body: string } {
  const { job_type, facility_name, status } = n.payload;
  const job = job_type ? JOB_LABEL[job_type].toLowerCase() : 'làm việc';
  const place = facility_name ?? 'quán';
  switch (n.kind) {
    case 'shift_promoted':
      return { title: 'Bạn đã lên làm người chính', body: `Bạn đã được lên làm người chính của ca ${job} tại ${place}.` };
    case 'shift_cancelled':
      return { title: 'Ca đã bị hủy', body: `Ca ${job} tại ${place} đã bị hủy. Suất của bạn không còn hiệu lực.` };
    case 'application_new':
      return { title: 'Có đơn ứng tuyển mới', body: `Có người vừa ứng tuyển vị trí ${job} tại ${place}.` };
    case 'application_status':
      if (status === 'hired') return { title: 'Bạn đã được nhận', body: `${place} đã nhận bạn vào vị trí ${job}.` };
      if (status === 'shortlisted') return { title: 'Đơn của bạn được chọn', body: `${place} đã chọn đơn của bạn vào vòng tiếp theo cho vị trí ${job}.` };
      if (status === 'rejected') return { title: 'Đơn chưa phù hợp', body: `${place} chưa chọn đơn của bạn cho vị trí ${job}.` };
      return { title: 'Đơn ứng tuyển có thay đổi', body: `Đơn của bạn cho vị trí ${job} tại ${place} vừa được cập nhật.` };
    case 'profile_reviewed':
      return status === 'approved'
        ? { title: 'Hồ sơ đã được duyệt', body: 'Hồ sơ của bạn đã được nhóm vận hành duyệt.' }
        : { title: 'Hồ sơ chưa được duyệt', body: 'Hồ sơ của bạn chưa được nhóm vận hành duyệt.' };
    case 'parental_consent_submitted':
      return { title: 'Phụ huynh đã gửi phiếu', body: 'Phụ huynh đã gửi phiếu đồng ý. Nhóm vận hành sẽ xem và duyệt hồ sơ của bạn.' };
  }
}

/** Chuẩn hóa số điện thoại người dùng gõ: bỏ dấu cách/chấm, +84 → 0. */
export function normalizePhone(raw: string) {
  let p = raw.replace(/[\s.\-()]/g, '');
  if (p.startsWith('+84')) p = '0' + p.slice(3);
  else if (p.startsWith('84') && p.length === 11) p = '0' + p.slice(2);
  return p;
}
