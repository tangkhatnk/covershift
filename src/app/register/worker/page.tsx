import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { registerWorker } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Check, Field, PageTitle, inputCls } from '@/components/ui';
import { getContext, homeFor } from '@/lib/auth';
import { AREA_LABEL, AVAILABILITY_LABEL } from '@/lib/constants';
import { vnDateInput } from '@/lib/format';

export const metadata = { title: 'Đăng ký tìm việc' };

const linkCls = 'font-semibold text-shutter underline underline-offset-4';

export default async function RegisterWorkerPage() {
  const { user, profile } = await getContext();
  if (!user) redirect('/login');
  if (profile) redirect(profile.status === 'locked' ? '/account' : homeFor(profile.role));
  return (
    <div className="space-y-4">
      <PageTitle sub="Điền một lần, mất khoảng 2 phút.">Đăng ký tìm việc</PageTitle>
      <Alert tone="blue">
        <ul className="list-disc space-y-2 pl-6">
          <li>Bạn cần đủ <b>15 tuổi</b> trở lên.</li>
          <li>Nếu bạn 15–17 tuổi: ở bước sau bạn sẽ nhận một link để gửi cho phụ huynh bấm đồng ý.</li>
          <li>Chúng tôi chỉ hỏi những thông tin cần thiết. <b>Không</b> thu căn cước (CCCD), ảnh hay địa chỉ nhà.</li>
        </ul>
      </Alert>
      <ActionForm action={registerWorker}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên">
            <input name="full_name" required minLength={2} maxLength={80} autoComplete="name" className={inputCls} placeholder="Nguyễn Văn An" />
          </Field>
          <Field label="Ngày sinh" hint="Ghi đúng ngày sinh thật. Ngày sinh không hiện cho chủ quán.">
            <input type="date" name="dob" required max={vnDateInput()} className={inputCls} />
          </Field>
          <Field label="Trường đang học">
            <input name="school" required minLength={2} maxLength={120} className={inputCls} placeholder="THPT Vũng Tàu" />
          </Field>
          <Field label="Lớp (không bắt buộc)">
            <input name="class_name" maxLength={40} className={inputCls} placeholder="11A2" />
          </Field>
          <Field label="Số điện thoại" hint="10 số, bắt đầu bằng 0. Chỉ quán bạn đã nhận ca mới thấy số này.">
            <input type="tel" inputMode="tel" name="phone" required autoComplete="tel" className={inputCls} placeholder="0901234567" />
          </Field>
          <Field label="Khu vực bạn muốn làm">
            <select name="area" required defaultValue="" className={inputCls}>
              <option value="" disabled>Chọn khu vực</option>
              {Object.entries(AREA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
        </div>
        <fieldset className="min-w-0">
          <legend className="mb-2 text-base font-semibold text-ink">Bạn rảnh lúc nào? (chọn nhiều ô được)</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(AVAILABILITY_LABEL).map(([k, v]) => (
              <Check key={k} name="availability" value={k}>{v}</Check>
            ))}
          </div>
        </fieldset>
        <Check name="consent" required>
          Tôi đồng ý cho SafeShift xử lý dữ liệu cá nhân của tôi để kết nối ca làm, theo{' '}
          <Link href="/privacy" className={linkCls}>Chính sách dữ liệu</Link> và{' '}
          <Link href="/terms" className={linkCls}>Điều khoản</Link>.
        </Check>
        <SubmitButton>Đăng ký</SubmitButton>
      </ActionForm>
      <p className="flex justify-center">
        <Link href="/register" className="inline-flex min-h-[3rem] items-center gap-2 font-semibold text-shutter underline underline-offset-4">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          Quay lại chọn vai trò
        </Link>
      </p>
    </div>
  );
}
