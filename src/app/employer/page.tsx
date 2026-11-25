import Link from 'next/link';
import { CirclePlus, MapPin } from 'lucide-react';
import { setFacilityLocation } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { LocationPicker } from '@/components/map';
import { Alert, Disclosure, Empty, PageTitle, ShiftCard, btn } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { hoursBetween, shiftState, type ShiftState } from '@/lib/format';
import type { Shift } from '@/lib/types';

export const metadata = { title: 'Ca của quán' };

type Facility = { id: string; name: string; address: string; verified: boolean; status: 'pending' | 'active' | 'removed'; lat: number | null; lng: number | null };

// Bộ lọc nhanh qua ?loc=, lọc phía server. Mỗi ô lọc gom một nhóm trạng thái ca (trạng thái suy ra từ shiftState).
const FILTERS = {
  'dang-tim': { label: 'Đang tìm người', states: ['open'] },
  'da-du': { label: 'Đã đủ người', states: ['filled'] },
  'cho-xac-nhan': { label: 'Chờ xác nhận', states: ['awaiting_confirm'] },
  'da-qua': { label: 'Đã qua', states: ['confirmed', 'expired', 'unfilled', 'cancelled'] },
} as const satisfies Record<string, { label: string; states: readonly ShiftState[] }>;
type Filter = keyof typeof FILTERS;
const isFilter = (v: unknown): v is Filter => typeof v === 'string' && Object.hasOwn(FILTERS, v);

function Group({ title, shifts }: { title: string; shifts: Shift[] }) {
  if (!shifts.length) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-ink">
        {title} <span className="font-normal text-ink-soft">({shifts.length})</span>
      </h2>
      <div className="stagger grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {shifts.map((s) => {
          const st = shiftState(s);
          return (
            <ShiftCard
              key={s.id}
              shift={s}
              showState
              href={`/employer/shifts/${s.id}`}
              // Ca còn chỗ / đã đủ người đã có Dãy cửa chớp ghi đúng các số này; các trạng thái khác thì ghi bằng chữ.
              extra={st === 'open' || st === 'filled' ? undefined : (
                <p className="text-base text-ink">
                  Người chính: <b>{s.primary_count}/{s.headcount}</b> · Dự phòng: <b>{s.backup_count > 0 ? 'có' : 'chưa'}</b>
                </p>
              )}
            />
          );
        })}
      </div>
    </section>
  );
}

