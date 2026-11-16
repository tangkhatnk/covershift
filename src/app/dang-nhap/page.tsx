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
    <div className="space-y-4">
      <PageTitle sub="Dùng tài khoản Google, hoặc nhận link đăng nhập qua email. Không cần mật khẩu.">Đăng nhập</PageTitle>
      {sp.loi ? <Alert tone="red">Đăng nhập chưa thành công (link hết hạn hoặc đã dùng). Vui lòng thử lại.</Alert> : null}
      <LoginForm />
    </div>
  );
}
