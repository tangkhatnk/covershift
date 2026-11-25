import Link from 'next/link';
import { reviewWorker, setAccountStatus } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Search } from 'lucide-react';
import { Alert, Badge, Card, Disclosure, Empty, Field, PageTitle, Tel, btn, inputCls } from '@/components/ui';
import { Pager, pageOf } from '../pager';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { APPROVAL_LABEL, AREA_LABEL, AVAILABILITY_LABEL, CONSENT_LABEL } from '@/lib/constants';
import { fmtDateTime, fmtPlainDate } from '@/lib/format';
import type { AdminWorker } from '@/lib/types';

export const metadata = { title: 'Duyệt người làm' };

const APPROVAL_TONE = { pending: 'amber', approved: 'green', rejected: 'gray' } as const;
const PAGE_SIZE = 4;

// Bỏ dấu để gõ "nguyen" vẫn ra "Nguyễn". Chỉ tìm theo tên, trường, lớp: không tìm theo SĐT (tránh đưa SĐT lên URL).
const fold = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();

const FILTERS = ['cho-duyet', 'da-duyet', 'tat-ca'] as const;
type Filter = (typeof FILTERS)[number];
const FILTER_LABEL: Record<Filter, string> = { 'cho-duyet': 'Chờ duyệt', 'da-duyet': 'Đã duyệt', 'tat-ca': 'Tất cả' };

