import Link from 'next/link';
import { reviewWorker, setAccountStatus } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Empty, Field, PageTitle, Tel, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { APPROVAL_LABEL, AREA_LABEL, AVAILABILITY_LABEL, CONSENT_LABEL } from '@/lib/constants';
import { fmtDateTime, fmtPlainDate } from '@/lib/format';
import type { AdminWorker } from '@/lib/types';

export const metadata = { title: 'Duyệt người làm' };

const summaryCls = 'cursor-pointer py-2 text-base font-semibold text-slate-700';
const APPROVAL_TONE = { pending: 'amber', approved: 'green', rejected: 'gray' } as const;
const FILTERS = ['cho-duyet', 'da-duyet', 'tat-ca'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL: Record<Filter, string> = { 'cho-duyet': 'Chờ duyệt', 'da-duyet': 'Đã duyệt', 'tat-ca': 'Tất cả' };

function ReviewForm({ w }: { w: AdminWorker }) {
  return (
    <ActionForm action={reviewWorker} className="space-y-3">
      <input type="hidden" name="worker_id" value={w.user_id} />
      {/* textarea, không dùng input: nhấn Enter trong input sẽ bấm nút submit đầu tiên ("Duyệt").
          Để trống: ghi chú cũ (vd. lý do từ chối) đã hiện ở trên, không tự thành ghi chú của lần quyết định mới. */}
      <Field label="Ghi chú">
        <textarea name="note" rows={2} maxLength={300} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <SubmitButton name="decision" value="approve">Duyệt</SubmitButton>
        <SubmitButton name="decision" value="reject" variant="danger"
          confirm={`Từ chối ${w.full_name}? Các ca sắp tới của người này sẽ bị hủy. Đã ghi lý do vào ô Ghi chú chưa? (người làm sẽ thấy lý do trong hồ sơ)`}>
          Từ chối
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

function WorkerCard({ w }: { w: AdminWorker }) {
  const minor = w.age < 18;
  const locked = w.status === 'locked';
  const c = w.consent;
  const slots = (w.availability ?? []).map((a) => AVAILABILITY_LABEL[a as keyof typeof AVAILABILITY_LABEL] ?? a);
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={APPROVAL_TONE[w.approval]}>{APPROVAL_LABEL[w.approval]}</Badge>
        {minor ? <Badge tone="amber">Dưới 18</Badge> : null}
        {locked ? <Badge tone="red">Đã khóa</Badge> : null}
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900">{w.full_name}</p>
        <p className="text-base text-slate-700">
          {w.age} tuổi · sinh {fmtPlainDate(w.date_of_birth)}
        </p>
        <p className="text-base text-slate-700">
          {w.school}{w.class_name ? ` · ${w.class_name}` : ''}
        </p>
        <p className="text-base text-slate-700">Khu vực: {AREA_LABEL[w.area]}</p>
        <p className="text-base text-slate-700">Rảnh: {slots.length ? slots.join('; ') : '(chưa chọn)'}</p>
        <p className="text-base text-slate-700">Điện thoại: <Tel phone={w.phone} /></p>
        {w.review_note ? <p className="break-words text-base text-slate-700">Ghi chú duyệt: {w.review_note}</p> : null}
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {([
          ['Ca đã xác nhận', w.confirmed, false],
          ['Hủy sát giờ', w.late_cancels, w.late_cancels > 0],
          ['Không đến', w.no_shows, w.no_shows > 0],
        ] as const).map(([label, n, bad]) => (
          <div key={label} className={`rounded-xl p-2 ${bad ? 'bg-red-50' : 'bg-slate-50'}`}>
            <dd className={`text-xl font-bold ${bad ? 'text-red-800' : 'text-slate-900'}`}>{n}</dd>
            <dt className="text-sm text-slate-600">{label}</dt>
          </div>
        ))}
      </dl>

      {c ? (
        <div className="rounded-xl bg-slate-50 p-3 text-base text-slate-800">
          <p className="font-bold">Phiếu phụ huynh</p>
          <p>{CONSENT_LABEL[c.status]}</p>
          {c.parent_name ? <p>Phụ huynh: {c.parent_name}</p> : null}
          {c.parent_phone ? <p>Điện thoại: <Tel phone={c.parent_phone} /></p> : null}
          {c.agreed_at ? <p>Đồng ý lúc: {fmtDateTime(c.agreed_at)}</p> : null}
        </div>
      ) : null}
      {minor && (!c || c.status === 'pending') ? (
        <Alert tone="amber">Chưa duyệt được: phụ huynh chưa gửi phiếu đồng ý.</Alert>
      ) : null}

      {w.approval === 'approved' ? (
        <details>
          <summary className={summaryCls}>Đổi quyết định</summary>
          <div className="pt-1"><ReviewForm w={w} /></div>
        </details>
      ) : (
        <ReviewForm w={w} />
      )}

      <details>
        <summary className={summaryCls}>Khóa / mở tài khoản</summary>
        <ActionForm action={setAccountStatus} className="space-y-3 pt-1">
          <input type="hidden" name="user_id" value={w.user_id} />
          <input type="hidden" name="status" value={locked ? 'active' : 'locked'} />
          <Field label={locked ? 'Lý do mở khóa' : 'Lý do khóa'}
            hint={locked ? undefined : 'Khóa sẽ hủy các ca sắp tới của người này.'}>
            <input name="reason" maxLength={300} className={inputCls} />
          </Field>
          {locked ? (
            <SubmitButton variant="secondary" confirm={`Mở khóa tài khoản của ${w.full_name}?`}>Mở khóa tài khoản</SubmitButton>
          ) : (
            <SubmitButton variant="danger" confirm={`Khóa tài khoản của ${w.full_name} và hủy các ca sắp tới?`}>
              Khóa tài khoản
            </SubmitButton>
          )}
        </ActionForm>
      </details>
    </Card>
  );
}

export default async function WorkersPage({ searchParams }: { searchParams: Promise<{ loc?: string | string[] }> }) {
  const { supabase } = await requireRole('admin');
  const sp = await searchParams;
  const raw = Array.isArray(sp.loc) ? sp.loc[0] : sp.loc;
  const filter: Filter = FILTERS.includes(raw as Filter) ? (raw as Filter) : 'tat-ca';

  const { data, error } = await supabase.rpc('admin_list_workers');
  if (error) {
    return (
      <div className="space-y-4">
        <PageTitle>Duyệt người làm</PageTitle>
        <Alert tone="red">{friendlyError(error)}</Alert>
      </div>
    );
  }
  const all = (data ?? []) as AdminWorker[];
  const count: Record<Filter, number> = {
    'cho-duyet': all.filter((w) => w.approval === 'pending').length,
    'da-duyet': all.filter((w) => w.approval === 'approved').length,
    'tat-ca': all.length,
  };
  const list =
    filter === 'cho-duyet' ? all.filter((w) => w.approval === 'pending')
    : filter === 'da-duyet' ? all.filter((w) => w.approval === 'approved')
    : all;

  return (
    <div className="space-y-4">
      <PageTitle>Duyệt người làm</PageTitle>
      <nav className="flex flex-wrap gap-2" aria-label="Bộ lọc">
        {FILTERS.map((f) => (
          <Link key={f} href={f === 'tat-ca' ? '/admin/nguoi-lam' : `/admin/nguoi-lam?loc=${f}`}
            aria-current={f === filter ? 'page' : undefined}
            className={`rounded-full px-4 py-2 text-base font-semibold ${
              f === filter ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800 hover:bg-brand-100'
            }`}>
            {FILTER_LABEL[f]} ({count[f]})
          </Link>
        ))}
      </nav>
      {list.length === 0 ? <Empty>Không có người làm nào trong nhóm này</Empty> : list.map((w) => <WorkerCard key={w.user_id} w={w} />)}
    </div>
  );
}
