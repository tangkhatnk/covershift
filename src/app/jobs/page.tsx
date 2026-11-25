import Link from 'next/link';
import { Alert, Badge, Empty, Field, PageTitle, btn, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { EMPLOYMENT_LABEL, JOB_LABEL } from '@/lib/constants';
import { friendlyError } from '@/lib/errors';
import type { JobPost } from '@/lib/types';
import { JobCard, one } from './_parts';

export const metadata = { title: 'Việc làm lâu dài' };

export default async function JobsPage({ searchParams }: {
  searchParams: Promise<{ viec?: string | string[]; hinh?: string | string[] }>;
}) {
  const { supabase } = await requireRole('worker');
  const sp = await searchParams;
  // Chỉ nhận giá trị hợp lệ; giá trị lạ coi như không lọc.
  const viec = Object.hasOwn(JOB_LABEL, one(sp.viec)) ? one(sp.viec) : '';
  const hinh = Object.hasOwn(EMPLOYMENT_LABEL, one(sp.hinh)) ? one(sp.hinh) : '';
  const filtering = Boolean(viec || hinh);

  const { data, error } = await supabase.rpc('feed_job_posts', { p_job: viec || null, p_employment: hinh || null });
  const jobs = (data ?? []) as JobPost[];

  return (
    <div className="space-y-4">
      <PageTitle sub="Việc làm đều đặn hằng tuần ở quán đã được xác minh. Hiện chỉ dành cho bạn từ 18 tuổi.">Việc làm lâu dài</PageTitle>

      <form method="get" className="grid grid-cols-2 gap-4 rounded-ui border border-rule bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Loại việc">
          <select name="viec" defaultValue={viec} className={inputCls}>
            <option value="">Tất cả</option>
            {Object.entries(JOB_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Hình thức">
          <select name="hinh" defaultValue={hinh} className={inputCls}>
            <option value="">Tất cả</option>
            {Object.entries(EMPLOYMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <div className="col-span-2 flex items-center gap-4 sm:col-span-1">
          <button type="submit" className={`${btn('primary')} sm:px-8`}>Lọc</button>
          {filtering ? <Link href="/jobs" className={`${btn('ghost', false)} whitespace-nowrap`}>Bỏ lọc</Link> : null}
        </div>
      </form>

      {error ? (
        // Chưa được duyệt, dưới 18 tuổi hoặc lỗi hệ thống: hiện đúng câu của database.
        <Alert tone={error.code === 'P0001' ? 'amber' : 'red'}>
          {friendlyError(error)}{' '}
          {error.code === 'P0001' ? <Link href="/profile" className="font-semibold text-brand underline underline-offset-4">Xem hồ sơ của tôi</Link> : null}
        </Alert>
      ) : jobs.length === 0 ? (
        <Empty>{filtering ? 'Không có tin nào khớp bộ lọc. Thử bỏ lọc xem sao.' : 'Hiện chưa có tin tuyển dụng nào. Bạn quay lại sau nhé.'}</Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((j) => (
            <JobCard key={j.id} job={j} href={`/jobs/${j.id}`}
              tab={j.my_application ? <Badge tone="green">Bạn đã ứng tuyển</Badge> : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
