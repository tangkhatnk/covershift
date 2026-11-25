import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { HeroFx } from '@/components/hero-fx';
import { ShiftMap, type MapPoint } from '@/components/map';
import { Alert, SlotStrip, StateBadge, btn } from '@/components/ui';
import { getContext, homeFor } from '@/lib/auth';
import { APP_NAME, AREA_LABEL, JOB_LABEL, NO_FEE } from '@/lib/constants';
import { fmtDate, fmtMoney, fmtTime, hoursBetween, vnDateInput } from '@/lib/format';

/** Ca minh họa ở hero: ngày mai theo giờ Việt Nam, tên quán chung chung, dữ liệu mẫu, không phải ca thật. */
function sampleTicket() {
  const day = vnDateInput(new Date(Date.now() + 24 * 3_600_000));
  const starts = `${day}T08:00:00+07:00`;
  const ends = `${day}T12:00:00+07:00`;
  return {
    date: fmtDate(starts), time: `${fmtTime(starts)}–${fmtTime(ends)}`, hours: hoursBetween(starts, ends),
    wage: fmtMoney(27000), place: `Quán cà phê mẫu · ${AREA_LABEL.bai_truoc}`,
  };
}

/** Ghim minh họa: tọa độ ba quán đã xác minh trong supabase/seed.sql (gần đúng, không phải ca thật), trải rộng theo kinh độ để không chồng nhau ở 360px. */
const DEMO_PINS: MapPoint[] = [
  { id: 'd1', lat: 10.3477, lng: 107.0743, text: '1', label: 'Phê La Vũng Tàu, quán cà phê', tone: 'open' },
  { id: 'd2', lat: 10.3553, lng: 107.0614, text: '2', label: 'OASIS SEA Coffee & Tea, quán cà phê', tone: 'open' },
  { id: 'd3', lat: 10.3531, lng: 107.0871, text: '3', label: 'Texas Chicken, nhà hàng', tone: 'open' },
];

const STEPS: { title: string; text: string }[] = [
  { title: 'Xác minh quán tận nơi', text: 'Nhóm vận hành đến quán, kiểm tra địa chỉ và người liên hệ. Chưa xác minh thì chưa đăng được ca.' },
  { title: 'Quán đăng ca', text: 'Chọn loại việc, giờ làm, số người và mức lương. Quán tick cam kết không thu phí, không đặt cọc, không giữ giấy tờ.' },
  { title: 'Người làm nhận ca', text: 'Người nhận đầu tiên là người chính. Hết chỗ chính thì người nhận kế là người dự phòng.' },
  { title: 'Trước ca', text: 'Người chính hủy thì người dự phòng tự lên thay. Quán không phải đăng lại ca.' },
  { title: 'Sau ca', text: 'Chủ quán xác nhận bằng một link, không cần đăng nhập. Link dùng một lần, trong 72 giờ sau khi ca kết thúc.' },
  { title: 'Hồ sơ ca làm', text: 'Ca đã xác nhận vào hồ sơ ca làm của người làm. Hồ sơ chỉ chia sẻ khi người làm bật.' },
];

// Chuyển động duy nhất của hero, chạy một lần: người chính hủy (ô tắt), ô dự phòng trượt lên chỗ đó (500ms, ease-out).
// Giảm chuyển động: không trượt, chỉ mờ dần và hiện dần. 3,25rem = một ô (2rem) + khoảng cách (0,5rem) + trụ (0,25rem) + khoảng cách (0,5rem).
const TICKET_CSS = `
@keyframes tk-cancel{to{opacity:0}}
@keyframes tk-up{to{transform:translateX(-3.25rem)}}
@keyframes tk-out{to{opacity:0}}
@keyframes tk-in{to{opacity:1}}
.tk-keep{animation:tk-cancel 150ms cubic-bezier(0.23,1,0.32,1) 900ms forwards}
.tk-out{animation:tk-up 500ms cubic-bezier(0.23,1,0.32,1) 1000ms forwards}
.tk-in{opacity:0}
.tk-base{animation:tk-cancel 1ms linear 1500ms forwards}
@media (prefers-reduced-motion:reduce){
.tk-out{animation:tk-out 200ms ease-out 900ms forwards}
.tk-in{animation:tk-in 200ms ease-out 900ms forwards}
}`;

