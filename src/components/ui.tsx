import Link from 'next/link';
import type { ReactNode, Ref } from 'react';
import {
  Ban, ChevronDown, CircleAlert, CircleCheck, CirclePlay, DoorClosed, DoorOpen, Hourglass, Info, OctagonAlert, Phone, Star, TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { AREA_LABEL, JOB_LABEL } from '@/lib/constants';
import {
  fmtDate, fmtMoney, fmtTime, hoursBetween, shiftState, SHIFT_STATE_LABEL, SHIFT_STATE_TONE, type ShiftState,
} from '@/lib/format';
import type { Shift } from '@/lib/types';

// Thành phần giao diện dùng chung ("Phố cửa chớp"). Chữ to, nút cao tối thiểu 3rem cho người lớn tuổi.
// Khoảng cách luôn là bội của 0.5rem. Không đổ bóng, không viền trái màu.

export type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-shutter text-white hover:bg-shutter-deep active:bg-shutter-deep',
  secondary: 'border-2 border-shutter bg-white text-shutter hover:bg-shutter-tint',
  danger: 'bg-roof text-white hover:brightness-90',
  ghost: 'text-shutter underline underline-offset-4 hover:bg-shutter-tint',
};
/** className cho nút / link dạng nút. `full` = rộng hết khung (mặc định). */
export function btn(variant: BtnVariant = 'primary', full = true) {
  return `inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-ui px-6 py-2 text-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
    full ? 'w-full' : ''
  } ${BTN[variant]}`;
}

// Không đặt focus:outline-none: vòng focus 3px toàn cục (globals.css) phải hiện thật.
export const inputCls =
  'block w-full min-h-[3rem] rounded-ui border-2 border-rule-strong bg-white px-4 py-2 text-lg text-ink placeholder:text-ink-soft/80 focus:border-shutter';

/** Băng tiêu đề trang: tường vàng, một việc chính của trang nằm ngay dưới. */
export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6 rounded-ui bg-wall px-4 py-4">
      <h1 className="text-2xl font-bold leading-tight text-ink">{children}</h1>
      {sub ? <p className="mt-2 text-base text-shutter-deep">{sub}</p> : null}
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
        <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-wall-tint px-4 py-2">{tab}</div>
        <div className="p-4">{children}</div>
      </section>
    );
  }
  return <section className={`rounded-ui border border-rule bg-white p-4 ${className}`}>{children}</section>;
}

export type Tone = 'green' | 'amber' | 'red' | 'gray' | 'blue';
const TONE: Record<Tone, string> = {
  green: 'bg-shutter-tint text-shutter-deep',
  amber: 'bg-wall-tint text-ink',
  red: 'bg-roof-tint text-roof',
  gray: 'border border-rule bg-chalk text-ink-soft',
  blue: 'bg-sea-tint text-sea',
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
  green: { box: 'border-shutter bg-shutter-tint', icon: 'text-shutter', Icon: CircleCheck },
  amber: { box: 'border-wall bg-wall-tint', icon: 'text-ink', Icon: TriangleAlert },
  red: { box: 'border-roof bg-roof-tint', icon: 'text-roof', Icon: OctagonAlert },
  gray: { box: 'border-rule-strong bg-white', icon: 'text-ink-soft', Icon: Info },
  blue: { box: 'border-sea bg-sea-tint', icon: 'text-sea', Icon: Info },
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
    <label className="flex cursor-pointer items-start gap-4 rounded-ui border-2 border-rule-strong bg-white p-4 text-base has-[:checked]:border-shutter has-[:checked]:bg-shutter-tint">
      <input type="checkbox" name={name} value={value ?? 'on'} defaultChecked={defaultChecked} required={required}
        className="h-6 w-6 shrink-0 accent-shutter" />
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
    <a href={`tel:${phone}`} className="inline-flex min-h-[3rem] items-center gap-2 font-semibold text-shutter underline underline-offset-4">
      <Phone className="h-5 w-5 shrink-0" aria-hidden="true" />
      {phone}
    </a>
  ) : (
    <a href={`tel:${phone}`} className="py-2 font-semibold text-shutter underline underline-offset-4">{phone}</a>
  );
}

/** Phần mở rộng (<details>): chạy bằng bàn phím, mũi tên xoay khi mở. Dòng tóm tắt cao tối thiểu 3rem. */
export function Disclosure({ summary, defaultOpen, children }: { summary: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex min-h-[3rem] cursor-pointer items-center justify-between gap-2 rounded-ui px-2 text-base font-semibold text-shutter hover:bg-shutter-tint">
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
          className={`h-5 w-5 ${i <= n ? 'fill-wall stroke-shutter-deep' : 'fill-none stroke-rule-strong'}`} />
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
        className={taken ? 'fill-shutter stroke-shutter-deep' : 'fill-white stroke-rule-strong'}
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
export function ShiftCard({ shift, href, extra, showState = false }: { shift: Shift; href?: string; extra?: ReactNode; showState?: boolean }) {
  const state = shiftState(shift);
  const upcoming = state === 'open' || state === 'filled';
  const urgent = shift.urgent && upcoming;
  const body = (
    <article className={`overflow-hidden rounded-ui border bg-white ${urgent ? 'border-roof' : 'border-rule'} ${href ? 'hover:border-shutter' : ''}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-wall-tint px-4 py-2">
        {urgent ? <Badge tone="red">GẤP</Badge> : null}
        <span className="text-base font-bold text-ink">{JOB_LABEL[shift.job_type]}</span>
        {shift.allow_minor ? <Badge tone="green">Nhận dưới 18 tuổi</Badge> : null}
        {showState ? <StateBadge state={state} /> : null}
      </div>
      <div className="space-y-2 p-4">
        <div>
          <p className="text-base text-ink-soft">{fmtDate(shift.starts_at)}</p>
          <p className="tabular font-num text-4xl font-bold leading-tight text-ink">
            {fmtTime(shift.starts_at)}–{fmtTime(shift.ends_at)}
          </p>
        </div>
        <p className="text-base text-ink">{shift.facility_name} · {AREA_LABEL[shift.area]}</p>
        <p className="text-lg font-semibold text-shutter">
          {fmtMoney(shift.hourly_wage)}/giờ <span className="font-normal text-ink-soft">· {hoursBetween(shift.starts_at, shift.ends_at)} giờ</span>
        </p>
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
          <a href={`#${t.id}`} className="flex min-h-[3rem] items-center rounded px-2 text-ink-soft hover:bg-wall-tint hover:text-ink">{i + 1}. {t.label}</a>
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
  <ul className="list-disc space-y-2 pl-6 marker:text-shutter">{children}</ul>
);
