import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Điểm quay về sau Google OAuth và magic link.
// Hỗ trợ cả hai kiểu: ?code=... (PKCE, mặc định) và ?token_hash=...&type=... (nếu sửa email template).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const supabase = await createClient();

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }
  // Trang chủ tự điều hướng theo vai trò (hoặc sang /dang-ky nếu là lần đầu).
  return NextResponse.redirect(ok ? `${origin}/` : `${origin}/dang-nhap?loi=1`);
}
