import Link from 'next/link';
import type { ReactNode, Ref } from 'react';
import {
  Ban, ChevronDown, CircleAlert, CircleCheck, CirclePlay, DoorClosed, DoorOpen, Hourglass, Info, OctagonAlert, Phone, Star, TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { AREA_LABEL, DEMO_PHONE_NOTE, JOB_LABEL } from '@/lib/constants';
import {
  fmtDate, fmtDateRel, fmtMoney, fmtTime, hoursBetween, shiftState, SHIFT_STATE_LABEL, SHIFT_STATE_TONE, type ShiftState,
} from '@/lib/format';
import type { Shift } from '@/lib/types';

// Thành phần giao diện dùng chung ("Biển & Nắng"). Chữ to, nút cao tối thiểu 3rem cho người lớn tuổi.
// Khoảng cách luôn là bội của 0.5rem. Không đổ bóng, không viền trái màu.

export type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-deep active:bg-brand-deep',
  secondary: 'border-2 border-brand bg-white text-brand hover:bg-brand-tint',
  danger: 'bg-danger text-white hover:brightness-90',
  ghost: 'text-brand underline underline-offset-4 hover:bg-brand-tint',
};
/** className cho nút / link dạng nút. `full` = rộng hết khung (mặc định). */
export function btn(variant: BtnVariant = 'primary', full = true) {
  // Nhấn nút co nhẹ 0.97 trong 120ms (bỏ khi giảm chuyển động hoặc nút bị khóa); liệt kê thuộc tính, không `transition: all`.
  return `inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-ui px-6 py-2 text-lg font-semibold transition-[color,background-color,border-color,opacity,transform] duration-[120ms] motion-safe:active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${
    full ? 'w-full' : ''
  } ${BTN[variant]}`;
}

// Không đặt focus:outline-none: vòng focus 3px toàn cục (globals.css) phải hiện thật.
export const inputCls =
  'block w-full min-h-[3rem] rounded-ui border-2 border-rule-strong bg-white px-4 py-2 text-lg text-ink placeholder:text-ink-soft/80 focus:border-brand';

/**
 * Tiêu đề trang: chữ trên nền vôi, không có khối nền; một gạch nắng ngắn (3rem x 4,5px) dưới tiêu đề làm điểm nhấn.
 * Chiều cao ổn định theo số dòng chữ phụ; `SKELETON_TITLE` bên dưới khớp với nó (CLS 0).
 */
export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold leading-tight text-ink">{children}</h1>
      <div className="mt-2 h-1 w-12 rounded-sm bg-accent" aria-hidden="true" />
      {sub ? <p className="mt-2 text-base text-ink-soft">{sub}</p> : null}
    </div>
  );
}

/**
 * Mô-đun chữ nhật viền hairline. `tab` (tùy chọn) là dải đầu chứa DỮ LIỆU THẬT của mô-đun
 * (trạng thái, loại việc...), không phải nhãn trang trí.
 */
export function Card({ children, className = '', tab }: { children: ReactNode; className?: string; tab?: ReactNode }) {
  if (tab) {
    return (
      <section className={`overflow-hidden rounded-ui border border-rule bg-white ${className}`}>
        <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-accent-tint px-4 py-2">{tab}</div>
        <div className="p-4">{children}</div>
      </section>
    );
  }
  return <section className={`rounded-ui border border-rule bg-white p-4 ${className}`}>{children}</section>;
}

// 0, 1, 2 dòng chữ phụ (khớp `PageTitle`, đo ở 360–1440px: 47,25 / 83,25 / 110,25px; 2 dòng chỉ ở điện thoại)
const SKELETON_TITLE = ['h-[2.625rem]', 'h-[4.625rem]', 'h-[6.125rem] lg:h-[4.625rem]'] as const;

