import { ActionForm, SubmitButton } from '@/components/client';
import { demoLogin } from '@/app/actions';
import { Card } from '@/components/ui';

// Ba vai trò ngang hàng: cùng một kiểu nút chính, không vai nào nổi hơn.
const ROLES: { who: string; title: string; label: string; hint: string }[] = [
  { who: 'worker', title: 'Người làm', label: 'Vào như người làm', hint: 'Tìm và nhận ca, xem hồ sơ ca làm.' },
  { who: 'employer', title: 'Chủ quán', label: 'Vào như chủ quán', hint: 'Đăng ca, xác nhận sau ca.' },
  { who: 'admin', title: 'Nhóm vận hành', label: 'Vào như nhóm vận hành', hint: 'Duyệt người làm, xác minh quán, điều phối.' },
];

export function LoginForm() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {ROLES.map((r) => (
        <Card key={r.who} className="flex flex-col lg:p-8">
          <h2 className="text-xl font-bold text-ink lg:text-2xl">{r.title}</h2>
          <p className="mt-2 flex-1 text-base text-ink-soft lg:text-lg">{r.hint}</p>
          <ActionForm action={demoLogin} className="mt-4 space-y-4 [&_button]:px-4">
            <input type="hidden" name="who" value={r.who} />
            <SubmitButton>{r.label}</SubmitButton>
          </ActionForm>
        </Card>
      ))}
    </div>
  );
}
