// Đường dẫn cũ (tiếng Việt) → mới (tiếng Anh), theo chỉ thị chủ dự án 19/11/2026. Redirect vĩnh viễn (308), giữ query string.
// Chỉ dùng đường dẫn chính xác (không wildcard rộng) để `/quan` không nuốt `/quan/ca/:id`, `/h` không nuốt đường dẫn khác.
const LEGACY_PATHS = [
  ['/dang-nhap', '/login'],
  ['/dang-ky', '/register'],
  ['/dang-ky/nguoi-lam', '/register/worker'],
  ['/dang-ky/chu-quan', '/register/employer'],
  ['/ca', '/shifts'],
  ['/ca/:id', '/shifts/:id'],
  ['/ca-cua-toi', '/my-shifts'],
  ['/ho-so', '/profile'],
  ['/tai-khoan', '/account'],
  ['/quan', '/employer'],
  ['/quan/dang-ca', '/employer/new-shift'],
  ['/quan/ca/:id', '/employer/shifts/:id'],
  ['/admin/co-so', '/admin/facilities'],
  ['/admin/nguoi-lam', '/admin/workers'],
  ['/admin/bao-cao', '/admin/reports'],
  ['/admin/nhat-ky', '/admin/audit'],
  ['/xac-nhan/:token', '/confirm/:token'],
  ['/dong-y/:token', '/consent/:token'],
  ['/h/:slug', '/p/:slug'],
  ['/dieu-khoan', '/terms'],
  ['/chinh-sach-du-lieu', '/privacy'],
  ['/auth/dang-xuat', '/auth/logout'], // 308 giữ nguyên phương thức POST của form đăng xuất
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return LEGACY_PATHS.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  async headers() {
    return [
      {
        // Trang có token / hồ sơ cá nhân: không cho máy tìm kiếm lập chỉ mục, không lộ token qua Referer.
        source: '/(confirm|consent|p)/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};
export default nextConfig;
