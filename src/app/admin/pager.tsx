import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Đọc số trang từ ?trang= (mặc định 1), kẹp vào [1, tổng số trang]. */
export function pageOf(raw: string | string[] | undefined, total: number, size: number) {
  const pages = Math.max(1, Math.ceil(total / size));
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return { page: Number.isInteger(n) ? Math.min(Math.max(n, 1), pages) : 1, pages };
}

/**
 * Phân trang phía server: link thuần (không JS). `params` là các tham số cần giữ (bộ lọc, tìm kiếm); giá trị rỗng bị bỏ.
 * shortcut: danh sách vẫn lấy một lần từ RPC rồi cắt trang ở server; khi dữ liệu lên hàng nghìn dòng thì cần RPC có phân trang.
 */
export function Pager({ base, params = {}, page, pages }: { base: string; params?: Record<string, string>; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (n: number) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
    if (n > 1) q.set('trang', String(n));
    return q.size ? `${base}?${q}` : base;
  };
  const cls = 'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-ui border-2 border-brand px-4 text-lg font-semibold text-brand hover:bg-brand-tint';
  const off = 'inline-flex min-h-[3rem] items-center justify-center gap-2 rounded-ui border-2 border-rule px-4 text-lg font-semibold text-ink-soft opacity-50';
  return (
    <nav aria-label="Phân trang" className="flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={cls}><ChevronLeft className="h-5 w-5" aria-hidden="true" />Trước</Link>
      ) : <span className={off} aria-disabled="true"><ChevronLeft className="h-5 w-5" aria-hidden="true" />Trước</span>}
      <p className="text-base text-ink">Trang <b>{page}</b>/{pages}</p>
      {page < pages ? (
        <Link href={href(page + 1)} rel="next" className={cls}>Sau<ChevronRight className="h-5 w-5" aria-hidden="true" /></Link>
      ) : <span className={off} aria-disabled="true">Sau<ChevronRight className="h-5 w-5" aria-hidden="true" /></span>}
    </nav>
  );
}
