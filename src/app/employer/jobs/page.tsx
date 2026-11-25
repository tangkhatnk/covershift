import Link from 'next/link';
import { CirclePlus } from 'lucide-react';
import { Alert, Empty, PageTitle, btn } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import type { EmployerJobPost } from '@/lib/types';
import { JobCard } from '@/app/jobs/_parts';

export const metadata = { title: 'Tin tuyển dụng của quán' };

function Group({ title, jobs }: { title: string; jobs: EmployerJobPost[] }) {
  if (!jobs.length) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-ink">{title} <span className="font-normal text-ink-soft">({jobs.length})</span></h2>
      <div className="stagger grid gap-4 md:grid-cols-2">
        {jobs.map((j) => (
          <JobCard key={j.id} job={j} href={`/employer/jobs/${j.id}`}
            extra={<p className="text-base text-ink">Chờ xem: <b>{j.applied_count}</b> · Đã chọn: <b>{j.shortlisted_count}</b></p>} />
        ))}
      </div>
    </section>
  );
}

export default async function EmployerJobsPage() {
  const { supabase } = await requireRole('employer');
  const { data, error } = await supabase.rpc('employer_job_posts');
  const jobs = (data ?? []) as EmployerJobPost[];
  const open = jobs.filter((j) => j.status === 'open' && !j.expired);
  const rest = jobs.filter((j) => !(j.status === 'open' && !j.expired));

  return (
    <div className="space-y-6">
      <PageTitle sub="Tin tuyển người làm đều đặn hằng tuần, khác với ca làm ngắn hạn.">Tin tuyển dụng</PageTitle>
      <Link href="/employer/jobs/new" className={`${btn('primary')} sm:w-auto`}>
        <CirclePlus className="h-5 w-5" aria-hidden="true" />
        Đăng tin tuyển dụng
      </Link>
      {error ? (
        <Alert tone="red">{friendlyError(error)}</Alert>
      ) : jobs.length === 0 ? (
        <Empty>Quán chưa đăng tin tuyển dụng nào.</Empty>
      ) : (
        <>
          <Group title="Đang tuyển" jobs={open} />
          <Group title="Đã đóng hoặc hết hạn" jobs={rest} />
        </>
      )}
    </div>
  );
}
