import Link from 'next/link';
import { Alert, Badge, Empty, PageTitle, ShiftCard, btn } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import type { MyShift } from '@/lib/types';

export const metadata = { title: 'Ca của tôi' };

function ClaimBadge({ s }: { s: MyShift }) {
  if (s.attended === false) return <Badge tone="red">Không đến</Badge>;
  if (s.claim_status === 'cancelled') {
    return s.cancel_kind === 'late_cancel' ? <Badge tone="red">Hủy sát giờ</Badge> : <Badge tone="gray">Đã hủy</Badge>;
  }
  return s.claim_role === 'primary' ? <Badge tone="green">Người chính</Badge> : <Badge tone="amber">Dự phòng</Badge>;
}

function Group({ title, hint, items, extra }: {
  title: string; hint?: string; items: MyShift[]; extra?: (s: MyShift) => React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-slate-900">{title} ({items.length})</h2>
        {hint ? <p className="text-base text-slate-600">{hint}</p> : null}
      </div>
      <ul className="space-y-3">
        {items.map((s) => (
          <li key={s.id}>
            <ShiftCard
              shift={s}
              href={`/ca/${s.id}`}
              showState
              extra={<div className="flex flex-wrap items-center gap-2"><ClaimBadge s={s} />{extra?.(s)}</div>}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function MyShiftsPage() {
  const { supabase } = await requireRole('worker');
  const { data, error } = await supabase.rpc('my_shifts');
  const all = (data ?? []) as MyShift[];
  const now = Date.now();
  const t = (iso: string) => new Date(iso).getTime();

  const upcoming: MyShift[] = [];
  const needAnswer: MyShift[] = [];
  const past: MyShift[] = [];
  for (const s of all) {
    const live = s.claim_status === 'active' && s.status !== 'cancelled';
    const ended = t(s.ends_at) <= now;
    if (live && !ended) upcoming.push(s);
    else if (live && ended && s.claim_role === 'primary' && s.attended !== false && s.my_payment == null) needAnswer.push(s);
    else past.push(s);
  }
  upcoming.sort((a, b) => t(a.starts_at) - t(b.starts_at));
  needAnswer.sort((a, b) => t(b.starts_at) - t(a.starts_at));
  past.sort((a, b) => t(b.starts_at) - t(a.starts_at));

  return (
    <div className="space-y-6">
      <PageTitle sub="Các ca bạn đã nhận.">Ca của tôi</PageTitle>
      {error ? <Alert tone="red">{error.message}</Alert> : null}

      {!error && all.length === 0 ? (
        <div className="space-y-3">
          <Empty>Bạn chưa nhận ca nào.</Empty>
          <Link href="/ca" className={btn('primary')}>Tìm ca</Link>
        </div>
      ) : null}

      {needAnswer.length ? (
        <Group
          title="Cần bạn trả lời"
          hint="Bấm vào ca để cho biết bạn đã nhận đủ tiền công chưa."
          items={needAnswer}
          extra={() => <Badge tone="amber">Chưa trả lời tiền công</Badge>}
        />
      ) : null}

      {all.length ? (
        upcoming.length ? (
          <Group title="Sắp tới" items={upcoming} />
        ) : (
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900">Sắp tới (0)</h2>
            <Empty>Bạn chưa có ca nào sắp tới.</Empty>
            <Link href="/ca" className={btn('primary')}>Tìm ca</Link>
          </section>
        )
      ) : null}

      {past.length ? <Group title="Đã qua / đã hủy" items={past} /> : null}
    </div>
  );
}
