import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cancelClaim, claimShift, createReport, submitPayment } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, PageTitle, Stars, Tel, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { AREA_LABEL, FACILITY_TYPE_LABEL, JOB_LABEL, PAYMENT_LABEL, type PaymentAnswer } from '@/lib/constants';
import { fmtDate, fmtMoney, fmtTime, hoursBetween, shiftState, SHIFT_STATE_LABEL, SHIFT_STATE_TONE } from '@/lib/format';
import type { Contacts, ShiftDetail } from '@/lib/types';

export const metadata = { title: 'Chi tiết ca' };

const linkCls = 'font-semibold text-brand-700 underline underline-offset-4';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAY_VARIANT: Record<PaymentAnswer, 'primary' | 'secondary' | 'danger'> = { full: 'primary', partial: 'secondary', unpaid: 'danger' };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2">
      <dt className="w-24 shrink-0 text-base text-slate-600">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-lg font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

export default async function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole('worker', 'admin');
  if (!UUID.test(id)) notFound();

  const { data, error } = await supabase.rpc('shift_detail', { p_shift: id });
  if (error) {
    if (/Không tìm thấy ca/.test(error.message)) notFound();
    return <Alert tone="red">{error.message}</Alert>;
  }
  if (!data) notFound();
  const s = data as ShiftDetail;

  const now = Date.now();
  const start = new Date(s.starts_at).getTime();
  const end = new Date(s.ends_at).getTime();
  const state = shiftState(s, now);
  const isWorker = profile.role === 'worker';
  const claim = s.my_claim;
  const active = claim?.status === 'active';
  const upcoming = s.status === 'open' && now < start;
  const primaryLeft = Math.max(s.headcount - s.primary_count, 0);
  const backupLeft = s.backup_count < 1;
  const lateWindow = start - now <= 2 * 3_600_000;

  let contact: Contacts['facility'] = null;
  if (active) {
    const res = await supabase.rpc('get_shift_contacts', { p_shift: id });
    if (!res.error && res.data) contact = (res.data as Contacts).facility;
  }

  const mapsHref = s.maps_url && /^https:\/\//i.test(s.maps_url)
    ? s.maps_url
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.facility_name} ${s.address}`)}`;

  const askPayment = isWorker && active && claim?.role === 'primary' && s.status !== 'cancelled' && now >= end
    && s.my_result?.attended !== false;

  return (
    <div className="space-y-4">
      <p><Link href="/ca" className={linkCls}>‹ Tất cả ca</Link></p>
      <PageTitle sub={`${s.facility_name} · ${AREA_LABEL[s.area]}`}>{JOB_LABEL[s.job_type]}</PageTitle>

      <div className="flex flex-wrap items-center gap-2">
        {s.urgent && upcoming ? <Badge tone="red">GẤP</Badge> : null}
        <Badge tone={SHIFT_STATE_TONE[state]}>{SHIFT_STATE_LABEL[state]}</Badge>
        {s.allow_minor ? <Badge tone="green">Nhận dưới 18 tuổi</Badge> : null}
        {active ? (
          <Badge tone={claim.role === 'primary' ? 'green' : 'amber'}>
            Bạn là {claim.role === 'primary' ? 'người chính' : 'người dự phòng'}
          </Badge>
        ) : null}
        {claim && !active ? (
          <Badge tone={claim.cancel_kind === 'late_cancel' ? 'red' : 'gray'}>
            {claim.cancel_kind === 'late_cancel' ? 'Bạn đã hủy sát giờ' : 'Suất của bạn đã hủy'}
          </Badge>
        ) : null}
      </div>

      {s.status === 'cancelled' ? <Alert tone="red">Ca này đã bị hủy. Bạn không cần đến.</Alert> : null}

      <Card>
        <dl className="divide-y divide-slate-200">
          <Row label="Ngày">{fmtDate(s.starts_at)}</Row>
          <Row label="Giờ">
            {fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}{' '}
            <span className="font-normal text-slate-600">({hoursBetween(s.starts_at, s.ends_at)} giờ)</span>
          </Row>
          <Row label="Lương"><span className="text-brand-700">{fmtMoney(s.hourly_wage)}/giờ</span></Row>
          <Row label="Nơi làm">
            {s.facility_name}
            <span className="block text-base font-normal text-slate-600">{FACILITY_TYPE_LABEL[s.facility_type]} · {AREA_LABEL[s.area]}</span>
          </Row>
          <Row label="Địa chỉ">
            <span className="font-normal">{s.address}</span>
            <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={`${linkCls} mt-1 block text-base`}>Xem bản đồ</a>
          </Row>
          {upcoming ? (
            <Row label="Còn chỗ">
              <span className="font-normal">
                {primaryLeft > 0 ? `${primaryLeft}/${s.headcount} chỗ chính` : 'Hết chỗ chính'}
                {backupLeft ? ', 1 chỗ dự phòng' : ', hết chỗ dự phòng'}
              </span>
            </Row>
          ) : null}
        </dl>
        {s.description ? (
          <div className="mt-3 border-t border-slate-200 pt-3">
            <p className="text-base font-semibold text-slate-900">Mô tả công việc</p>
            <p className="mt-1 whitespace-pre-line break-words text-base text-slate-700">{s.description}</p>
          </div>
        ) : null}
      </Card>

      <Alert tone="gray">
        Lương và điều kiện làm việc do bạn và quán tự thỏa thuận. Quán <b>không được</b> thu phí, đặt cọc hay giữ giấy tờ của bạn.
        Nếu bị đòi, hãy báo ngay cho nhóm vận hành ở cuối trang.
      </Alert>

      {/* Nhận ca */}
      {isWorker && upcoming && !active ? (
        primaryLeft > 0 || backupLeft ? (
          <Card>
            <p className="mb-3 text-base text-slate-700">
              {primaryLeft > 0 ? (
                <>Nếu nhận bây giờ, bạn sẽ là <b>người chính</b>: bạn là người đi làm ca này.</>
              ) : (
                <>Ca đã đủ người chính. Nếu nhận bây giờ, bạn sẽ là <b>người dự phòng</b>: chỉ đi làm khi người chính hủy.</>
              )}
            </p>
            <ActionForm action={claimShift}>
              <input type="hidden" name="shift_id" value={s.id} />
              <SubmitButton>Nhận ca này</SubmitButton>
            </ActionForm>
          </Card>
        ) : (
          <Alert tone="amber">Ca này đã đủ người. Bạn xem ca khác nhé.</Alert>
        )
      ) : null}

      {/* Đã nhận ca */}
      {active && s.status !== 'cancelled' ? (
        <Card>
          <h2 className="text-xl font-bold text-slate-900">
            {claim.role === 'primary' ? 'Bạn là người chính của ca này' : 'Bạn là người dự phòng'}
          </h2>
          {claim.role === 'backup' && upcoming ? (
            <p className="mt-1 text-base text-slate-700">Nếu người chính hủy, bạn sẽ được lên thay. Hãy để ý điện thoại.</p>
          ) : null}
          {contact ? (
            <p className="mt-3 text-lg">
              Liên hệ quán: <b>{contact.contact_name}</b> · <Tel phone={contact.phone} />
            </p>
          ) : null}
          {upcoming ? (
            <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
              {lateWindow ? (
                <Alert tone="red">
                  Còn dưới 2 tiếng nữa là ca bắt đầu. Nếu hủy bây giờ, bạn sẽ bị ghi <b>&quot;hủy sát giờ&quot;</b> vào lịch sử.
                </Alert>
              ) : (
                <p className="text-base text-slate-600">
                  Bận không đi được? Hãy hủy sớm. Hủy khi còn dưới 2 tiếng sẽ bị ghi &quot;hủy sát giờ&quot; vào lịch sử.
                </p>
              )}
              <ActionForm action={cancelClaim}>
                <input type="hidden" name="shift_id" value={s.id} />
                <SubmitButton
                  variant="danger"
                  confirm={lateWindow
                    ? 'Còn dưới 2 tiếng. Hủy bây giờ sẽ bị ghi "hủy sát giờ" vào lịch sử. Bạn chắc chắn hủy?'
                    : 'Bạn chắc chắn muốn hủy suất ở ca này?'}
                >
                  Hủy suất của tôi
                </SubmitButton>
              </ActionForm>
            </div>
          ) : null}
        </Card>
      ) : null}

      {/* Hỏi tiền công */}
      {askPayment ? (
        <Card>
          <h2 className="text-xl font-bold text-slate-900">Bạn đã được trả đủ tiền công chưa?</h2>
          {s.my_payment ? (
            <p className="mt-2 text-lg">
              Bạn đã trả lời:{' '}
              <Badge tone={s.my_payment === 'full' ? 'green' : 'red'}>{PAYMENT_LABEL[s.my_payment]}</Badge>
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <p className="text-base text-slate-600">Câu trả lời chỉ nhóm vận hành thấy, quán không thấy.</p>
              {(Object.keys(PAYMENT_LABEL) as PaymentAnswer[]).map((a) => (
                <ActionForm key={a} action={submitPayment}>
                  <input type="hidden" name="shift_id" value={s.id} />
                  <input type="hidden" name="answer" value={a} />
                  <SubmitButton variant={PAY_VARIANT[a]}>{PAYMENT_LABEL[a]}</SubmitButton>
                </ActionForm>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {/* Kết quả chủ quán xác nhận */}
      {s.my_result ? (
        <Card>
          <h2 className="text-xl font-bold text-slate-900">Quán đã xác nhận</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={s.my_result.attended ? 'green' : 'red'}>{s.my_result.attended ? 'Đã làm' : 'Không đến'}</Badge>
            {s.my_result.attended && s.my_result.on_time != null ? (
              <Badge tone={s.my_result.on_time ? 'green' : 'amber'}>{s.my_result.on_time ? 'Đúng giờ' : 'Đến trễ'}</Badge>
            ) : null}
          </div>
          {s.my_result.rating != null ? (
            <p className="mt-2 text-2xl"><Stars value={s.my_result.rating} /></p>
          ) : null}
          {s.my_result.comment ? (
            <p className="mt-2 whitespace-pre-line break-words text-base text-slate-700">&ldquo;{s.my_result.comment}&rdquo;</p>
          ) : null}
        </Card>
      ) : null}

      <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-lg font-semibold text-slate-900">Báo cáo vấn đề với nhóm vận hành</summary>
        <div className="mt-3">
          <p className="mb-3 text-base text-slate-600">
            Ví dụ: bị đòi đặt cọc, bị giữ giấy tờ, không được trả tiền, việc khác với mô tả, thấy không an toàn.
          </p>
          <ActionForm action={createReport} resetOnOk>
            <input type="hidden" name="shift_id" value={s.id} />
            <label className="block">
              <span className="mb-1 block text-base font-semibold text-slate-900">Chuyện gì đã xảy ra?</span>
              <textarea name="body" required minLength={5} maxLength={1000} rows={4} className={inputCls} />
            </label>
            <SubmitButton variant="secondary">Gửi báo cáo</SubmitButton>
          </ActionForm>
        </div>
      </details>
    </div>
  );
}
