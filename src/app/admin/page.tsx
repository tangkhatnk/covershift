import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { primaryBusy } from '@/app/actions';
import { ActionForm, CopyButton, Flash, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Empty, Field, PageTitle, StateBadge, Tel, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { JOB_LABEL, SITE_URL } from '@/lib/constants';
import { friendlyError } from '@/lib/errors';
import { fmtDate, fmtDateTime, fmtRange, fmtTime, shiftState } from '@/lib/format';
import type { DispatchBoard, DispatchShift, PendingConfirmation } from '@/lib/types';

export const metadata = { title: 'Điều phối' };

const linkCls = 'inline-flex min-h-[3rem] items-center font-semibold text-shutter underline underline-offset-4';
const summaryCls =
  'flex min-h-[3rem] cursor-pointer items-center justify-between gap-2 rounded-ui px-2 text-base font-semibold text-shutter hover:bg-shutter-tint';

/** Phần mở rộng (<details>): chạy bằng bàn phím, mũi tên xoay khi mở. */
function Disclosure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className={summaryCls}>
        {label}
        <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      {children}
    </details>
  );
}

function reminderText(s: DispatchShift) {
  const maps =
    s.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.facility_name} ${s.address}`)}`;
  return [
    '[SafeShift] Nhắc ca',
    `Quán: ${s.facility_name}`,
    `Địa chỉ: ${s.address}`,
    `Giờ: ${fmtRange(s.starts_at, s.ends_at)}`,
    `Việc: ${JOB_LABEL[s.job_type]}`,
    `Bản đồ: ${maps}`,
    'Vui lòng đến sớm 10 phút. Nếu bận hãy báo ngay cho nhóm vận hành.',
  ].join('\n');
}

function ownerText(s: PendingConfirmation) {
  return (
    `[SafeShift] Anh/chị vui lòng xác nhận ca ${JOB_LABEL[s.job_type]} ${fmtRange(s.starts_at, s.ends_at)} tại ${s.facility_name} ` +
    `(bấm link, không cần đăng nhập, hạn ${fmtDateTime(s.confirm_expires_at)}):\n${SITE_URL}/xac-nhan/${s.confirm_token}`
  );
}

