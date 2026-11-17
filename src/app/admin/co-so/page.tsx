import { setAccountStatus, setFacilityStatus, verifyFacility } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Check, Empty, Field, PageTitle, Tel, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { AREA_LABEL, FACILITY_STATUS_LABEL, FACILITY_TYPE_LABEL } from '@/lib/constants';
import { fmtPlainDate, vnDateInput } from '@/lib/format';
import type { AdminFacility } from '@/lib/types';

export const metadata = { title: 'Duyệt cơ sở' };

const summaryCls = 'cursor-pointer py-2 text-base font-semibold text-slate-700';
const yesNo = (ok: boolean) => (ok ? 'Có' : 'Không');

function FacilityCard({ f, today, verifier }: { f: AdminFacility; today: string; verifier: string }) {
  const v = f.verification;
  const ownerLocked = f.owner_status === 'locked';
  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={f.status === 'active' && f.verified ? 'green' : f.status === 'pending' ? 'amber' : 'gray'}>
          {f.status === 'active' && f.verified ? 'Đã xác minh' : FACILITY_STATUS_LABEL[f.status]}
        </Badge>
        {ownerLocked ? <Badge tone="red">Chủ quán bị khóa</Badge> : null}
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900">{f.name}</p>
        <p className="text-base text-slate-700">
          {FACILITY_TYPE_LABEL[f.type]} · {AREA_LABEL[f.area]}
        </p>
        <p className="text-base text-slate-700">{f.address}</p>
        {f.maps_url ? (
          <p>
            <a href={f.maps_url} target="_blank" rel="noopener noreferrer"
              className="font-semibold text-brand-700 underline underline-offset-4">
              Mở bản đồ
            </a>
          </p>
        ) : null}
        <p className="text-base text-slate-700">
          Chủ: {f.owner_name} · <Tel phone={f.owner_phone} />
        </p>
      </div>

      {v ? (
        <div className="rounded-xl bg-slate-50 p-3 text-base text-slate-800">
          <p className="font-bold">Phiếu xác minh gần nhất</p>
          <ul className="mt-1 space-y-0.5">
            <li>Đúng địa chỉ: {yesNo(v.address_ok)}</li>
            <li>Đúng người liên hệ: {yesNo(v.contact_ok)}</li>
            <li>Giấy phép kinh doanh: {yesNo(v.has_business_license)}</li>
            <li>Ngày xác minh: {fmtPlainDate(v.verified_on)}</li>
            <li>Người xác minh: {v.verifier_name}</li>
            {v.note ? <li>Ghi chú: {v.note}</li> : null}
          </ul>
        </div>
      ) : null}

      <details open={f.status === 'pending'}>
        <summary className={summaryCls}>Phiếu xác minh thực tế</summary>
        <ActionForm action={verifyFacility} className="space-y-3 pt-1">
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
          <p className="text-sm text-slate-600">Phải tick hai mục đầu (đúng địa chỉ, đúng người liên hệ) mới duyệt được.</p>
          <SubmitButton>Xác minh và cho phép đăng ca</SubmitButton>
        </ActionForm>
      </details>

      <details>
        <summary className={summaryCls}>Gỡ cơ sở / khóa chủ quán</summary>
        <div className="space-y-5 pt-1">
          {f.status !== 'removed' ? (
            <ActionForm action={setFacilityStatus} className="space-y-3">
              <input type="hidden" name="facility_id" value={f.id} />
              <input type="hidden" name="status" value="removed" />
              <Field label="Lý do gỡ cơ sở" hint="Các ca sắp tới của cơ sở sẽ bị hủy.">
                <input name="reason" maxLength={300} className={inputCls} />
              </Field>
              <SubmitButton variant="danger" confirm="Gỡ cơ sở và hủy các ca sắp tới?">Gỡ cơ sở</SubmitButton>
            </ActionForm>
          ) : (
            <p className="text-base text-slate-600">Cơ sở đã bị gỡ. Muốn kích hoạt lại, hãy làm phiếu xác minh mới.</p>
          )}
          <ActionForm action={setAccountStatus} className="space-y-3">
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
      </details>
    </Card>
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
  const today = vnDateInput();
  return (
    <div className="space-y-4">
      <PageTitle sub={`${list.length} cơ sở · ${waiting} đang chờ xác minh`}>Duyệt cơ sở</PageTitle>
      {list.length === 0 ? (
        <Empty>Chưa có cơ sở nào đăng ký</Empty>
      ) : (
        list.map((f) => <FacilityCard key={f.id} f={f} today={today} verifier={profile.full_name} />)
      )}
    </div>
  );
}
