'use client';

import { useEffect, useState } from 'react';
import { btn, inputCls } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

// Trình duyệt nhúng trong app (Zalo, Facebook, Messenger, Instagram, TikTok): Google chặn đăng nhập
// ("disallowed_useragent") và link email mở ở trình duyệt khác nên mất phiên PKCE.
const IN_APP_BROWSER = /Zalo|FBAN|FBAV|FB_IAB|Instagram|musical_ly|TikTok/i;

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inApp, setInApp] = useState(false);
  useEffect(() => setInApp(IN_APP_BROWSER.test(navigator.userAgent)), []);

  const redirectTo = () => `${window.location.origin}/auth/callback`;

  async function google() {
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
    if (error) {
      setError('Không mở được đăng nhập Google. Vui lòng thử lại.');
      setBusy(false);
    }
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo() } });
    setBusy(false);
    if (error) {
      setError(error.status === 429
        ? 'Hệ thống gửi email đang quá tải. Hãy đợi vài phút hoặc đăng nhập bằng Google.'
        : 'Không gửi được email. Kiểm tra lại địa chỉ hoặc đăng nhập bằng Google.');
    } else setSent(true);
  }

  if (sent) {
    return (
      <p role="status" className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4 text-lg text-emerald-900">
        Đã gửi link đăng nhập tới <b>{email}</b>. Mở hộp thư (xem cả mục Spam) và bấm vào link trên chính điện thoại này.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {inApp ? (
        <p role="alert" className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-base text-amber-900">
          Bạn đang mở trang trong Zalo/Facebook nên đăng nhập sẽ không thành công. Hãy bấm nút <b>⋯</b> ở góc màn hình,
          chọn <b>Mở bằng trình duyệt</b> (Chrome hoặc Safari), rồi đăng nhập ở đó.
        </p>
      ) : null}
      {error ? <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-base text-red-900">{error}</p> : null}
      <button type="button" onClick={google} disabled={busy} className={btn('primary')}>
        Đăng nhập bằng Google
      </button>
      <div className="flex items-center gap-3 text-base text-slate-500">
        <span className="h-px flex-1 bg-slate-300" /> hoặc <span className="h-px flex-1 bg-slate-300" />
      </div>
      <form onSubmit={magicLink} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-base font-semibold">Email của bạn</span>
          <input type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="ten@gmail.com" className={inputCls} />
        </label>
        <button type="submit" disabled={busy} className={btn('secondary')}>
          Gửi link đăng nhập qua email
        </button>
      </form>
    </div>
  );
}
