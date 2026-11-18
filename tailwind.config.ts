import type { Config } from 'tailwindcss';

// Bảng màu "Phố cửa chớp": tường vàng, cửa chớp xanh, nền vôi. Mọi cặp chữ/nền đã tính WCAG AA
// (xem PRODUCT.md và báo cáo thiết kế). Không viết mã hex trong trang, chỉ dùng tên ở đây.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chalk: '#F6F4E8', // nền vôi
        ink: { DEFAULT: '#17231D', soft: '#46524B' },
        shutter: { DEFAULT: '#1F5C45', deep: '#153F30', tint: '#DDEBE3' }, // xanh cửa chớp
        wall: { DEFAULT: '#F2C94C', tint: '#FBF0C4' }, // tường vàng
        roof: { DEFAULT: '#B0391F', tint: '#F8DDD5' }, // ngói (lỗi, nguy hiểm)
        sea: { DEFAULT: '#1C5F8A', tint: '#D6E6EF' }, // biển (thông tin)
        rule: { DEFAULT: '#CFCAB2', strong: '#7C8479' }, // viền hairline / viền ô nhập
        // Tên cũ, giữ để các trang chưa làm lại vẫn có màu (sẽ bỏ khi các trang đó được làm lại).
        brand: { 50: '#DDEBE3', 100: '#DDEBE3', 600: '#1F5C45', 700: '#153F30', 800: '#153F30' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        // Chữ số có bảng tabular (Be Vietnam Pro không có tnum): giờ ca thẳng cột.
        num: ['var(--font-num)', 'system-ui', 'sans-serif'],
      },
      borderRadius: { ui: '6px' },
    },
  },
  plugins: [],
} satisfies Config;
