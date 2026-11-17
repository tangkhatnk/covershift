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

function ReportCard({ r }: { r: AdminReport }) {
  const open = r.status === 'open';
  const shiftLabel = [r.facility_name, r.starts_at ? fmtDateTime(r.starts_at) : null].filter(Boolean).join(' · ');
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">{REPORT_KIND_LABEL[r.kind] ?? r.kind}</Badge>
        <Badge tone={open ? 'red' : 'green'}>{open ? 'Đang mở' : 'Đã xử lý'}</Badge>
        <span className="text-sm text-slate-600">{fmtDateTime(r.created_at)}</span>
      </div>
      <p className="whitespace-pre-wrap break-words text-base text-slate-900">{r.body}</p>
      <div className="space-y-0.5 text-base text-slate-700">
        {r.shift_id ? (
          <p>
            Ca liên quan:{' '}
            <Link href={`/quan/ca/${r.shift_id}`} className="font-semibold text-brand-700 underline underline-offset-4">
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
      {r.admin_note ? (
        <p className="rounded-xl bg-slate-50 p-3 text-base text-slate-800">
          <span className="font-bold">Ghi chú xử lý:</span> {r.admin_note}
        </p>
      ) : null}
      {open ? (
        <ActionForm action={resolveReport} className="space-y-3">
          <input type="hidden" name="report_id" value={r.id} />
          <Field label="Đã xử lý thế nào?">
            <input name="note" maxLength={500} className={inputCls} />
          </Field>
          <SubmitButton>Đánh dấu đã xử lý</SubmitButton>
        </ActionForm>
      ) : null}
    </Card>
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
    <div className="space-y-4">
      <PageTitle sub="Hiện tối đa 300 báo cáo gần nhất.">Hộp báo cáo</PageTitle>
      <Alert tone={openCount > 0 ? 'red' : 'green'}>
        {openCount > 0 ? `${openCount} báo cáo đang mở cần xử lý.` : 'Không có báo cáo nào đang mở.'}
      </Alert>
      {list.length === 0 ? <Empty>Chưa có báo cáo nào</Empty> : list.map((r) => <ReportCard key={r.id} r={r} />)}
    </div>
  );
}
