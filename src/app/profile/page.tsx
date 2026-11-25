import Link from 'next/link';
import { Circle, CircleCheck } from 'lucide-react';
import { regenerateConsent, setSharing, updateWorkerProfile } from '@/app/actions';
import { ActionForm, CopyButton, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Check, Field, PageTitle, btn, inputCls, type Tone } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { APPROVAL_LABEL, AREA_LABEL, AVAILABILITY_LABEL, CONSENT_LABEL, SITE_URL, type Area } from '@/lib/constants';
import { friendlyError } from '@/lib/errors';
import { fmtDateTime, fmtPlainDate, hoursBetween, vnDateInput } from '@/lib/format';
import type { MyShift } from '@/lib/types';

export const metadata = { title: 'Hồ sơ' };

type WorkerRow = {
  date_of_birth: string;
  school: string;
  class_name: string | null;
  area: Area;
  availability: string[];
  approval: keyof typeof APPROVAL_LABEL;
  review_note: string | null;
  share_enabled: boolean;
  public_slug: string;
};
type ConsentRow = { token: string; status: keyof typeof CONSENT_LABEL; expires_at: string };

const linkCls = 'font-semibold text-brand underline underline-offset-4';
const APPROVAL_TONE: Record<WorkerRow['approval'], Tone> = { pending: 'amber', approved: 'green', rejected: 'red' };
const CONSENT_TONE: Record<ConsentRow['status'], Tone> = { pending: 'amber', submitted: 'blue', approved: 'green', rejected: 'red' };
const urlBox = 'break-all text-base font-semibold text-ink';