/**
 * Khung chờ cho `loading.tsx`. Mỗi khối có chiều cao xấp xỉ khối thật cùng vị trí (đo theo `PageTitle`, bộ lọc,
 * `ShiftCard`...) để khi dữ liệu về nội dung không nhảy (CLS); cả khung cao tối thiểu một màn hình nên chân trang
 * không chui vào tầm nhìn rồi bị đẩy xuống. Cấu hình theo trang thật, không có khối thừa "để dành".
 * - `gap`: `space-y-4` hay `space-y-6` của trang thật. `lead`: khối trước tiêu đề (`back` = link quay lại, `refresh` = dòng LiveRefresh).
 * - `sub`: số dòng chữ phụ của tiêu đề. `action`: nút chính to. `form`: ô lọc. `filter`: thanh "Bộ lọc" thu gọn, hàng chip ngày và (điện thoại) thanh Danh sách/Bản đồ của /shifts. `map`: bản đồ.
 * - `boxes`: chiều cao (lớp Tailwind) của từng mô-đun; `side`: mô-đun cột phải từ `lg` (xếp dưới cùng trên điện thoại).
 * Chỉ nhấp nháy khi người dùng không chọn giảm chuyển động.
 */
export function PageSkeleton({ gap = 4, lead, sub = 1, action = false, form = false, filter = false, map = false, boxes = [], side }: {
  gap?: 4 | 6; lead?: 'back' | 'refresh'; sub?: 0 | 1 | 2; action?: boolean; form?: boolean; filter?: boolean; map?: boolean; boxes?: string[]; side?: string;
}) {
  const box = (h: string, key: string | number) => (
    <div key={key} className={`${h} space-y-4 rounded-ui border border-rule bg-white p-4`}>
      <div className="h-6 w-2/3 rounded-ui bg-chalk" />
      <div className="h-4 w-1/2 rounded-ui bg-chalk" />
      <div className="h-4 w-1/3 rounded-ui bg-chalk" />
    </div>
  );
  const left = boxes.map((h, i) => box(h, i));
  return (
    <div role="status" aria-busy="true" className="min-h-dvh">
      <span className="sr-only">Đang tải…</span>
      <div aria-hidden="true" className={`${gap === 6 ? 'space-y-6' : 'space-y-4'} motion-safe:animate-pulse`}>
        {lead === 'back' ? <div className="h-12 w-40 rounded-ui bg-white" /> : null}
        <div className={`mb-6 space-y-2 ${SKELETON_TITLE[sub]}`}>
          <div className="h-7 w-2/3 rounded-ui bg-white" />
          <div className="h-1 w-12 rounded-sm bg-accent-tint" />
        </div>
        {lead === 'refresh' ? <div className="h-12 rounded-ui bg-white" /> : null}
        {action ? <div className="h-[3.75rem] w-full rounded-ui bg-brand-tint sm:w-56" /> : null}
        {form ? <div className="h-[17rem] rounded-ui border border-rule bg-white lg:h-28" /> : null}
        {filter ? (
          <>
            <div className="h-14 rounded-ui border border-rule bg-white" />
            <div className="h-12 w-60 rounded-ui bg-white" />
            <div className="h-14 rounded-ui border-2 border-brand-tint bg-white lg:hidden" />
          </>
        ) : null}
        {map ? <div className="h-72 rounded-ui border border-rule bg-chalk lg:h-96" /> : null}
        {side ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="space-y-4">{left}</div>
            {box(side, 'side')}
          </div>
        ) : left}
      </div>
    </div>
  );
}

