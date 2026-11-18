'use client';

import Link from 'next/link';
import { PageTitle, btn } from '@/components/ui';

// Không hiện nội dung hay mã lỗi cho người dùng; chi tiết nằm ở log phía máy chủ.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="space-y-6">
      <PageTitle sub="Lỗi do hệ thống, không phải do bạn.">Chưa tải được trang này</PageTitle>
      <p className="text-base text-ink">Bạn bấm Thử lại. Nếu vẫn không được, hãy quay về trang chủ và thử lại sau ít phút.</p>
      <div className="max-w-xs space-y-4">
        <button type="button" onClick={() => reset()} className={btn('primary')}>Thử lại</button>
        <Link href="/" className={btn('secondary')}>Về trang chủ</Link>
      </div>
    </div>
  );
}
