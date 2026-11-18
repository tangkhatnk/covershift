import Link from 'next/link';
import { resolveReport } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Empty, Field, PageTitle, Tel, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { REPORT_KIND_LABEL } from '@/lib/constants';
import { fmtDateTime } from '@/lib/format';
import type { AdminReport } from '@/lib/types';

export const metadata = { title: 'Hộp báo cáo' };

const th = 'px-4 py-2 text-left text-base font-semibold text-ink';
const td = 'px-4 py-4 align-top text-base text-ink';

function Kind({ r }: { r: AdminReport }) {
  const open = r.status === 'open';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="blue">{REPORT_KIND_LABEL[r.kind] ?? r.kind}</Badge>
      <Badge tone={open ? 'red' : 'green'}>{open ? 'Đang mở' : 'Đã xử lý'}</Badge>
    </div>
  );
}

function Body({ r }: { r: AdminReport }) {
  return (
    <div className="space-y-2">
      <p className="whitespace-pre-wrap break-words text-base text-ink">{r.body}</p>
      {r.admin_note ? (
        <p className="break-words text-base text-ink">
          <span className="font-bold">Ghi chú xử lý:</span> {r.admin_note}
        </p>
      ) : null}
    </div>
  );
}

function Related({ r }: { r: AdminReport }) {
  const shiftLabel = [r.facility_name, r.starts_at ? fmtDateTime(r.starts_at) : null].filter(Boolean).join(' · ');
  if (!r.shift_id && !r.reporter_name && !r.subject_name) return <p className="text-base text-ink-soft">Không có.</p>;
  return (
    <div className="space-y-1 text-base text-ink">
      {r.shift_id ? (
        <p>
          Ca liên quan:{' '}
          <Link href={`/quan/ca/${r.shift_id}`} className="font-semibold text-shutter underline underline-offset-4">
            {shiftLabel || 'Xem ca'}
          </Link>
        </p>
      ) : null}
      {r.reporter_name ? (
        <p>Người gửi: {r.reporter_name} · <Tel phone={r.reporter_phone} /></p>
      ) : null}
      {r.subject_name ? (
        <p>Người liên quan: {r.subject_name} · <Tel phone={r.subject_phone} /></p>
      ) : null}
    </div>
  );
}

function Resolve({ r }: { r: AdminReport }) {
  return (
    <ActionForm action={resolveReport} className="space-y-4">
      <input type="hidden" name="report_id" value={r.id} />
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <Field label="Đã xử lý thế nào?">
          <input name="note" maxLength={500} className={inputCls} />
        </Field>
        <SubmitButton>Đánh dấu đã xử lý</SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function ReportsPage() {
  const { supabase } = await requireRole('admin');
  const { data, error } = await supabase.rpc('admin_list_reports');
  if (error) {
    return (
      <div className="space-y-4">
        <PageTitle>Hộp báo cáo</PageTitle>
        <Alert tone="red">{friendlyError(error)}</Alert>
      </div>
    );
  }
  const list = (data ?? []) as AdminReport[];
  const openCount = list.filter((r) => r.status === 'open').length;
  return (
    <div className="space-y-6">
      <PageTitle sub="Hiện tối đa 300 báo cáo gần nhất.">Hộp báo cáo</PageTitle>
      <Alert tone={openCount > 0 ? 'red' : 'green'}>
        {openCount > 0 ? `${openCount} báo cáo đang mở cần xử lý.` : 'Không có báo cáo nào đang mở.'}
      </Alert>
      {list.length === 0 ? (
        <Empty>Chưa có báo cáo nào</Empty>
      ) : (
        <>
          {/* Điện thoại: mỗi báo cáo một thẻ. */}
          <div className="space-y-4 lg:hidden">
            {list.map((r) => (
              <Card key={r.id} tab={<><Kind r={r} /><span className="text-base text-ink-soft">{fmtDateTime(r.created_at)}</span></>}>
                <div className="space-y-4">
                  <Body r={r} />
                  <Related r={r} />
                  {r.status === 'open' ? <Resolve r={r} /> : null}
                </div>
              </Card>
            ))}
          </div>

          {/* Từ 1024px: bảng. Báo cáo đang mở có thêm một hàng để ghi cách xử lý. */}
          <div className="hidden overflow-hidden rounded-ui border border-rule bg-white lg:block">
            <table className="w-full border-collapse">
              <caption className="sr-only">Danh sách báo cáo</caption>
              <thead className="bg-wall-tint">
                <tr>
                  <th scope="col" className={th}>Loại và thời gian</th>
                  <th scope="col" className={th}>Nội dung</th>
                  <th scope="col" className={th}>Liên quan</th>
                </tr>
              </thead>
              {list.map((r) => (
                <tbody key={r.id} className="border-t border-rule">
                  <tr>
                    <th scope="row" className={`${td} text-left font-normal`}>
                      <div className="space-y-2">
                        <Kind r={r} />
                        <p className="text-base text-ink-soft">{fmtDateTime(r.created_at)}</p>
                      </div>
                    </th>
                    <td className={td}><Body r={r} /></td>
                    <td className={td}><Related r={r} /></td>
                  </tr>
                  {r.status === 'open' ? (
                    <tr>
                      <td colSpan={3} className="px-4 pb-4"><Resolve r={r} /></td>
                    </tr>
                  ) : null}
                </tbody>
              ))}
            </table>
          </div>
        </>
      )}
    </div>
  );
}
