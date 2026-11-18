import { ChevronDown, MapPin } from 'lucide-react';
import { setAccountStatus, setFacilityLocation, setFacilityStatus, verifyFacility } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { LocationPicker, ShiftMap, type MapPoint } from '@/components/map';
import { Alert, Badge, Card, Check, Empty, Field, PageTitle, Tel, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { AREA_LABEL, FACILITY_STATUS_LABEL, FACILITY_TYPE_LABEL } from '@/lib/constants';
import { fmtPlainDate, vnDateInput } from '@/lib/format';
import type { AdminFacility } from '@/lib/types';

export const metadata = { title: 'Duyệt cơ sở' };

const summaryCls =
  'flex min-h-[3rem] cursor-pointer items-center justify-between gap-2 rounded-ui px-2 text-base font-semibold text-shutter hover:bg-shutter-tint';
const yesNo = (ok: boolean) => (ok ? 'Có' : 'Không');
const th = 'px-4 py-2 text-left text-base font-semibold text-ink';
const td = 'px-4 py-4 align-top text-base text-ink';

/** Phần mở rộng (<details>): chạy bằng bàn phím, mũi tên xoay khi mở. */
function Disclosure({ label, open, children }: { label: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details className="group" open={open}>
      <summary className={summaryCls}>
        {label}
        <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      {children}
    </details>
  );
}

function StatusBadges({ f }: { f: AdminFacility }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
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
          className="inline-flex min-h-[3rem] items-center gap-2 font-semibold text-shutter underline underline-offset-4">
          <MapPin className="h-5 w-5" aria-hidden="true" />
          Mở bản đồ
        </a>
      ) : null}
    </>
  );
}

function Owner({ f }: { f: AdminFacility }) {
  return (
    <p className="text-base text-ink">
      Chủ: {f.owner_name} · <Tel phone={f.owner_phone} />
    </p>
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
      <Disclosure label="Phiếu xác minh thực tế" open={f.status === 'pending'}>
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
        <Disclosure label="Vị trí trên bản đồ">
          <ActionForm action={setFacilityLocation} className="space-y-4 px-2 pb-2 pt-2">
            <input type="hidden" name="facility_id" value={f.id} />
            <LocationPicker lat={f.lat} lng={f.lng} />
            <SubmitButton variant="secondary">Lưu vị trí</SubmitButton>
          </ActionForm>
        </Disclosure>
      ) : null}

      <Disclosure label="Gỡ cơ sở / khóa chủ quán">
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
  const points: MapPoint[] = list.flatMap((f) => f.lat == null || f.lng == null ? [] : [{
    id: f.id, lat: f.lat, lng: f.lng,
    text: f.name.length > 14 ? `${f.name.slice(0, 13)}…` : f.name,
    label: `${f.name}, ${f.status === 'active' && f.verified ? 'đã xác minh' : FACILITY_STATUS_LABEL[f.status].toLowerCase()}`,
    tone: f.status === 'removed' ? 'removed' as const : f.status === 'active' && f.verified ? 'open' as const : 'pending' as const,
  }]);
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
            <ShiftMap
              points={points}
              className="h-72 lg:h-96"
              caption={noPin > 0 ? `${noPin} cơ sở chưa có ghim vị trí.` : undefined}
            />
          ) : (
            <Alert tone="amber">Chưa cơ sở nào có ghim vị trí.</Alert>
          )}

          {/* Điện thoại: mỗi cơ sở một thẻ. */}
          <div className="space-y-4 lg:hidden">
            {list.map((f) => (
              <Card key={f.id} tab={<StatusBadges f={f} />}>
                <div className="space-y-4">
                  <div><Identity f={f} /></div>
                  <Owner f={f} />
                  <div className="border-t border-rule pt-4"><Verification f={f} /></div>
                  <div className="border-t border-rule pt-2"><Actions f={f} today={today} verifier={verifier} /></div>
                </div>
              </Card>
            ))}
          </div>

          {/* Từ 1024px: bảng. Mỗi cơ sở hai hàng (thông tin, rồi các thao tác trải hết bề ngang). */}
          <div className="hidden overflow-hidden rounded-ui border border-rule bg-white lg:block">
            <table className="w-full border-collapse">
              <caption className="sr-only">Danh sách cơ sở và thao tác xác minh</caption>
              <thead className="bg-wall-tint">
                <tr>
                  <th scope="col" className={th}>Cơ sở</th>
                  <th scope="col" className={th}>Trạng thái</th>
                  <th scope="col" className={th}>Chủ quán</th>
                  <th scope="col" className={th}>Xác minh</th>
                </tr>
              </thead>
              {list.map((f) => (
                <tbody key={f.id} className="border-t border-rule">
                  <tr>
                    <th scope="row" className={`${td} text-left font-normal`}><Identity f={f} /></th>
                    <td className={td}><StatusBadges f={f} /></td>
                    <td className={td}><Owner f={f} /></td>
                    <td className={td}><Verification f={f} /></td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 pb-4"><Actions f={f} today={today} verifier={verifier} /></td>
                  </tr>
                </tbody>
              ))}
            </table>
          </div>
        </>
      )}
    </div>
  );
}
