import Link from 'next/link';
import { markNotificationsRead } from '@/app/actions';
import { ActionForm, SubmitButton } from '@/components/client';
import { Alert, Badge, Empty, PageTitle } from '@/components/ui';
import { requireRole } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { fmtDateTime, notificationText } from '@/lib/format';
import type { AppNotification, MyNotifications, Role } from '@/lib/types';

export const metadata = { title: 'Thông báo' };

// Chỉ link tới trang đã có: ca (theo vai trò) và hồ sơ. Tin tuyển dụng chưa có trang riêng nên không link.
function target(n: AppNotification, role: Role): { href: string; label: string } | null {
  if (n.payload.shift_id) {
    return role === 'worker'
      ? { href: `/shifts/${n.payload.shift_id}`, label: 'Xem ca' }
      : { href: `/employer/shifts/${n.payload.shift_id}`, label: 'Xem ca' };
  }
  if (role === 'worker' && (n.kind === 'profile_reviewed' || n.kind === 'parental_consent_submitted')) {
    return { href: '/profile', label: 'Xem hồ sơ' };
  }
  return null;
}

export default async function NotificationsPage() {
  const { supabase, profile } = await requireRole();
  const { data, error } = await supabase.rpc('my_notifications');
  if (error) {
    return (
      <div className="space-y-4">
        <PageTitle>Thông báo</PageTitle>
        <Alert tone="red">{friendlyError(error)}</Alert>
      </div>
    );
  }
  const { unread, items } = data as MyNotifications;

  return (
    <div className="space-y-4">
      <PageTitle sub={unread > 0 ? `${unread} thông báo chưa đọc.` : items.length ? 'Bạn đã đọc hết thông báo.' : undefined}>Thông báo</PageTitle>

      {unread > 0 ? (
        <div className="sm:max-w-xs">
          <ActionForm action={markNotificationsRead}>
            <SubmitButton variant="secondary">Đánh dấu đã đọc</SubmitButton>
          </ActionForm>
        </div>
      ) : null}

      {items.length === 0 ? (
        <Empty>Bạn chưa có thông báo nào.</Empty>
      ) : (
        <ul className="space-y-4">
          {items.map((n) => {
            const { title, body } = notificationText(n);
            const go = target(n, profile.role);
            const isNew = n.read_at == null;
            return (
              <li key={n.id} className={`rounded-ui border p-4 ${isNew ? 'border-accent bg-accent-tint' : 'border-rule bg-white'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {isNew ? <Badge tone="amber">Mới</Badge> : null}
                  <h2 className="text-lg font-bold text-ink">{title}</h2>
                </div>
                <p className="mt-2 break-words text-base text-ink">{body}</p>
                <p className="mt-2 text-base text-ink-soft">{fmtDateTime(n.created_at)}</p>
                {go ? (
                  <Link href={go.href} className="inline-flex min-h-[3rem] items-center font-semibold text-brand underline underline-offset-4">
                    {go.label}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
