'use client';

import { useState } from 'react';
import { btn, inputCls } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
