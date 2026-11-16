import Link from 'next/link';
import { redirect } from 'next/navigation';
import { registerEmployer } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Check, Field, PageTitle, inputCls } from '@/components/ui';
import { getContext, homeFor } from '@/lib/auth';
import { AREA_LABEL, FACILITY_TYPE_LABEL, PROHIBITED_TEXT } from '@/lib/constants';

export const metadata = { title: 'Đăng ký cơ sở' };

const linkCls = 'font-semibold text-brand-700 underline underline-offset-4';

export default async function RegisterEmployerPage() {
  const { user, profile } = await getContext();
  if (!user) redirect('/dang-nhap');
  if (profile) redirect(profile.status === 'locked' ? '/tai-khoan' : homeFor(profile.role));
  return (
    <div className="space-y-4">
      <PageTitle sub="Dành cho quán cà phê, nhà hàng, homestay, khách sạn nhỏ ở Vũng Tàu.">Đăng ký cơ sở</PageTitle>
      <Alert tone="blue">
        Sau khi đăng ký, nhóm vận hành sẽ <b>đến tận nơi xác minh</b> cơ sở. Xác minh xong anh/chị mới đăng ca được. Không thu phí.
      </Alert>
      <ActionForm action={registerEmployer}>
        <Field label="Họ tên người liên hệ">
          <input name="full_name" required minLength={2} maxLength={80} autoComplete="name" className={inputCls} placeholder="Trần Thị Bình" />
        </Field>
        <Field label="Số điện thoại" hint="10 số, bắt đầu bằng 0. Chỉ người đã nhận ca của quán mới thấy số này.">
          <input type="tel" inputMode="tel" name="phone" required autoComplete="tel" className={inputCls} placeholder="0901234567" />
        </Field>
        <Field label="Tên cơ sở">
          <input name="facility_name" required minLength={2} maxLength={100} className={inputCls} placeholder="Cà phê Biển Xanh" />
        </Field>
        <Field label="Loại hình">
          <select name="type" required defaultValue="" className={inputCls}>
            <option value="" disabled>Chọn loại hình</option>
            {Object.entries(FACILITY_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Địa chỉ" hint="Số nhà, tên đường, phường.">
          <input name="address" required minLength={5} maxLength={200} autoComplete="street-address" className={inputCls} placeholder="12 Thùy Vân, phường Thắng Tam" />
        </Field>
        <Field label="Khu vực">
          <select name="area" required defaultValue="" className={inputCls}>
            <option value="" disabled>Chọn khu vực</option>
            {Object.entries(AREA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Link Google Maps (không bắt buộc)" hint="Mở Google Maps, bấm Chia sẻ, dán link vào đây. Link bắt đầu bằng https://">
          <input type="url" inputMode="url" name="maps_url" pattern="https://.*" className={inputCls} placeholder="https://maps.app.goo.gl/..." />
        </Field>
        <Check name="not_prohibited" required>
          Cơ sở của tôi <b>KHÔNG</b> thuộc: {PROHIBITED_TEXT}.
        </Check>
        <Check name="consent" required>
          Tôi đồng ý cho SafeShift xử lý dữ liệu cá nhân của tôi để kết nối ca làm, theo{' '}
          <Link href="/chinh-sach-du-lieu" className={linkCls}>Chính sách dữ liệu</Link> và{' '}
          <Link href="/dieu-khoan" className={linkCls}>Điều khoản</Link>.
        </Check>
        <SubmitButton>Đăng ký cơ sở</SubmitButton>
      </ActionForm>
      <p className="text-center text-base">
        <Link href="/dang-ky" className={linkCls}>Quay lại chọn vai trò</Link>
      </p>
    </div>
  );
}
