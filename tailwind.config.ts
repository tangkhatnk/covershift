import type { Config } from 'tailwindcss';

// Bảng màu "Biển & Nắng" (theo chỉ thị chủ dự án 19/11/2026): nền vôi sáng, xanh biển làm khung và nút chính,
// vàng nắng làm điểm nhấn. Mọi cặp chữ/nền đã tính WCAG AA (xem DESIGN.md). Không viết mã hex trong trang, chỉ dùng tên ở đây.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  // `hover:` chỉ chạy trên thiết bị có con trỏ thật (@media (hover: hover) and (pointer: fine)): chạm trên điện thoại không bị kẹt trạng thái hover.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        chalk: '#F6F3EA', // nền vôi
        ink: { DEFAULT: '#0F2230', soft: '#42525E' },
        brand: { DEFAULT: '#0B5C8A', deep: '#083F5F', tint: '#DCEBF5' }, // xanh biển: khung, nút chính, liên kết
        accent: { DEFAULT: '#FFC247', tint: '#FFF1CE' }, // vàng nắng: điểm nhấn, mục đang chọn, cảnh báo nhẹ
        ok: { DEFAULT: '#146B45', tint: '#DAF0E4' }, // thành công
        danger: { DEFAULT: '#B8321F', tint: '#FBDFD8' }, // lỗi, nguy hiểm
        info: { DEFAULT: '#0F6F7E', tint: '#D4EDEF' }, // thông tin
        rule: { DEFAULT: '#D6D1BE', strong: '#6F7C86' }, // viền hairline / viền ô nhập
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        // Chữ số có bảng tabular (Be Vietnam Pro không có tnum): giờ ca thẳng cột.
        num: ['var(--font-num)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { ui: '6px' },
      // Chuyển động giao diện: ease-out mạnh, ngắn (<= 200ms). Mọi `transition-*` của Tailwind dùng mặc định này.
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.23, 1, 0.32, 1)' },
      transitionDuration: { DEFAULT: '150ms' },
    },
  },
  plugins: [],
} satisfies Config;
