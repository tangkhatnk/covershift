import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import './globals.css';
import { APP_NAME, DISCLAIMER, NO_FEE } from '@/lib/constants';
import { getContext, homeFor } from '@/lib/auth';
import type { Role } from '@/lib/types';

export const metadata: Metadata = {
  title: { default: `${APP_NAME} – Ca làm ngắn hạn an toàn ở Vũng Tàu`, template: `%s · ${APP_NAME}` },
  description: 'Kết nối ca làm ngắn hạn giữa quán cà phê, nhà hàng, homestay, khách sạn nhỏ ở Vũng Tàu và học sinh, sinh viên.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#047857' };

const NAV: Record<Role, { href: string; label: string }[]> = {
  worker: [
    { href: '/ca', label: 'Tìm ca' },
    { href: '/ca-cua-toi', label: 'Ca của tôi' },
    { href: '/ho-so', label: 'Hồ sơ' },
  ],
  employer: [
    { href: '/quan', label: 'Ca của quán' },
    { href: '/quan/dang-ca', label: 'Đăng ca' },
    { href: '/tai-khoan', label: 'Tài khoản' },
  ],
  admin: [
    { href: '/admin', label: 'Điều phối' },
    { href: '/admin/co-so', label: 'Cơ sở' },
    { href: '/admin/nguoi-lam', label: 'Người làm' },
    { href: '/admin/bao-cao', label: 'Báo cáo' },
    { href: '/admin/kpi', label: 'KPI' },
    { href: '/admin/nhat-ky', label: 'Nhật ký' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getContext();
  const links = profile && profile.status === 'active' ? NAV[profile.role] : [];
  return (
    <html lang="vi">
      <body className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
            <Link href={profile ? homeFor(profile.role) : '/'} className="text-xl font-extrabold text-brand-700">
              {APP_NAME}
            </Link>
            {user ? (
              <Link href="/tai-khoan" className="text-base font-semibold text-slate-700 underline underline-offset-4">
                {profile?.full_name.split(' ').slice(-1)[0] ?? 'Tài khoản'}
              </Link>
            ) : (
              <Link href="/dang-nhap" className="text-base font-semibold text-brand-700 underline underline-offset-4">
                Đăng nhập
              </Link>
            )}
          </div>
          {links.length ? (
            <nav className="mx-auto flex max-w-xl gap-1 overflow-x-auto px-2 pb-2">
              {links.map((l) => (
                <Link key={l.href} href={l.href}
                  className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-base font-semibold text-slate-800 hover:bg-brand-100">
                  {l.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </header>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-5">{children}</main>
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-xl space-y-2 px-4 py-5 text-sm text-slate-600">
            <p className="text-base font-bold text-brand-700">{NO_FEE}</p>
            <p>{DISCLAIMER}</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <Link href="/dieu-khoan" className="underline underline-offset-4">Điều khoản</Link>
              <Link href="/chinh-sach-du-lieu" className="underline underline-offset-4">Chính sách dữ liệu</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
