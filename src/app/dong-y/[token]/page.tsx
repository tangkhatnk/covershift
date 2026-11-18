import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Card, Check, Field, PageTitle, inputCls } from '@/components/ui';
import { submitParentalConsent } from '@/app/actions';
import { DISCLAIMER, JOB_LABEL, NO_FEE, PROHIBITED_TEXT } from '@/lib/constants';
import { createClient } from '@/lib/supabase/server';
import type { ParentalConsentView } from '@/lib/types';

export const metadata: Metadata = { title: 'Phụ huynh đồng ý', robots: { index: false, follow: false } };

const TITLE = 'Phụ huynh đồng ý cho con làm thêm';

export default async function ParentalConsentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_parental_consent', { p_token: token });

  if (error) {
    return (
      <div className="space-y-4">
        <PageTitle>{TITLE}</PageTitle>
        <Alert tone="red">Chưa tải được trang. Anh/chị vui lòng thử lại sau ít phút.</Alert>
      </div>
    );
  }

  const v = (data as ParentalConsentView | null) ?? { state: 'invalid' as const };

  if (v.state !== 'ok') {
    return (
      <div className="space-y-4">
        <PageTitle>{TITLE}</PageTitle>
        {v.state === 'submitted' ? (
          <Alert tone="green">
            <span className="text-lg font-semibold">Phiếu đồng ý đã được gửi. Cảm ơn anh/chị.</span>
            <span className="mt-2 block">Nhóm vận hành sẽ xem và duyệt hồ sơ của con. Anh/chị không cần làm gì thêm.</span>
          </Alert>
        ) : v.state === 'expired' ? (
          <Alert tone="amber">
            <span className="text-lg">Link này đã hết hạn. Anh/chị nhờ con tạo link mới trong mục Hồ sơ rồi gửi lại.</span>
          </Alert>
        ) : (
          <Alert tone="red">
            <span className="text-lg">Link không hợp lệ. Anh/chị nhờ con gửi lại link trong mục Hồ sơ.</span>
          </Alert>
        )}
      </div>
    );
  }

  const name = v.worker_name ?? 'con';
  const jobs = Object.values(JOB_LABEL).join(', ').toLowerCase();

  return (
    <div className="space-y-6">
      <PageTitle sub={<>Con của anh/chị là <b className="text-ink">{name}</b> muốn nhận ca làm thêm ngắn hạn qua SafeShift.</>}>
        {TITLE}
      </PageTitle>

      <Card tab={<h2 className="text-lg font-bold text-ink">Anh/chị cần biết</h2>}>
        <ul className="list-disc space-y-2 pl-6 text-base text-ink marker:text-shutter">
          <li>{DISCLAIMER}</li>
          <li>Con chỉ nhận được ca <b>trong khung 06:00–22:00</b>, tối đa <b>8 giờ một ca</b> và <b>40 giờ một tuần</b>.</li>
          <li>Chỉ có 7 loại việc nhẹ: {jobs}. Không có việc liên quan đến: {PROHIBITED_TEXT}.</li>
          <li>Nơi thuê đã được nhóm vận hành đến tận nơi xác minh.</li>
          <li><b>{NO_FEE}</b> Không đặt cọc, không giữ giấy tờ.</li>
          <li>Số điện thoại của anh/chị chỉ nhóm vận hành thấy, để liên hệ khi cần.</li>
        </ul>
      </Card>

      <ActionForm action={submitParentalConsent}>
        <input type="hidden" name="token" value={token} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ tên phụ huynh">
            <input name="parent_name" required maxLength={100} autoComplete="name" className={inputCls} />
          </Field>
          <Field label="Số điện thoại phụ huynh" hint="Ví dụ: 0901234567">
            <input name="parent_phone" type="tel" inputMode="tel" required maxLength={15} autoComplete="tel" className={inputCls} />
          </Field>
        </div>
        <Check name="agree" required>
          Tôi là cha/mẹ/người giám hộ của <b>{name}</b> và đồng ý cho con nhận ca làm qua SafeShift.
        </Check>
        {/* Không dùng confirm() ở trang token: trình duyệt nhúng của Zalo/Facebook có thể bỏ qua hộp thoại. Nút to, một việc duy nhất. */}
        <div className="[&>button]:!min-h-[3.75rem] [&>button]:!text-xl">
          <SubmitButton>Gửi đồng ý</SubmitButton>
        </div>
      </ActionForm>

      <p className="text-base text-ink-soft">
        Anh/chị có thể đọc thêm{' '}
        <Link href="/dieu-khoan" className="font-semibold text-shutter underline underline-offset-4">Điều khoản sử dụng</Link> và{' '}
        <Link href="/chinh-sach-du-lieu" className="font-semibold text-shutter underline underline-offset-4">Chính sách dữ liệu</Link>.
      </p>
    </div>
  );
}
