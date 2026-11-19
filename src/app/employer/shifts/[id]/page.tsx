import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CirclePlus, Hourglass } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Empty, PageTitle, SlotStrip, StateBadge, Stars, Tel, btn } from '@/components/ui';
import { cancelShift, hideComment, swapRoles } from '@/app/actions';
import { requireRole } from '@/lib/auth';
import { AREA_LABEL, JOB_LABEL } from '@/lib/constants';
import { friendlyError } from '@/lib/errors';
import { fmtDate, fmtDateTime, fmtMoney, fmtTime, hoursBetween, shiftState } from '@/lib/format';
import type { Contacts, ShiftDetail } from '@/lib/types';

export const metadata = { title: 'Chi tiết ca' };

type Worker = NonNullable<Contacts['workers']>[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function WorkerRow({ w, children }: { w: Worker; children?: React.ReactNode }) {
  return (
    <li className="space-y-2 py-4 first:pt-0 last:pb-0">
      <p className="text-lg font-bold text-ink">{w.name}</p>
      <p className="text-lg">Gọi: <Tel phone={w.phone} /></p>
      {w.slug ? (
        <Link href={`/p/${w.slug}`} className="inline-flex min-h-[3rem] items-center text-base font-semibold text-shutter underline underline-offset-4">
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

  // get_shift_contacts độc lập với shift_detail (tự kiểm quyền ở database), nên chạy song song; kết quả chỉ dùng khi ca hợp lệ.
  const [{ data, error }, { data: contactData, error: contactError }] = await Promise.all([
    supabase.rpc('shift_detail', { p_shift: id }),
    supabase.rpc('get_shift_contacts', { p_shift: id }),
  ]);
  // P0001 = "Không tìm thấy ca." từ database. Lỗi kỹ thuật (mạng…) thì báo thử lại, đừng giả là ca không tồn tại.
  if (error?.code === 'P0001' || (!error && !data)) notFound();
  if (error) return <Alert tone="red">{friendlyError(error)}</Alert>;
  const shift = data as ShiftDetail;
  const isAdmin = profile.role === 'admin';
  if (!shift.is_owner && !isAdmin) notFound();

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
    <div className="space-y-6">
      {sp.moi ? <Alert tone="green"><b>Đã đăng ca.</b> Khi có người nhận, tên và số điện thoại sẽ hiện ở trang này.</Alert> : null}

      <PageTitle sub={`${shift.facility_name} · ${AREA_LABEL[shift.area]}`}>Chi tiết ca</PageTitle>

      <Card
        tab={
          <>
            <StateBadge state={state} />
            {shift.urgent ? <Badge tone="red">GẤP</Badge> : null}
            <Badge tone="blue">{JOB_LABEL[shift.job_type]}</Badge>
            {shift.allow_minor ? <Badge tone="green">Nhận dưới 18 tuổi</Badge> : null}
          </>
        }
      >
        <div className="space-y-2">
          <div>
            <p className="text-base text-ink-soft">{fmtDate(shift.starts_at)}</p>
            <p className="tabular font-num text-4xl font-bold leading-tight text-ink">
              {fmtTime(shift.starts_at)}–{fmtTime(shift.ends_at)}
            </p>
          </div>
          <p className="text-lg font-semibold text-shutter">
            {fmtMoney(shift.hourly_wage)}/giờ{' '}
            <span className="font-normal text-ink-soft">· {hoursBetween(shift.starts_at, shift.ends_at)} giờ</span>
          </p>
          {state === 'open' || state === 'filled' ? (
            <SlotStrip headcount={shift.headcount} primary={shift.primary_count} backup={shift.backup_count} />
          ) : (
            <p className="text-base text-ink">
              Cần <b>{shift.headcount}</b> người chính · Đã nhận: <b>{shift.primary_count}/{shift.headcount}</b> · Dự phòng:{' '}
              <b>{shift.backup_count > 0 ? 'có' : 'chưa'}</b>
            </p>
          )}
          <p className="break-words text-base text-ink">Địa chỉ: {shift.address}</p>
          {shift.description ? <p className="whitespace-pre-line break-words text-base text-ink">{shift.description}</p> : null}
        </div>
      </Card>

      {shift.confirm_token ? (
        <section className="space-y-4 rounded-ui border-2 border-wall bg-wall-tint p-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
            <Hourglass className="h-6 w-6 shrink-0" aria-hidden="true" />
            Xác nhận sau ca
          </h2>
          {confirmExpired ? (
            <Alert tone="red">
              Đã quá hạn 72 giờ sau ca nên không xác nhận ở đây được nữa. Anh/chị vui lòng liên hệ nhóm vận hành.
            </Alert>
          ) : (
            <>
              <p className="text-base text-ink">
                Ca đã xong. Anh/chị cho biết ai đã làm, có đúng giờ không. Chỉ mất 1 phút.
              </p>
              <Link href={`/confirm/${shift.confirm_token}`} className={`${btn('primary')} !min-h-[3.75rem] !text-xl sm:w-auto`}>
                Xác nhận ngay
              </Link>
              {shift.confirm_expires_at ? (
                <p className="text-base text-ink">Hạn chót: <b>{fmtDateTime(shift.confirm_expires_at)}</b></p>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {results.length ? (
        <Card>
          <h2 className="mb-2 text-xl font-bold text-ink">Kết quả đã xác nhận</h2>
          <ul className="divide-y divide-rule">
            {results.map((r) => (
              <li key={r.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                <p className="text-lg font-bold text-ink">{r.name}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={r.attended ? 'green' : 'red'}>{r.attended ? 'Đã làm' : 'Không đến'}</Badge>
                  {r.attended && r.on_time != null ? (
                    <Badge tone={r.on_time ? 'green' : 'amber'}>{r.on_time ? 'Đúng giờ' : 'Trễ'}</Badge>
                  ) : null}
                  <Stars value={r.rating} />
                </div>
                {r.comment ? <p className="break-words text-base text-ink">“{r.comment}”</p> : null}
                {r.comment && r.comment_hidden ? (
                  <p className="text-base text-ink-soft">(Nhận xét này đã được nhóm vận hành ẩn khỏi hồ sơ công khai.)</p>
                ) : null}
                {isAdmin && r.comment ? (
                  <ActionForm action={hideComment} className="space-y-2 pt-1">
                    <input type="hidden" name="result_id" value={r.id} />
                    <input type="hidden" name="shift_id" value={shift.id} />
                    <input type="hidden" name="hidden" value={r.comment_hidden ? 'false' : 'true'} />
                    <SubmitButton variant="secondary" full={false}
                      confirm={r.comment_hidden ? undefined : `Ẩn nhận xét về ${r.name} khỏi hồ sơ công khai?`}>
                      {r.comment_hidden ? 'Hiện lại' : 'Ẩn nhận xét'}
                    </SubmitButton>
                  </ActionForm>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-ink">Người nhận ca</h2>
        {workers.length === 0 ? (
          shift.status === 'cancelled' ? (
            <Alert tone="gray">
              Ca đã hủy. Nếu đã có người nhận mà anh/chị chưa kịp báo cho họ, vui lòng liên hệ nhóm vận hành.
            </Alert>
          ) : contactError?.code === '42501' && claimed ? (
            // 42501 = database cố ý không trả số (quá 7 ngày sau ca). Lỗi khác (mạng…) thì báo thử lại.
            <Alert tone="gray">Tên và số điện thoại người làm chỉ hiện đến 7 ngày sau ca.</Alert>
          ) : contactError && contactError.code !== '42501' ? (
            <Alert tone="red">{friendlyError(contactError)}</Alert>
          ) : (
            <Empty>Chưa ai nhận ca này.</Empty>
          )
        ) : (
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <Card tab={<h3 className="text-lg font-bold text-ink">Người chính ({primaries.length}/{shift.headcount})</h3>}>
              {primaries.length ? (
                <ul className="divide-y divide-rule">
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
                <p className="text-base text-ink-soft">Chưa có người chính.</p>
              )}
            </Card>
            <Card tab={<h3 className="text-lg font-bold text-ink">Người dự phòng</h3>}>
              {backups.length ? (
                <>
                  <ul className="divide-y divide-rule">
                    {backups.map((w) => <WorkerRow key={w.claim_id} w={w} />)}
                  </ul>
                  <p className="mt-4 text-base text-ink-soft">Nếu người chính hủy, người dự phòng tự động được lên thay.</p>
                </>
              ) : (
                <p className="text-base text-ink-soft">Chưa có người dự phòng.</p>
              )}
            </Card>
          </div>
        )}
      </section>

      {shift.is_owner ? (
        <Link href={`/employer/new-shift?from=${shift.id}`} className={`${btn('secondary')} sm:w-auto`}>
          <CirclePlus className="h-5 w-5" aria-hidden="true" />
          Nhân bản ca này
        </Link>
      ) : null}

      {notStarted ? (
        <Card className="space-y-4">
          <h2 className="text-lg font-bold text-ink">Hủy ca</h2>
          {lateCancel ? (
            <Alert tone="red">
              Ca còn dưới 2 tiếng nữa là bắt đầu và đã có người nhận. Nếu hủy bây giờ sẽ bị ghi là <b>“hủy sát giờ”</b> và
              nhóm vận hành sẽ được báo.
            </Alert>
          ) : claimed ? (
            <p className="text-base text-ink">Ca đã có người nhận. Nếu hủy, anh/chị nên gọi báo cho họ.</p>
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
        </Card>
      ) : null}

      <Link href={isAdmin && !shift.is_owner ? '/admin' : '/employer'} className={`${btn('ghost')} sm:w-auto`}>
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Về danh sách ca
      </Link>
    </div>
  );
}
