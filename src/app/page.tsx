import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { ShiftMap, type MapPoint } from '@/components/map';
import { Alert, ShiftCard, SlotStrip, btn } from '@/components/ui';
import { getContext, homeFor } from '@/lib/auth';
import { APP_NAME, NO_FEE } from '@/lib/constants';
import { vnDateInput } from '@/lib/format';
import type { Shift } from '@/lib/types';

/** Ca minh họa cho trang chủ: ngày mai theo giờ Việt Nam, dữ liệu mẫu, không phải ca thật. */
function sampleShift(): Shift {
  const day = vnDateInput(new Date(Date.now() + 24 * 3_600_000));
  return {
    id: 'minh-hoa', facility_id: 'minh-hoa', job_type: 'pha_che',
    starts_at: `${day}T08:00:00+07:00`, ends_at: `${day}T12:00:00+07:00`,
    headcount: 3, hourly_wage: 27000, description: null, urgent: false, allow_minor: false, status: 'open',
    created_at: `${day}T00:00:00+07:00`, facility_name: 'Quán Demo 1', facility_type: 'cafe', area: 'bai_truoc',
    address: '', maps_url: null, lat: null, lng: null, primary_count: 2, backup_count: 0, my_role: null,
  };
}

/** Ghim minh họa: tọa độ bốn quán demo đã xác minh trong supabase/seed.sql. Không phải dữ liệu thật. */
const DEMO_PINS: MapPoint[] = [
  { id: 'd1', lat: 10.3441, lng: 107.0749, text: 'Demo 1', label: 'Quán Demo 1, quán cà phê', tone: 'open' },
  { id: 'd2', lat: 10.3318, lng: 107.089, text: 'Demo 2', label: 'Quán Demo 2, nhà hàng', tone: 'open' },
  { id: 'd3', lat: 10.338, lng: 107.0853, text: 'Demo 3', label: 'Quán Demo 3, homestay', tone: 'open' },
  { id: 'd4', lat: 10.3524, lng: 107.0881, text: 'Demo 4', label: 'Quán Demo 4, khách sạn nhỏ', tone: 'open' },
];

function Point({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-rule py-6 lg:grid-cols-[16rem_1fr] lg:gap-8">
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      <div className="space-y-4 text-base text-ink">{children}</div>
    </div>
  );
}

