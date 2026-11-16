import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { requireRole } from '@/lib/auth';

export const metadata: Metadata = { title: 'Vận hành', robots: { index: false, follow: false } };

// Chặn sớm cả nhánh /admin. Quyền thật vẫn do RPC admin_* trong database kiểm tra.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole('admin');
  return <>{children}</>;
}