export type Tone = 'green' | 'amber' | 'red' | 'gray' | 'blue';
const TONE: Record<Tone, string> = {
  green: 'bg-ok-tint text-ok',
  amber: 'border border-accent bg-white text-ink', // nền trắng + viền nắng: vẫn rõ khi nằm trên dải đầu thẻ `accent-tint`
  red: 'bg-danger-tint text-danger',
  gray: 'border border-rule bg-chalk text-ink-soft',
  blue: 'bg-info-tint text-info',
};
export function Badge({ tone = 'gray', icon, children }: { tone?: Tone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex min-h-[2rem] items-center gap-2 whitespace-nowrap rounded px-2 text-sm font-semibold ${TONE[tone]}`}>
      {icon}
      {children}
    </span>
  );
}

// Từ điển trạng thái ca: mỗi trạng thái một icon + chữ + màu (nhãn và màu lấy từ format.ts).
const STATE_ICON: Record<ShiftState, LucideIcon> = {
  open: DoorOpen,
  filled: DoorClosed,
  in_progress: CirclePlay,
  awaiting_confirm: Hourglass,
  expired: TriangleAlert,
  unfilled: CircleAlert,
  confirmed: CircleCheck,
  cancelled: Ban,
};
export function StateBadge({ state }: { state: ShiftState }) {
  const Icon = STATE_ICON[state];
  return (
    <Badge tone={SHIFT_STATE_TONE[state]} icon={<Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}>
      {SHIFT_STATE_LABEL[state]}
    </Badge>
  );
}

const ALERT: Record<Tone, { box: string; icon: string; Icon: LucideIcon }> = {
  green: { box: 'border-ok bg-ok-tint', icon: 'text-ok', Icon: CircleCheck },
  amber: { box: 'border-accent bg-accent-tint', icon: 'text-ink', Icon: TriangleAlert },
  red: { box: 'border-danger bg-danger-tint', icon: 'text-danger', Icon: OctagonAlert },
  gray: { box: 'border-rule-strong bg-white', icon: 'text-ink-soft', Icon: Info },
  blue: { box: 'border-info bg-info-tint', icon: 'text-info', Icon: Info },
};
/** Thông báo: nền nhạt + viền 1px + icon + chữ. Lỗi (tông đỏ) là `role="alert"`, còn lại `role="status"`. */
export function Alert({ tone = 'blue', role, ref, className = '', children }: {
  tone?: Tone; role?: 'alert' | 'status'; ref?: Ref<HTMLDivElement>; className?: string; children: ReactNode;
}) {
  const { box, icon, Icon } = ALERT[tone];
  return (
    <div ref={ref} role={role ?? (tone === 'red' ? 'alert' : 'status')}
      className={`flex gap-2 rounded-ui border px-4 py-2 text-base text-ink ${box} ${className}`}>
      <Icon className={`h-6 w-6 shrink-0 ${icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** Nhãn + ô nhập. Bọc input/select/textarea bên trong. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-semibold text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-sm text-ink-soft">{hint}</span> : null}
    </label>
  );
}

/** Ô tick to, dễ bấm. Hàng được chọn đổi nền và viền, không chỉ dựa vào dấu tick. */
export function Check({ name, value, defaultChecked, required, children }: {
  name: string; value?: string; defaultChecked?: boolean; required?: boolean; children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-4 rounded-ui border-2 border-rule-strong bg-white p-4 text-base has-[:checked]:border-brand has-[:checked]:bg-brand-tint">
      <input type="checkbox" name={name} value={value ?? 'on'} defaultChecked={defaultChecked} required={required}
        className="h-6 w-6 shrink-0 accent-brand" />
      <span>{children}</span>
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-ui border-2 border-dashed border-rule-strong p-6 text-center text-base text-ink-soft">{children}</p>;
}

/**
 * Link gọi điện, bấm là gọi. Mặc định `inline`: nằm giữa dòng chữ, không đổi chiều cao dòng
 * (py-2 chỉ nới vùng chạm, không nới dòng). `block`: đứng riêng một hàng, cao tối thiểu 3rem.
 */
export function Tel({ phone, block = false }: { phone: string | null | undefined; block?: boolean }) {
  if (!phone) return <span className="text-ink-soft">(chưa có số)</span>;
  return block ? (
    <a href={`tel:${phone}`} className="inline-flex min-h-[3rem] items-center gap-2 font-semibold text-brand underline underline-offset-4">
      <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
      {phone}
    </a>
  ) : (
    <a href={`tel:${phone}`} className="py-2 font-semibold text-brand underline underline-offset-4">{phone}</a>
  );
}

/** Dòng nhắc cạnh SĐT của quán: hotline trong seed là số thật của quán, nhưng app chỉ là bản mô phỏng. */
export function DemoPhoneNote() {
  return <p className="text-sm text-ink-soft">{DEMO_PHONE_NOTE}</p>;
}

/** Phần mở rộng (<details>): chạy bằng bàn phím, mũi tên xoay khi mở. Dòng tóm tắt cao tối thiểu 3rem. */
export function Disclosure({ summary, defaultOpen, children }: { summary: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex min-h-[3rem] cursor-pointer items-center justify-between gap-2 rounded-ui px-2 text-base font-semibold text-brand hover:bg-brand-tint">
        {summary}
        <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      {children}
    </details>
  );
}

export function Stars({ value }: { value: number | null | undefined }) {
  if (value == null) return null;
  const n = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span role="img" aria-label={`${value} trên 5 sao`} className="inline-flex items-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden="true"
          className={`h-5 w-5 ${i <= n ? 'fill-accent stroke-brand-deep' : 'fill-none stroke-rule-strong'}`} />
      ))}
    </span>
  );
}

