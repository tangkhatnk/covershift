import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Alert, Empty, PageTitle, Stars } from '@/components/ui';
import { ShiftMap } from '@/components/map';
import { PublicShiftBox } from '../shift-box';
import { AREA_LABEL, FACILITY_TYPE_LABEL } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import type { PublicFacility } from '@/lib/types';

export const metadata: Metadata = { title: 'Trang quán', robots: { index: false, follow: false } };

const linkCls = 'inline-flex min-h-[3rem] items-center font-semibold text-brand underline underline-offset-4';

function Stat({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse justify-end rounded-ui border border-rule bg-white p-4 text-center">
      <dt className="mt-2 text-base font-semibold text-ink-soft">{label}</dt>
      <dd>
        <span className="tabular font-num block text-4xl font-bold leading-tight text-ink">{value}</span>
        {extra ? <span className="block">{extra}</span> : null}
      </dd>
    </div>
  );
}

export default async function PublicFacilityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_public_facility', { p_slug: slug });
  if (error) {
    // Mã sai, quán chưa xác minh, chờ duyệt hay đã gỡ đều trả cùng một lỗi nghiệp vụ.
    if (error.code === 'P0001') notFound();
    return (
      <div className="space-y-4">
        <PageTitle>Trang quán</PageTitle>
        <Alert tone="red">Chưa tải được trang. Vui lòng thử lại sau ít phút.</Alert>
      </div>
    );
  }
  const f = data as PublicFacility;
  const hasPin = f.lat != null && f.lng != null;
  const mapsHref = f.maps_url && /^https:\/\//i.test(f.maps_url)
    ? f.maps_url
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.name} ${f.address}`)}`;

  return (
    <div className="space-y-6">
      <PageTitle sub={`${FACILITY_TYPE_LABEL[f.type]} · ${AREA_LABEL[f.area]}`}>
        <span className="break-words">{f.name}</span>
      </PageTitle>

      <dl className="grid grid-cols-2 gap-4">
        <Stat label="Ca đã hoàn thành" value={String(f.completed_shifts)} />
        <Stat
          label={f.review_count > 0 ? `${f.review_count} lượt đánh giá` : 'Đánh giá'}
          value={f.avg_stars != null ? `${f.avg_stars}/5` : '—'}
          extra={<Stars value={f.avg_stars} />}
        />
      </dl>

      <section className="space-y-2 rounded-ui border border-rule bg-white p-4">
        <h2 className="text-xl font-bold text-ink">Địa chỉ</h2>
        <p className="break-words text-lg text-ink">{f.address}</p>
        <a href={mapsHref} target="_blank" rel="noopener noreferrer" className={linkCls}>Xem bản đồ</a>
        {hasPin ? (
          <div className="border-t border-rule pt-4">
            <ShiftMap
              className="h-64"
              points={[{ id: f.slug, lat: f.lat!, lng: f.lng!, text: f.name, label: `${f.name}, ${f.address}`, tone: 'open' }]}
            />
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-ink">Ca đang mở ({f.open_shifts.length})</h2>
        {f.open_shifts.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {f.open_shifts.map((s) => (
              <li key={s.id}><PublicShiftBox shift={s} href={`/s/${s.id}`} /></li>
            ))}
          </ul>
        ) : (
          <Empty>Quán chưa có ca nào đang mở.</Empty>
        )}
      </section>
    </div>
  );
}
