import Link from 'next/link';
import type { ReactNode } from 'react';
import { PageTitle, btn } from '@/components/ui';

// Khung chung của hai trang công khai (/f và /s). AppShell không bọc nội dung các trang này (SELF_LAID_OUT trong client.tsx)
// nên dải đầu tràn mép nối liền thanh trên `brand-deep`. Trang mở trong trình duyệt nhúng của Zalo: không chuyển động, không ảnh.

/** Dải đầu mỏng: tên quán / loại việc lớn, chữ trắng trên `brand-deep`. */
export function PublicBand({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="surface-dark bg-brand-deep text-white">
      <div className="mx-auto max-w-3xl px-4 pb-6 lg:px-8">
        <h1 className="break-words text-3xl font-bold leading-tight text-white">{title}</h1>
        <div className="mt-2 h-1 w-12 rounded-sm bg-accent" aria-hidden="true" />
        {sub ? <p className="mt-2 break-words text-lg text-brand-tint">{sub}</p> : null}
        {children}
      </div>
    </div>
  );
}

/** Thân trang: cột `max-w-3xl` căn giữa, đúng lề của các trang còn lại. */
export function PublicBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 lg:px-8">{children}</div>;
}

/** "Không tìm thấy" cho /f và /s (notFound() ném trong hai nhánh này): giống app/not-found.tsx nhưng nằm trong `PublicBody`. */
export function PublicNotFound() {
  return (
    <PublicBody>
      <PageTitle sub="Trang này không có hoặc link đã cũ.">Không tìm thấy trang</PageTitle>
      <p className="text-base text-ink">Bạn kiểm tra lại link rồi mở lại.</p>
      <div className="sm:max-w-xs">
        <Link href="/" className={btn('primary')}>Về trang chủ</Link>
      </div>
    </PublicBody>
  );
}
