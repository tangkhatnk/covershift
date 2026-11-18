export const APP_NAME = 'SafeShift';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
export const TZ = 'Asia/Ho_Chi_Minh';

export const DISCLAIMER = `${APP_NAME} chỉ kết nối người làm và nơi thuê. Lương, hợp đồng và điều kiện làm việc do hai bên tự thỏa thuận.`;
export const NO_FEE = 'Không bao giờ thu phí người làm.';

export const JOB_LABEL = {
  phuc_vu: 'Phục vụ',
  pha_che: 'Pha chế',
  thu_ngan: 'Thu ngân',
  don_phong: 'Dọn phòng',
  le_tan: 'Lễ tân',
  phu_bep_nhe: 'Phụ bếp nhẹ',
  ho_tro_su_kien: 'Hỗ trợ sự kiện',
} as const;
export type JobType = keyof typeof JOB_LABEL;

export const AREA_LABEL = {
  bai_truoc: 'Bãi Trước',
  bai_sau: 'Bãi Sau',
  thang_tam: 'Thắng Tam',
  trung_tam: 'Trung tâm',
  rach_dua: 'Rạch Dừa',
  khac: 'Khu vực khác',
} as const;
export type Area = keyof typeof AREA_LABEL;

export const FACILITY_TYPE_LABEL = {
  cafe: 'Quán cà phê',
  restaurant: 'Nhà hàng / quán ăn',
  homestay: 'Homestay',
  small_hotel: 'Khách sạn nhỏ',
} as const;
export type FacilityType = keyof typeof FACILITY_TYPE_LABEL;

export const PROHIBITED_TEXT = 'bar, karaoke, massage, công trường, việc dưới nước, giao hàng bằng xe máy';

export const AVAILABILITY_LABEL = {
  ngay_thuong_sang: 'Ngày thường – sáng',
  ngay_thuong_chieu: 'Ngày thường – chiều',
  ngay_thuong_toi: 'Ngày thường – tối',
  cuoi_tuan_sang: 'Cuối tuần – sáng',
  cuoi_tuan_chieu: 'Cuối tuần – chiều',
  cuoi_tuan_toi: 'Cuối tuần – tối',
} as const;

export const PAYMENT_LABEL = { full: 'Đủ', partial: 'Chưa đủ', unpaid: 'Chưa nhận' } as const;
export type PaymentAnswer = keyof typeof PAYMENT_LABEL;

export const REPORT_KIND_LABEL = {
  payment: 'Tiền công',
  late_cancel: 'Hủy sát giờ',
  primary_busy: 'Người chính báo bận',
  no_show: 'Không đến',
  user_report: 'Người dùng báo cáo',
} as const;

export const APPROVAL_LABEL = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' } as const;
export const CONSENT_LABEL = {
  pending: 'Phụ huynh chưa gửi',
  submitted: 'Phụ huynh đã gửi – chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Bị từ chối',
} as const;
export const FACILITY_STATUS_LABEL = { pending: 'Chờ xác minh', active: 'Đang hoạt động', removed: 'Đã gỡ' } as const;

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  verify_facility: 'Xác minh cơ sở',
  set_facility_status: 'Đổi trạng thái cơ sở',
  set_facility_location: 'Đặt vị trí cơ sở',
  approve_worker: 'Duyệt người làm',
  reject_worker: 'Từ chối người làm',
  lock_account: 'Khóa tài khoản',
  unlock_account: 'Mở khóa tài khoản',
  primary_busy: 'Người chính báo bận',
  resolve_report: 'Xử lý báo cáo',
  hide_comment: 'Ẩn/hiện nhận xét',
  set_config: 'Đổi cấu hình',
  cancel_shift: 'Hủy ca',
  swap_roles: 'Đổi thứ tự chính/dự phòng',
};
