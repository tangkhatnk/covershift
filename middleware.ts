import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Bỏ qua file tĩnh và các trang token công khai (không cần phiên đăng nhập).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|confirm|consent|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
