import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Alert, PageTitle, btn } from '@/components/ui';
import { getContext, homeFor } from '@/lib/auth';
import { NO_FEE } from '@/lib/constants';

export const metadata = { title: 'Đăng ký' };

export default async function RegisterPage() {
  const { user, profile } = await getContext();
  if (!user) redirect('/dang-nhap');
  if (profile) redirect(profile.status === 'locked' ? '/tai-khoan' : homeFor(profile.role));
  return (
    <div className="space-y-4">
      <PageTitle sub="Chọn đúng một trong hai. Sau này muốn đổi thì liên hệ nhóm vận hành.">Bạn là ai?</PageTitle>
      <Link href="/dang-ky/nguoi-lam" className={`${btn('primary')} min-h-[5rem] text-center text-xl`}>
        Tôi tìm việc (học sinh, sinh viên)
      </Link>
      <Link href="/dang-ky/chu-quan" className={`${btn('secondary')} min-h-[5rem] text-center text-xl`}>
        Tôi là chủ quán / cơ sở
      </Link>
      <Alert tone="green">
        Đăng ký và sử dụng hoàn toàn miễn phí. {NO_FEE} Không đặt cọc, không giữ giấy tờ.
      </Alert>
    </div>
  );
}
