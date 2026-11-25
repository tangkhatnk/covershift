import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { applyJob, withdrawApplication } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Field, PageTitle, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { APPLICATION_STATUS_LABEL, APPLICATION_STATUS_TONE, fmtDate, fmtWageRange } from '@/lib/format';
import { AREA_LABEL, EMPLOYMENT_LABEL, FACILITY_TYPE_LABEL, JOB_LABEL, WAGE_TYPE_LABEL } from '@/lib/constants';
import { friendlyError } from '@/lib/errors';
import type { JobPostDetail } from '@/lib/types';
import { ContactBox, UUID_RE, jobClosedBadge } from '../_parts';

export const metadata = { title: 'Chi tiết tin tuyển dụng' };

const linkCls = 'font-semibold text-brand underline underline-offset-4';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 py-2">
      <dt className="w-28 shrink-0 text-base text-ink-soft">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-lg font-semibold text-ink">{children}</dd>
    </div>
  );
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireRole('worker');
  if (!UUID_RE.test(id)) notFound();

  const { data, error } = await supabase.rpc('job_post_detail', { p_job: id });
  if (error) {
    if (error.code === 'P0001' && /Không tìm thấy/.test(error.message)) notFound();
    return (
      <div className="space-y-4">
        <Alert tone={error.code === 'P0001' ? 'amber' : 'red'}>{friendlyError(error)}</Alert>
        <Link href="/jobs" className={linkCls}>Về danh sách việc làm</Link>
      </div>
    );
  }
  if (!data) notFound();
  const j = data as JobPostDetail;
  const app = j.my_application;
  const live = j.status === 'open' && !j.expired;
  const inProgress = app?.status === 'applied' || app?.status === 'shortlisted' || app?.status === 'hired';
  const canApply = live && !inProgress;
  const showContact = app?.status === 'shortlisted' || app?.status === 'hired';
  const contactRes = showContact ? await supabase.rpc('get_job_contacts', { p_application: app.id }) : null;

  const mapsHref = j.maps_url && /^https:\/\//i.test(j.maps_url)
    ? j.maps_url
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${j.facility_name} ${j.address}`)}`;

  return (
    <div className="space-y-4">
      <Link href="/jobs" className="inline-flex min-h-[3rem] items-center gap-2 rounded font-semibold text-brand underline underline-offset-4">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        Tất cả việc làm
      </Link>
      <PageTitle sub={`${j.facility_name} · ${AREA_LABEL[j.area]}`}>{j.title}</PageTitle>

      <Card tab={
        <>
          <span className="text-base font-bold text-ink">{JOB_LABEL[j.job_type]}</span>
          <Badge tone="blue">{EMPLOYMENT_LABEL[j.employment]}</Badge>
          {jobClosedBadge(j)}
        </>
      }>
        <p className="text-lg font-semibold text-brand">{fmtWageRange(j)}</p>
        <dl className="mt-2 divide-y divide-rule border-t border-rule">
          <Row label="Tính lương">{WAGE_TYPE_LABEL[j.wage_type]}</Row>
          <Row label="Thời gian">{j.hours_per_week} giờ mỗi tuần{j.schedule_note ? <span className="block text-base font-normal text-ink">{j.schedule_note}</span> : null}</Row>
          <Row label="Cần người">{j.openings} người · đã nhận {j.hired_count}</Row>
          <Row label="Nơi làm">
            {j.facility_name}
            <span className="block text-base font-normal text-ink-soft">{FACILITY_TYPE_LABEL[j.facility_type]} · {AREA_LABEL[j.area]}</span>
          </Row>
          <Row label="Địa chỉ">
            <span className="font-normal">{j.address}</span>
            <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={`${linkCls} block min-h-[3rem] text-base leading-[3rem]`}>Xem bản đồ</a>
          </Row>
          <Row label="Nhận đơn">{live ? `đến hết ${fmtDate(j.expires_at)}` : 'đã ngừng nhận đơn'}</Row>
        </dl>
        {j.description ? (
          <div className="mt-2 border-t border-rule pt-4">
            <p className="text-base font-semibold text-ink">Mô tả công việc</p>
            <p className="mt-2 whitespace-pre-line break-words text-base text-ink">{j.description}</p>
          </div>
        ) : null}
      </Card>

      {inProgress ? (
        <Card>
          <h2 className="text-xl font-bold text-ink">Đơn của bạn</h2>
          <p className="mt-2"><Badge tone={APPLICATION_STATUS_TONE[app.status]}>{APPLICATION_STATUS_LABEL[app.status]}</Badge></p>
          {app.status === 'applied' ? <p className="mt-2 text-base text-ink-soft">Quán sẽ xem đơn và phản hồi. Bạn sẽ nhận thông báo khi có tin.</p> : null}
          {contactRes ? <div className="mt-4"><ContactBox res={contactRes} /></div> : null}
          {app.status !== 'hired' ? (
            <div className="mt-4 border-t border-rule pt-4">
              <p className="mb-4 text-base text-ink-soft">Không muốn làm nữa? Bạn có thể rút đơn. Sau khi rút, bạn vẫn nộp lại được nếu tin còn mở.</p>
              <ActionForm action={withdrawApplication}>
                <input type="hidden" name="application_id" value={app.id} />
                <input type="hidden" name="job_id" value={j.id} />
                <SubmitButton variant="danger" confirm="Bạn chắc chắn muốn rút đơn ứng tuyển này?">Rút đơn ứng tuyển</SubmitButton>
              </ActionForm>
            </div>
          ) : null}
        </Card>
      ) : canApply ? (
        <Card>
          {app ? (
            <p className="mb-4 text-base text-ink">
              Đơn trước của bạn: <Badge tone={APPLICATION_STATUS_TONE[app.status]}>{APPLICATION_STATUS_LABEL[app.status]}</Badge>. Bạn vẫn nộp đơn mới được.
            </p>
          ) : null}
          <h2 className="mb-4 text-xl font-bold text-ink">Ứng tuyển</h2>
          <ActionForm action={applyJob}>
            <input type="hidden" name="job_id" value={j.id} />
            <Field label="Lời nhắn cho quán (không bắt buộc)" hint="Tối đa 500 ký tự. Ví dụ: bạn rảnh những buổi nào. Đừng ghi số điện thoại.">
              <textarea name="note" rows={3} maxLength={500} className={inputCls} />
            </Field>
            <p className="text-base text-ink-soft">
              Chỉ người từ 18 tuổi, hồ sơ đã được duyệt mới ứng tuyển được. Nếu chưa đủ điều kiện, hệ thống sẽ báo lý do khi bạn bấm gửi.
            </p>
            <SubmitButton>Gửi đơn ứng tuyển</SubmitButton>
          </ActionForm>
        </Card>
      ) : (
        <Alert tone="gray">Tin này đã đóng hoặc hết hạn nên không nộp đơn được.</Alert>
      )}

      <Alert tone="gray">
        Lương và điều kiện làm việc do bạn và quán tự thỏa thuận. Quán <b>không được</b> thu phí, đặt cọc hay giữ giấy tờ của bạn.
        Nếu bị đòi, hãy báo cho nhóm vận hành.
      </Alert>
    </div>
  );
}
