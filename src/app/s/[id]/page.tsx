import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ShiftMap } from '@/components/map';
import { Alert, Card, PageTitle, btn } from '@/components/ui';
import { PublicShiftBox } from '@/app/f/shift-box';
import { PublicBand, PublicBody } from '@/app/f/public-parts';
import { APP_NAME, AREA_LABEL, FACILITY_TYPE_LABEL, JOB_LABEL } from '@/lib/constants';
import { getContext } from '@/lib/auth';
import { fmtDate, fmtMoney, fmtTime } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { PublicShift } from '@/lib/types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Dùng chung cho generateMetadata và trang: một lượt gọi RPC mỗi request.
const loadShift = cache(async (id: string) => {
  if (!UUID.test(id)) return { shift: null, failed: false };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_shift', { p_id: id });
  // Ca không đủ điều kiện (đã đóng, đã qua, quán chưa xác minh) trả cùng một lỗi nghiệp vụ P0001.
  if (error) return { shift: null, failed: error.code !== 'P0001' };
  return { shift: data as PublicShift, failed: false };
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { shift: s } = await loadShift((await params).id);
  const base = { robots: { index: false, follow: false } };
  if (!s) return { title: 'Ca làm', ...base };
  const title = `${JOB_LABEL[s.job_type]} tại ${s.facility_name} · ${fmtTime(s.starts_at)}–${fmtTime(s.ends_at)}, ${fmtDate(s.starts_at)}`;
  const description = `${fmtMoney(s.hourly_wage)}/giờ · ${AREA_LABEL[s.area]}${s.adults_only ? ' · Chỉ từ 18 tuổi' : ''}. Ca làm ngắn hạn trên ${APP_NAME}.`;
  return { title, description, ...base, openGraph: { title, description, type: 'website', siteName: APP_NAME, locale: 'vi_VN' } };
}

export default async function PublicShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const { shift: s, failed } = await loadShift((await params).id);
  if (failed) {
    return (
      <PublicBody>
        <PageTitle>Ca làm</PageTitle>
        <Alert tone="red">Chưa tải được ca này. Vui lòng thử lại sau ít phút.</Alert>
      </PublicBody>
    );
  }
  if (!s) notFound();
  const { profile } = await getContext();
  const isWorker = profile?.role === 'worker' && profile.status === 'active';
  const hasPin = s.lat != null && s.lng != null;

  return (
    <>
      <PublicBand title={JOB_LABEL[s.job_type]} sub={`${s.facility_name} · ${AREA_LABEL[s.area]}`} />
      <PublicBody>
        <PublicShiftBox shift={s} hero />

        <div className="sm:max-w-xs">
          {isWorker ? (
            <Link href={`/shifts/${s.id}`} className={btn('primary')}>Mở ca trong ứng dụng</Link>
          ) : (
            <Link href="/login" className={btn('primary')}>Đăng nhập để nhận ca</Link>
          )}
        </div>

        <Card>
          <h2 className="text-xl font-bold text-ink">Nơi làm</h2>
          <p className="mt-2 break-words text-lg font-semibold text-ink">{s.facility_name}</p>
          <p className="text-base text-ink-soft">{FACILITY_TYPE_LABEL[s.facility_type]} · {AREA_LABEL[s.area]}</p>
          <p className="mt-2 break-words text-base text-ink">{s.address}</p>
          <Link href={`/f/${s.facility_slug}`} className="inline-flex min-h-[3rem] items-center font-semibold text-brand underline underline-offset-4">
            Xem trang quán
          </Link>
          {hasPin ? (
            <div className="mt-2 border-t border-rule pt-4">
              <ShiftMap
                className="h-64"
                points={[{ id: s.id, lat: s.lat!, lng: s.lng!, text: fmtTime(s.starts_at), label: `${s.facility_name}, ${s.address}`, tone: 'open' }]}
              />
            </div>
          ) : null}
          {s.description ? (
            <div className="mt-4 border-t border-rule pt-4">
              <h2 className="text-xl font-bold text-ink">Mô tả công việc</h2>
              <p className="mt-2 whitespace-pre-line break-words text-base text-ink">{s.description}</p>
            </div>
          ) : null}
        </Card>
      </PublicBody>
    </>
  );
}
