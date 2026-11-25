import Link from 'next/link';
import { Alert, Badge, Empty, PageTitle, btn } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { APPLICATION_STATUS_LABEL, APPLICATION_STATUS_TONE, fmtDate } from '@/lib/format';
import type { MyApplication } from '@/lib/types';
import { ContactBox, JobCard } from '../jobs/_parts';

export const metadata = { title: 'Đơn ứng tuyển của tôi' };

export default async function MyApplicationsPage() {
  const { supabase } = await requireRole('worker');
  const { data, error } = await supabase.rpc('my_applications');
  const apps = (data ?? []) as MyApplication[];

  // SĐT quán chỉ lấy cho đơn đã được chọn hoặc nhận; các lượt gọi độc lập nên chạy song song.
  const contacts = await Promise.all(
    apps.map((a) => (a.status === 'shortlisted' || a.status === 'hired'
      ? supabase.rpc('get_job_contacts', { p_application: a.id })
      : null)),
  );

  return (
    <div className="space-y-4">
      <PageTitle sub="Các tin bạn đã ứng tuyển và phản hồi của quán.">Đơn ứng tuyển của tôi</PageTitle>
      {error ? (
        <Alert tone="red">{friendlyError(error)}</Alert>
      ) : apps.length === 0 ? (
        <>
          <Empty>Bạn chưa ứng tuyển tin nào.</Empty>
          <Link href="/jobs" className={`${btn('secondary')} sm:w-auto`}>Xem việc làm lâu dài</Link>
        </>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {apps.map((a, i) => {
            const c = contacts[i];
            return (
              <JobCard key={a.id} job={a.job}
                tab={<Badge tone={APPLICATION_STATUS_TONE[a.status]}>{APPLICATION_STATUS_LABEL[a.status]}</Badge>}
                extra={
                  <div className="space-y-2">
                    <p className="text-base text-ink-soft">Nộp ngày {fmtDate(a.created_at)}</p>
                    {a.note ? <p className="whitespace-pre-line break-words text-base text-ink">&ldquo;{a.note}&rdquo;</p> : null}
                    {c ? <ContactBox res={c} /> : null}
                    <Link href={`/jobs/${a.job.id}`} className="inline-flex min-h-[3rem] items-center font-semibold text-brand underline underline-offset-4">Xem tin</Link>
                  </div>
                } />
            );
          })}
        </div>
      )}
    </div>
  );
}
