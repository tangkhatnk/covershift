import { fmtDateTime, vnDateInput } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { Kpis } from '@/lib/types';
import { KPI_LABELS } from '../labels';

export const dynamic = 'force-dynamic';

const cell = (v: string | number | null | undefined) => {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_kpis');
  if (error || !data) {
    // admin_kpis() tự kiểm tra quyền: không phải admin (hoặc chưa đăng nhập) thì lỗi.
    return new Response('Không có quyền truy cập.', {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  const kpis = data as Kpis;
  const rows: (string | number | null)[][] = [
    ['Chỉ số', 'Giá trị', 'Đơn vị'],
    ...KPI_LABELS.map(([key, label, unit]) => [label, kpis[key] ?? null, unit]),
    ['Thời điểm xuất', fmtDateTime(new Date().toISOString()), ''],
  ];
  const csv = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="safeshift-kpi-${vnDateInput()}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
