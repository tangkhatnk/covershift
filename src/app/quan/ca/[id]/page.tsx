import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Empty, PageTitle, Stars, Tel, btn } from '@/components/ui';
import { cancelShift, swapRoles } from '@/app/actions';
import { requireRole } from '@/lib/auth';
import { AREA_LABEL, JOB_LABEL } from '@/lib/constants';
import { fmtDateTime, fmtMoney, fmtRange, hoursBetween, shiftState, SHIFT_STATE_LABEL, SHIFT_STATE_TONE } from '@/lib/format';
import type { Contacts, ShiftDetail } from '@/lib/types';

export const metadata = { title: 'Chi tiết ca' };

type Worker = NonNullable<Contacts['workers']>[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function WorkerRow({ w, children }: { w: Worker; children?: React.ReactNode }) {
  return (
    <li className="space-y-2 py-3">
      <p className="text-lg font-bold text-slate-900">{w.name}</p>
      <p className="text-lg">Gọi: <Tel phone={w.phone} /></p>
      {w.slug ? (
        <Link href={`/h/${w.slug}`} className="inline-block text-base font-semibold text-brand-700 underline underline-offset-4">
          Xem hồ sơ ca làm
        </Link>
      ) : null}
      {children}
    </li>
  );
}

export default async function EmployerShiftPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ moi?: string }> }) {
  const { supabase, profile } = await requireRole('employer', 'admin');
  const { id } = await params;
  const sp = await searchParams;
  if (!UUID_RE.test(id)) notFound();

  const { data, error } = await supabase.rpc('shift_detail', { p_shift: id });
  if (error || !data) notFound();
  const shift = data as ShiftDetail;
  const isAdmin = profile.role === 'admin';
  if (!shift.is_owner && !isAdmin) notFound();

  const { data: contactData, error: contactError } = await supabase.rpc('get_shift_contacts', { p_shift: id });
  const workers = (contactError ? null : (contactData as Contacts | null)?.workers) ?? [];
  const primaries = workers.filter((w) => w.role === 'primary');
  const backups = workers.filter((w) => w.role === 'backup');

  const now = Date.now();
  const state = shiftState(shift, now);
  const startMs = new Date(shift.starts_at).getTime();
  const notStarted = now < startMs && shift.status === 'open';
  const claimed = shift.primary_count + shift.backup_count > 0;
  const lateCancel = notStarted && claimed && startMs - now <= 2 * 3_600_000;
  const canSwap = notStarted && primaries.length > 0 && backups.length > 0;
  const confirmExpired = !!shift.confirm_expires_at && new Date(shift.confirm_expires_at).getTime() < now;
  const results = shift.results ?? [];

  return (
    <div className="space-y-5">
      {sp.moi ? <Alert tone="green"><b>Đã đăng ca.</b> Khi có người nhận, tên và số điện thoại sẽ hiện ở trang này.</Alert> : null}

      <PageTitle sub={`${shift.facility_name} · ${AREA_LABEL[shift.area]}`}>Chi tiết ca</PageTitle>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={SHIFT_STATE_TONE[state]}>{SHIFT_STATE_LABEL[state]}</Badge>
          {shift.urgent ? <Badge tone="red">GẤP</Badge> : null}
          <Badge tone="blue">{JOB_LABEL[shift.job_type]}</Badge>
          {shift.allow_minor ? <Badge tone="green">Nhận dưới 18 tuổi</Badge> : null}
        </div>
        <p className="mt-2 text-xl font-bold text-slate-900">{fmtRange(shift.starts_at, shift.ends_at)}</p>
        <p className="text-lg font-semibold text-brand-700">
          {fmtMoney(shift.hourly_wage)}/giờ{' '}
          <span className="font-normal text-slate-600">· {hoursBetween(shift.starts_at, shift.ends_at)} giờ</span>
        </p>
        <p className="mt-1 text-base text-slate-700">
          Cần <b>{shift.headcount}</b> người chính · Đã nhận: <b>{shift.primary_count}/{shift.headcount}</b> · Dự phòng:{' '}
          <b>{shift.backup_count > 0 ? 'có' : 'chưa'}</b>
        </p>
        <p className="text-base text-slate-700">Địa chỉ: {shift.address}</p>
        {shift.description ? <p className="mt-2 whitespace-pre-line text-base text-slate-800">{shift.description}</p> : null}
      </Card>

      {shift.confirm_token ? (
        <section className="space-y-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4">
          <h2 className="text-xl font-bold text-amber-900">Xác nhận sau ca</h2>
          {confirmExpired ? (
            <p className="text-base text-red-900">
              Đã quá hạn 72 giờ sau ca nên không xác nhận ở đây được nữa. Anh/chị vui lòng liên hệ nhóm vận hành.
            </p>
          ) : (
            <>
              <p className="text-base text-amber-900">
                Ca đã xong. Anh/chị cho biết ai đã làm, có đúng giờ không. Chỉ mất 1 phút.
              </p>
              <Link href={`/xac-nhan/${shift.confirm_token}`} className={`${btn('primary')} !min-h-[3.75rem] !text-xl`}>
                Xác nhận ngay
              </Link>
              {shift.confirm_expires_at ? (
                <p className="text-base text-amber-900">Hạn chót: <b>{fmtDateTime(shift.confirm_expires_at)}</b></p>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {results.length ? (
        <Card>
          <h2 className="text-xl font-bold text-slate-900">Kết quả đã xác nhận</h2>
          <ul className="divide-y divide-slate-200">
            {results.map((r) => (
              <li key={r.id} className="space-y-1 py-3">
                <p className="text-lg font-bold text-slate-900">{r.name}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={r.attended ? 'green' : 'red'}>{r.attended ? 'Đã làm' : 'Không đến'}</Badge>
                  {r.attended && r.on_time != null ? (
                    <Badge tone={r.on_time ? 'green' : 'amber'}>{r.on_time ? 'Đúng giờ' : 'Trễ'}</Badge>
                  ) : null}
                  <span className="text-xl"><Stars value={r.rating} /></span>
                </div>
                {r.comment ? <p className="text-base text-slate-800">“{r.comment}”</p> : null}
                {r.comment && r.comment_hidden ? (
                  <p className="text-sm text-slate-500">(Nhận xét này đã được nhóm vận hành ẩn khỏi hồ sơ công khai.)</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Người nhận ca</h2>
        {workers.length === 0 ? (
          contactError && claimed ? (
            <Alert tone="gray">Tên và số điện thoại người làm chỉ hiện đến 7 ngày sau ca.</Alert>
          ) : (
            <Empty>Chưa ai nhận ca này.</Empty>
          )
        ) : (
          <>
            <Card>
              <h3 className="text-base font-bold uppercase tracking-wide text-emerald-800">Người chính ({primaries.length}/{shift.headcount})</h3>
              {primaries.length ? (
                <ul className="divide-y divide-slate-200">
                  {primaries.map((w) => (
                    <WorkerRow key={w.claim_id} w={w}>
                      {canSwap ? (
                        <ActionForm action={swapRoles} className="space-y-2">
                          <input type="hidden" name="shift_id" value={shift.id} />
                          <input type="hidden" name="worker_id" value={w.worker_id} />
                          <SubmitButton variant="secondary"
                            confirm={`Đổi ${w.name} xuống dự phòng và đưa ${backups[0].name} lên làm người chính?`}>
                            Đổi chỗ với người dự phòng
                          </SubmitButton>
                        </ActionForm>
                      ) : null}
                    </WorkerRow>
                  ))}
                </ul>
              ) : (
                <p className="py-2 text-base text-slate-600">Chưa có người chính.</p>
              )}
            </Card>
            <Card>
              <h3 className="text-base font-bold uppercase tracking-wide text-sky-800">Người dự phòng</h3>
              {backups.length ? (
                <>
                  <ul className="divide-y divide-slate-200">
                    {backups.map((w) => <WorkerRow key={w.claim_id} w={w} />)}
                  </ul>
                  <p className="text-sm text-slate-600">Nếu người chính hủy, người dự phòng tự động được lên thay.</p>
                </>
              ) : (
                <p className="py-2 text-base text-slate-600">Chưa có người dự phòng.</p>
              )}
            </Card>
          </>
        )}
      </section>

      <Link href={`/quan/dang-ca?from=${shift.id}`} className={btn('secondary')}>Nhân bản ca này</Link>

      {notStarted ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-bold text-slate-900">Hủy ca</h2>
          {lateCancel ? (
            <Alert tone="red">
              Ca còn dưới 2 tiếng nữa là bắt đầu và đã có người nhận. Nếu hủy bây giờ sẽ bị ghi là <b>“hủy sát giờ”</b> và
              nhóm vận hành sẽ được báo.
            </Alert>
          ) : claimed ? (
            <p className="text-base text-slate-700">Ca đã có người nhận. Nếu hủy, anh/chị nên gọi báo cho họ.</p>
          ) : null}
          <ActionForm action={cancelShift}>
            <input type="hidden" name="shift_id" value={shift.id} />
            <SubmitButton variant="danger"
              confirm={lateCancel
                ? 'Ca sắp bắt đầu và đã có người nhận. Hủy bây giờ sẽ bị ghi "hủy sát giờ". Anh/chị vẫn muốn hủy?'
                : 'Anh/chị chắc chắn muốn hủy ca này?'}>
              Hủy ca này
            </SubmitButton>
          </ActionForm>
        </section>
      ) : null}

      <Link href={isAdmin && !shift.is_owner ? '/admin' : '/quan'} className={btn('ghost')}>← Về danh sách ca</Link>
    </div>
  );
}
