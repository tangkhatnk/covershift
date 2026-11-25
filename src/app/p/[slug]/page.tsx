import type { Metadata } from 'next';
import { CircleCheck, Clock } from 'lucide-react';
import { PrintButton } from '@/components/client';
import { Alert, Badge, PageTitle, Stars } from '@/components/ui';
import { APP_NAME, JOB_LABEL } from '@/lib/constants';
import { fmtPlainDate, vnDateInput } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { PublicProfile } from '@/lib/types';

export const metadata: Metadata = { title: 'Hồ sơ ca làm', robots: { index: false, follow: false } };

function Stat({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse justify-end rounded-ui border border-rule bg-chalk p-4 text-center print:bg-white">
      <dt className="mt-2 flex min-h-[3rem] items-center justify-center text-base font-semibold leading-snug text-ink-soft">{label}</dt>
      <dd>
        <span className="tabular font-num block text-4xl font-bold leading-tight text-ink">{value}</span>
        {extra ? <span className="block">{extra}</span> : null}
      </dd>
    </div>
  );
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_profile', { p_slug: slug });
  if (error) {
    return (
      <div className="space-y-4">
        <PageTitle>Hồ sơ ca làm</PageTitle>
        <Alert tone="red"><span className="text-lg">Chưa tải được hồ sơ. Vui lòng thử lại sau ít phút.</span></Alert>
      </div>
    );
  }
  const p = data as PublicProfile;

  if (!p) {
    return (
      <div className="space-y-4">
        <PageTitle>Hồ sơ ca làm</PageTitle>
        <Alert tone="gray"><span className="text-lg">Hồ sơ này không tồn tại hoặc đang tắt chia sẻ.</span></Alert>
      </div>
    );
  }

  const reviews = p.reviews ?? [];
  const jobTypes = p.job_types ?? [];

  return (
    <div className="space-y-4">
      {p.share_enabled === false ? (
        <div className="print:hidden">
          <Alert tone="amber">Hồ sơ đang tắt chia sẻ, chỉ bạn thấy trang này.</Alert>
        </div>
      ) : null}

      <article className="overflow-hidden rounded-ui border border-rule bg-white print:border-ink print:bg-white">
        <header className="bg-brand-deep px-4 py-6 text-center text-white print:border-b-2 print:border-ink print:bg-white print:text-ink">
          <h1 className="break-words text-3xl font-bold leading-tight">{p.name}</h1>
          <p className="mt-2 text-base text-brand-tint print:text-ink">Hồ sơ ca làm · {APP_NAME}</p>
        </header>

        <div className="p-4 sm:p-6">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4 print:grid-cols-4">
            <Stat label="Ca đã xác nhận" value={String(p.confirmed_shifts)} />
            <Stat label="Tổng số giờ" value={String(p.total_hours)} />
            <Stat label="Điểm trung bình" value={p.avg_rating != null ? `${p.avg_rating}/5` : '—'} extra={<Stars value={p.avg_rating} />} />
            <Stat label="Đúng giờ" value={p.on_time_rate != null ? `${p.on_time_rate}%` : '—'} />
          </dl>

          <section className="mt-6 break-inside-avoid">
            <h2 className="text-xl font-bold text-ink">Việc đã làm</h2>
            {jobTypes.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {jobTypes.map((j) => <Badge key={j} tone="blue">{JOB_LABEL[j] ?? j}</Badge>)}
              </div>
            ) : (
              <p className="mt-2 text-base text-ink-soft">Chưa có ca nào được xác nhận.</p>
            )}
          </section>

          {reviews.length ? (
            <section className="mt-6">
              <h2 className="break-after-avoid text-xl font-bold text-ink">Các ca đã làm và nhận xét</h2>
              <ul className="mt-2 divide-y divide-rule">
                {reviews.map((r, i) => (
                  <li key={i} className="space-y-2 py-4 break-inside-avoid">
                    <p className="break-words text-base font-bold text-ink">
                      {fmtPlainDate(r.date)} · {r.facility_name}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-ink">
                      <span>{JOB_LABEL[r.job_type] ?? r.job_type}</span>
                      <Stars value={r.rating} />
                      {r.on_time ? (
                        <Badge tone="green" icon={<CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />}>Đúng giờ</Badge>
                      ) : (
                        <Badge tone="amber" icon={<Clock className="h-4 w-4 shrink-0" aria-hidden="true" />}>Trễ</Badge>
                      )}
                    </p>
                    {r.comment ? <p className="break-words text-base text-ink">“{r.comment}”</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <footer className="mt-6 space-y-2 border-t border-rule pt-4 text-base text-ink-soft">
            <p>Các ca trên đã được nơi thuê xác nhận qua {APP_NAME}.</p>
            <p>Ngày in: {fmtPlainDate(vnDateInput())}</p>
          </footer>
        </div>
      </article>

      <PrintButton />
    </div>
  );
}
