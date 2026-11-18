import { Download } from 'lucide-react';
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
    <div className="space-y-6">
      <PageTitle sub={`Tính đến ${fmtDateTime(new Date().toISOString())}`}>KPI</PageTitle>

      {/* Từ 1024px: bảng chỉ số bên trái, cấu hình bên phải. */}
      <div className="grid gap-8 lg:grid-cols-[3fr_2fr] lg:items-start">
        <div className="space-y-4">
          {kpiRes.error || !kpis ? (
            <Alert tone="red">{kpiRes.error ? friendlyError(kpiRes.error) : 'Không tải được KPI.'}</Alert>
          ) : (
            <>
              <div className="overflow-hidden rounded-ui border border-rule bg-white">
                <table className="w-full border-collapse text-base">
                  <caption className="sr-only">Chỉ số vận hành</caption>
                  <thead className="bg-wall-tint">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left font-semibold text-ink">Chỉ số</th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold text-ink">Giá trị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {KPI_LABELS.map(([key, label, unit]) => (
                      <tr key={key}>
                        <th scope="row" className="px-4 py-4 text-left font-normal text-ink">{label}</th>
                        <td className="tabular whitespace-nowrap px-4 py-4 text-right text-lg font-bold text-ink">{show(kpis[key], unit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <a href="/admin/kpi/export" download className={`${btn('secondary')} lg:w-auto`}>
                <Download className="h-5 w-5" aria-hidden="true" />
                Tải CSV
              </a>
            </>
          )}
        </div>

        <Card className="space-y-6">
          <h2 className="text-xl font-bold text-ink">Cấu hình</h2>
          {cfgRes.error ? <Alert tone="red">{friendlyError(cfgRes.error)}</Alert> : null}
          {CONFIG.map((c) => {
            const cur = cfg.get(c.key);
            return (
              <ActionForm key={c.key} action={setConfig} className="space-y-4">
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
    </div>
  );
}
