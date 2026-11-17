import { ActionForm, SubmitButton } from '@/components/client';
import { demoLogin } from '@/app/actions';
import type { BtnVariant } from '@/components/ui';

const ROLES: { who: string; label: string; hint: string; variant: BtnVariant }[] = [
  { who: 'worker', label: 'Vào bằng người làm demo', hint: 'Tìm và nhận ca, xem hồ sơ ca làm.', variant: 'primary' },
  { who: 'employer', label: 'Vào bằng chủ quán demo', hint: 'Đăng ca, xác nhận sau ca.', variant: 'secondary' },
  { who: 'admin', label: 'Vào bằng nhóm vận hành demo', hint: 'Duyệt người làm, xác minh quán, điều phối.', variant: 'secondary' },
];

export function LoginForm() {
  return (
    <div className="space-y-6">
      {ROLES.map((r) => (
        <ActionForm key={r.who} action={demoLogin} className="space-y-2">
          <input type="hidden" name="who" value={r.who} />
          <SubmitButton variant={r.variant}>{r.label}</SubmitButton>
          <p className="text-sm text-slate-600">{r.hint}</p>
        </ActionForm>
      ))}
    </div>
  );
}
