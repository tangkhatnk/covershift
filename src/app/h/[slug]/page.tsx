import type { Metadata } from 'next';
import { PrintButton } from '@/components/client';
import { Alert, Badge, PageTitle, Stars } from '@/components/ui';
import { APP_NAME, JOB_LABEL } from '@/lib/constants';
import { fmtPlainDate, vnDateInput } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { PublicProfile } from '@/lib/types';

export const metadata: Metadata = { title: 'Hồ sơ ca làm', robots: { index: false, follow: false } };

function Stat({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center print:bg-white">
      <p className="text-3xl font-extrabold leading-tight text-slate-900">{value}</p>
      {extra ? <p className="text-lg leading-none">{extra}</p> : null}
      <p className="mt-1 text-sm font-semibold text-slate-600">{label}</p>
    </div>
  );
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_profile', { p_slug: slug });
  const p = error ? null : (data as PublicProfile);

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
          <Alert tone="amber">Hồ sơ đang TẮT chia sẻ, chỉ bạn thấy trang này.</Alert>
        </div>
      ) : null}

      <article className="rounded-2xl border-2 border-brand-600 bg-white p-5 shadow-sm print:border print:border-slate-400 print:p-0 print:shadow-none">
        <header className="border-b-2 border-slate-200 pb-4 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-brand-700">{APP_NAME} · Hồ sơ ca làm</p>
          <h1 className="mt-1 text-3xl font-extrabold leading-tight text-slate-900">{p.name}</h1>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-3 print:grid-cols-4">
          <Stat label="Ca đã xác nhận" value={String(p.confirmed_shifts)} />
          <Stat label="Tổng số giờ" value={String(p.total_hours)} />
          <Stat label="Điểm trung bình" value={p.avg_rating != null ? `${p.avg_rating}/5` : '—'} extra={<Stars value={p.avg_rating} />} />
          <Stat label="Đúng giờ" value={p.on_time_rate != null ? `${p.on_time_rate}%` : '—'} />
        </div>

        <section className="mt-5">
          <h2 className="text-lg font-bold text-slate-900">Việc đã làm</h2>
          {jobTypes.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {jobTypes.map((j) => <Badge key={j} tone="blue">{JOB_LABEL[j] ?? j}</Badge>)}
            </div>
          ) : (
            <p className="mt-1 text-base text-slate-600">Chưa có ca nào được xác nhận.</p>
          )}
        </section>

        {reviews.length ? (
          <section className="mt-5">
            <h2 className="text-lg font-bold text-slate-900">Các ca đã làm và nhận xét</h2>
            <ul className="divide-y divide-slate-200">
              {reviews.map((r, i) => (
                <li key={i} className="space-y-1 py-3 print:break-inside-avoid">
                  <p className="text-base font-bold text-slate-900">
                    {fmtPlainDate(r.date)} · {r.facility_name}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-slate-700">
                    <span>{JOB_LABEL[r.job_type] ?? r.job_type}</span>
                    <span className="text-lg leading-none"><Stars value={r.rating} /></span>
                    <span className={r.on_time ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
                      {r.on_time ? 'Đúng giờ' : 'Trễ'}
                    </span>
                  </p>
                  {r.comment ? <p className="text-base text-slate-800">“{r.comment}”</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="mt-5 border-t-2 border-slate-200 pt-3 text-sm text-slate-600">
          <p>Các ca trên đã được nơi thuê xác nhận qua {APP_NAME}.</p>
          <p>Ngày in: {fmtPlainDate(vnDateInput())}</p>
        </footer>
      </article>

      <PrintButton />
    </div>
  );
}