function ReviewForm({ w }: { w: AdminWorker }) {
  return (
    <ActionForm action={reviewWorker} className="space-y-4">
      <input type="hidden" name="worker_id" value={w.user_id} />
      {/* textarea, không dùng input: nhấn Enter trong input sẽ bấm nút submit đầu tiên ("Duyệt").
          Để trống: ghi chú cũ (vd. lý do từ chối) đã hiện ở trên, không tự thành ghi chú của lần quyết định mới. */}
      <Field label="Ghi chú">
        <textarea name="note" rows={2} maxLength={300} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <SubmitButton name="decision" value="approve">Duyệt</SubmitButton>
        <SubmitButton name="decision" value="reject" variant="danger"
          confirm={`Từ chối ${w.full_name}? Các ca sắp tới của người này sẽ bị hủy. Đã ghi lý do vào ô Ghi chú chưa? (người làm sẽ thấy lý do trong hồ sơ)`}>
          Từ chối
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

function Badges({ w }: { w: AdminWorker }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={APPROVAL_TONE[w.approval]}>{APPROVAL_LABEL[w.approval]}</Badge>
      {w.age < 18 ? <Badge tone="amber">Dưới 18</Badge> : null}
      {w.status === 'locked' ? <Badge tone="red">Đã khóa</Badge> : null}
    </div>
  );
}

function Identity({ w }: { w: AdminWorker }) {
  return (
    <>
      <p className="break-words text-xl font-bold text-ink">{w.full_name}</p>
      <p className="text-base text-ink">
        {w.age} tuổi · sinh {fmtPlainDate(w.date_of_birth)}
      </p>
      <p className="break-words text-base text-ink">
        {w.school}{w.class_name ? ` · ${w.class_name}` : ''}
      </p>
    </>
  );
}

function Contact({ w }: { w: AdminWorker }) {
  const slots = (w.availability ?? []).map((a) => AVAILABILITY_LABEL[a as keyof typeof AVAILABILITY_LABEL] ?? a);
  return (
    <div className="space-y-1 text-base text-ink">
      <p>Điện thoại: <Tel phone={w.phone} /></p>
      <p>Khu vực: {AREA_LABEL[w.area]}</p>
      <p>Rảnh: {slots.length ? slots.join('; ') : '(chưa chọn)'}</p>
      {w.review_note ? <p className="break-words">Ghi chú duyệt: {w.review_note}</p> : null}
    </div>
  );
}

function Stats({ w }: { w: AdminWorker }) {
  return (
    <dl className="grid grid-cols-3 gap-2 text-center lg:grid-cols-1 lg:text-left">
      {([
        ['Ca đã xác nhận', w.confirmed, false],
        ['Hủy sát giờ', w.late_cancels, w.late_cancels > 0],
        ['Không đến', w.no_shows, w.no_shows > 0],
      ] as const).map(([label, n, bad]) => (
        <div key={label} className={`rounded-ui p-2 lg:flex lg:items-baseline lg:gap-2 lg:p-0 ${bad ? 'bg-danger-tint lg:bg-transparent' : 'bg-chalk lg:bg-transparent'}`}>
          <dd className={`tabular text-xl font-bold lg:order-2 ${bad ? 'text-danger' : 'text-ink'}`}>{n}</dd>
          <dt className="text-base text-ink-soft lg:order-1">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

/** Phiếu phụ huynh và cảnh báo thiếu phiếu (chỉ có khi có dữ liệu). */
function Consent({ w }: { w: AdminWorker }) {
  const c = w.consent;
  const minor = w.age < 18;
  if (!c && !minor) return null;
  return (
    <div className="space-y-2">
      {c ? (
        <div className="text-base text-ink">
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
    </div>
  );
}

function Actions({ w }: { w: AdminWorker }) {
  const locked = w.status === 'locked';
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-8">
      <div>
        {w.approval === 'approved' ? (
          <Disclosure summary="Đổi quyết định">
            <div className="px-2 pb-2 pt-2"><ReviewForm w={w} /></div>
          </Disclosure>
        ) : (
          <div className="px-2"><ReviewForm w={w} /></div>
        )}
      </div>
      <Disclosure summary="Khóa / mở tài khoản">
        <ActionForm action={setAccountStatus} className="space-y-4 px-2 pb-2 pt-2">
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
      </Disclosure>
    </div>
  );
}

export default async function WorkersPage({ searchParams }: { searchParams: Promise<{ loc?: string | string[]; q?: string | string[]; trang?: string | string[] }> }) {
  const { supabase } = await requireRole('admin');
  const sp = await searchParams;
  const raw = Array.isArray(sp.loc) ? sp.loc[0] : sp.loc;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().slice(0, 60) ?? '';
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
  const byFilter =
    filter === 'cho-duyet' ? all.filter((w) => w.approval === 'pending')
    : filter === 'da-duyet' ? all.filter((w) => w.approval === 'approved')
    : all;
  const needle = fold(q);
  const matched = needle ? byFilter.filter((w) => fold(`${w.full_name} ${w.school} ${w.class_name ?? ''}`).includes(needle)) : byFilter;
  const { page, pages } = pageOf(sp.trang, matched.length, PAGE_SIZE);
  const list = matched.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const keep = { loc: filter === 'tat-ca' ? '' : filter, q };
  const qs = (p: Record<string, string>) => {
    const t = new URLSearchParams(Object.entries(p).filter(([, v]) => v)).toString();
    return t ? `/admin/workers?${t}` : '/admin/workers';
  };

  return (
    <div className="space-y-6">
      <PageTitle>Duyệt người làm</PageTitle>
      <form action="/admin/workers" role="search" className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {filter !== 'tat-ca' ? <input type="hidden" name="loc" value={filter} /> : null}
        <div className="sm:flex-1">
          <Field label="Tìm theo tên, trường hoặc lớp">
            <input type="search" name="q" defaultValue={q} maxLength={60} autoComplete="off" className={inputCls} />
          </Field>
        </div>
        <button type="submit" className={`${btn('primary')} sm:w-auto`}><Search className="h-5 w-5" aria-hidden="true" />Tìm</button>
      </form>
      <nav className="flex flex-wrap gap-2" aria-label="Bộ lọc">
        {FILTERS.map((f) => (
          <Link key={f} href={qs({ loc: f === 'tat-ca' ? '' : f, q })}
            aria-current={f === filter ? 'page' : undefined}
            className={`inline-flex min-h-[3rem] items-center rounded-ui border-2 px-4 text-base font-semibold ${
              f === filter
                ? 'border-brand bg-brand text-white'
                : 'border-rule-strong bg-white text-ink hover:bg-brand-tint'
            }`}>
            {FILTER_LABEL[f]} ({count[f]})
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <Empty>{q ? `Không có người làm nào khớp "${q}" trong nhóm này.` : 'Không có người làm nào trong nhóm này.'}</Empty>
      ) : (
        <>
          <p className="text-base text-ink-soft">
            Hiện {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + list.length} trong {matched.length} người.
          </p>
          {/* Một thẻ cho mỗi người ở mọi bề rộng; từ 1024px phần thông tin chia ba cột, thao tác trải hết bề ngang. */}
          <div className="space-y-4">
            {list.map((w) => (
              <Card key={w.user_id} tab={<Badges w={w} />}>
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-3 lg:gap-8">
                    <div><Identity w={w} /></div>
                    <Contact w={w} />
                    <Stats w={w} />
                  </div>
                  <Consent w={w} />
                  <div className="border-t border-rule pt-2"><Actions w={w} /></div>
                </div>
              </Card>
            ))}
          </div>
          <Pager base="/admin/workers" params={keep} page={page} pages={pages} />
        </>
      )}
    </div>
  );
}