// Một ô cửa chớp. Đã có người: cánh đóng (các thanh chớp). Còn chỗ: khung trống.
// Chỉ là hình minh họa (aria-hidden); chữ mô tả luôn hiện bên cạnh trong SlotStrip.
function Slot({ taken, backup }: { taken: boolean; backup?: boolean }) {
  return (
    <svg viewBox="0 0 24 32" className="h-10 w-8 shrink-0" aria-hidden="true">
      <rect x="1" y="1" width="22" height="30" rx="2"
        className={taken ? 'fill-brand stroke-brand-deep' : 'fill-white stroke-rule-strong'}
        strokeWidth="2" strokeDasharray={backup && !taken ? '4 3' : undefined} />
      {taken
        ? [8, 14, 20, 26].map((y) => <line key={y} x1="4" x2="20" y1={y} y2={y} className="stroke-white" strokeWidth="2" />)
        : null}
    </svg>
  );
}

/**
 * Dãy cửa chớp: mỗi ca là một dãy ô cửa. Ô người chính đóng = đã có người, mở = còn chỗ;
 * một ô dự phòng tách bằng một trụ. Luôn kèm câu chữ đọc được, không chỉ dựa vào hình và màu.
 */
export function SlotStrip({ headcount, primary, backup }: { headcount: number; primary: number; backup: number }) {
  const hasBackup = backup >= 1;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" aria-hidden="true">
        <div className="flex items-center gap-2">
          {Array.from({ length: headcount }, (_, i) => <Slot key={i} taken={i < primary} />)}
        </div>
        <div className="h-10 w-1 rounded-sm bg-rule" />
        <Slot taken={hasBackup} backup />
        <span className="text-sm font-semibold text-ink-soft">Dự phòng</span>
      </div>
      <p className="mt-2 text-base text-ink">
        {primary}/{headcount} người chính · {hasBackup ? 'đã có dự phòng' : 'chưa có dự phòng'}
      </p>
    </div>
  );
}

