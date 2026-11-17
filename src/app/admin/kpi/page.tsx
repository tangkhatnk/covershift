import { setConfig } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Card, Field, PageTitle, btn, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { fmtDateTime } from '@/lib/format';
import type { Kpis } from '@/lib/types';
import { KPI_LABELS } from './labels';

export const metadata = { title: 'KPI' };

const numFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

function show(v: number | null | undefined, unit: string) {
  if (v == null) return '—';
  const n = numFmt.format(v);
  return unit === '%' ? `${n}%` : unit === '/5' ? `${n}/5` : unit === 'phút' ? `${n} phút` : n;
}

const CONFIG: { key: string; label: string }[] = [
  { key: 'min_hourly_wage', label: 'Lương/giờ tối thiểu (đ)' },
  { key: 'weekly_hours_cap', label: 'Giới hạn giờ/tuần' },
];

export default async function KpiPage() {
  const { supabase } = await requireRole('admin');
  const [kpiRes, cfgRes] = await Promise.all([
    supabase.rpc('admin_kpis'),
    supabase.from('app_config').select('key, value'),
  ]);
  const kpis = kpiRes.data as Kpis | null;
  const cfg = new Map<string, unknown>(((cfgRes.data ?? []) as { key: string; value: unknown }[]).map((r) => [r.key, r.value]));

  return (
    <div className="space-y-5">
      <PageTitle sub={`Tính đến ${fmtDateTime(new Date().toISOString())}`}>KPI</PageTitle>

      {kpiRes.error || !kpis ? (
        <Alert tone="red">{kpiRes.error ? friendlyError(kpiRes.error) : 'Không tải được KPI.'}</Alert>
      ) : (
        <>
          <Card className="!p-0">
            <table className="w-full text-base">
              <thead className="sr-only">
                <tr><th>Chỉ số</th><th>Giá trị</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {KPI_LABELS.map(([key, label, unit]) => (
                  <tr key={key}>
                    <th scope="row" className="px-4 py-3 text-left font-normal text-slate-700">{label}</th>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-lg font-bold text-slate-900">{show(kpis[key], unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <a href="/admin/kpi/export" download className={btn('secondary')}>Tải CSV</a>
        </>
      )}

      <Card className="space-y-5">
        <h2 className="text-xl font-bold text-slate-900">Cấu hình</h2>
        {cfgRes.error ? <Alert tone="red">{friendlyError(cfgRes.error)}</Alert> : null}
        {CONFIG.map((c) => {
          const cur = cfg.get(c.key);
          return (
            <ActionForm key={c.key} action={setConfig} className="space-y-3">
              <input type="hidden" name="key" value={c.key} />
              <Field label={c.label}>
                <input name="value" type="number" inputMode="numeric" min={1} step={1} required
                  defaultValue={typeof cur === 'number' || typeof cur === 'string' ? String(cur) : ''} className={inputCls} />
              </Field>
              <SubmitButton variant="secondary" confirm={`Lưu "${c.label}"? Giá trị mới áp dụng ngay cho các ca đăng sau.`}>
                Lưu
              </SubmitButton>
            </ActionForm>
          );
        })}
      </Card>
    </div>
  );
}