export default async function EmployerHomePage({ searchParams }: { searchParams: Promise<{ loc?: string | string[] }> }) {
  const { supabase, profile } = await requireRole('employer');
  const rawLoc = (await searchParams).loc;
  const loc = Array.isArray(rawLoc) ? rawLoc[0] : rawLoc;
  const filter = isFilter(loc) ? loc : null;
  const [{ data: facData, error: facError }, { data: shiftData, error: shiftError }] = await Promise.all([
    supabase.from('facilities').select('id, name, address, verified, status, lat, lng').eq('owner_id', profile.id).maybeSingle(),
    supabase.rpc('employer_shifts'),
  ]);
  const facility = facData as Facility | null;
  const shifts = (shiftData as Shift[] | null) ?? [];

  const now = Date.now();
  const awaiting: Shift[] = [];
  const upcoming: Shift[] = [];
  const past: Shift[] = [];
  const counts: Record<Filter, number> = { 'dang-tim': 0, 'da-du': 0, 'cho-xac-nhan': 0, 'da-qua': 0 };
  // Tỉ lệ lấp đầy: suất người chính đã có / suất cần, trên các ca chưa hủy. Giờ: tổng độ dài các ca đã xác nhận (không nhân số người).
  let seats = 0, filledSeats = 0, doneHours = 0;
  for (const s of shifts) {
    const st = shiftState(s, now);
    for (const f of Object.keys(FILTERS) as Filter[]) if ((FILTERS[f].states as readonly ShiftState[]).includes(st)) counts[f]++;
    if (s.status !== 'cancelled') { seats += s.headcount; filledSeats += Math.min(s.primary_count, s.headcount); }
    if (s.status === 'completed') doneHours += hoursBetween(s.starts_at, s.ends_at);
    if (st === 'awaiting_confirm') awaiting.push(s);
    else if (st === 'open' || st === 'filled' || st === 'in_progress') upcoming.push(s);
    else past.push(s);
  }
  // Ca sắp tới: ca gần nhất lên đầu (RPC trả mới nhất trước).
  upcoming.reverse();

  const canPost = !!facility && facility.verified && facility.status === 'active';
  const filtered = filter ? shifts.filter((s) => (FILTERS[filter].states as readonly ShiftState[]).includes(shiftState(s, now))) : [];

  // Việc chính của chủ quán là ca, không phải ghim: thẻ vị trí thu gọn, chưa ghim thì nằm sau nhóm "Cần xác nhận", đã ghim thì nằm cuối trang.
  const pinned = facility && facility.status !== 'removed' ? facility.lat != null && facility.lng != null : null;
  const panel = facility ? (
    <div className={`rounded-ui border p-2 ${pinned ? 'border-rule bg-white' : 'border-accent bg-accent-tint'}`}>
      <Disclosure summary={
        <span className="flex min-w-0 items-center gap-2">
          <MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="min-w-0">{pinned ? 'Vị trí quán: đã ghim' : 'Chưa ghim vị trí quán'}</span>
        </span>
      }>
        <div className="mt-2 border-t border-rule px-2 pb-2 pt-4">
          <p className="mb-4 text-base text-ink">
            {pinned ? 'Chạm vào bản đồ hoặc kéo ghim để đổi vị trí, rồi bấm Lưu.' : 'Chạm vào bản đồ để ghim vị trí quán, rồi bấm Lưu.'}
          </p>
          <ActionForm action={setFacilityLocation}>
            <input type="hidden" name="facility_id" value={facility.id} />
            <LocationPicker lat={facility.lat} lng={facility.lng} />
            <SubmitButton variant="secondary">Lưu vị trí</SubmitButton>
          </ActionForm>
        </div>
      </Disclosure>
    </div>
  ) : null;

  // Chưa lọc: ca chờ xác nhận là việc cần làm, đứng ngay dưới nút "Đăng ca mới", trước ô tóm tắt.
  const awaitingFirst = !filter && awaiting.length > 0;

  return (
    <div className="space-y-6">
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
        <div>
          <Link href="/employer/new-shift" className={`${btn('primary')} !min-h-[3.75rem] !text-xl sm:w-auto`}>
            <CirclePlus className="h-6 w-6" aria-hidden="true" />
            Đăng ca mới
          </Link>
        </div>
      ) : null}

      {shiftError ? <Alert tone="red">{friendlyError(shiftError)}</Alert> : null}

      {awaitingFirst ? (
        <div className="space-y-4">
          <Alert tone="amber">Ca đã xong. Anh/chị bấm vào từng ca để xác nhận ai đã làm.</Alert>
          <Group title="Cần anh/chị xác nhận" shifts={awaiting} />
        </div>
      ) : null}

      {shifts.length > 0 ? (
        <section aria-label="Tóm tắt ca" className="space-y-4">
          <nav aria-label="Lọc ca" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(Object.keys(FILTERS) as Filter[]).map((f) => {
              const on = f === filter;
              return (
                // Chạm lại ô đang chọn thì bỏ lọc.
                <Link key={f} href={on ? '/employer' : `/employer?loc=${f}`} aria-current={on ? 'page' : undefined}
                  className={`flex min-h-[3rem] flex-col justify-start rounded-ui border-2 px-4 py-2 ${on ? 'border-brand bg-brand-tint' : 'border-rule bg-white hover:border-brand'}`}>
                  <span className="tabular font-num text-3xl font-bold leading-tight text-ink">{counts[f]}</span>
                  <span className="text-base font-semibold text-ink">{FILTERS[f].label}</span>
                </Link>
              );
            })}
          </nav>
          <p className="text-base text-ink">
            {seats > 0 ? <>Đã có người chính cho <b>{filledSeats}/{seats}</b> suất ({Math.round((filledSeats / seats) * 100)}%). </> : null}
            {doneHours > 0 ? <>Các ca đã xác nhận: <b>{doneHours}</b> giờ.</> : null}
          </p>
        </section>
      ) : null}

      {filter ? (
        <>
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-base text-ink">Đang lọc: <b>{FILTERS[filter].label}</b></p>
            <Link href="/employer" className="inline-flex min-h-[3rem] items-center font-semibold text-brand underline underline-offset-4">Xem tất cả ca</Link>
          </div>
          {filtered.length ? <Group title={FILTERS[filter].label} shifts={filtered} /> : <Empty>Không có ca nào trong nhóm này.</Empty>}
          {pinned ? panel : null}
        </>
      ) : (
        <>
          {pinned === false ? panel : null}
          <Group title="Sắp tới / đang diễn ra" shifts={upcoming} />
          <Group title="Đã qua" shifts={past} />

          {!shiftError && shifts.length === 0 ? (
            <Empty>{canPost ? 'Anh/chị chưa đăng ca nào. Bấm "Đăng ca mới" để bắt đầu.' : 'Chưa có ca nào.'}</Empty>
          ) : null}
          {pinned ? panel : null}
        </>
      )}
    </div>

  );
}
