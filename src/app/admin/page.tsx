import Link from 'next/link';
import { primaryBusy } from '@/app/actions';
import { ActionForm, CopyButton, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Empty, Field, PageTitle, Tel, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { JOB_LABEL, SITE_URL } from '@/lib/constants';
import { fmtDateTime, fmtRange, shiftState, SHIFT_STATE_LABEL, SHIFT_STATE_TONE } from '@/lib/format';
import type { DispatchBoard, DispatchShift, PendingConfirmation } from '@/lib/types';

export const metadata = { title: 'Điều phối' };

const linkCls = 'font-semibold text-brand-700 underline underline-offset-4';
const summaryCls = 'cursor-pointer py-2 text-base font-semibold text-slate-700';

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
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={SHIFT_STATE_TONE[state]}>{SHIFT_STATE_LABEL[state]}</Badge>
        <Badge tone="blue">{JOB_LABEL[s.job_type]}</Badge>
        {s.urgent ? <Badge tone="red">GẤP</Badge> : null}
        {missing > 0 ? <Badge tone="red">THIẾU {missing} người chính</Badge> : null}
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900">{fmtRange(s.starts_at, s.ends_at)}</p>
        <p className="text-lg font-semibold text-slate-900">{s.facility_name}</p>
        <p className="text-base text-slate-700">{s.address}</p>
        <p className="text-base text-slate-700">
          Chủ quán: {s.owner_name} · <Tel phone={s.owner_phone} />
        </p>
      </div>

      <div>
        <p className="text-base font-bold text-slate-900">
          Người chính ({primaries.length}/{s.headcount})
        </p>
        {primaries.length === 0 ? <p className="text-base text-slate-600">Chưa có ai nhận.</p> : null}
        <ul className="mt-1 space-y-2">
          {primaries.map((c) => (
            <li key={c.worker_id} className="rounded-xl bg-slate-50 p-3">
              <p className="flex flex-wrap items-center gap-2 text-base">
                <span className="font-semibold">{c.name}</span>
                <Tel phone={c.phone} />
                {c.minor ? <Badge tone="amber">dưới 18</Badge> : null}
              </p>
              {notEnded ? (
                <details>
                  <summary className={summaryCls}>Người chính báo bận</summary>
                  <ActionForm action={primaryBusy} className="space-y-3 pt-1">
                    <input type="hidden" name="shift_id" value={s.id} />
                    <input type="hidden" name="worker_id" value={c.worker_id} />
                    <Field label="Ghi chú">
                      <input name="note" className={inputCls} placeholder="Lý do, ai báo, lúc nào…" maxLength={300} />
                    </Field>
                    <SubmitButton variant="danger" confirm="Chuyển người dự phòng lên và ghi sự cố?">
                      {c.name} báo bận
                    </SubmitButton>
                  </ActionForm>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-base font-bold text-slate-900">Người dự phòng</p>
        {backups.length === 0 ? (
          <p className="mt-1"><Badge tone="amber">Chưa có dự phòng</Badge></p>
        ) : (
          <ul className="mt-1 space-y-1">
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

      <CopyButton text={reminderText(s)}>Sao chép tin nhắn nhắc ca</CopyButton>
      <p>
        <Link href={`/quan/ca/${s.id}`} className={linkCls}>Xem chi tiết ca</Link>
      </p>
    </Card>
  );
}

function PendingCard({ s }: { s: PendingConfirmation }) {
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">{JOB_LABEL[s.job_type]}</Badge>
        {s.expired ? <Badge tone="red">Quá hạn 72 giờ</Badge> : <Badge tone="amber">Chờ xác nhận</Badge>}
        {s.primary_count === 0 ? <Badge tone="gray">Không có người nhận</Badge> : null}
      </div>
      <div>
        <p className="text-lg font-semibold text-slate-900">{s.facility_name}</p>
        <p className="text-base text-slate-700">{fmtRange(s.starts_at, s.ends_at)}</p>
        <p className="text-base text-slate-700">
          Chủ quán: {s.owner_name} · <Tel phone={s.owner_phone} />
        </p>
        <p className="text-base text-slate-700">Hạn xác nhận: {fmtDateTime(s.confirm_expires_at)}</p>
      </div>
      {s.expired ? null : <CopyButton text={ownerText(s)}>Sao chép tin nhắn cho chủ quán</CopyButton>}
      <p>
        <Link href={`/quan/ca/${s.id}`} className={linkCls}>Xem chi tiết ca</Link>
      </p>
    </Card>
  );
}

export default async function DispatchPage() {
  const { supabase } = await requireRole('admin');
  const { data, error } = await supabase.rpc('admin_dispatch_board');
  if (error) {
    return (
      <div className="space-y-4">
        <PageTitle>Bảng điều phối</PageTitle>
        <Alert tone="red">{error.message}</Alert>
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

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Ca trong 24 giờ tới ({upcoming.length})</h2>
        {short > 0 ? <Alert tone="red">Có {short} ca đang thiếu người chính.</Alert> : null}
        {upcoming.length === 0 ? (
          <Empty>Không có ca nào trong 24 giờ tới</Empty>
        ) : (
          upcoming.map((s) => <UpcomingCard key={s.id} s={s} now={now} />)
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Ca chờ chủ quán xác nhận ({pending.length})</h2>
        {pending.length === 0 ? (
          <Empty>Không có ca nào đang chờ xác nhận</Empty>
        ) : (
          pending.map((s) => <PendingCard key={s.id} s={s} />)
        )}
      </section>
    </div>
  );
}
