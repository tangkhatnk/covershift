import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { closeJobPost, setApplicationStatus } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Disclosure, Empty, PageTitle, Stars } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { JOB_LABEL } from '@/lib/constants';
import { friendlyError } from '@/lib/errors';
import { APPLICATION_STATUS_LABEL, APPLICATION_STATUS_TONE, fmtDate, fmtPlainDate, fmtWageRange } from '@/lib/format';
import type { JobApplicants } from '@/lib/types';
import { ContactBox, UUID_RE, jobClosedBadge } from '@/app/jobs/_parts';

export const metadata = { title: 'Tin tuyển dụng của quán' };

type Applicant = JobApplicants['applicants'][number];

/** Hồ sơ ca làm của một người ứng tuyển: chỉ số liệu đã xác nhận, không ngày sinh, trường, lớp, SĐT. */
function Stats({ p }: { p: Applicant['profile'] }) {
  if (p.confirmed_shifts === 0) return <p className="text-base text-ink-soft">Chưa có ca nào được xác nhận trên SafeShift.</p>;
  return (
    <div className="space-y-2">
      <p className="text-base text-ink">
        <b>{p.confirmed_shifts}</b> ca đã xác nhận · <b>{p.total_hours}</b> giờ
        {p.on_time_rate != null ? <> · đúng giờ <b>{p.on_time_rate}%</b></> : null}
      </p>
      {p.avg_rating != null ? <p className="flex items-center gap-2 text-base"><Stars value={p.avg_rating} /> <span aria-hidden="true">{p.avg_rating} trên 5</span></p> : null}
      {p.reviews.length ? (
        <Disclosure summary={<span>Nhận xét từ quán khác ({p.reviews.length})</span>}>
          <ul className="mt-2 divide-y divide-rule">
            {p.reviews.slice(0, 5).map((r, i) => (
              <li key={i} className="space-y-2 py-2 text-base">
                <p className="text-ink-soft">{fmtPlainDate(r.date)} · {r.facility_name} · {JOB_LABEL[r.job_type]}</p>
                <Stars value={r.rating} />
                {r.comment ? <p className="whitespace-pre-line break-words text-ink">&ldquo;{r.comment}&rdquo;</p> : null}
              </li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
    </div>
  );
}

export default async function EmployerJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole('employer', 'admin');
  if (!UUID_RE.test(id)) notFound();

  const { data, error } = await supabase.rpc('job_applicants', { p_job: id });
  if (error) {
    if (error.code === 'P0001' && /Không tìm thấy/.test(error.message)) notFound();
    return <Alert tone="red">{friendlyError(error)}</Alert>;
  }
  if (!data) notFound();
  const { job: j, applicants } = data as JobApplicants;
  const isOwner = profile.role === 'employer';
  const live = j.status === 'open' && !j.expired;

  // SĐT chỉ lấy cho đơn đã chọn hoặc nhận; các lượt gọi độc lập nên chạy song song.
  const contacts = await Promise.all(
    applicants.map((a) => (a.status === 'shortlisted' || a.status === 'hired'
      ? supabase.rpc('get_job_contacts', { p_application: a.id })
      : null)),
  );

  const back = isOwner ? '/employer/jobs' : '/admin/jobs';

  return (
    <div className="space-y-6">
      <Link href={back} className="inline-flex min-h-[3rem] items-center gap-2 rounded-ui font-semibold text-brand underline underline-offset-4">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        {isOwner ? 'Tất cả tin tuyển dụng' : 'Tin tuyển dụng'}
      </Link>
      <PageTitle sub={`${j.facility_name} · ${JOB_LABEL[j.job_type]}`}>{j.title}</PageTitle>

      <Card tab={<>{jobClosedBadge(j) ?? <Badge tone="green">Đang tuyển</Badge>}</>}>
        <p className="text-lg font-semibold text-brand">{fmtWageRange(j)}</p>
        <p className="mt-2 text-base text-ink-soft">
          {j.hours_per_week} giờ/tuần · cần {j.openings} người · đã nhận {j.hired_count}
          {live ? ` · nhận đơn đến ${fmtDate(j.expires_at)}` : ''}
        </p>
        {isOwner && j.status === 'open' ? (
          <div className="mt-4 border-t border-rule pt-4">
            <p className="mb-4 text-base text-ink-soft">Đóng tin khi đã đủ người hoặc không cần tuyển nữa. Tin đã đóng không mở lại được, chỉ đăng tin mới.</p>
            <ActionForm action={closeJobPost}>
              <input type="hidden" name="job_id" value={j.id} />
              <div className="sm:max-w-xs">
                <SubmitButton variant="danger" confirm="Đóng tin này? Người làm sẽ không nộp đơn mới được nữa.">Đóng tin</SubmitButton>
              </div>
            </ActionForm>
          </div>
        ) : null}
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-ink">Người ứng tuyển <span className="font-normal text-ink-soft">({applicants.length})</span></h2>
        {applicants.length === 0 ? (
          <Empty>Chưa có ai ứng tuyển tin này.</Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {applicants.map((a, i) => {
              const c = contacts[i];
              return (
                <Card key={a.id} tab={<><span className="break-words text-base font-bold text-ink">{a.name}</span><Badge tone={APPLICATION_STATUS_TONE[a.status]}>{APPLICATION_STATUS_LABEL[a.status]}</Badge></>}>
                  <div className="space-y-4">
                    <p className="text-base text-ink-soft">Nộp ngày {fmtDate(a.created_at)}</p>
                    {a.note ? <p className="whitespace-pre-line break-words text-base text-ink">&ldquo;{a.note}&rdquo;</p> : null}
                    <Stats p={a.profile} />
                    {c ? <ContactBox res={c} /> : null}
                    {isOwner && (a.status === 'applied' || a.status === 'shortlisted') ? (
                      <ActionForm action={setApplicationStatus}>
                        <input type="hidden" name="application_id" value={a.id} />
                        <input type="hidden" name="job_id" value={j.id} />
                        {a.status === 'applied' ? (
                          <SubmitButton name="status" value="shortlisted">Chọn vào vòng tiếp theo</SubmitButton>
                        ) : (
                          <SubmitButton name="status" value="hired" confirm={`Nhận ${a.name} vào làm?`}>Nhận vào làm</SubmitButton>
                        )}
                        <SubmitButton name="status" value="rejected" variant="secondary" confirm={`Đánh dấu ${a.name} chưa phù hợp?`}>Chưa phù hợp</SubmitButton>
                      </ActionForm>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
        {isOwner ? (
          <p className="text-base text-ink-soft">
            Số điện thoại chỉ hiện sau khi anh/chị chọn người vào vòng tiếp theo. Anh/chị tự thỏa thuận lương và điều kiện với người làm; không thu phí, đặt cọc hay giữ giấy tờ.
          </p>
        ) : null}
      </section>
    </div>
  );
}
