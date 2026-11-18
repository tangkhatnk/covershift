import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { deleteAccount } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Badge, Card, Check, PageTitle, btn } from '@/components/ui';
import { getContext, homeFor } from '@/lib/auth';
import { FACILITY_STATUS_LABEL } from '@/lib/constants';
import type { Role } from '@/lib/types';

export const metadata = { title: 'Tài khoản' };

const ROLE_LABEL: Record<Role, string> = { worker: 'Người làm', employer: 'Chủ quán / cơ sở', admin: 'Nhóm vận hành' };
type FacilityRow = { name: string; address: string; verified: boolean; status: keyof typeof FACILITY_STATUS_LABEL };

// Không dùng requireRole: tài khoản bị khóa hoặc chưa đăng ký vẫn phải vào được để đăng xuất / xóa.
export default async function AccountPage() {
  const { supabase, user, profile } = await getContext();
  if (!user) redirect('/dang-nhap');

  let facility: FacilityRow | null = null;
  if (profile?.role === 'employer') {
    const { data } = await supabase.from('facilities').select('name, address, verified, status').eq('owner_id', user.id).maybeSingle();
    facility = data as FacilityRow | null;
  }

  return (
    <div className="space-y-4">
      <PageTitle>Tài khoản</PageTitle>

      {profile?.status === 'locked' ? (
        <Alert tone="red"><b>Tài khoản đang bị khóa.</b> Vui lòng liên hệ nhóm vận hành.</Alert>
      ) : null}

      <Card>
        <dl className="space-y-4 text-lg">
          {profile ? (
            <div><dt className="text-base text-ink-soft">Họ tên</dt><dd className="font-semibold">{profile.full_name}</dd></div>
          ) : null}
          <div><dt className="text-base text-ink-soft">Email đăng nhập</dt><dd className="font-semibold [overflow-wrap:anywhere]">
            {/* Cho ngắt dòng ở trước "@" và "." để không lẻ một chữ cái mồ côi. */}
            {user.email ? user.email.split(/(?=[@.])/).map((part, i) => <span key={i}>{i > 0 ? <wbr /> : null}{part}</span>) : '(không có)'}
          </dd></div>
          {profile ? (
            <div><dt className="text-base text-ink-soft">Vai trò</dt><dd className="font-semibold">{ROLE_LABEL[profile.role]}</dd></div>
          ) : null}
        </dl>
        {profile && profile.status === 'active' ? (
          <p className="mt-2 text-base">
            <Link href={profile.role === 'worker' ? '/ho-so' : homeFor(profile.role)} className="inline-flex min-h-[3rem] items-center font-semibold text-shutter underline underline-offset-4">
              {profile.role === 'worker' ? 'Xem và sửa hồ sơ' : 'Về trang chính'}
            </Link>
          </p>
        ) : null}
      </Card>

      {!profile ? (
        <Card>
          <p className="mb-4 text-base text-ink">Bạn đã đăng nhập nhưng chưa đăng ký xong.</p>
          <Link href="/dang-ky" className={btn('primary')}>Đăng ký tiếp</Link>
        </Card>
      ) : null}

      {facility ? (
        <Card>
          <h2 className="text-xl font-bold text-ink">Cơ sở của tôi</h2>
          <p className="mt-2 text-lg font-semibold">{facility.name}</p>
          <p className="text-base text-ink">{facility.address}</p>
          <p className="mt-2 flex flex-wrap gap-2">
            <Badge tone={facility.status === 'active' ? 'green' : facility.status === 'removed' ? 'red' : 'amber'}>
              {FACILITY_STATUS_LABEL[facility.status]}
            </Badge>
            <Badge tone={facility.verified ? 'green' : 'gray'}>{facility.verified ? 'Đã xác minh' : 'Chưa xác minh'}</Badge>
          </p>
          {!facility.verified && facility.status === 'pending' ? (
            <p className="mt-2 text-base text-ink">Nhóm vận hành sẽ đến tận nơi xác minh. Xác minh xong anh/chị mới đăng ca được.</p>
          ) : null}
          {facility.status === 'removed' ? (
            <p className="mt-2 text-base text-roof">Cơ sở đã bị gỡ nên không đăng ca được. Vui lòng liên hệ nhóm vận hành.</p>
          ) : null}
        </Card>
      ) : null}

      <form action="/auth/dang-xuat" method="post">
        <button className={btn('secondary')}>
          <LogOut className="h-5 w-5" aria-hidden="true" />
          Đăng xuất
        </button>
      </form>

      {profile && profile.role !== 'admin' ? (
        <Card className="!border-roof">
          <h2 className="text-xl font-bold text-roof">Xóa tài khoản</h2>
          <ul className="mt-2 list-disc space-y-2 pl-6 text-base text-ink">
            <li>Xóa <b>vĩnh viễn</b> toàn bộ dữ liệu của bạn: hồ sơ, số điện thoại, lịch sử ca, đánh giá.</li>
            <li>Các ca sắp tới của bạn sẽ bị hủy.</li>
            <li>Không khôi phục lại được.</li>
          </ul>
          <ActionForm action={deleteAccount} className="mt-4 space-y-4">
            <Check name="confirm" required>Tôi hiểu và muốn xóa vĩnh viễn tài khoản của mình.</Check>
            <SubmitButton variant="danger" confirm="Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu? Không khôi phục lại được.">
              Xóa tài khoản
            </SubmitButton>
          </ActionForm>
        </Card>
      ) : null}
    </div>
  );
}
