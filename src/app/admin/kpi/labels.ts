import type { Kpis } from '@/lib/types';

/** [khóa trong admin_kpis(), nhãn tiếng Việt, đơn vị] — dùng chung cho trang KPI và route xuất CSV. */
export const KPI_LABELS: readonly (readonly [keyof Kpis, string, string])[] = [
  ['verified_facilities', 'Số cơ sở đã xác minh', 'cơ sở'],
  ['approved_workers', 'Số người làm đã duyệt', 'người'],
  ['shifts_posted', 'Số ca đã đăng', 'ca'],
  ['shifts_cancelled', 'Số ca bị hủy', 'ca'],
  ['shifts_filled', 'Số ca lấp thành công', 'ca'],
  ['fill_rate_pct', 'Tỷ lệ lấp ca', '%'],
  ['backup_promotions', 'Số lần người dự phòng vào thay', 'lần'],
  ['no_show_shifts', 'Số ca không ai đến', 'ca'],
  ['median_minutes_to_first_claim', 'Thời gian trung vị từ lúc đăng đến khi có người nhận', 'phút'],
  ['on_time_rate_pct', 'Tỷ lệ đúng giờ', '%'],
  ['avg_rating', 'Điểm trung bình', '/5'],
  ['paid_full_rate_pct', 'Tỷ lệ "đã trả đủ"', '%'],
];