function UpcomingCard({ s, now }: { s: DispatchShift; now: number }) {
  const state = shiftState(s, now);
  const primaries = s.claims.filter((c) => c.role === 'primary');
  const backups = s.claims.filter((c) => c.role === 'backup');
  const missing = s.headcount - primaries.length;
  const notEnded = new Date(s.ends_at).getTime() > now;
  return (
    <Card
      className="space-y-4"
      tab={
        <>
          <StateBadge state={state} />
          <Badge tone="blue">{JOB_LABEL[s.job_type]}</Badge>
          {s.urgent ? <Badge tone="red">GẤP</Badge> : null}
          {missing > 0 ? <Badge tone="red">THIẾU {missing} người chính</Badge> : null}
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-base text-ink-soft">{fmtDate(s.starts_at)}</p>
          <p className="tabular font-num text-3xl font-bold leading-tight text-ink">
            {fmtTime(s.starts_at)}–{fmtTime(s.ends_at)}
          </p>
          <p className="mt-2 text-lg font-semibold text-ink">{s.facility_name}</p>
          <p className="text-base text-ink">{s.address}</p>
          <p className="text-base text-ink">
            Chủ quán: {s.owner_name} · <Tel phone={s.owner_phone} />
          </p>
        </div>

        <div>
          <p className="text-base font-bold text-ink">
            Người chính ({primaries.length}/{s.headcount})
          </p>
          {primaries.length === 0 ? <p className="text-base text-ink-soft">Chưa có ai nhận.</p> : null}
          <ul className="mt-2 divide-y divide-rule border-y border-rule">
            {primaries.map((c) => (
              <li key={c.worker_id} className="py-2">
                <p className="flex flex-wrap items-center gap-2 text-base">
                  <span className="font-semibold">{c.name}</span>
                  <Tel phone={c.phone} />
                  {c.minor ? <Badge tone="amber">dưới 18</Badge> : null}
                </p>
                {notEnded ? (
                  <Disclosure label="Người chính báo bận">
                    <ActionForm action={primaryBusy} className="space-y-4 px-2 pb-2 pt-2">
                      <input type="hidden" name="shift_id" value={s.id} />
                      <input type="hidden" name="worker_id" value={c.worker_id} />
                      <Field label="Ghi chú">
                        <input name="note" className={inputCls} placeholder="Lý do, ai báo, lúc nào…" maxLength={300} />
                      </Field>
                      <SubmitButton variant="danger" confirm="Chuyển người dự phòng lên và ghi sự cố?">
                        {c.name} báo bận
                      </SubmitButton>
                    </ActionForm>
                  </Disclosure>
                ) : null}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-base font-bold text-ink">Người dự phòng</p>
          {backups.length === 0 ? (
            <p className="mt-2"><Badge tone="amber">Chưa có dự phòng</Badge></p>
          ) : (
            <ul className="mt-2 space-y-2">
              {backups.map((c) => (
                <li key={c.worker_id} className="flex flex-wrap items-center gap-2 text-base">
                  <span className="font-semibold">{c.name}</span>
                  <Tel phone={c.phone} />
                  {c.minor ? <Badge tone="amber">dưới 18</Badge> : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <CopyButton text={reminderText(s)}>Sao chép tin nhắn nhắc ca</CopyButton>
          <Link href={`/quan/ca/${s.id}`} className={linkCls}>Xem chi tiết ca</Link>
        </div>
      </div>
    </Card>
  );
}

function PendingCard({ s }: { s: PendingConfirmation }) {
  return (
    <Card
      tab={
        <>
          <Badge tone="blue">{JOB_LABEL[s.job_type]}</Badge>
          {s.expired ? <Badge tone="red">Quá hạn 72 giờ</Badge> : <Badge tone="amber">Chờ xác nhận</Badge>}
          {s.primary_count === 0 ? <Badge tone="gray">Không có người nhận</Badge> : null}
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-ink">{s.facility_name}</p>
          <p className="text-base text-ink">{fmtRange(s.starts_at, s.ends_at)}</p>
          <p className="text-base text-ink">
            Chủ quán: {s.owner_name} · <Tel phone={s.owner_phone} />
          </p>
          <p className="text-base text-ink">Hạn xác nhận: {fmtDateTime(s.confirm_expires_at)}</p>
        </div>
        <div className="space-y-2">
          {s.expired ? null : <CopyButton text={ownerText(s)}>Sao chép tin nhắn cho chủ quán</CopyButton>}
          <Link href={`/quan/ca/${s.id}`} className={linkCls}>Xem chi tiết ca</Link>
        </div>
      </div>
    </Card>
  );
}

export default async function DispatchPage({ searchParams }: { searchParams: Promise<{ 'bao-ban'?: string }> }) {
  const { supabase } = await requireRole('admin');
  const busyResult = (await searchParams)['bao-ban'];
  const { data, error } = await supabase.rpc('admin_dispatch_board');
  if (error) {
    return (
      <div className="space-y-4">
        <PageTitle>Bảng điều phối</PageTitle>
        <Alert tone="red">{friendlyError(error)}</Alert>
      </div>
    );
  }
  const board = data as DispatchBoard;
  const upcoming = board?.upcoming ?? [];
  const pending = board?.pending ?? [];
  const now = Date.now();
  const short = upcoming.filter((s) => s.claims.filter((c) => c.role === 'primary').length < s.headcount).length;

  return (
    <div className="space-y-6">
      <PageTitle sub={`Cập nhật lúc ${fmtDateTime(new Date(now).toISOString())}. Tải lại trang để xem mới nhất.`}>
        Bảng điều phối
      </PageTitle>

      {/* Kết quả "Người chính báo bận" (action primaryBusy chuyển hướng về đây); Flash tự xóa ?bao-ban khỏi URL. */}
      {busyResult === 'da-thay' ? (
        <Flash param="bao-ban" tone="green">
          Đã chuyển người dự phòng lên làm người chính và ghi sự cố. Hãy gọi báo cho người dự phòng và chủ quán.
        </Flash>
      ) : busyResult === 'khong-du-phong' ? (
        <Flash param="bao-ban" tone="red">
          <b>Đã ghi sự cố nhưng ca này KHÔNG có người dự phòng.</b> Cần tìm người thay ngay.
        </Flash>
      ) : null}

      {/* Hai cột từ 1024px: ca sắp diễn ra (việc gấp) bên trái, ca chờ xác nhận bên phải. */}
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-ink">Ca trong 24 giờ tới ({upcoming.length})</h2>
          {short > 0 ? <Alert tone="red">Có {short} ca đang thiếu người chính.</Alert> : null}
          {upcoming.length === 0 ? (
            <Empty>Không có ca nào trong 24 giờ tới</Empty>
          ) : (
            upcoming.map((s) => <UpcomingCard key={s.id} s={s} now={now} />)
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-ink">Ca chờ chủ quán xác nhận ({pending.length})</h2>
          {pending.length === 0 ? (
            <Empty>Không có ca nào đang chờ xác nhận</Empty>
          ) : (
            pending.map((s) => <PendingCard key={s.id} s={s} />)
          )}
        </section>
      </div>
    </div>
  );
}
