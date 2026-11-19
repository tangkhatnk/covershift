import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Barlow_Condensed, Be_Vietnam_Pro } from 'next/font/google';
import './globals.css';
import { AppShell } from '@/components/client';
import { APP_NAME, DISCLAIMER, NO_FEE } from '@/lib/constants';
import { getContext, homeFor } from '@/lib/auth';

// Font tự host qua next/font (tải lúc build, không gọi CDN khi người dùng mở trang).
const sans = Be_Vietnam_Pro({ subsets: ['latin', 'vietnamese'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' });
// Be Vietnam Pro không có chữ số tabular; giờ ca dùng Barlow Condensed (có tnum) để các giờ thẳng cột.
const num = Barlow_Condensed({ subsets: ['latin', 'vietnamese'], weight: ['600', '700'], variable: '--font-num', display: 'swap' });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} – Ca làm ngắn hạn an toàn ở Vũng Tàu`, template: `%s · ${APP_NAME}` },
  description: 'Kết nối ca làm ngắn hạn giữa quán cà phê, nhà hàng, homestay, khách sạn nhỏ ở Vũng Tàu và học sinh, sinh viên.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#083F5F' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getContext();
  const role = profile && profile.status === 'active' ? profile.role : null;
  return (
    <html lang="vi" className={`${sans.variable} ${num.variable}`}>
      <body className="font-sans">
        <AppShell
          role={role}
          signedIn={!!user}
          userName={profile?.full_name.split(' ').slice(-1)[0] ?? null}
          homeHref={profile ? homeFor(profile.role) : '/'}
          footer={
            <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 lg:px-8">
              <p className="text-lg font-bold text-accent">{NO_FEE}</p>
              <p className="text-base text-brand-tint">{DISCLAIMER}</p>
              <p className="flex flex-wrap gap-x-6 text-base font-semibold">
                <Link href="/terms" className="inline-flex min-h-[3rem] items-center underline">Điều khoản</Link>
                <Link href="/privacy" className="inline-flex min-h-[3rem] items-center underline">Chính sách dữ liệu</Link>
              </p>
            </div>
          }
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
