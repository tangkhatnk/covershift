import Link from 'next/link';
import { adminCloseJobPost } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Empty, Field, PageTitle, btn, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import type { EmployerJobPost } from '@/lib/types';
import { JobCard } from '@/app/jobs/_parts';

export const metadata = { title: 'Tin tuyển dụng' };

export default async function AdminJobsPage() {
  // Admin: employer_job_posts() trả mọi tin của mọi cơ sở.
  const { supabase } = await requireRole('admin');
  const { data, error } = await supabase.rpc('employer_job_posts');
  const jobs = (data ?? []) as EmployerJobPost[];
  const open = jobs.filter((j) => j.status === 'open');
  const closed = jobs.filter((j) => j.status !== 'open');

  const card = (j: EmployerJobPost) => (
    <JobCard key={j.id} job={j}
      extra={
        <div className="space-y-4">
          <p className="text-base text-ink">Chờ xem: <b>{j.applied_count}</b> · Đã chọn: <b>{j.shortlisted_count}</b></p>
          <Link href={`/employer/jobs/${j.id}`} className={`${btn('secondary')}`}>Xem người ứng tuyển</Link>
          {j.status === 'open' ? (
            <ActionForm action={adminCloseJobPost}>
              <input type="hidden" name="job_id" value={j.id} />
              <Field label="Lý do đóng tin" hint="Ghi vào nhật ký. Ví dụ: tin có dấu hiệu thu phí.">
                <input name="reason" required maxLength={300} className={inputCls} />
              </Field>
              <SubmitButton variant="danger" confirm="Đóng tin này? Không hoàn tác được.">Đóng tin</SubmitButton>
            </ActionForm>
          ) : null}
        </div>
      } />
  );

  return (
    <div className="space-y-6">
      <PageTitle sub="Mọi tin tuyển dụng lâu dài của các cơ sở. Đóng tin khi có dấu hiệu vi phạm.">Tin tuyển dụng</PageTitle>
      {error ? (
        <Alert tone="red">{friendlyError(error)}</Alert>
      ) : jobs.length === 0 ? (
        <Empty>Chưa có tin tuyển dụng nào.</Empty>
      ) : (
        <>
          {open.length ? (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-ink">Đang mở <span className="font-normal text-ink-soft">({open.length})</span></h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{open.map(card)}</div>
            </section>
          ) : null}
          {closed.length ? (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-ink">Đã đóng <span className="font-normal text-ink-soft">({closed.length})</span></h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{closed.map(card)}</div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
