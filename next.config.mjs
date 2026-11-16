/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Trang có token / hồ sơ cá nhân: không cho máy tìm kiếm lập chỉ mục, không lộ token qua Referer.
        source: '/(xac-nhan|dong-y|h)/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
        ],
      },
    ];
  },
};
export default nextConfig;
