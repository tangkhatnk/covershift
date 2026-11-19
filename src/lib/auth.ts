import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from './supabase/server';
import type { Profile, Role } from './types';

export const homeFor = (role: Role) => (role === 'admin' ? '/admin' : role === 'employer' ? '/employer' : '/shifts');

/**
 * Người dùng hiện tại + hồ sơ (null nếu chưa đăng nhập / chưa đăng ký). `cache()` làm layout và trang dùng chung
 * đúng một lượt xác thực và một lượt đọc `profiles` mỗi request.
 * Danh tính lấy từ `getClaims()`: project dùng khóa ký bất đối xứng (ES256), nên chữ ký JWT được kiểm cục bộ bằng
 * JWKS đã cache trong bộ nhớ, không gọi mạng tới Auth như `getUser()`. Đây chỉ để dựng giao diện và điều hướng;
 * quyền thật vẫn ở RLS/RPC (`auth.uid()`), và `_require_user()` vẫn từ chối tài khoản bị khóa ở mọi RPC.
 */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return { supabase, user: null, profile: null as Profile | null };
  const user = { id: claims.sub, email: claims.email };
  const { data: row } = await supabase.from('profiles').select('id, role, full_name, status').eq('id', user.id).maybeSingle();
  return { supabase, user, profile: (row as Profile | null) ?? null };
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