function Step({ caption, headcount, primary, backup }: { caption: string; headcount: number; primary: number; backup: number }) {
  return (
    <div className="space-y-2 rounded-ui border border-rule bg-white p-4">
      <p className="text-base font-semibold text-ink">{caption}</p>
      <SlotStrip headcount={headcount} primary={primary} backup={backup} />
    </div>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ 'da-xoa'?: string }> }) {
  const { user, profile } = await getContext();
  if (user && profile) redirect(profile.status === 'locked' ? '/tai-khoan' : homeFor(profile.role));
  if (user) redirect('/dang-ky');
  const sp = await searchParams;
  return (
    <div>
      <section className="bg-wall">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:py-16">
          <div className="space-y-6">
            {sp['da-xoa'] ? <Alert tone="green">Tài khoản và toàn bộ dữ liệu của bạn đã được xóa.</Alert> : null}
            <h1 className="text-4xl font-bold leading-tight text-ink lg:text-5xl">Ca làm ngắn hạn, an toàn ở Vũng Tàu</h1>
            <p className="text-lg text-ink">
              {APP_NAME} kết nối quán cà phê, nhà hàng, homestay, khách sạn nhỏ đã được xác minh với học sinh (từ 15 tuổi) và sinh viên.
            </p>
            <p className="flex items-center gap-2 text-lg font-bold text-ink">
              <ShieldCheck className="h-6 w-6 shrink-0" aria-hidden="true" />
              {NO_FEE}
            </p>
            <div className="sm:max-w-xs">
              <Link href="/dang-nhap" className={btn('primary')}>Bắt đầu</Link>
            </div>
          </div>
          <div className="space-y-2">
            <ShiftCard shift={sampleShift()} />
            <p className="text-base text-ink">Ví dụ minh họa: ca mẫu, không phải ca thật.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-4 px-4 py-8 lg:px-8 lg:py-16">
        <h2 className="text-3xl font-bold text-ink">Ca nằm ở đâu trên bản đồ</h2>
        <p className="text-base text-ink">Người làm xem quán nào gần nhà trước khi nhận ca. Chủ quán tự ghim vị trí quán.</p>
        <ShiftMap points={DEMO_PINS} className="h-96 lg:h-[28rem]" caption="Bản đồ minh họa, dữ liệu mẫu" />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:py-16">
        <h2 className="mb-6 text-3xl font-bold text-ink">Những gì giữ cho ca làm an toàn</h2>
        <Point title="Mỗi ca có một người dự phòng">
          <p>
            Người nhận ca sau khi đã đủ người chính là người dự phòng. Nếu người chính hủy, người dự phòng tự lên thay,
            chủ quán không phải đăng lại ca.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <Step caption="Ca còn chỗ" headcount={2} primary={1} backup={0} />
            <Step caption="Đủ người chính, đã có dự phòng" headcount={2} primary={2} backup={1} />
            <Step caption="Người chính hủy, dự phòng lên thay" headcount={2} primary={2} backup={0} />
          </div>
          <p className="text-base text-ink-soft">Ví dụ minh họa.</p>
        </Point>
        <Point title="Chỉ cơ sở đã xác minh tận nơi mới đăng ca">
          <p>Nhóm vận hành đến tận nơi kiểm tra địa chỉ và người liên hệ của quán trước khi quán được đăng ca.</p>
        </Point>
        <Point title="Rào an toàn cho người dưới 18 tuổi">
          <p>
            Người dưới 18 tuổi chỉ thấy và nhận được ca trong khoảng 06:00–22:00, dài tối đa 8 giờ, và cần phụ huynh đồng ý.
            Các giới hạn này được chặn ngay trong cơ sở dữ liệu, không chỉ trên màn hình.
          </p>
        </Point>
        <Point title="Ca đã xác nhận thành hồ sơ ca làm">
          <p>
            Sau ca, chủ quán xác nhận bằng một link, không cần đăng nhập. Ca đã xác nhận vào hồ sơ ca làm của người làm;
            hồ sơ chỉ chia sẻ khi người làm bật.
          </p>
        </Point>
      </section>

      <section className="border-t border-rule bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-16">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-ink">Dành cho người làm</h2>
            <ul className="list-disc space-y-2 pl-6 text-base text-ink marker:text-shutter">
              <li>{NO_FEE} Không đặt cọc, không giữ giấy tờ.</li>
              <li>Chỉ có việc phù hợp: phục vụ, pha chế, thu ngân, dọn phòng, lễ tân, phụ bếp nhẹ, hỗ trợ sự kiện.</li>
              <li>Dưới 18 tuổi: chỉ ca kết thúc trước 22:00, tối đa 8 giờ, có phụ huynh đồng ý.</li>
              <li>Mỗi ca xong được ghi vào hồ sơ ca làm để bạn đi xin việc sau này.</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-ink">Dành cho chủ quán</h2>
            <ul className="list-disc space-y-2 pl-6 text-base text-ink marker:text-shutter">
              <li>Đăng ca trong 1 phút. Mỗi ca có người chính và người dự phòng.</li>
              <li>Người làm đã được nhóm vận hành duyệt.</li>
              <li>Sau ca chỉ cần bấm link xác nhận, không cần đăng nhập.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-wall">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="text-lg font-semibold text-ink">Đây là bản mô phỏng, chỉ có dữ liệu mẫu.</p>
          <div className="sm:w-64">
            <Link href="/dang-nhap" className={btn('primary')}>Vào xem bản mô phỏng</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
