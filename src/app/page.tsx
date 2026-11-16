import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Alert, Card, btn } from '@/components/ui';
import { getContext, homeFor } from '@/lib/auth';
import { APP_NAME, NO_FEE } from '@/lib/constants';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ 'da-xoa'?: string }> }) {
  const { user, profile } = await getContext();
  if (user && profile) redirect(profile.status === 'locked' ? '/tai-khoan' : homeFor(profile.role));
  if (user) redirect('/dang-ky');
  const sp = await searchParams;
  return (
    <div className="space-y-5">
      {sp['da-xoa'] ? <Alert tone="green">Tài khoản và toàn bộ dữ liệu của bạn đã được xóa.</Alert> : null}
      <div>
        <h1 className="text-3xl font-extrabold leading-tight text-slate-900">Ca làm ngắn hạn, an toàn ở Vũng Tàu</h1>
        <p className="mt-2 text-lg text-slate-700">
          {APP_NAME} kết nối quán cà phê, nhà hàng, homestay, khách sạn nhỏ đã được xác minh với học sinh (từ 15 tuổi) và sinh viên.
        </p>
      </div>
      <Link href="/dang-nhap" className={btn('primary')}>Bắt đầu</Link>
      <Card>
        <h2 className="text-xl font-bold">Dành cho người làm</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-slate-700">
          <li>{NO_FEE} Không đặt cọc, không giữ giấy tờ.</li>
          <li>Chỉ có việc phù hợp: phục vụ, pha chế, thu ngân, dọn phòng, lễ tân, phụ bếp nhẹ, hỗ trợ sự kiện.</li>
          <li>Dưới 18 tuổi: chỉ ca kết thúc trước 22:00, tối đa 8 giờ, có phụ huynh đồng ý.</li>
          <li>Mỗi ca xong được ghi vào hồ sơ ca làm để bạn đi xin việc sau này.</li>
        </ul>
      </Card>
      <Card>
        <h2 className="text-xl font-bold">Dành cho chủ quán</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-slate-700">
          <li>Đăng ca trong 1 phút. Mỗi ca có người chính và người dự phòng.</li>
          <li>Người làm đã được nhóm vận hành duyệt.</li>
          <li>Sau ca chỉ cần bấm link xác nhận, không cần đăng nhập.</li>
        </ul>
      </Card>
    </div>
  );
}
