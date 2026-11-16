import Link from 'next/link';
import type { ReactNode } from 'react';
import { AREA_LABEL, JOB_LABEL } from '@/lib/constants';
import { fmtMoney, fmtRange, hoursBetween, shiftState, SHIFT_STATE_LABEL, SHIFT_STATE_TONE } from '@/lib/format';
import type { Shift } from '@/lib/types';

// Thành phần giao diện dùng chung. Chữ to, nút cao tối thiểu 48px cho người lớn tuổi.

export type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-white text-slate-900 border-2 border-slate-300 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-brand-700 underline underline-offset-4',
};
/** className cho nút / link dạng nút. `full` = rộng hết khung (mặc định). */
export function btn(variant: BtnVariant = 'primary', full = true) {
  return `inline-flex min-h-[3rem] items-center justify-center rounded-xl px-5 py-3 text-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
    full ? 'w-full' : ''
  } ${BTN[variant]}`;
}

export const inputCls =
  'block w-full min-h-[3rem] rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-lg text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none';

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold leading-tight text-slate-900">{children}</h1>
      {sub ? <p className="mt-1 text-base text-slate-600">{sub}</p> : null}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</section>;
}

export type Tone = 'green' | 'amber' | 'red' | 'gray' | 'blue';
const TONE: Record<Tone, string> = {
  green: 'bg-emerald-100 text-emerald-900',
  amber: 'bg-amber-100 text-amber-900',
  red: 'bg-red-100 text-red-900',
  gray: 'bg-slate-200 text-slate-800',
  blue: 'bg-sky-100 text-sky-900',
};
export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${TONE[tone]}`}>{children}</span>;
}

const ALERT: Record<Tone, string> = {
  green: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  amber: 'border-amber-300 bg-amber-50 text-amber-900',
  red: 'border-red-300 bg-red-50 text-red-900',
  gray: 'border-slate-300 bg-slate-50 text-slate-800',
  blue: 'border-sky-300 bg-sky-50 text-sky-900',
};
export function Alert({ tone = 'blue', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div role="status" className={`rounded-xl border-2 px-4 py-3 text-base ${ALERT[tone]}`}>
      {children}
    </div>
  );
}

/** Nhãn + ô nhập. Bọc input/select/textarea bên trong. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-base font-semibold text-slate-900">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-sm text-slate-600">{hint}</span> : null}
    </label>
  );
}

/** Ô tick to, dễ bấm. */
export function Check({ name, value, defaultChecked, required, children }: {
  name: string; value?: string; defaultChecked?: boolean; required?: boolean; children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-300 bg-white p-3 text-base">
      <input type="checkbox" name={name} value={value ?? 'on'} defaultChecked={defaultChecked} required={required}
        className="mt-0.5 h-6 w-6 shrink-0 accent-brand-600" />
      <span>{children}</span>
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border-2 border-dashed border-slate-300 p-6 text-center text-base text-slate-600">{children}</p>;
}

/** Link gọi điện, bấm là gọi. */
export function Tel({ phone }: { phone: string | null | undefined }) {
  if (!phone) return <span className="text-slate-500">(chưa có số)</span>;
  return <a href={`tel:${phone}`} className="font-semibold text-brand-700 underline underline-offset-4">{phone}</a>;
}

export function Stars({ value }: { value: number | null | undefined }) {
  if (value == null) return null;
  const n = Math.round(value);
  return <span aria-label={`${value} trên 5 sao`} className="text-amber-500">{'★'.repeat(n)}<span className="text-slate-300">{'★'.repeat(5 - n)}</span></span>;
}

/** Thẻ tóm tắt một ca. `href` có thì cả thẻ là link. `extra` hiện dưới cùng (vd. nhãn "Bạn là người chính"). */
export function ShiftCard({ shift, href, extra, showState = false }: { shift: Shift; href?: string; extra?: ReactNode; showState?: boolean }) {
  const state = shiftState(shift);
  const primaryLeft = Math.max(shift.headcount - shift.primary_count, 0);
  const body = (
    <div className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${shift.urgent && state === 'open' ? 'border-red-400' : 'border-slate-200'}`}>
      <div className="flex flex-wrap items-center gap-2">
        {shift.urgent && (state === 'open' || state === 'filled') ? <Badge tone="red">GẤP</Badge> : null}
        <Badge tone="blue">{JOB_LABEL[shift.job_type]}</Badge>
        {shift.allow_minor ? <Badge tone="green">Nhận dưới 18 tuổi</Badge> : null}
        {showState ? <Badge tone={SHIFT_STATE_TONE[state]}>{SHIFT_STATE_LABEL[state]}</Badge> : null}
      </div>
      <p className="mt-2 text-xl font-bold text-slate-900">{fmtRange(shift.starts_at, shift.ends_at)}</p>
      <p className="text-base text-slate-700">
        {shift.facility_name} · {AREA_LABEL[shift.area]}
      </p>
      <p className="mt-1 text-lg font-semibold text-brand-700">
        {fmtMoney(shift.hourly_wage)}/giờ <span className="font-normal text-slate-600">· {hoursBetween(shift.starts_at, shift.ends_at)} giờ</span>
      </p>
      {!showState && state === 'open' ? (
        <p className="text-base text-slate-600">Còn {primaryLeft} chỗ chính{shift.backup_count < 1 ? ', 1 chỗ dự phòng' : ''}</p>
      ) : null}
      {!showState && state === 'filled' && shift.backup_count < 1 ? <p className="text-base text-slate-600">Còn 1 chỗ dự phòng</p> : null}
      {extra ? <div className="mt-2">{extra}</div> : null}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}
