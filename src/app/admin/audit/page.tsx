import { Alert, Empty, PageTitle } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
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
        <Alert tone="red">{friendlyError(error)}</Alert>
      </div>
    );
  }
  const rows = (data ?? []) as AuditRow[];
  return (
    <div className="space-y-6">
      <PageTitle sub={rows.length > 0 ? `${rows.length} thao tác gần nhất của nhóm vận hành (hiện tối đa 200).` : undefined}>Nhật ký thao tác</PageTitle>
      {rows.length === 0 ? (
        <Empty>Chưa có thao tác nào được ghi</Empty>
      ) : (
        <>
          {/* Một danh sách ở mọi bề rộng; từ 1024px mỗi dòng chia cột (cột chi tiết co giãn, các cột khác cố định). */}
          <ul className="divide-y divide-rule rounded-ui border border-rule bg-white">
            {rows.map((r) => {
              const pairs = detailPairs(r.detail);
              return (
                <li key={r.id} className="space-y-1 px-4 py-4 lg:grid lg:grid-cols-[11rem_14rem_10rem_1fr] lg:gap-4 lg:space-y-0">
                  <p className="text-base text-ink-soft lg:text-ink">{fmtDateTime(r.created_at)}</p>
                  <p className="text-base font-semibold text-ink">
                    {AUDIT_ACTION_LABEL[r.action] ?? r.action}
                    {r.target_table ? <span className="block font-normal text-ink-soft">{TABLE_LABEL[r.target_table] ?? r.target_table}</span> : null}
                  </p>
                  <p className="text-base text-ink-soft lg:text-ink">{r.admin_name ?? '(không rõ)'}</p>
                  {pairs.length ? <p className="break-words text-base text-ink">{pairs.join(' · ')}</p> : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
