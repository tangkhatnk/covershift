import { MapPin } from 'lucide-react';
import { setAccountStatus, setFacilityLocation, setFacilityStatus, verifyFacility } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { LocationPicker, ShiftMap, type MapPoint } from '@/components/map';
import { Alert, Badge, Card, Check, DemoPhoneNote, Disclosure, Empty, Field, PageTitle, Tel, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { AREA_LABEL, FACILITY_STATUS_LABEL, FACILITY_TYPE_LABEL } from '@/lib/constants';
import { fmtPlainDate, vnDateInput } from '@/lib/format';
import type { AdminFacility } from '@/lib/types';

export const metadata = { title: 'Duyệt cơ sở' };

const yesNo = (ok: boolean) => (ok ? 'Có' : 'Không');

function StatusBadges({ f, pin }: { f: AdminFacility; pin: number | null }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="blue">{pin ? `Ghim ${pin}` : 'Chưa ghim'}</Badge>
      <Badge tone={f.status === 'active' && f.verified ? 'green' : f.status === 'pending' ? 'amber' : 'gray'}>
        {f.status === 'active' && f.verified ? 'Đã xác minh' : FACILITY_STATUS_LABEL[f.status]}
      </Badge>
      {f.owner_status === 'locked' ? <Badge tone="red">Chủ quán bị khóa</Badge> : null}
    </div>
  );
}

function Identity({ f }: { f: AdminFacility }) {
  return (
    <>
      <p className="break-words text-xl font-bold text-ink">{f.name}</p>
      <p className="text-base text-ink">
        {FACILITY_TYPE_LABEL[f.type]} · {AREA_LABEL[f.area]}
      </p>
      <p className="break-words text-base text-ink">{f.address}</p>
      {f.maps_url ? (
        <a href={f.maps_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex min-h-[3rem] items-center gap-2 font-semibold text-brand underline underline-offset-4">
          <MapPin className="h-5 w-5" aria-hidden="true" />
          Mở bản đồ
        </a>
      ) : null}
    </>
  );
}

function Owner({ f }: { f: AdminFacility }) {
  return (
    <div>
      <p className="text-base text-ink">
        Chủ: {f.owner_name} · <Tel phone={f.owner_phone} />
      </p>
      <DemoPhoneNote />
    </div>
  );
}

function Verification({ f }: { f: AdminFacility }) {
  const v = f.verification;
  if (!v) return <p className="text-base text-ink-soft">Chưa có phiếu xác minh.</p>;
  return (
    <div className="text-base text-ink">
      <p className="font-bold">Phiếu xác minh gần nhất</p>
      <ul className="mt-2 space-y-1">
        <li>Đúng địa chỉ: {yesNo(v.address_ok)}</li>
        <li>Đúng người liên hệ: {yesNo(v.contact_ok)}</li>
        <li>Giấy phép kinh doanh: {yesNo(v.has_business_license)}</li>
        <li>Ngày xác minh: {fmtPlainDate(v.verified_on)}</li>
        <li>Người xác minh: {v.verifier_name}</li>
        {v.note ? <li className="break-words">Ghi chú: {v.note}</li> : null}
      </ul>
    </div>
  );
}

function Actions({ f, today, verifier }: { f: AdminFacility; today: string; verifier: string }) {
  const ownerLocked = f.owner_status === 'locked';
  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-8">
      <Disclosure summary="Phiếu xác minh thực tế" defaultOpen={f.status === 'pending'}>
        <ActionForm action={verifyFacility} className="space-y-4 px-2 pb-2 pt-2">
          <input type="hidden" name="facility_id" value={f.id} />
          <Check name="address_ok">Đã đến đúng địa chỉ</Check>
          <Check name="contact_ok">Đã gặp đúng người liên hệ</Check>
          <Check name="has_license">Có giấy phép kinh doanh</Check>
          <Field label="Ngày xác minh">
            <input type="date" name="verified_on" defaultValue={today} max={today} required className={inputCls} />
          </Field>
          <Field label="Người đi xác minh">
            <input name="verifier_name" defaultValue={verifier} required minLength={2} maxLength={80} className={inputCls} />
          </Field>
          <Field label="Ghi chú">
            <textarea name="note" rows={2} maxLength={500} className={inputCls} />
          </Field>
          <p className="text-base text-ink-soft">Phải tick hai mục đầu (đúng địa chỉ, đúng người liên hệ) mới duyệt được.</p>
          <SubmitButton>Xác minh và cho phép đăng ca</SubmitButton>
        </ActionForm>
      </Disclosure>

      {f.status !== 'removed' ? (
        <Disclosure summary="Vị trí trên bản đồ">
          <ActionForm action={setFacilityLocation} className="space-y-4 px-2 pb-2 pt-2">
            <input type="hidden" name="facility_id" value={f.id} />
            <LocationPicker lat={f.lat} lng={f.lng} />
            <SubmitButton variant="secondary">Lưu vị trí</SubmitButton>
          </ActionForm>
        </Disclosure>
      ) : null}

      <Disclosure summary="Gỡ cơ sở / khóa chủ quán">
        <div className="space-y-6 px-2 pb-2 pt-2">
          {f.status !== 'removed' ? (
            <ActionForm action={setFacilityStatus} className="space-y-4">
              <input type="hidden" name="facility_id" value={f.id} />
              <input type="hidden" name="status" value="removed" />
              <Field label="Lý do gỡ cơ sở" hint="Các ca sắp tới của cơ sở sẽ bị hủy.">
                <input name="reason" maxLength={300} className={inputCls} />
              </Field>
              <SubmitButton variant="danger" confirm="Gỡ cơ sở và hủy các ca sắp tới?">Gỡ cơ sở</SubmitButton>
            </ActionForm>
          ) : (
            <p className="text-base text-ink-soft">Cơ sở đã bị gỡ. Muốn kích hoạt lại, hãy làm phiếu xác minh mới.</p>
          )}
          <ActionForm action={setAccountStatus} className="space-y-4">
            <input type="hidden" name="user_id" value={f.owner_id} />
            <input type="hidden" name="status" value={ownerLocked ? 'active' : 'locked'} />
            <Field label={ownerLocked ? 'Lý do mở khóa' : 'Lý do khóa tài khoản chủ quán'}>
              <input name="reason" maxLength={300} className={inputCls} />
            </Field>
            {ownerLocked ? (
              <SubmitButton variant="secondary" confirm={`Mở khóa tài khoản của ${f.owner_name}?`}>Mở khóa</SubmitButton>
            ) : (
              <SubmitButton variant="danger" confirm={`Khóa tài khoản của ${f.owner_name}?`}>Khóa tài khoản chủ quán</SubmitButton>
            )}
          </ActionForm>
        </div>
      </Disclosure>
    </div>
  );
}

