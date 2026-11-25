import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, Flag } from 'lucide-react';
import { cancelClaim, claimShift, createReport, submitPayment } from '@/app/actions';
import { ActionForm, ShareButton, SubmitButton } from '@/components/client';
import { ShiftMap } from '@/components/map';
import { Alert, Badge, Card, DemoPhoneNote, PageTitle, SlotStrip, StateBadge, Stars, Tel, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { AREA_LABEL, FACILITY_TYPE_LABEL, JOB_LABEL, PAYMENT_LABEL, type PaymentAnswer } from '@/lib/constants';
import { friendlyError } from '@/lib/errors';
import { ageOn, fmtDateRel, fmtMoney, fmtTime, hoursBetween, shiftState, vnDateInput } from '@/lib/format';
import type { Contacts, ShiftDetail } from '@/lib/types';

export const metadata = { title: 'Chi tiết ca' };

const linkCls = 'font-semibold text-brand underline underline-offset-4';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAY_VARIANT: Record<PaymentAnswer, 'primary' | 'secondary' | 'danger'> = { full: 'primary', partial: 'secondary', unpaid: 'danger' };

export default async function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireRole('worker', 'admin');
  if (!UUID.test(id)) notFound();

  const { data, error } = await supabase.rpc('shift_detail', { p_shift: id });
  if (error) {
    if (/Không tìm thấy ca/.test(error.message)) notFound();
    return <Alert tone="red">{friendlyError(error)}</Alert>;
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

  // Chỉ để hiện lời giải thích thay cho nút "Nhận ca này"; database (_claims_validate) vẫn là chốt chặn chính.
  let claimBlocker: string | null = null;
  if (isWorker && upcoming && !active) {
    const [wpRes, consentRes] = await Promise.all([
      supabase.from('worker_profiles').select('approval, date_of_birth').eq('user_id', profile.id).maybeSingle(),
      supabase.from('parental_consents').select('status').eq('worker_id', profile.id).maybeSingle(),
    ]);
    const wp = wpRes.data as { approval: string; date_of_birth: string } | null;
    // Đọc lỗi (mạng…) thì không đoán: vẫn hiện nút, database sẽ trả lời đúng khi bấm.
    if (!wpRes.error && !consentRes.error) {
      if (wp?.approval === 'rejected') {
        claimBlocker = 'Hồ sơ của bạn bị từ chối nên chưa nhận ca được.';
      } else if (!wp || wp.approval !== 'approved') {
        claimBlocker = 'Hồ sơ của bạn chưa được nhóm vận hành duyệt nên chưa nhận ca được.';
      } else if (ageOn(wp.date_of_birth, vnDateInput(s.starts_at)) < 18 && consentRes.data?.status !== 'approved') {
        claimBlocker = 'Bạn dưới 18 tuổi: cần phụ huynh đồng ý và nhóm vận hành duyệt trước khi nhận ca.';
      }
    }
  }

  let contact: Contacts['facility'] = null;
  if (active) {
    const res = await supabase.rpc('get_shift_contacts', { p_shift: id });
    if (!res.error && res.data) contact = (res.data as Contacts).facility;
  }

  const hasPin = s.lat != null && s.lng != null;
  const mapsHref = s.maps_url && /^https:\/\//i.test(s.maps_url)
    ? s.maps_url
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.facility_name} ${s.address}`)}`;
  const directionsHref = hasPin ? `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}` : null;

  const showClaim = isWorker && upcoming && !active;
  const showActive = active && s.status !== 'cancelled';
  const askPayment = isWorker && active && claim?.role === 'primary' && s.status !== 'cancelled' && now >= end
    && s.my_result?.attended !== false;
  const hasSide = showClaim || showActive || askPayment || Boolean(s.my_result) || upcoming;

  const claimBadges = (
    <>
      <StateBadge state={state} />
      {s.urgent && upcoming ? <Badge tone="red">GẤP</Badge> : null}
      {s.allow_minor ? <Badge tone="green">Hợp với người dưới 18</Badge> : null}
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
    </>
  );

  return (
    <div className="space-y-4">
      <Link href="/shifts" className="inline-flex min-h-[3rem] items-center gap-2 rounded-ui font-semibold text-brand underline underline-offset-4">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        Tất cả ca
      </Link>
      <PageTitle sub={`${s.facility_name} · ${AREA_LABEL[s.area]}`}>{JOB_LABEL[s.job_type]}</PageTitle>

      {s.status === 'cancelled' ? <Alert tone="red">Ca này đã bị hủy. Bạn không cần đến.</Alert> : null}

      {/* Điện thoại: một cột theo thứ tự DOM (ngày, giờ, lương; rồi việc cần làm; rồi chỗ còn trống, mô tả, nơi làm kèm bản đồ; "Chia sẻ ca" cuối).
          Từ lg: hai cột, việc cần làm dính ở cột phải (`contents` ở điện thoại để các khối con tự xếp theo `order` của lưới). */}
      <div className={`grid gap-4 lg:items-start ${hasSide ? 'lg:grid-cols-[minmax(0,1fr)_20rem]' : ''}`}>
        <Card tab={claimBadges}>
          <p className="text-base text-ink-soft">{fmtDateRel(s.starts_at, now)} · {hoursBetween(s.starts_at, s.ends_at)} giờ</p>
          <p className="tabular font-num text-5xl font-bold leading-tight text-ink">
            {fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}
          </p>
          <p className="text-lg font-semibold text-brand">{fmtMoney(s.hourly_wage)}/giờ</p>
        </Card>

        {hasSide ? (
          <div className="contents space-y-4 lg:sticky lg:top-8 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block">

            {/* Nhận ca */}
            {showClaim ? (
              claimBlocker ? (
                <Alert tone="amber">
                  {claimBlocker}{' '}
                  <Link href="/profile" className={linkCls}>Xem hồ sơ của tôi</Link>
                </Alert>
              ) : primaryLeft > 0 || backupLeft ? (
                <Card>
                  <p className="mb-4 text-base text-ink">
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
            {showActive ? (
              <Card>
                <h2 className="text-xl font-bold text-ink">
                  {claim.role === 'primary' ? 'Bạn là người chính của ca này' : 'Bạn là người dự phòng'}
                </h2>
                {claim.role === 'backup' && upcoming ? (
                  <p className="mt-2 text-base text-ink">Nếu người chính hủy, bạn sẽ được lên thay. Hãy để ý điện thoại.</p>
                ) : null}
                {contact ? (
                  <div className="mt-4">
                    <p className="text-lg">Liên hệ quán: <b>{contact.contact_name}</b></p>
                    <Tel phone={contact.phone} block />
                    <DemoPhoneNote />
                  </div>
                ) : null}
                {upcoming ? (
                  <div className="mt-4 space-y-4 border-t border-rule pt-4">
                    {lateWindow ? (
                      <Alert tone="red">
                        Còn dưới 2 tiếng nữa là ca bắt đầu. Nếu hủy bây giờ, bạn sẽ bị ghi <b>&quot;hủy sát giờ&quot;</b> vào lịch sử.
                      </Alert>
                    ) : (
                      <p className="text-base text-ink-soft">
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
                <h2 className="text-xl font-bold text-ink">Bạn đã được trả đủ tiền công chưa?</h2>
                {s.my_payment ? (
                  <p className="mt-2 text-lg">
                    Bạn đã trả lời:{' '}
                    <Badge tone={s.my_payment === 'full' ? 'green' : 'red'}>{PAYMENT_LABEL[s.my_payment]}</Badge>
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    <p className="text-base text-ink-soft">Câu trả lời chỉ nhóm vận hành thấy, quán không thấy.</p>
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
                <h2 className="text-xl font-bold text-ink">Quán đã xác nhận</h2>
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
                  <p className="mt-2 whitespace-pre-line break-words text-base text-ink">&ldquo;{s.my_result.comment}&rdquo;</p>
                ) : null}
              </Card>
            ) : null}

            {/* Chia sẻ ca: sau cùng trên điện thoại, dưới việc cần làm ở cột phải */}
            {upcoming ? (
              <Card className="max-lg:order-last">
                <h2 className="text-xl font-bold text-ink">Chia sẻ ca</h2>
                <p className="mb-4 mt-2 text-base text-ink-soft">Ai mở link cũng xem được ca này, không cần đăng nhập.</p>
                <ShareButton path={`/s/${s.id}`} title={`${JOB_LABEL[s.job_type]} tại ${s.facility_name}`} />
              </Card>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-4 lg:col-start-1 lg:row-start-2">
          {upcoming ? (
            <Card>
              <SlotStrip headcount={s.headcount} primary={s.primary_count} backup={s.backup_count} />
            </Card>
          ) : null}

          {s.description ? (
            <Card>
              <h2 className="text-xl font-bold text-ink">Mô tả công việc</h2>
              <p className="mt-2 whitespace-pre-line break-words text-base text-ink">{s.description}</p>
            </Card>
          ) : null}

          <Card>
            <h2 className="text-xl font-bold text-ink">Nơi làm</h2>
            <p className="mt-2 text-base text-ink-soft">{FACILITY_TYPE_LABEL[s.facility_type]}</p>
            <p className="break-words text-base text-ink">{s.address}</p>
            <div className="flex flex-wrap gap-x-6">
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={`${linkCls} block min-h-[3rem] text-base leading-[3rem]`}>Xem bản đồ</a>
              {directionsHref ? (
                <a href={directionsHref} target="_blank" rel="noopener noreferrer" className={`${linkCls} block min-h-[3rem] text-base leading-[3rem]`}>Chỉ đường</a>
              ) : null}
            </div>
            {hasPin ? (
              <ShiftMap
                className="mt-4 h-56"
                points={[{ id: s.id, lat: s.lat!, lng: s.lng!, text: fmtTime(s.starts_at), label: `${s.facility_name}, ${s.address}`, tone: 'open' }]}
              />
            ) : null}
          </Card>

          <Alert tone="gray">
            Lương và điều kiện làm việc do bạn và quán tự thỏa thuận. Quán <b>không được</b> thu phí, đặt cọc hay giữ giấy tờ của bạn.
            Nếu bị đòi, hãy báo ngay cho nhóm vận hành ở cuối trang.
          </Alert>
        </div>
      </div>

      <details className="rounded-ui border border-rule bg-white">
        <summary className="flex min-h-[3rem] cursor-pointer items-center gap-2 px-4 text-lg font-semibold text-ink">
          <Flag className="h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
          Báo cáo vấn đề với nhóm vận hành
        </summary>
        <div className="border-t border-rule p-4">
          <p className="mb-4 text-base text-ink-soft">
            Ví dụ: bị đòi đặt cọc, bị giữ giấy tờ, không được trả tiền, việc khác với mô tả, thấy không an toàn.
          </p>
          <ActionForm action={createReport} resetOnOk>
            <input type="hidden" name="shift_id" value={s.id} />
            <label className="block">
              <span className="mb-2 block text-base font-semibold text-ink">Chuyện gì đã xảy ra?</span>
              <textarea name="body" required minLength={5} maxLength={1000} rows={4} className={inputCls} />
            </label>
            <SubmitButton variant="secondary">Gửi báo cáo</SubmitButton>
          </ActionForm>
        </div>
      </details>
    </div>
  );
}
