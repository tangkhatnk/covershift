import Link from 'next/link';
import { Alert, Empty, Field, PageTitle, btn, inputCls } from '@/components/ui';
import { LiveRefresh, ShiftExplorer } from '@/components/map';
import { requireRole } from '@/lib/auth';
import { AREA_LABEL, JOB_LABEL } from '@/lib/constants';
import { friendlyError } from '@/lib/errors';
import { vnDateInput } from '@/lib/format';
import type { Shift } from '@/lib/types';

export const metadata = { title: 'Tìm ca' };

const linkCls = 'font-semibold text-brand underline underline-offset-4';
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
/** Ngày YYYY-MM-DD có thật (loại 2026-13-45, 2026-02-30). */
const isYmd = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return v >= '2000-01-01' && !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

export default async function FeedPage({ searchParams }: {
  searchParams: Promise<{ ngay?: string | string[]; khu?: string | string[]; viec?: string | string[] }>;
}) {
  const { supabase, profile, user } = await requireRole('worker', 'admin');
  const sp = await searchParams;
  // Chỉ nhận giá trị hợp lệ; giá trị lạ coi như không lọc.
  const ngay = isYmd(one(sp.ngay)) ? one(sp.ngay) : '';
  // Object.hasOwn thay cho `in`: `in` coi cả "constructor", "toString"… là hợp lệ.
  const khu = Object.hasOwn(AREA_LABEL, one(sp.khu)) ? one(sp.khu) : '';
  const viec = Object.hasOwn(JOB_LABEL, one(sp.viec)) ? one(sp.viec) : '';
  const filtering = Boolean(ngay || khu || viec);

  const isWorker = profile.role === 'worker';
  // Ba truy vấn độc lập: chạy song song để không cộng dồn độ trễ.
  const [wp, pc, { data, error }] = await Promise.all([
    isWorker ? supabase.from('worker_profiles').select('approval, review_note').eq('user_id', user.id).maybeSingle() : null,
    isWorker ? supabase.from('parental_consents').select('status').eq('worker_id', user.id).maybeSingle() : null,
    supabase.rpc('feed_shifts', { p_date: ngay || null, p_area: khu || null, p_job: viec || null }),
  ]);
  const approval = (wp?.data?.approval as string | undefined) ?? null;
  const reviewNote = (wp?.data?.review_note as string | null | undefined) ?? null;
  const consentStatus = (pc?.data?.status as string | undefined) ?? null;
  const shifts = (data ?? []) as Shift[];

  return (
    <div className="space-y-4">
      <LiveRefresh />
      <PageTitle sub="Ca gấp hiện lên đầu. Bấm vào ca để xem và nhận.">Tìm ca</PageTitle>

      {profile.role === 'worker' && approval !== 'approved' ? (
        approval === 'rejected' ? (
          <Alert tone="red">
            Hồ sơ của bạn chưa được duyệt nên chưa nhận ca được.{reviewNote ? ` Lý do: ${reviewNote}` : ''}{' '}
            <Link href="/profile" className={linkCls}>Xem hồ sơ</Link>
          </Alert>
        ) : (
          <Alert tone="amber">
            <p>
              <b>Hồ sơ của bạn đang chờ duyệt.</b> Bạn xem ca được, nhưng chưa nhận ca được cho tới khi nhóm vận hành duyệt.
            </p>
            {consentStatus === 'pending' ? (
              <p className="mt-2">
                Bạn dưới 18 tuổi nên cần phụ huynh đồng ý. Hãy gửi link cho phụ huynh:{' '}
                <Link href="/profile" className={linkCls}>Lấy link ở trang Hồ sơ</Link>
              </p>
            ) : null}
            {consentStatus === 'rejected' ? (
              <p className="mt-2">
                Phiếu đồng ý của phụ huynh bị từ chối. <Link href="/profile" className={linkCls}>Tạo link mới ở trang Hồ sơ</Link>
              </p>
            ) : null}
          </Alert>
        )
      ) : null}

      <form method="get" className="grid grid-cols-2 gap-4 rounded-ui border border-rule bg-white p-4 lg:grid-cols-[2fr_2fr_2fr_auto] lg:items-end">
        <div className="col-span-2 lg:col-span-1">
          <Field label="Ngày">
            <input type="date" name="ngay" defaultValue={ngay} min={vnDateInput()} className={inputCls} />
          </Field>
        </div>
        <Field label="Khu vực">
          <select name="khu" defaultValue={khu} className={inputCls}>
            <option value="">Tất cả</option>
            {Object.entries(AREA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Loại việc">
          <select name="viec" defaultValue={viec} className={inputCls}>
            <option value="">Tất cả</option>
            {Object.entries(JOB_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <div className="col-span-2 flex items-center gap-4 lg:col-span-1">
          <button type="submit" className={`${btn('primary')} lg:px-8`}>Lọc</button>
          {filtering ? <Link href="/shifts" className={`${btn('ghost', false)} whitespace-nowrap`}>Bỏ lọc</Link> : null}
        </div>
      </form>

      {error ? (
        <Alert tone="red">{friendlyError(error)}</Alert>
      ) : shifts.length === 0 ? (
        <Empty>
          {filtering ? 'Không có ca nào khớp bộ lọc. Thử bỏ lọc xem sao.' : 'Hiện chưa có ca nào đang tìm người. Bạn quay lại sau nhé.'}
        </Empty>
      ) : (
        <ShiftExplorer shifts={shifts} now={Date.now()} />
      )}
    </div>
  );
}
