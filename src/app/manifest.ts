import type { MetadataRoute } from 'next';
import tailwind from '../../tailwind.config';
import { APP_NAME } from '@/lib/constants';

// Màu khung lấy từ token `brand-deep` (cùng giá trị với `themeColor` ở layout.tsx). Không có service worker: chỉ để "Thêm vào màn hình chính".
const BRAND_DEEP = tailwind.theme.extend.colors.brand.deep;

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: 'Kết nối ca làm ngắn hạn giữa quán ở Vũng Tàu và học sinh, sinh viên.',
    start_url: '/',
    display: 'standalone',
    lang: 'vi',
    theme_color: BRAND_DEEP,
    background_color: BRAND_DEEP,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
