import Link from 'next/link';
import { createJobPost } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Check, Field, PageTitle, btn, inputCls } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { EMPLOYMENT_LABEL, JOB_HOURS_MAX, JOB_LABEL, JOB_POST_MAX_DAYS, WAGE_TYPE_LABEL } from '@/lib/constants';
import { fmtMoney } from '@/lib/format';

export const metadata = { title: 'Đăng tin tuyển dụng' };

export default async function NewJobPage() {
  const { supabase, profile } = await requireRole('employer');
  const [{ data: facility }, { data: cfg }] = await Promise.all([
    supabase.from('facilities').select('verified, status').eq('owner_id', profile.id).maybeSingle(),
    supabase.from('app_config').select('key, value'),
  ]);
  const canPost = !!facility && facility.verified === true && facility.status === 'active';

  if (!canPost) {
    return (
      <div className="space-y-4">
        <PageTitle>Đăng tin tuyển dụng</PageTitle>
        <Alert tone={facility?.status === 'removed' ? 'red' : 'amber'}>
          {facility?.status === 'removed'
            ? 'Cơ sở của anh/chị đã bị gỡ khỏi SafeShift nên không đăng tin được.'
            : 'Cơ sở đang chờ nhóm vận hành đến xác minh. Sau khi xác minh anh/chị mới đăng tin được.'}
        </Alert>
        <Link href="/employer/jobs" className={`${btn('secondary')} sm:w-auto`}>Về tin tuyển dụng</Link>
      </div>
    );
  }

  // Chỉ là gợi ý; database mới là nơi chặn (mức lương tối thiểu lấy từ app_config).
  const cfgNum = (key: string) => {
    const n = Number((cfg as { key: string; value: unknown }[] | null)?.find((r) => r.key === key)?.value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const hourly = cfgNum('min_hourly_wage');
  const monthly = cfgNum('min_monthly_wage');
  const wageHint = [hourly ? `theo giờ từ ${fmtMoney(hourly)}` : null, monthly ? `theo tháng từ ${fmtMoney(monthly)}` : null]
    .filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <PageTitle sub="Điền xong bấm Đăng tin. Tin không sửa được, chỉ đóng và đăng lại.">Đăng tin tuyển dụng</PageTitle>

      <ActionForm action={createJobPost} resetOnOk>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Tiêu đề tin" hint="Ví dụ: Pha chế bán thời gian tối trong tuần.">
              <input name="title" required maxLength={120} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Field label="Loại việc">
              <select name="job_type" required defaultValue="" className={inputCls}>
                <option value="" disabled>-- Chọn loại việc --</option>
                {Object.entries(JOB_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Field label="Hình thức">
              <select name="employment" required defaultValue="" className={inputCls}>
                <option value="" disabled>-- Chọn hình thức --</option>
                {Object.entries(EMPLOYMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Tính lương" hint={wageHint ? `Mức thấp nhất: ${wageHint}.` : undefined}>
              <select name="wage_type" required defaultValue="" className={inputCls}>
                <option value="" disabled>-- Chọn cách tính lương --</option>
                {Object.entries(WAGE_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Field label="Lương thấp nhất (đồng)" hint="Ví dụ: 30000 (theo giờ) hoặc 6000000 (theo tháng).">
              <input type="number" name="wage_min" inputMode="numeric" required min={1} step={1} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Field label="Lương cao nhất (không bắt buộc)" hint="Bỏ trống nếu chỉ ghi mức thấp nhất.">
              <input type="number" name="wage_max" inputMode="numeric" min={1} step={1} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Field label="Số giờ mỗi tuần" hint={`Từ 1 đến ${JOB_HOURS_MAX} giờ.`}>
              <input type="number" name="hours_per_week" inputMode="numeric" required min={1} max={JOB_HOURS_MAX} step={1} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Field label="Số người cần" hint="Từ 1 đến 10 người.">
              <input type="number" name="openings" inputMode="numeric" required min={1} max={10} step={1} defaultValue={1} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Lịch làm (không bắt buộc)" hint="Ví dụ: Thứ 2 đến thứ 6, 17:00–22:00. Tối đa 500 ký tự.">
              <textarea name="schedule_note" rows={2} maxLength={500} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Mô tả công việc (không bắt buộc)" hint="Tối đa 2000 ký tự. Người làm đã được duyệt đều đọc được mô tả này, nên đừng ghi số điện thoại cá nhân vào đây.">
              <textarea name="description" rows={5} maxLength={2000} className={inputCls} />
            </Field>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Field label="Hiển thị trong (ngày)" hint={`Từ 1 đến ${JOB_POST_MAX_DAYS} ngày, sau đó tin tự hết hạn.`}>
              <input type="number" name="days" inputMode="numeric" required min={1} max={JOB_POST_MAX_DAYS} step={1} defaultValue={JOB_POST_MAX_DAYS} className={inputCls} />
            </Field>
          </div>
        </div>

        <Check name="commit" required>
          Tôi cam kết: không thu phí, không đặt cọc, không giữ giấy tờ của người làm.
        </Check>

        <div className="sm:max-w-xs">
          <SubmitButton>Đăng tin</SubmitButton>
        </div>
      </ActionForm>

      <Link href="/employer/jobs" className="inline-flex min-h-[3rem] items-center font-semibold text-brand underline underline-offset-4">
        Xem tin tuyển dụng của quán
      </Link>
    </div>
  );
}
