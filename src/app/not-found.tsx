import Link from 'next/link';
import { PageTitle, btn } from '@/components/ui';
import { getContext, homeFor } from '@/lib/auth';

export const metadata = { title: 'Không tìm thấy trang' };

export default async function NotFound() {
  const { profile } = await getContext();
  return (
    <div className="space-y-6">
      <PageTitle sub="Trang này không có hoặc link đã cũ.">Không tìm thấy trang</PageTitle>
      <p className="text-base text-ink">Bạn kiểm tra lại link, hoặc quay về trang chính rồi mở lại từ đó.</p>
      <div className="sm:max-w-xs">
        <Link href={profile ? homeFor(profile.role) : '/'} className={btn('primary')}>
          {profile ? 'Về trang chính' : 'Về trang chủ'}
        </Link>
      </div>
    </div>
  );
}
