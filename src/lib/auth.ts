import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from './supabase/server';
import type { Profile, Role } from './types';

export const homeFor = (role: Role) => (role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/shifts');

/** Người dùng hiện tại + hồ sơ (null nếu chưa đăng nhập / chưa đăng ký). Gọi nhiều lần trong một request chỉ tốn một lần truy vấn. */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null as Profile | null };
  const { data } = await supabase.from('profiles').select('id, role, full_name, status').eq('id', user.id).maybeSingle();
  return { supabase, user, profile: (data as Profile | null) ?? null };
});

/**
 * Chặn trang theo vai trò (chỉ để điều hướng cho gọn — quyền thật do RLS/RPC ở database quyết định).
 * Chưa đăng nhập → /login; chưa đăng ký → /register; bị khóa → /account; sai vai trò → trang chủ của vai trò đó.
 */
export async function requireRole(...roles: Role[]) {
  const ctx = await getContext();
  if (!ctx.user) redirect('/login');
  if (!ctx.profile) redirect('/register');
  if (ctx.profile.status === 'locked') redirect('/account');
  if (roles.length && !roles.includes(ctx.profile.role)) redirect(homeFor(ctx.profile.role));
  return { supabase: ctx.supabase, user: ctx.user, profile: ctx.profile };
}
