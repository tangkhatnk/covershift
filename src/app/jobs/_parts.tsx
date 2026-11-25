import Link from 'next/link';
import { Badge, DemoPhoneNote, Tel } from '@/components/ui';
import { AREA_LABEL, EMPLOYMENT_LABEL, JOB_LABEL } from '@/lib/constants';
import { friendlyError } from '@/lib/errors';
import { fmtDate, fmtWageRange } from '@/lib/format';
import type { JobContacts, JobPost } from '@/lib/types';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/** Đã đóng hoặc hết hạn thì ghi rõ; còn mở thì null. */
export function jobClosedBadge(j: Pick<JobPost, 'status' | 'expired'>) {
  if (j.status === 'closed') return <Badge tone="gray">Đã đóng</Badge>;
  if (j.expired) return <Badge tone="gray">Hết hạn</Badge>;
  return null;
}

/** Thẻ tóm tắt một tin tuyển dụng. `href` có thì cả thẻ là link; `extra` hiện dưới cùng. */
export function JobCard({ job, href, extra, tab }: { job: JobPost; href?: string; extra?: React.ReactNode; tab?: React.ReactNode }) {
  const body = (
    <article className={`overflow-hidden rounded-ui border border-rule bg-white transition-colors ${href ? 'hover:border-brand' : ''}`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-rule bg-accent-tint px-4 py-2">
        <span className="text-base font-bold text-ink">{JOB_LABEL[job.job_type]}</span>
        <Badge tone="blue">{EMPLOYMENT_LABEL[job.employment]}</Badge>
        {jobClosedBadge(job)}
        {tab}
      </div>
      <div className="space-y-2 p-4">
        <h2 className="break-words text-xl font-bold leading-snug text-ink">{job.title}</h2>
        <p className="break-words text-base text-ink">{job.facility_name} · {AREA_LABEL[job.area]}</p>
        <p className="text-lg font-semibold text-brand">{fmtWageRange(job)}</p>
        <p className="text-base text-ink-soft">
          {job.hours_per_week} giờ/tuần · cần {job.openings} người · đã nhận {job.hired_count}
        </p>
        {job.status === 'open' && !job.expired ? <p className="text-base text-ink-soft">Nhận đơn đến {fmtDate(job.expires_at)}</p> : null}
        {extra ? <div>{extra}</div> : null}
      </div>
    </article>
  );
  return href ? <Link href={href} className="block rounded-ui">{body}</Link> : body;
}

/**
 * SĐT của đơn đã được chọn / nhận (kết quả get_job_contacts, hoặc lỗi của nó). Chỉ chỗ này hiện SĐT trong nhóm trang tuyển dụng.
 * SĐT quán hiện kèm dòng nhắc dữ liệu mô phỏng.
 */
export function ContactBox({ res }: { res: { data: unknown; error: { code?: string; message: string } | null } }) {
  if (res.error) return <p className="text-base text-ink-soft">{friendlyError(res.error)}</p>;
  const c = res.data as JobContacts | null;
  if (!c) return null;
  return (
    <div className="space-y-2 rounded-ui border border-rule bg-chalk p-4">
      {c.facility ? (
        <div>
          <p className="text-lg">
            Liên hệ quán: <b className="break-words">{c.facility.contact_name}</b> · <Tel phone={c.facility.phone} />
          </p>
          <DemoPhoneNote />
        </div>
      ) : null}
      {c.worker ? (
        <p className="text-lg">
          Liên hệ người ứng tuyển: <b className="break-words">{c.worker.name}</b> · <Tel phone={c.worker.phone} />
        </p>
      ) : null}
    </div>
  );
}
