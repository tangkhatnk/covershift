import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Card, Check, Disclosure, Field, PageTitle, btn, inputCls } from '@/components/ui';
import { createShift } from '@/app/actions';
import { requireRole } from '@/lib/auth';
import { JOB_LABEL, type JobType } from '@/lib/constants';
import { fmtDate, fmtMoney, fmtTime, vnDateInput } from '@/lib/format';
import type { Shift, ShiftDetail } from '@/lib/types';

export const metadata = { title: 'Đăng ca mới' };

const DEFAULT_MIN_WAGE = 25500;

export default async function NewShiftPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { supabase, profile } = await requireRole('employer');
  const { from } = await searchParams;

  const { data: facility } = await supabase
    .from('facilities').select('id, verified, status').eq('owner_id', profile.id).maybeSingle();
  const canPost = !!facility && facility.verified === true && facility.status === 'active';

  if (!canPost) {
    return (
      <div className="space-y-4">
        <PageTitle>Đăng ca mới</PageTitle>
        <Alert tone={facility?.status === 'removed' ? 'red' : 'amber'}>
          {facility?.status === 'removed'
            ? 'Cơ sở của anh/chị đã bị gỡ khỏi SafeShift nên không đăng ca được.'
            : 'Cơ sở đang chờ nhóm vận hành đến xác minh. Sau khi xác minh anh/chị mới đăng ca được.'}
        </Alert>
        <Link href="/employer" className={`${btn('secondary')} sm:w-auto`}>Về trang ca của quán</Link>
      </div>
    );
  }

  const [{ data: cfg }, cloneRes, recentRes] = await Promise.all([
    supabase.from('app_config').select('key, value'),
    from ? supabase.rpc('shift_detail', { p_shift: from }) : Promise.resolve({ data: null }),
    from ? Promise.resolve({ data: null }) : supabase.rpc('employer_shifts'),
  ]);

  const rawMin = Number((cfg as { key: string; value: unknown }[] | null)?.find((r) => r.key === 'min_hourly_wage')?.value);
  const minWage = Number.isFinite(rawMin) && rawMin > 0 ? rawMin : DEFAULT_MIN_WAGE;

  const detail = cloneRes.data as ShiftDetail | null;
  const src = detail && detail.is_owner ? detail : null;
  const recent = ((recentRes.data as Shift[] | null) ?? []).slice(0, 5);

  const today = vnDateInput();
  const tomorrow = vnDateInput(new Date(Date.now() + 24 * 3_600_000));

  return (
    <div className="space-y-6">
      <PageTitle sub="Điền xong bấm Đăng ca. Chỉ mất khoảng 1 phút.">Đăng ca mới</PageTitle>

      {src ? (
        <Alert tone="blue">
          Đang nhân bản ca cũ, anh/chị chỉ cần chọn ngày.{' '}
          <Link href="/employer/new-shift" className="font-semibold underline underline-offset-4">Đăng ca trống</Link>
        </Alert>
      ) : from ? (
        <Alert tone="amber">Không tìm thấy ca cũ để nhân bản. Anh/chị điền ca mới bên dưới.</Alert>
      ) : null}

      <ActionForm action={createShift}>
        {/* Điện thoại: một cột (giờ bắt đầu / kết thúc đứng cạnh nhau). Từ 640px: ba ô mỗi hàng. */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
          <div className="col-span-2">
            <Field label="Ngày làm">
              <input type="date" name="date" required min={today} defaultValue={tomorrow} className={inputCls} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Giờ bắt đầu">
              <input type="time" name="start" required defaultValue={src ? fmtTime(src.starts_at) : ''} className={inputCls} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Giờ kết thúc">
              <input type="time" name="end" required defaultValue={src ? fmtTime(src.ends_at) : ''} className={inputCls} />
            </Field>
          </div>

          <div className="col-span-2">
            <Field label="Loại việc" hint="Chỉ có 7 loại việc này.">
              <select name="job_type" required defaultValue={src?.job_type ?? ''} className={inputCls}>
                <option value="" disabled>-- Chọn loại việc --</option>
                {(Object.keys(JOB_LABEL) as JobType[]).map((k) => (
                  <option key={k} value={k}>{JOB_LABEL[k]}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Số người cần" hint="Mỗi ca có thêm 1 người dự phòng.">
              <select name="headcount" required defaultValue={String(src?.headcount ?? 1)} className={inputCls}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} người</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Lương mỗi giờ (đồng)" hint={`Thấp nhất ${fmtMoney(minWage)}/giờ. Ví dụ: 30000`}>
              <input type="number" name="wage" inputMode="numeric" required min={minWage} step={1}
                defaultValue={src ? String(src.hourly_wage) : ''} placeholder={String(minWage)} className={inputCls} />
            </Field>
          </div>

          <div className="col-span-full">
            <Field label="Mô tả công việc (không bắt buộc)" hint="Ví dụ: bưng bê, dọn bàn; mặc áo tối màu.">
              <textarea name="description" rows={3} maxLength={500} defaultValue={src?.description ?? ''} className={inputCls} />
            </Field>
          </div>
        </div>

        <div className="space-y-4">
          <Check name="urgent" defaultChecked={src?.urgent}>
            <b>Ca gấp</b> — cần người ngay, ca sẽ được đánh dấu GẤP.
          </Check>
          <Check name="allow_minor" defaultChecked={src?.allow_minor}>
            <b>Nhận người dưới 18 tuổi</b>
            <span className="block text-base text-ink-soft">Chỉ áp dụng cho ca trong 06:00–22:00, dài tối đa 8 giờ.</span>
          </Check>
          <Check name="commit" required>
            Tôi cam kết: không thu phí, không đặt cọc, không giữ giấy tờ của người làm.
          </Check>
        </div>

        <div className="sm:max-w-xs">
          <SubmitButton>Đăng ca</SubmitButton>
        </div>
      </ActionForm>

      {!from && recent.length ? (
        <Card>
          <Disclosure summary={<span>Nhân bản ca cũ ({recent.length})</span>}>
            <p className="mt-2 text-base text-ink-soft">Bấm vào một ca để dùng lại, chỉ cần chọn ngày mới.</p>
            <ul className="mt-2 divide-y divide-rule">
              {recent.map((s) => (
                <li key={s.id}>
                  <Link href={`/employer/new-shift?from=${s.id}`} className="flex min-h-[3rem] items-center justify-between gap-4 py-2 text-base">
                    <span>
                      <b>{JOB_LABEL[s.job_type]}</b> · {fmtTime(s.starts_at)}–{fmtTime(s.ends_at)} · {fmtMoney(s.hourly_wage)}/giờ
                      <span className="block text-sm text-ink-soft">Ca ngày {fmtDate(s.starts_at)}</span>
                    </span>
                    <span className="shrink-0 font-semibold text-shutter underline underline-offset-4">Dùng lại</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Disclosure>
        </Card>
      ) : null}
    </div>
  );
}