// Ô cửa chớp của vé ca (cùng hình với `Slot` trong ui.tsx, thêm `className` để xếp chồng và chạy chuyển động).
function Door({ taken, backup, className = '' }: { taken: boolean; backup?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 32" className={`h-10 w-8 shrink-0 ${className}`} aria-hidden="true">
      <rect x="1" y="1" width="22" height="30" rx="2"
        className={taken ? 'fill-brand stroke-brand-deep' : 'fill-white stroke-rule-strong'}
        strokeWidth="2" strokeDasharray={backup && !taken ? '4 3' : undefined} />
      {taken ? [8, 14, 20, 26].map((y) => <line key={y} x1="4" x2="20" y1={y} y2={y} className="stroke-white" strokeWidth="2" />) : null}
    </svg>
  );
}

function Ticket() {
  const t = sampleTicket();
  return (
    <div className="space-y-2">
      <style>{TICKET_CSS}</style>
      <article className="overflow-hidden rounded-ui border border-rule bg-white text-ink">
        <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-accent-tint px-4 py-2">
          <span className="text-base font-bold text-ink">{JOB_LABEL.pha_che}</span>
          <StateBadge state="filled" />
        </div>
        <div className="space-y-2 p-4">
          <div>
            <p className="text-base text-ink-soft">{t.date}</p>
            <p className="tabular font-num text-5xl font-bold leading-none text-ink lg:text-6xl">{t.time}</p>
          </div>
          <p className="text-base text-ink">{t.place}</p>
          <p className="text-lg font-semibold text-brand">
            {t.wage}/giờ <span className="font-normal text-ink-soft">· {t.hours} giờ</span>
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2" aria-hidden="true">
            <div className="flex items-center gap-2">
              <Door taken />
              <span className="relative block h-10 w-8 shrink-0">
                <Door taken={false} className="tk-base" />
                <Door taken className="tk-keep absolute inset-0" />
                <Door taken className="tk-in absolute inset-0" />
              </span>
            </div>
            <div className="h-10 w-1 rounded-sm bg-rule" />
            <span className="relative block h-10 w-8 shrink-0">
              <Door taken={false} backup />
              <Door taken className="tk-out absolute inset-0" />
            </span>
            <span className="text-sm font-semibold text-ink-soft">Dự phòng</span>
          </div>
          <p className="text-base text-ink">Người chính hủy, người dự phòng tự lên thay.</p>
        </div>
      </article>
      <p className="text-base text-white">Ví dụ minh họa, dữ liệu mẫu.</p>
    </div>
  );
}

function Point({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-rule py-6 lg:grid-cols-[16rem_1fr] lg:gap-8">
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      <div className="space-y-4 text-base text-ink">{children}</div>
    </div>
  );
}

function Demo({ caption, headcount, primary, backup }: { caption: string; headcount: number; primary: number; backup: number }) {
  return (
    <div className="space-y-2 rounded-ui border border-rule bg-white p-4">
      <p className="text-base font-semibold text-ink">{caption}</p>
      <SlotStrip headcount={headcount} primary={primary} backup={backup} />
    </div>
  );
}

// Nút chính trên nền xanh biển đậm: vàng nắng (nút `primary` xanh biển sẽ chìm vào nền). Cùng kích thước và nhấn nút như `btn()`.
const HERO_CTA =
  'inline-flex min-h-[3.75rem] w-full items-center justify-center rounded-ui bg-accent px-6 py-2 text-lg font-semibold text-ink transition-[color,background-color,transform] duration-[120ms] hover:bg-accent-tint motion-safe:active:scale-[0.97]';