export default async function FacilitiesPage() {
  const { supabase, profile } = await requireRole('admin');
  const { data, error } = await supabase.rpc('admin_list_facilities');
  if (error) {
    return (
      <div className="space-y-4">
        <PageTitle>Duyệt cơ sở</PageTitle>
        <Alert tone="red">{friendlyError(error)}</Alert>
      </div>
    );
  }
  const list = (data ?? []) as AdminFacility[];
  const waiting = list.filter((f) => f.status === 'pending').length;
  // Số thứ tự trong danh sách = số trên ghim = số trong chú giải = số trên thẻ.
  const pinned = list.flatMap((f, i) => f.lat == null || f.lng == null ? [] : [{ f, n: i + 1 }]);
  const verified = (f: AdminFacility) => f.status === 'active' && f.verified;
  const points: MapPoint[] = pinned.map(({ f, n }) => ({
    id: f.id, lat: f.lat as number, lng: f.lng as number, text: String(n),
    label: `${n}. ${f.name}, ${verified(f) ? 'đã xác minh' : FACILITY_STATUS_LABEL[f.status].toLowerCase()}`,
    tone: f.status === 'removed' ? 'removed' as const : verified(f) ? 'open' as const : 'pending' as const,
  }));
  const noPin = list.length - points.length;
  const today = vnDateInput();
  const verifier = profile.full_name;
  return (
    <div className="space-y-6">
      <PageTitle sub={`${list.length} cơ sở · ${waiting} đang chờ xác minh`}>Duyệt cơ sở</PageTitle>
      {list.length === 0 ? (
        <Empty>Chưa có cơ sở nào đăng ký</Empty>
      ) : (
        <>
          {points.length > 0 ? (
            <div className="space-y-2">
              <ShiftMap
                points={points}
                fitIds={pinned.filter(({ f }) => verified(f)).map(({ f }) => f.id)}
                className="h-96 lg:h-[28rem]"
                caption={noPin > 0 ? `${noPin} cơ sở chưa có ghim vị trí.` : undefined}
              />
              <p className="break-words text-base text-ink">
                {pinned.map(({ f, n }, i) => (
                  <span key={f.id}>
                    {i > 0 ? ' · ' : ''}
                    <b>{n}</b> {f.name}
                    {verified(f) ? '' : ` (${FACILITY_STATUS_LABEL[f.status].toLowerCase()})`}
                  </span>
                ))}
              </p>
            </div>
          ) : (
            <Alert tone="amber">Chưa cơ sở nào có ghim vị trí.</Alert>
          )}

          {/* Một thẻ cho mỗi cơ sở ở mọi bề rộng; từ 1024px phần thông tin chia ba cột, thao tác trải hết bề ngang. */}
          <div className="space-y-4">
            {list.map((f, i) => (
              <Card key={f.id} tab={<StatusBadges f={f} pin={f.lat == null || f.lng == null ? null : i + 1} />}>
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-3 lg:gap-8">
                    <div><Identity f={f} /></div>
                    <Owner f={f} />
                    <Verification f={f} />
                  </div>
                  <div className="border-t border-rule pt-2"><Actions f={f} today={today} verifier={verifier} /></div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