/** Thẻ tóm tắt một ca. `href` có thì cả thẻ là link. `extra` hiện dưới cùng (vd. nhãn "Bạn là người chính"). */
/** `now` (ms): Client Component phải nhận từ server để lần render đầu ở server và lúc hydrate cho cùng trạng thái ca. */
export function ShiftCard({ shift, href, extra, showState = false, now }: { shift: Shift; href?: string; extra?: ReactNode; showState?: boolean; now?: number }) {
  const state = shiftState(shift, now);
  const upcoming = state === 'open' || state === 'filled';
  const urgent = shift.urgent && upcoming;
  const body = (
    <article className={`overflow-hidden rounded-ui border bg-white ${urgent ? 'border-danger' : 'border-rule'} ${href ? 'hover:border-brand' : ''} transition-colors`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-accent-tint px-4 py-2">
        {urgent ? <Badge tone="red">GẤP</Badge> : null}
        <span className="text-base font-bold text-ink">{JOB_LABEL[shift.job_type]}</span>
        {shift.allow_minor ? <Badge tone="green">Hợp với người dưới 18</Badge> : null}
        {showState ? <StateBadge state={state} /> : null}
      </div>
      <div className="space-y-2 p-4">
        <div>
          <p className="text-base text-ink-soft">{now == null ? fmtDate(shift.starts_at) : fmtDateRel(shift.starts_at, now)} · {hoursBetween(shift.starts_at, shift.ends_at)} giờ</p>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4">
            <p className="tabular font-num text-4xl font-bold leading-tight text-ink">
              {fmtTime(shift.starts_at)}–{fmtTime(shift.ends_at)}
            </p>
            <p className="text-lg font-semibold text-brand">{fmtMoney(shift.hourly_wage)}/giờ</p>
          </div>
        </div>
        <p className="text-base text-ink">{shift.facility_name} · {AREA_LABEL[shift.area]}</p>
        {upcoming ? <SlotStrip headcount={shift.headcount} primary={shift.primary_count} backup={shift.backup_count} /> : null}
        {extra ? <div>{extra}</div> : null}
      </div>
    </article>
  );
  return href ? <Link href={href} className="block rounded-ui">{body}</Link> : body;
}

/**
 * Tờ đọc cho điều khoản và chính sách (chế độ Read): bề rộng đọc 40rem căn giữa, mục lục dính bên phải ở desktop
 * (link neo thuần, không cần JS), trên điện thoại mục lục nằm gọn trong <details>.
 */
export function Doc({ title, sub, toc, notice, children }: {
  title: string; sub: string; toc: { id: string; label: string }[]; notice: ReactNode; children: ReactNode;
}) {
  const links = (
    <ol className="space-y-2 text-base">
      {toc.map((t, i) => (
        <li key={t.id}>
          <a href={`#${t.id}`} className="flex min-h-[3rem] items-center rounded px-2 text-ink-soft hover:bg-accent-tint hover:text-ink">{i + 1}. {t.label}</a>
        </li>
      ))}
    </ol>
  );
  return (
    <div className="mx-auto max-w-[62rem] lg:flex lg:justify-center lg:gap-8">
      <div className="w-full min-w-0 lg:max-w-[40rem]">
        <PageTitle sub={sub}>{title}</PageTitle>
        <div className="mb-6">{notice}</div>
        <details className="mb-6 rounded-ui border border-rule bg-white lg:hidden">
          <summary className="flex min-h-[3rem] cursor-pointer items-center px-4 text-base font-semibold text-ink">Mục lục</summary>
          <nav aria-label="Mục lục" className="border-t border-rule p-2">{links}</nav>
        </details>
        <article className="rounded-ui border border-rule bg-white px-4 py-2 sm:px-8">{children}</article>
      </div>
      <aside className="hidden w-56 shrink-0 self-start lg:sticky lg:top-8 lg:block">
        <nav aria-label="Mục lục">
          <p className="mb-2 text-base font-bold text-ink">Mục lục</p>
          {links}
        </nav>
      </aside>
    </div>
  );
}

export function DocSection({ id, n, title, children }: { id: string; n: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 border-t border-rule py-6 first:border-t-0">
      <h2 className="text-xl font-bold text-ink">{n}. {title}</h2>
      <div className="mt-2 space-y-2 text-base leading-relaxed text-ink">{children}</div>
    </section>
  );
}

export const DocList = ({ children }: { children: ReactNode }) => (
  <ul className="list-disc space-y-2 pl-6 marker:text-brand">{children}</ul>
);
