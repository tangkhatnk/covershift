import { redirect } from 'next/navigation';
import { Alert, PageTitle } from '@/components/ui';
import { getContext } from '@/lib/auth';
import { LoginForm } from './login-form';

export const metadata = { title: 'Đăng nhập' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ loi?: string }> }) {
  const { user } = await getContext();
  if (user) redirect('/');
  const sp = await searchParams;
  return (
    <div className="space-y-6">
      <PageTitle sub="Đây là bản mô phỏng, chỉ có dữ liệu mẫu. Chọn một vai trò để vào xem.">Đăng nhập</PageTitle>
      {sp.loi ? <Alert tone="red">Link đăng nhập cũ không còn dùng được. Bản mô phỏng chỉ đăng nhập bằng ba nút bên dưới.</Alert> : null}
      <LoginForm />
    </div>
  );
}
