import Link from 'next/link';
import { createFacilityReview } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Empty, PageTitle, ShiftCard, btn, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import type { MyShift } from '@/lib/types';

export const metadata = { title: 'Ca của tôi' };

function ClaimBadge({ s }: { s: MyShift }) {
  if (s.attended === false) return <Badge tone="red">Không đến</Badge>;
  if (s.claim_status === 'cancelled') {
    return s.cancel_kind === 'late_cancel' ? <Badge tone="red">Hủy sát giờ</Badge> : <Badge tone="amber">Bạn đã hủy</Badge>;
  }
  return s.claim_role === 'primary' ? <Badge tone="green">Người chính</Badge> : <Badge tone="amber">Dự phòng</Badge>;
}

function Group({ title, hint, items, extra }: {
  title: string; hint?: string; items: MyShift[]; extra?: (s: MyShift) => React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-ink">{title} ({items.length})</h2>
        {hint ? <p className="text-base text-ink-soft">{hint}</p> : null}
      </div>
      <ul className="grid gap-4 lg:grid-cols-2">
        {items.map((s) => (
          <li key={s.id}>
            <ShiftCard
              shift={s}
              href={`/shifts/${s.id}`}
              showState
              extra={<div className="flex flex-wrap items-center gap-2"><ClaimBadge s={s} />{extra?.(s)}</div>}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

// Ca đã xác nhận mình có mặt, chưa đánh giá quán: mỗi ca một lần, không sửa sau khi gửi (trigger ở database).
function ReviewForm({ s }: { s: MyShift }) {
  return (
    <Card>
      <p className="mb-4 text-base font-semibold text-ink">Quán {s.facility_name} thế nào?</p>
      <ActionForm action={createFacilityReview}>
        <input type="hidden" name="shift_id" value={s.id} />
        <fieldset>
          <legend className="mb-2 text-base font-semibold text-ink">Chấm sao (1 thấp nhất, 5 cao nhất)</legend>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="flex min-h-[3.5rem] cursor-pointer flex-col items-center justify-center gap-1 rounded-ui border-2 border-rule-strong bg-white has-[:checked]:border-brand has-[:checked]:bg-brand-tint has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/30">
                <input type="radio" name="stars" value={n} required className="h-6 w-6 accent-brand" />
                <span className="tabular font-num text-xl font-bold leading-none text-ink">{n}<span className="sr-only"> sao</span></span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-2 block text-base font-semibold text-ink">Nhận xét (không bắt buộc)</span>
          <textarea name="comment" rows={3} maxLength={500} className={inputCls} />
          <span className="mt-2 block text-sm text-ink-soft">Quán không đọc được nhận xét của bạn. Đánh giá không sửa lại được sau khi gửi.</span>
        </label>
        <SubmitButton confirm="Đánh giá không sửa lại được sau khi gửi. Gửi đánh giá?">Gửi đánh giá</SubmitButton>
      </ActionForm>
    </Card>
  );
}

export default async function MyShiftsPage() {
  const { supabase } = await requireRole('worker');
  const [{ data, error }, { data: reviewed }] = await Promise.all([
    supabase.rpc('my_shifts'),
    supabase.from('facility_reviews').select('shift_id'), // RLS: chỉ đánh giá của chính mình
  ]);
  const all = (data ?? []) as MyShift[];
  const reviewedIds = new Set(((reviewed ?? []) as { shift_id: string }[]).map((r) => r.shift_id));
  const toReview = all
    .filter((s) => s.status === 'completed' && s.claim_status === 'active' && s.attended === true && !reviewedIds.has(s.id))
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());
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
      {error ? <Alert tone="red">{friendlyError(error)}</Alert> : null}

      {!error && all.length === 0 ? (
        <div className="space-y-4">
          <Empty>Bạn chưa nhận ca nào.</Empty>
          <Link href="/shifts" className={`${btn('primary', false)} w-full sm:w-auto`}>Tìm ca</Link>
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

      {toReview.length ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-ink">Đánh giá quán ({toReview.length})</h2>
            <p className="text-base text-ink-soft">Quán đã xác nhận bạn làm ca này. Mỗi ca đánh giá một lần.</p>
          </div>
          <ul className="grid gap-4 lg:grid-cols-2">
            {toReview.map((s) => (
              <li key={s.id} className="space-y-4">
                <ShiftCard shift={s} />
                <ReviewForm s={s} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {all.length ? (
        upcoming.length ? (
          <Group title="Sắp tới" items={upcoming} />
        ) : (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-ink">Sắp tới (0)</h2>
            <Empty>Bạn chưa có ca nào sắp tới.</Empty>
            <Link href="/shifts" className={`${btn('primary', false)} w-full sm:w-auto`}>Tìm ca</Link>
          </section>
        )
      ) : null}

      {past.length ? <Group title="Đã qua / đã hủy" items={past} /> : null}
    </div>
  );
}
