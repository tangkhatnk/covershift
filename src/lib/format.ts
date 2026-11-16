import { TZ } from './constants';
import type { Shift } from './types';

// Server Vercel chạy giờ UTC => LUÔN định dạng theo múi giờ Việt Nam.
const dateFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const fullFmt = new Intl.DateTimeFormat('vi-VN', {
  timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});
const isoDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

/** "Th 7, 21/11" */
export const fmtDate = (iso: string) => dateFmt.format(new Date(iso));
/** "08:00" */
export const fmtTime = (iso: string) => timeFmt.format(new Date(iso));
/** "Th 7, 21/11 · 08:00–12:00" */
export const fmtRange = (start: string, end: string) => `${fmtDate(start)} · ${fmtTime(start)}–${fmtTime(end)}`;
/** "21/11/2026 08:00" */
export const fmtDateTime = (iso: string) => fullFmt.format(new Date(iso));
/** "2026-11-21" theo giờ Việt Nam, dùng cho <input type="date"> và tham số ngày của RPC */
export const vnDateInput = (d: Date | string = new Date()) => isoDateFmt.format(new Date(d));
/** "21/11/2026" từ chuỗi ngày thuần "2026-11-21" */
export const fmtPlainDate = (ymd: string) => ymd.split('-').reverse().join('/');
/** "27.000đ" */
export const fmtMoney = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
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
