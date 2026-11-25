import type { Metadata } from 'next';
import Link from 'next/link';
import { adminHideFacilityReview } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Empty, Field, PageTitle, Stars, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { fmtDateTime } from '@/lib/format';
import type { AdminFacilityReview } from '@/lib/types';

export const metadata: Metadata = { title: 'Đánh giá quán', robots: { index: false, follow: false } };

export default async function AdminReviewsPage() {
  const { supabase } = await requireRole('admin');
  const { data, error } = await supabase.rpc('admin_list_facility_reviews');
  if (error) {
    return (
      <div className="space-y-4">
        <PageTitle>Đánh giá quán</PageTitle>
        <Alert tone="red">{friendlyError(error)}</Alert>
      </div>
    );
  }
  const list = (data ?? []) as AdminFacilityReview[];
  const hiddenCount = list.filter((r) => r.hidden).length;

  return (
    <div className="space-y-6">
      <PageTitle sub="Đánh giá bị ẩn không tính vào điểm trung bình của quán.">Đánh giá quán</PageTitle>
      <Alert tone="gray">{list.length} đánh giá, {hiddenCount} đang ẩn.</Alert>

      {list.length === 0 ? (
        <Empty>Chưa có đánh giá nào.</Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((r) => (
            <Card
              key={r.id}
              tab={<><Stars value={r.stars} />{r.hidden ? <Badge tone="red">Đang ẩn</Badge> : <Badge tone="green">Đang hiện</Badge>}</>}
            >
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="break-words text-lg font-semibold text-ink">{r.facility_name}</p>
                  <p className="break-words text-base text-ink-soft">
                    {r.worker_name} · {fmtDateTime(r.created_at)} ·{' '}
                    <Link href={`/employer/shifts/${r.shift_id}`} className="font-semibold text-brand underline underline-offset-4">Xem ca</Link>
                  </p>
                </div>
                {r.comment ? (
                  <p className="whitespace-pre-line break-words text-base text-ink">&ldquo;{r.comment}&rdquo;</p>
                ) : (
                  <p className="text-base text-ink-soft">Không có nhận xét.</p>
                )}
                <ActionForm action={adminHideFacilityReview}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="hidden" value={r.hidden ? 'false' : 'true'} />
                  <Field label="Lý do (không bắt buộc)">
                    <input name="reason" maxLength={200} className={inputCls} />
                  </Field>
                  <SubmitButton
                    variant={r.hidden ? 'secondary' : 'danger'}
                    confirm={r.hidden ? 'Hiện lại đánh giá này?' : 'Ẩn đánh giá này? Điểm trung bình của quán sẽ không tính đánh giá này.'}
                  >
                    {r.hidden ? 'Hiện lại đánh giá' : 'Ẩn đánh giá'}
                  </SubmitButton>
                </ActionForm>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
