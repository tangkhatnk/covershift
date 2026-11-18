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

const th = 'px-4 py-2 text-left text-base font-semibold text-ink';
const td = 'px-4 py-4 align-top text-base text-ink';

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
      <PageTitle sub="200 thao tác gần nhất của nhóm vận hành.">Nhật ký thao tác</PageTitle>
      {rows.length === 0 ? (
        <Empty>Chưa có thao tác nào được ghi</Empty>
      ) : (
        <>
          {/* Điện thoại: một danh sách trong một khung. */}
          <ul className="divide-y divide-rule rounded-ui border border-rule bg-white lg:hidden">
            {rows.map((r) => {
              const pairs = detailPairs(r.detail);
              return (
                <li key={r.id} className="px-4 py-4">
                  <p className="text-base font-semibold text-ink">{AUDIT_ACTION_LABEL[r.action] ?? r.action}</p>
                  <p className="text-base text-ink-soft">
                    {fmtDateTime(r.created_at)} · {r.admin_name ?? '(không rõ)'}
                    {r.target_table ? ` · ${TABLE_LABEL[r.target_table] ?? r.target_table}` : ''}
                  </p>
                  {pairs.length ? <p className="mt-2 break-words text-base text-ink">{pairs.join(' · ')}</p> : null}
                </li>
              );
            })}
          </ul>

          {/* Từ 1024px: bảng. */}
          <div className="hidden overflow-hidden rounded-ui border border-rule bg-white lg:block">
            <table className="w-full border-collapse">
              <caption className="sr-only">Nhật ký thao tác của nhóm vận hành</caption>
              <thead className="bg-wall-tint">
                <tr>
                  <th scope="col" className={th}>Thời gian</th>
                  <th scope="col" className={th}>Thao tác</th>
                  <th scope="col" className={th}>Người thực hiện</th>
                  <th scope="col" className={th}>Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {rows.map((r) => {
                  const pairs = detailPairs(r.detail);
                  return (
                    <tr key={r.id}>
                      <th scope="row" className={`${td} whitespace-nowrap text-left font-normal`}>{fmtDateTime(r.created_at)}</th>
                      <td className={td}>
                        <span className="font-semibold">{AUDIT_ACTION_LABEL[r.action] ?? r.action}</span>
                        {r.target_table ? <span className="block text-ink-soft">{TABLE_LABEL[r.target_table] ?? r.target_table}</span> : null}
                      </td>
                      <td className={td}>{r.admin_name ?? '(không rõ)'}</td>
                      <td className={`${td} break-words`}>{pairs.length ? pairs.join(' · ') : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
