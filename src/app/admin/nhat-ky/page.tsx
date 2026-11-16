import { Alert, Empty, PageTitle } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { AUDIT_ACTION_LABEL } from '@/lib/constants';
import { fmtDateTime } from '@/lib/format';
import type { AuditRow } from '@/lib/types';

export const metadata = { title: 'Nhật ký' };

const TABLE_LABEL: Record<string, string> = {
  facilities: 'Cơ sở',
  worker_profiles: 'Người làm',
  profiles: 'Tài khoản',
  shifts: 'Ca làm',
  reports: 'Báo cáo',
  shift_results: 'Nhận xét',
  app_config: 'Cấu hình',
};

function detailPairs(detail: AuditRow['detail']) {
  return Object.entries(detail ?? {})
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
}

export default async function AuditPage() {
  const { supabase } = await requireRole('admin');
  const { data, error } = await supabase.rpc('admin_audit', { p_limit: 200 });
  if (error) {
    return (
      <div className="space-y-4">
        <PageTitle>Nhật ký thao tác</PageTitle>
        <Alert tone="red">{error.message}</Alert>
      </div>
    );
  }
  const rows = (data ?? []) as AuditRow[];
  return (
    <div className="space-y-4">
      <PageTitle sub="200 thao tác gần nhất của nhóm vận hành.">Nhật ký thao tác</PageTitle>
      {rows.length === 0 ? (
        <Empty>Chưa có thao tác nào được ghi</Empty>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {rows.map((r) => {
            const pairs = detailPairs(r.detail);
            return (
              <li key={r.id} className="px-4 py-3">
                <p className="text-base font-semibold text-slate-900">{AUDIT_ACTION_LABEL[r.action] ?? r.action}</p>
                <p className="text-sm text-slate-600">
                  {fmtDateTime(r.created_at)} · {r.admin_name ?? '(không rõ)'}
                  {r.target_table ? ` · ${TABLE_LABEL[r.target_table] ?? r.target_table}` : ''}
                </p>
                {pairs.length ? <p className="mt-1 break-words text-sm text-slate-700">{pairs.join(' · ')}</p> : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
