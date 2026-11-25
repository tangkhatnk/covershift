import Link from 'next/link';
import { Badge, SlotStrip } from '@/components/ui';
import { JOB_LABEL } from '@/lib/constants';
import { fmtDate, fmtMoney, fmtTime, hoursBetween } from '@/lib/format';
import type { PublicShiftCard } from '@/lib/types';

/** Thẻ ca công khai (/f và /s): không SĐT, không danh sách người nhận. `href` có thì cả thẻ là link. */
export function PublicShiftBox({ shift: s, href }: { shift: PublicShiftCard; href?: string }) {
  const body = (
    <article className={`overflow-hidden rounded-ui border bg-white transition-colors ${s.urgent ? 'border-danger' : 'border-rule'} ${href ? 'hover:border-brand' : ''}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-accent-tint px-4 py-2">
        {s.urgent ? <Badge tone="red">GẤP</Badge> : null}
        <span className="text-base font-bold text-ink">{JOB_LABEL[s.job_type]}</span>
        <Badge tone={s.adults_only ? 'amber' : 'green'}>{s.adults_only ? 'Chỉ từ 18 tuổi' : 'Nhận dưới 18 tuổi'}</Badge>
      </div>
      <div className="space-y-2 p-4">
        <div>
          <p className="text-base text-ink-soft">{fmtDate(s.starts_at)}</p>
          <p className="tabular font-num text-4xl font-bold leading-tight text-ink">{fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}</p>
        </div>
        <p className="text-lg font-semibold text-brand">
          {fmtMoney(s.hourly_wage)}/giờ <span className="font-normal text-ink-soft">· {hoursBetween(s.starts_at, s.ends_at)} giờ</span>
        </p>
        <SlotStrip headcount={s.headcount} primary={s.headcount - s.primary_left} backup={s.backup_open ? 0 : 1} />
      </div>
    </article>
  );
  return href ? <Link href={href} className="block rounded-ui">{body}</Link> : body;
}
