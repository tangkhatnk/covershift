import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Làm mới phiên đăng nhập (cookie) ở mỗi request. Phân quyền thật nằm ở RLS + RPC, không nằm ở đây.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  // getClaims() kiểm chữ ký JWT cục bộ (khóa ES256 trong JWKS đã cache) và vẫn làm mới token hết hạn qua refresh token,
  // nên không tốn một vòng gọi mạng tới Auth ở mỗi request như getUser().
  await supabase.auth.getClaims();
  return response;
}