/** Ngày YYYY-MM-DD cộng `n` ngày (chỉ số học trên ngày, không phụ thuộc múi giờ máy chủ). */
const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
/** Thứ Hai và Chủ nhật của tuần chứa `ymd` (tuần theo giờ Việt Nam, khớp `_claims_validate`). */
const weekOf = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const mon = addDays(ymd, -((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7));
  return [mon, addDays(mon, 6)] as const;
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ moi?: string }> }) {
  const { supabase, profile, user } = await requireRole('worker');
  const sp = await searchParams;

  const [wpRes, phoneRes, consentRes, eventsRes, shiftsRes, cfgRes] = await Promise.all([
    supabase.from('worker_profiles')
      .select('date_of_birth, school, class_name, area, availability, approval, review_note, share_enabled, public_slug')
      .eq('user_id', user.id).maybeSingle(),
    supabase.from('private_contacts').select('phone').eq('user_id', user.id).maybeSingle(),
    supabase.from('parental_consents').select('token, status, expires_at').eq('worker_id', user.id).maybeSingle(),
    supabase.from('worker_events').select('kind').eq('worker_id', user.id),
    supabase.rpc('my_shifts'),
    supabase.from('app_config').select('value').eq('key', 'weekly_hours_cap').maybeSingle(),
  ]);

  const wp = wpRes.data as WorkerRow | null;
  if (!wp) {
    return <Alert tone="red">{wpRes.error ? friendlyError(wpRes.error) : 'Không tìm thấy hồ sơ người làm. Vui lòng liên hệ nhóm vận hành.'}</Alert>;
  }
  const phone = (phoneRes.data?.phone as string | undefined) ?? '';
  const consent = consentRes.data as ConsentRow | null;
  const events = (eventsRes.data ?? []) as { kind: string }[];
  const lateCancels = events.filter((e) => e.kind === 'late_cancel').length;
  const noShows = events.filter((e) => e.kind === 'no_show').length;

  // Giờ tuần này: cùng cách tính với database (suất còn hiệu lực, ca chưa hủy, tuần Thứ Hai đến Chủ nhật); database vẫn là nơi chặn.
  const cap = Number(cfgRes.data?.value) || 40;
  const [weekFrom, weekTo] = weekOf(vnDateInput());
  const weekHours = shiftsRes.error ? null : Math.round(
    ((shiftsRes.data ?? []) as MyShift[])
      .filter((x) => x.claim_status === 'active' && x.status !== 'cancelled' && vnDateInput(x.starts_at) >= weekFrom && vnDateInput(x.starts_at) <= weekTo)
      .reduce((sum, x) => sum + hoursBetween(x.starts_at, x.ends_at), 0) * 10) / 10;

  const steps = [
    { done: phone.trim() !== '', label: 'Số điện thoại', ok: 'Đã có số điện thoại.', todo: 'Chưa có số điện thoại.' },
    { done: wp.school.trim() !== '', label: 'Trường đang học', ok: wp.school, todo: 'Chưa ghi trường đang học.' },
    { done: (wp.availability ?? []).length > 0, label: 'Giờ rảnh', ok: `Đã chọn ${(wp.availability ?? []).length} khung giờ.`, todo: 'Chưa chọn giờ rảnh.' },
  ];
  const approved = wp.approval === 'approved';
  const doneCount = steps.filter((x) => x.done).length + (approved ? 1 : 0);

  const consentUrl = consent ? `${SITE_URL}/consent/${consent.token}` : '';
  const consentExpired = consent ? new Date(consent.expires_at).getTime() < Date.now() : false;
  const publicUrl = `${SITE_URL}/p/${wp.public_slug}`;

  return (
    <div className="space-y-4">
      <PageTitle sub={profile.full_name}>Hồ sơ của tôi</PageTitle>

      {sp.moi ? (
        <Alert tone="green">
          <b>Bạn đã đăng ký xong.</b>{' '}
          {consent?.status === 'pending'
            ? 'Còn một bước: gửi link bên dưới cho phụ huynh để phụ huynh bấm đồng ý.'
            : 'Nhóm vận hành sẽ duyệt hồ sơ của bạn. Trong lúc chờ, bạn xem trước các ca được.'}
        </Alert>
      ) : null}

      <Card tab={<><h2 className="text-lg font-bold text-ink">Hoàn thiện hồ sơ ({doneCount}/4)</h2><Badge tone={APPROVAL_TONE[wp.approval]}>{APPROVAL_LABEL[wp.approval]}</Badge></>}>
        <ul className="divide-y divide-rule">
          {steps.map((x) => (
            <li key={x.label} className="flex items-start gap-2 py-2">
              {x.done
                ? <CircleCheck className="mt-1 h-5 w-5 shrink-0 text-ok" aria-hidden="true" />
                : <Circle className="mt-1 h-5 w-5 shrink-0 text-rule-strong" aria-hidden="true" />}
              <p className="min-w-0 flex-1 break-words text-base text-ink">
                <b>{x.label}.</b> {x.done ? x.ok : x.todo}
                {x.done ? null : <>{' '}<a href="#thong-tin" className={linkCls}>Điền ở mục Thông tin</a></>}
              </p>
            </li>
          ))}
          <li className="flex items-start gap-2 py-2">
            {approved
              ? <CircleCheck className="mt-1 h-5 w-5 shrink-0 text-ok" aria-hidden="true" />
              : <Circle className="mt-1 h-5 w-5 shrink-0 text-rule-strong" aria-hidden="true" />}
            <p className="min-w-0 flex-1 break-words text-base text-ink">
              <b>Nhóm vận hành duyệt.</b>{' '}
              {approved ? 'Bạn nhận ca được rồi.' : null}
              {wp.approval === 'pending' ? 'Đang chờ duyệt. Duyệt xong bạn mới nhận ca được.' : null}
              {wp.approval === 'rejected' ? <span className="text-danger">{wp.review_note ? `Lý do: ${wp.review_note}` : 'Chưa được duyệt. Vui lòng liên hệ nhóm vận hành để biết lý do.'}</span> : null}
            </p>
          </li>
        </ul>
        {approved ? <Link href="/shifts" className={`${btn('primary', false)} mt-4 w-full sm:w-auto`}>Tìm ca</Link> : null}
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-ink">Giờ làm tuần này</h2>
        {weekHours == null ? (
          <p className="mt-2 text-base text-ink-soft">Chưa tải được số giờ của tuần này. Bạn tải lại trang sau ít phút nhé.</p>
        ) : (
          <>
            <p className="mt-2 text-base text-ink">
              <span className="tabular font-num text-4xl font-bold leading-tight">{weekHours}/{cap}</span> giờ
            </p>
            <div role="progressbar" aria-label="Giờ làm tuần này" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={Math.min(weekHours, cap)}
              className="mt-2 h-4 overflow-hidden rounded-ui border border-rule-strong bg-chalk">
              <div className="h-full bg-brand" style={{ width: `${Math.min(100, (weekHours / cap) * 100)}%` }} />
            </div>
            <p className="mt-2 text-base text-ink-soft">
              Tuần {fmtPlainDate(weekFrom).slice(0, 5)} đến {fmtPlainDate(weekTo).slice(0, 5)}, tính cả suất dự phòng còn hiệu lực.
              {weekHours >= cap ? ' Bạn đã đủ giờ của tuần này.' : ` Còn ${Math.round((cap - weekHours) * 10) / 10} giờ.`}
            </p>
          </>
        )}
      </Card>

      {consent ? (
        <Card tab={<><h2 className="text-lg font-bold text-ink">Phụ huynh đồng ý</h2><Badge tone={CONSENT_TONE[consent.status]}>{CONSENT_LABEL[consent.status]}</Badge></>}>
          {consent.status === 'pending' ? (
            <div className="space-y-4">
              <p className="text-base text-ink">Bạn dưới 18 tuổi nên cần phụ huynh đồng ý trước khi nhận ca. Làm 3 bước:</p>
              <ol className="list-decimal space-y-2 pl-6 text-base text-ink">
                <li>Bấm <b>Sao chép link</b> bên dưới.</li>
                <li>Gửi link cho ba, mẹ hoặc người giám hộ qua Zalo.</li>
                <li>Phụ huynh mở link, điền tên, số điện thoại và tick đồng ý.</li>
              </ol>
              {consentExpired ? (
                <Alert tone="red">Link này đã hết hạn. Hãy bấm &quot;Tạo link mới&quot; rồi gửi lại cho phụ huynh.</Alert>
              ) : (
                <>
                  <p className={urlBox}>{consentUrl}</p>
                  <CopyButton text={consentUrl} variant="primary">Sao chép link</CopyButton>
                  <p className="text-base text-ink-soft">Link dùng được đến {fmtDateTime(consent.expires_at)}.</p>
                </>
              )}
            </div>
          ) : null}
          {consent.status === 'submitted' ? (
            <p className="text-base text-ink">Phụ huynh đã gửi. Nhóm vận hành sẽ kiểm tra (có thể gọi cho phụ huynh) rồi duyệt.</p>
          ) : null}
          {consent.status === 'rejected' ? (
            <p className="text-base text-ink">Phiếu đồng ý bị từ chối. Bạn tạo link mới rồi gửi lại cho phụ huynh nhé.</p>
          ) : null}

          {consent.status === 'pending' || consent.status === 'rejected' ? (
            <ActionForm action={regenerateConsent} className="mt-4 space-y-4">
              <SubmitButton variant="secondary" confirm="Tạo link mới? Link cũ sẽ không dùng được nữa.">Tạo link mới</SubmitButton>
            </ActionForm>
          ) : null}
        </Card>
      ) : null}

      <Card tab={<><h2 className="text-lg font-bold text-ink">Hồ sơ ca làm công khai</h2><Badge tone={wp.share_enabled ? 'green' : 'gray'}>{wp.share_enabled ? 'Đang bật chia sẻ' : 'Đang tắt'}</Badge></>}>
        <p className="text-base text-ink">
          Hồ sơ này ghi lại các ca bạn đã làm và đánh giá của quán, để bạn gửi khi đi xin việc. Hồ sơ công khai{' '}
          <b>không có</b> số điện thoại, ngày sinh, trường lớp.
        </p>
        {wp.share_enabled ? (
          <div className="mt-4 space-y-4">
            <p className={urlBox}>{publicUrl}</p>
            <CopyButton text={publicUrl}>Sao chép link hồ sơ</CopyButton>
            <Link href={`/p/${wp.public_slug}`} className={btn('secondary')}>Xem hồ sơ</Link>
          </div>
        ) : (
          <div className="mt-2">
            <Link href={`/p/${wp.public_slug}`} className={btn('secondary')}>Xem trước</Link>
            <p className="mt-2 text-base text-ink-soft">Khi đang tắt, chỉ mình bạn xem được.</p>
          </div>
        )}
        <ActionForm action={setSharing} className="mt-4 space-y-4">
          <input type="hidden" name="enabled" value={wp.share_enabled ? 'false' : 'true'} />
          {wp.share_enabled ? (
            <SubmitButton variant="secondary" confirm="Tắt chia sẻ? Người có link sẽ không xem được hồ sơ nữa.">Tắt chia sẻ</SubmitButton>
          ) : (
            <SubmitButton>Bật chia sẻ</SubmitButton>
          )}
        </ActionForm>
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-ink">Lịch sử</h2>
        <dl className="mt-4 grid grid-cols-2 divide-x divide-rule text-center">
          <div className="flex flex-col-reverse px-2">
            <dt className="text-base text-ink-soft">lần hủy sát giờ</dt>
            <dd className={`tabular font-num text-4xl font-bold ${lateCancels ? 'text-danger' : 'text-ink'}`}>{lateCancels}</dd>
          </div>
          <div className="flex flex-col-reverse px-2">
            <dt className="text-base text-ink-soft">lần không đến</dt>
            <dd className={`tabular font-num text-4xl font-bold ${noShows ? 'text-danger' : 'text-ink'}`}>{noShows}</dd>
          </div>
        </dl>
        <p className="mt-4 text-base text-ink-soft">Hủy khi còn dưới 2 tiếng trước ca được tính là hủy sát giờ.</p>
      </Card>

      <Card>
        <h2 id="thong-tin" className="text-xl font-bold text-ink">Thông tin của tôi</h2>
        <dl className="mt-2 space-y-2 text-base">
          <div className="flex gap-2"><dt className="text-ink-soft">Họ tên:</dt><dd className="font-semibold">{profile.full_name}</dd></div>
          <div className="flex gap-2"><dt className="text-ink-soft">Ngày sinh:</dt><dd className="font-semibold">{fmtPlainDate(wp.date_of_birth)}</dd></div>
        </dl>
        <p className="mb-4 mt-2 text-base text-ink-soft">Muốn đổi họ tên hoặc ngày sinh, hãy liên hệ nhóm vận hành.</p>
        <ActionForm action={updateWorkerProfile}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Trường đang học">
              <input name="school" required minLength={2} maxLength={120} defaultValue={wp.school} className={inputCls} />
            </Field>
            <Field label="Lớp (không bắt buộc)">
              <input name="class_name" maxLength={40} defaultValue={wp.class_name ?? ''} className={inputCls} />
            </Field>
            <Field label="Số điện thoại" hint="10 số, bắt đầu bằng 0.">
              <input type="tel" inputMode="tel" name="phone" required autoComplete="tel" defaultValue={phone} className={inputCls} />
            </Field>
            <Field label="Khu vực bạn muốn làm">
              <select name="area" required defaultValue={wp.area} className={inputCls}>
                {Object.entries(AREA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <fieldset className="min-w-0 space-y-2">
            <legend className="mb-2 text-base font-semibold text-ink">Bạn rảnh lúc nào?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(AVAILABILITY_LABEL).map(([k, v]) => (
                <Check key={k} name="availability" value={k} defaultChecked={wp.availability?.includes(k)}>{v}</Check>
              ))}
            </div>
          </fieldset>
          <SubmitButton>Lưu thay đổi</SubmitButton>
        </ActionForm>
      </Card>

      <Link href="/account" className={btn('secondary')}>Tài khoản (đăng xuất, xóa tài khoản)</Link>
    </div>
  );
}
