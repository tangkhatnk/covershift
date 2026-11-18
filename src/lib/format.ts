import { TZ } from './constants';
import type { Shift } from './types';

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
function vn(d: Date | string) {
  const o: Record<string, string> = {};
  for (const p of partsFmt.formatToParts(new Date(d))) o[p.type] = p.value;
  return o;
}

/** "Thứ 7, 21/11" ("CN, 22/11" cho Chủ nhật) */
export const fmtDate = (iso: string) => { const p = vn(iso); return `${WEEKDAY[p.weekday]}, ${p.day}/${p.month}`; };
/** "08:00" */
export const fmtTime = (iso: string) => { const p = vn(iso); return `${p.hour}:${p.minute}`; };
/** "Thứ 7, 21/11 · 08:00–12:00" */
export const fmtRange = (start: string, end: string) => `${fmtDate(start)} · ${fmtTime(start)}–${fmtTime(end)}`;
/** "08:00 21/11/2026" */
export const fmtDateTime = (iso: string) => { const p = vn(iso); return `${p.hour}:${p.minute} ${p.day}/${p.month}/${p.year}`; };
/** "2026-11-21" theo giờ Việt Nam, dùng cho <input type="date"> và tham số ngày của RPC */
export const vnDateInput = (d: Date | string = new Date()) => { const p = vn(d); return `${p.year}-${p.month}-${p.day}`; };
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

/** Chuẩn hóa số điện thoại người dùng gõ: bỏ dấu cách/chấm, +84 → 0. */
export function normalizePhone(raw: string) {
  let p = raw.replace(/[\s.\-()]/g, '');
  if (p.startsWith('+84')) p = '0' + p.slice(3);
  else if (p.startsWith('84') && p.length === 11) p = '0' + p.slice(2);
  return p;
}
