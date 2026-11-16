import Link from 'next/link';
import { Alert, Empty, PageTitle, ShiftCard, btn } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { shiftState } from '@/lib/format';
import type { Shift } from '@/lib/types';

export const metadata = { title: 'Ca của quán' };

type Facility = { id: string; name: string; address: string; verified: boolean; status: 'pending' | 'active' | 'removed' };

function Group({ title, shifts }: { title: string; shifts: Shift[] }) {
  if (!shifts.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-slate-900">
        {title} <span className="font-normal text-slate-500">({shifts.length})</span>
      </h2>
      {shifts.map((s) => (
        <ShiftCard
          key={s.id}
          shift={s}
          showState
          href={`/quan/ca/${s.id}`}
          extra={
            <p className="text-base text-slate-700">
              Người chính: <b>{s.primary_count}/{s.headcount}</b> · Dự phòng: <b>{s.backup_count > 0 ? 'có' : 'chưa'}</b>
            </p>
          }
        />
      ))}
    </section>
  );
}

export default async function EmployerHomePage() {
  const { supabase, profile } = await requireRole('employer');
  const [{ data: facData, error: facError }, { data: shiftData, error: shiftError }] = await Promise.all([
    supabase.from('facilities').select('id, name, address, verified, status').eq('owner_id', profile.id).maybeSingle(),
    supabase.rpc('employer_shifts'),
  ]);
  const facility = facData as Facility | null;
  const shifts = (shiftData as Shift[] | null) ?? [];

  const now = Date.now();
  const awaiting: Shift[] = [];
  const upcoming: Shift[] = [];
  const past: Shift[] = [];
  for (const s of shifts) {
    const st = shiftState(s, now);
    if (st === 'awaiting_confirm') awaiting.push(s);
    else if (st === 'open' || st === 'filled' || st === 'in_progress') upcoming.push(s);
    else past.push(s);
  }
  // Ca sắp tới: ca gần nhất lên đầu (RPC trả mới nhất trước).
  upcoming.reverse();

  const canPost = !!facility && facility.verified && facility.status === 'active';

  return (
    <div className="space-y-5">
      <PageTitle sub={facility ? `${facility.name} · ${facility.address}` : undefined}>Ca của quán</PageTitle>

      {facError ? <Alert tone="red">Không tải được thông tin cơ sở. Vui lòng thử lại sau ít phút.</Alert> : null}
      {!facError && !facility ? (
        <Alert tone="amber">Chưa thấy thông tin cơ sở của anh/chị. Vui lòng liên hệ nhóm vận hành.</Alert>
      ) : null}
      {facility?.status === 'removed' ? (
        <Alert tone="red">
          Cơ sở của anh/chị đã bị gỡ khỏi SafeShift nên không đăng ca được. Nếu cần hỏi lại, anh/chị liên hệ nhóm vận hành.
        </Alert>
      ) : facility && !facility.verified ? (
        <Alert tone="amber">
          Cơ sở đang chờ nhóm vận hành đến xác minh. Sau khi xác minh anh/chị mới đăng ca được.
        </Alert>
      ) : null}

      {canPost ? (
        <Link href="/quan/dang-ca" className={`${btn('primary')} !min-h-[3.75rem] !text-xl`}>
          + Đăng ca mới
        </Link>
      ) : null}

      {shiftError ? <Alert tone="red">{shiftError.message}</Alert> : null}

      {awaiting.length ? (
        <div className="space-y-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3">
          <p className="text-base text-amber-900">Ca đã xong. Anh/chị bấm vào từng ca để xác nhận ai đã làm.</p>
          <Group title="Cần anh/chị xác nhận" shifts={awaiting} />
        </div>
      ) : null}
      <Group title="Sắp tới / đang diễn ra" shifts={upcoming} />
      <Group title="Đã qua" shifts={past} />

      {!shiftError && shifts.length === 0 ? (
        <Empty>{canPost ? 'Anh/chị chưa đăng ca nào. Bấm "Đăng ca mới" để bắt đầu.' : 'Chưa có ca nào.'}</Empty>
      ) : null}
    </div>
  );
}
