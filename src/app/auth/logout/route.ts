import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Đăng xuất bằng POST (form) để link preload/crawler không vô tình đăng xuất người dùng.
// scope local: tài khoản demo dùng chung, không được thu hồi phiên của người khác.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
