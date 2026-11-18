import { ActionForm, SubmitButton } from '@/components/client';
import { demoLogin } from '@/app/actions';
import { Card, type BtnVariant } from '@/components/ui';

const ROLES: { who: string; title: string; label: string; hint: string; variant: BtnVariant }[] = [
  { who: 'worker', title: 'Người làm', label: 'Vào bằng người làm demo', hint: 'Tìm và nhận ca, xem hồ sơ ca làm.', variant: 'primary' },
  { who: 'employer', title: 'Chủ quán', label: 'Vào bằng chủ quán demo', hint: 'Đăng ca, xác nhận sau ca.', variant: 'secondary' },
  { who: 'admin', title: 'Nhóm vận hành', label: 'Vào bằng nhóm vận hành demo', hint: 'Duyệt người làm, xác minh quán, điều phối.', variant: 'secondary' },
];

export function LoginForm() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {ROLES.map((r) => (
        <Card key={r.who} className="flex flex-col lg:p-8">
          <h2 className="text-xl font-bold text-ink lg:text-2xl">{r.title}</h2>
          <p className="mt-2 flex-1 text-base text-ink-soft lg:text-lg">{r.hint}</p>
          {/* Nhãn nút dài nhất xuống 2 dòng: cả ba nút cùng chiều cao để hàng nút thẳng. */}
          <ActionForm action={demoLogin} className="mt-4 space-y-4 [&_button]:min-h-[5rem] [&_button]:text-balance [&_button]:text-center">
            <input type="hidden" name="who" value={r.who} />
            <SubmitButton variant={r.variant}>{r.label}</SubmitButton>
          </ActionForm>
        </Card>
      ))}
    </div>
  );
}
