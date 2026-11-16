import Link from 'next/link';
import { Alert, Badge, Empty, Field, PageTitle, ShiftCard, btn, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { AREA_LABEL, JOB_LABEL } from '@/lib/constants';
import { vnDateInput } from '@/lib/format';
import type { Shift } from '@/lib/types';

export const metadata = { title: 'Tìm ca' };

const linkCls = 'font-semibold underline underline-offset-4';
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function FeedPage({ searchParams }: {
  searchParams: Promise<{ ngay?: string | string[]; khu?: string | string[]; viec?: string | string[] }>;
}) {
  const { supabase, profile, user } = await requireRole('worker', 'admin');
  const sp = await searchParams;
  // Chỉ nhận giá trị hợp lệ; giá trị lạ coi như không lọc.
  const ngay = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.ngay)) ? one(sp.ngay) : '';
  const khu = one(sp.khu) in AREA_LABEL ? one(sp.khu) : '';
  const viec = one(sp.viec) in JOB_LABEL ? one(sp.viec) : '';
  const filtering = Boolean(ngay || khu || viec);

  let approval: string | null = null;
  let reviewNote: string | null = null;
  let consentStatus: string | null = null;
  if (profile.role === 'worker') {
    const [wp, pc] = await Promise.all([
      supabase.from('worker_profiles').select('approval, review_note').eq('user_id', user.id).maybeSingle(),
      supabase.from('parental_consents').select('status').eq('worker_id', user.id).maybeSingle(),
    ]);
    approval = (wp.data?.approval as string | undefined) ?? null;
    reviewNote = (wp.data?.review_note as string | null | undefined) ?? null;
    consentStatus = (pc.data?.status as string | undefined) ?? null;
  }

  const { data, error } = await supabase.rpc('feed_shifts', {
    p_date: ngay || null,
    p_area: khu || null,
    p_job: viec || null,
  });
  const shifts = (data ?? []) as Shift[];

  return (
    <div className="space-y-4">
      <PageTitle sub="Ca gấp hiện lên đầu. Bấm vào ca để xem và nhận.">Tìm ca</PageTitle>

      {profile.role === 'worker' && approval !== 'approved' ? (
        approval === 'rejected' ? (
          <Alert tone="red">
            Hồ sơ của bạn chưa được duyệt nên chưa nhận ca được.{reviewNote ? ` Lý do: ${reviewNote}` : ''}{' '}
            <Link href="/ho-so" className={linkCls}>Xem hồ sơ</Link>
          </Alert>
        ) : (
          <Alert tone="amber">
            <p>
              <b>Hồ sơ của bạn đang chờ duyệt.</b> Bạn xem ca được, nhưng chưa nhận ca được cho tới khi nhóm vận hành duyệt.
            </p>
            {consentStatus === 'pending' ? (
              <p className="mt-2">
                Bạn dưới 18 tuổi nên cần phụ huynh đồng ý. Hãy gửi link cho phụ huynh:{' '}
                <Link href="/ho-so" className={linkCls}>Lấy link ở trang Hồ sơ</Link>
              </p>
            ) : null}
            {consentStatus === 'rejected' ? (
              <p className="mt-2">
                Phiếu đồng ý của phụ huynh bị từ chối. <Link href="/ho-so" className={linkCls}>Tạo link mới ở trang Hồ sơ</Link>
              </p>
            ) : null}
          </Alert>
        )
      ) : null}

      <form method="get" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <Field label="Ngày">
          <input type="date" name="ngay" defaultValue={ngay} min={vnDateInput()} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
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
        </div>
        <div className="flex items-center gap-4">
          <button type="submit" className={btn('primary')}>Lọc</button>
          {filtering ? <Link href="/ca" className={`${btn('ghost', false)} whitespace-nowrap`}>Bỏ lọc</Link> : null}
        </div>
      </form>

      {error ? (
        <Alert tone="red">{error.message}</Alert>
      ) : shifts.length === 0 ? (
        <Empty>
          {filtering ? 'Không có ca nào khớp bộ lọc. Thử bỏ lọc xem sao.' : 'Hiện chưa có ca nào đang tìm người. Bạn quay lại sau nhé.'}
        </Empty>
      ) : (
        <ul className="space-y-3">
          {shifts.map((s) => (
            <li key={s.id}>
              <ShiftCard
                shift={s}
                href={`/ca/${s.id}`}
                extra={s.my_role ? (
                  <Badge tone={s.my_role === 'primary' ? 'green' : 'amber'}>
                    Bạn là {s.my_role === 'primary' ? 'người chính' : 'người dự phòng'}
                  </Badge>
                ) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
