import Link from 'next/link';
import { regenerateConsent, setSharing, updateWorkerProfile } from '@/app/actions';
import { ActionForm, CopyButton, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Check, Field, PageTitle, btn, inputCls, type Tone } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { APPROVAL_LABEL, AREA_LABEL, AVAILABILITY_LABEL, CONSENT_LABEL, SITE_URL, type Area } from '@/lib/constants';
import { friendlyError } from '@/lib/errors';
import { fmtDateTime, fmtPlainDate } from '@/lib/format';

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

const linkCls = 'font-semibold text-shutter underline underline-offset-4';
const APPROVAL_TONE: Record<WorkerRow['approval'], Tone> = { pending: 'amber', approved: 'green', rejected: 'red' };
const CONSENT_TONE: Record<ConsentRow['status'], Tone> = { pending: 'amber', submitted: 'blue', approved: 'green', rejected: 'red' };
const urlBox = 'break-all rounded-ui border-2 border-rule-strong bg-chalk px-4 py-2 text-base text-ink';

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ moi?: string }> }) {
  const { supabase, profile, user } = await requireRole('worker');
  const sp = await searchParams;

  const [wpRes, phoneRes, consentRes, eventsRes] = await Promise.all([
    supabase.from('worker_profiles')
      .select('date_of_birth, school, class_name, area, availability, approval, review_note, share_enabled, public_slug')
      .eq('user_id', user.id).maybeSingle(),
    supabase.from('private_contacts').select('phone').eq('user_id', user.id).maybeSingle(),
    supabase.from('parental_consents').select('token, status, expires_at').eq('worker_id', user.id).maybeSingle(),
    supabase.from('worker_events').select('kind').eq('worker_id', user.id),
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

  const consentUrl = consent ? `${SITE_URL}/consent/${consent.token}` : '';
  const consentExpired = consent ? new Date(consent.expires_at).getTime() < Date.now() : false;
  const publicUrl = `${SITE_URL}/p/${wp.public_slug}`;

  return (
    <div className="space-y-4">
      <PageTitle sub={profile.full_name}>Hồ sơ của tôi</PageTitle>

      {sp.moi ? (
        <Alert tone="green">
          <b>Đăng ký thành công!</b>{' '}
          {consent?.status === 'pending'
            ? 'Còn một bước: gửi link bên dưới cho phụ huynh để phụ huynh bấm đồng ý.'
            : 'Nhóm vận hành sẽ duyệt hồ sơ của bạn. Trong lúc chờ, bạn xem trước các ca được.'}
        </Alert>
      ) : null}

      <Card tab={<><h2 className="text-lg font-bold text-ink">Trạng thái duyệt</h2><Badge tone={APPROVAL_TONE[wp.approval]}>{APPROVAL_LABEL[wp.approval]}</Badge></>}>
        {wp.approval === 'pending' ? (
          <p className="text-base text-ink">Nhóm vận hành đang xem hồ sơ. Duyệt xong bạn mới nhận ca được.</p>
        ) : null}
        {wp.approval === 'approved' ? (
          <p className="text-base text-ink">
            Bạn nhận ca được rồi. <Link href="/shifts" className={linkCls}>Tìm ca</Link>
          </p>
        ) : null}
        {wp.approval === 'rejected' ? (
          <p className="text-base text-roof">
            {wp.review_note ? `Lý do: ${wp.review_note}` : 'Hồ sơ chưa được duyệt. Vui lòng liên hệ nhóm vận hành để biết lý do.'}
          </p>
        ) : null}
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
          <p className="mt-2 text-base">
            <Link href={`/p/${wp.public_slug}`} className={linkCls}>Xem trước</Link>{' '}
            <span className="text-ink-soft">(chỉ mình bạn xem được khi đang tắt)</span>
          </p>
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
        <dl className="mt-4 grid grid-cols-2 gap-4 text-center">
          <div className="flex flex-col-reverse rounded-ui border border-rule bg-chalk p-4">
            <dt className="text-base text-ink-soft">lần hủy sát giờ</dt>
            <dd className={`tabular font-num text-4xl font-bold ${lateCancels ? 'text-roof' : 'text-ink'}`}>{lateCancels}</dd>
          </div>
          <div className="flex flex-col-reverse rounded-ui border border-rule bg-chalk p-4">
            <dt className="text-base text-ink-soft">lần không đến</dt>
            <dd className={`tabular font-num text-4xl font-bold ${noShows ? 'text-roof' : 'text-ink'}`}>{noShows}</dd>
          </div>
        </dl>
        <p className="mt-4 text-base text-ink-soft">Hủy khi còn dưới 2 tiếng trước ca được tính là hủy sát giờ.</p>
      </Card>

      <Card>
        <h2 className="text-xl font-bold text-ink">Thông tin của tôi</h2>
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