export default async function HomePage({ searchParams }: { searchParams: Promise<{ 'da-xoa'?: string }> }) {
  const { user, profile } = await getContext();
  if (user && profile) redirect(profile.status === 'locked' ? '/account' : homeFor(profile.role));
  if (user) redirect('/register');
  const sp = await searchParams;
  return (
    <div>
      <section className="surface-dark relative isolate overflow-hidden bg-brand-deep text-white">
        <HeroFx />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:min-h-[34rem] lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-center lg:gap-16 lg:px-8 lg:py-16">
          <div className="space-y-6">
            {sp['da-xoa'] ? <Alert tone="green">Tài khoản và toàn bộ dữ liệu của bạn đã được xóa.</Alert> : null}
            <h1 className="text-4xl font-bold leading-tight text-white lg:text-5xl">Ca gấp có người. Đi làm an toàn.</h1>
            <div className="space-y-2 text-lg text-white">
              <p className="font-semibold text-accent">Mỗi ca là một dòng kinh nghiệm thật.</p>
              <p>{APP_NAME} kết nối quán đã xác minh tận nơi ở Vũng Tàu với học sinh từ 15 tuổi và sinh viên.</p>
            </div>
            <p className="flex items-center gap-2 text-lg font-bold text-white">
              <ShieldCheck className="h-6 w-6 shrink-0 text-accent" aria-hidden="true" />
              {NO_FEE}
            </p>
            <div className="sm:max-w-xs">
              <Link href="/login" className={HERO_CTA}>Dùng thử bản mô phỏng</Link>
            </div>
          </div>
          <Ticket />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 lg:px-8 lg:py-16">
        <h2 className="mb-6 text-3xl font-bold text-ink">Cách hoạt động</h2>
        <ol className="grid gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t border-rule pt-4">
              <span className="tabular font-num text-5xl font-bold leading-none text-brand" aria-hidden="true">{i + 1}</span>
              <h3 className="mt-2 text-xl font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-base text-ink">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 space-y-4">
          <p className="text-lg font-semibold text-ink">Một ca cần 2 người, từ lúc nhận đến lúc có người hủy</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Demo caption="Ca còn chỗ" headcount={2} primary={1} backup={0} />
            <Demo caption="Đủ người chính, đã có dự phòng" headcount={2} primary={2} backup={1} />
            <Demo caption="Người chính hủy, dự phòng lên thay" headcount={2} primary={2} backup={0} />
          </div>
          <p className="text-base text-ink-soft">Ví dụ minh họa.</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-4 px-4 pb-8 lg:px-8 lg:pb-16">
        <h2 className="text-3xl font-bold text-ink">Ca nằm ở đâu trên bản đồ</h2>
        <p className="text-base text-ink">Người làm xem quán nào gần nhà trước khi nhận ca. Chủ quán tự ghim vị trí quán.</p>
        <ShiftMap points={DEMO_PINS} className="h-96 lg:h-[28rem]" caption="Bản đồ minh họa, dữ liệu mẫu" />
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-8 lg:px-8 lg:pb-16">
        <h2 className="mb-6 text-3xl font-bold text-ink">Những gì giữ cho ca làm an toàn</h2>
        <Point title="Chỉ quán đã xác minh mới đăng ca">
          <p>
            Nhóm vận hành đến tận nơi kiểm tra địa chỉ và người liên hệ trước khi quán được đăng ca. Chỉ nhận quán cà phê,
            nhà hàng, homestay và khách sạn nhỏ; cơ sở có tên bar, pub, club, karaoke hay mát xa bị chặn.
          </p>
        </Point>
        <Point title="Rào an toàn cho người dưới 18 tuổi">
          <p>
            Người dưới 18 tuổi chỉ thấy và nhận được ca trong khoảng 06:00–22:00, dài tối đa 8 giờ, do quán cho phép nhận
            người dưới 18 tuổi. Người làm cần phụ huynh đồng ý và nhóm vận hành duyệt. Các giới hạn này được chặn ngay trong
            cơ sở dữ liệu, không chỉ trên màn hình.
          </p>
        </Point>
        <Point title="Giới hạn cho mọi người làm">
          <p>
            Không nhận quá 40 giờ mỗi tuần và không nhận hai ca trùng giờ. Ca có mức lương thấp hơn mức tối thiểu bị từ chối
            ngay khi quán đăng.
          </p>
        </Point>
        <Point title="Không thu phí, không đặt cọc">
          <p>Mỗi ca đăng đều kèm cam kết của quán: không thu phí, không đặt cọc, không giữ giấy tờ của người làm.</p>
        </Point>
      </section>

      <section className="border-t border-rule bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-16">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-ink">Dành cho người làm</h2>
            <ul className="list-disc space-y-2 pl-6 text-base text-ink marker:text-brand">
              <li>Không đặt cọc, không giữ giấy tờ.</li>
              <li>Chỉ có việc phù hợp: phục vụ, pha chế, thu ngân, dọn phòng, lễ tân, phụ bếp nhẹ, hỗ trợ sự kiện.</li>
              <li>Dưới 18 tuổi: chỉ ca kết thúc trước 22:00, tối đa 8 giờ, có phụ huynh đồng ý.</li>
              <li>Mỗi ca xong được ghi vào hồ sơ ca làm để bạn đi xin việc sau này.</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-ink">Dành cho chủ quán</h2>
            <ul className="list-disc space-y-2 pl-6 text-base text-ink marker:text-brand">
              <li>Đăng ca bằng một biểu mẫu ngắn. Mỗi ca có người chính và người dự phòng.</li>
              <li>Người làm đã được nhóm vận hành duyệt.</li>
              <li>Sau ca chỉ cần bấm link xác nhận, không cần đăng nhập.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-accent">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p className="text-lg font-semibold text-ink">Đây là bản mô phỏng, chỉ có dữ liệu mẫu.</p>
          <div className="sm:w-80">
            <Link href="/login" className={btn('primary')}>Dùng thử bản mô phỏng</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
