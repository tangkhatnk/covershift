'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useActionState, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import {
  Bell, Briefcase, Building2, CalendarCheck, ChartColumn, Check, CircleUser, CirclePlus, Copy, Ellipsis, Flag, LayoutDashboard,
  LoaderCircle, LogOut, Printer, ScrollText, Search, Settings, Share2, Star, Store, UserPlus, UserRound, Users, type LucideIcon,
} from 'lucide-react';
import { SITE_URL } from '@/lib/constants';
import type { ActionState, Role } from '@/lib/types';
import { Alert, btn, type BtnVariant, type Tone } from './ui';

/** Cuộn mượt, trừ khi người dùng chọn giảm chuyển động. */
const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const SKIP_TYPES = new Set(['hidden', 'file', 'submit', 'button', 'reset', 'image']);

/**
 * React 19 tự xóa các ô của form sau mỗi lần form action chạy xong — kể cả khi action trả lỗi,
 * và kể cả ô radio "kiểm soát" (DOM bị bỏ chọn trong khi giao diện vẫn hiện đã chọn).
 * Điền lại đúng những gì người dùng đã gửi để họ chỉ cần sửa ô sai.
 */
function restoreFields(form: HTMLFormElement, data: FormData) {
  const seen = new Map<string, number>();
  for (const el of Array.from(form.elements)) {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) continue;
    if (!el.name || el.disabled) continue;
    const values = data.getAll(el.name).filter((v): v is string => typeof v === 'string');
    if (el instanceof HTMLInputElement) {
      if (SKIP_TYPES.has(el.type)) continue;
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = values.includes(el.value);
        continue;
      }
    }
    if (el instanceof HTMLSelectElement && el.multiple) {
      for (const o of Array.from(el.options)) o.selected = values.includes(o.value);
      continue;
    }
    const i = seen.get(el.name) ?? 0;
    seen.set(el.name, i + 1);
    if (i < values.length) el.value = values[i];
  }
}

/**
 * Form gọi server action và tự hiện lỗi / thông báo thành công ngay trên form.
 * Gửi lỗi thì giữ nguyên dữ liệu đã nhập; thông báo được cuộn vào tầm nhìn.
 * `resetOnOk`: xóa trắng form sau khi thành công.
 */
export function ActionForm({ action, children, className = 'space-y-4', resetOnOk = false }: {
  action: Action; children: ReactNode; className?: string; resetOnOk?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const msgRef = useRef<HTMLDivElement>(null);
  const submitted = useRef<FormData | null>(null);
  // useLayoutEffect: điền lại ngay sau khi React reset form (cùng commit), trước khi vẽ — không nháy ô trống.
  useLayoutEffect(() => {
    if (!state) return;
    if (state.error && ref.current && submitted.current) restoreFields(ref.current, submitted.current);
    if (state.ok && resetOnOk) ref.current?.reset();
    // Thông báo nằm ở đầu form còn nút gửi ở cuối: cuộn tới để người dùng thấy ngay. 'center' + scroll-padding của
    // <html> + scroll-my-4 (xem globals.css) giữ thông báo nằm trọn giữa thanh trên dính và thanh điều hướng dưới.
    msgRef.current?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
  }, [state, resetOnOk]);
  const msg = state?.error ?? state?.ok;
  return (
    <form
      ref={ref}
      action={formAction}
      onSubmit={(e) => {
        submitted.current = new FormData(e.currentTarget);
      }}
      className={className}
    >
      {msg ? (
        <Alert ref={msgRef} tone={state?.error ? 'red' : 'green'} role={state?.error ? 'alert' : 'status'} className="scroll-my-4 font-medium">
          {msg}
        </Alert>
      ) : null}
      {children}
    </form>
  );
}

/**
 * Thông báo một lần sau khi chuyển trang (vd. /admin?bao-ban=…): cuộn tới để chắc người dùng thấy, rồi xóa tham số
 * `param` khỏi URL (không tải lại trang) để bấm F5 / Back không hiện lại thông báo cũ.
 */
export function Flash({ param, tone = 'green', children }: { param: string; tone?: Tone; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
    const url = new URL(window.location.href);
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }, [param]);
  return <div ref={ref} className="scroll-my-4"><Alert tone={tone}>{children}</Alert></div>;
}

/**
 * Nút gửi form: tự khóa khi đang gửi (chống bấm hai lần). `confirm` = câu hỏi xác nhận trước khi gửi.
 * Không dùng `confirm` ở trang mở từ Zalo/Facebook (/confirm, /consent): trình duyệt nhúng có thể bỏ qua hộp thoại
 * và trả "không" ngay, nút sẽ như bị liệt.
 */
export function SubmitButton({ children, variant = 'primary', confirm, full = true, name, value }: {
  children: ReactNode; variant?: BtnVariant; confirm?: string; full?: boolean; name?: string; value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={btn(variant, full)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? (
        <>
          <LoaderCircle className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />
          Đang gửi…
        </>
      ) : children}
    </button>
  );
}

/** Sao chép văn bản vào clipboard (dán vào Zalo). */
export function CopyButton({ text, children = 'Sao chép', variant = 'secondary', full = true }: {
  text: string; children?: ReactNode; variant?: BtnVariant; full?: boolean;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={btn(variant, full)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Trình duyệt cũ / không có quyền clipboard: dùng textarea tạm.
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
    >
      {done ? (
        <>
          <Check className="h-5 w-5" aria-hidden="true" />
          Đã sao chép
        </>
      ) : (
        <>
          <Copy className="h-5 w-5" aria-hidden="true" />
          {children}
        </>
      )}
    </button>
  );
}

export function PrintButton({ children = 'In / Lưu PDF' }: { children?: ReactNode }) {
  return (
    <button type="button" className={`${btn('secondary')} print:hidden`} onClick={() => window.print()}>
      <Printer className="h-5 w-5" aria-hidden="true" />
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------------------------
// Khung trang: thanh trên, rail trái (desktop), thanh điều hướng dưới (điện thoại), chân trang.
// Là Client Component chỉ để biết đường dẫn hiện tại (mục đang chọn, trang token không có nav).
// Nhãn "Thêm" của nhóm vận hành dùng <details>: chạy được bằng bàn phím và trong trình duyệt nhúng của Zalo.
// ---------------------------------------------------------------------------------------------

/**
 * Logo "Biển & Nắng": mặt trời nhô trên hai làn sóng, trong ô vuông bo góc. Chỉ dùng trên khung xanh đậm (`surface-dark`),
 * nên ô nền là trắng; favicon (src/app/icon.svg) là bản nền xanh đậm của cùng hình. Chữ dùng font của app, không vẽ path.
 */
function Mark() {
  return (
    <>
      <svg viewBox="0 0 64 64" className="h-8 w-8 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx="14" className="fill-white" />
        <path d="M19 35a13 13 0 0 1 26 0z" className="fill-accent" />
        <path d="M9 43q5.75-6 11.5 0t11.5 0t11.5 0t11.5 0" transform="translate(1.5 0)" className="stroke-brand" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M9 54q5.75-6 11.5 0t11.5 0t11.5 0t11.5 0" transform="translate(1.5 0)" className="stroke-brand opacity-50" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span>Safe<span className="text-accent">Shift</span></span>
    </>
  );
}

/** `also`: đường dẫn khác cũng thuộc mục này (vd. /my-applications nằm trong "Việc làm"). */
type NavItem = { href: string; label: string; icon: LucideIcon; also?: string[] };

const NAV: Record<Role, NavItem[]> = {
  worker: [
    { href: '/shifts', label: 'Tìm ca', icon: Search },
    { href: '/my-shifts', label: 'Ca của tôi', icon: CalendarCheck },
    { href: '/jobs', label: 'Việc làm', icon: Briefcase, also: ['/my-applications'] },
    { href: '/profile', label: 'Hồ sơ', icon: UserRound },
  ],
  employer: [
    { href: '/employer', label: 'Ca của quán', icon: Store },
    { href: '/employer/new-shift', label: 'Đăng ca', icon: CirclePlus },
    { href: '/employer/jobs', label: 'Tuyển dụng', icon: UserPlus },
    { href: '/account', label: 'Tài khoản', icon: Settings },
  ],
  admin: [
    { href: '/admin', label: 'Điều phối', icon: LayoutDashboard },
    { href: '/admin/facilities', label: 'Cơ sở', icon: Building2 },
    { href: '/admin/workers', label: 'Người làm', icon: Users },
    { href: '/admin/reports', label: 'Báo cáo', icon: Flag },
  ],
};
/** Các mục của nhóm vận hành nằm sau nút "Thêm" trên điện thoại (rail desktop hiện đủ). */
const ADMIN_MORE: NavItem[] = [
  // Chi tiết một tin (/employer/jobs/[id]) dùng chung với chủ quán: nhóm vận hành xem cũng thuộc mục này.
  { href: '/admin/jobs', label: 'Tin tuyển dụng', icon: Briefcase, also: ['/employer/jobs'] },
  { href: '/admin/reviews', label: 'Đánh giá quán', icon: Star },
  { href: '/admin/kpi', label: 'KPI', icon: ChartColumn },
  { href: '/admin/audit', label: 'Nhật ký', icon: ScrollText },
  { href: '/account', label: 'Tài khoản', icon: Settings },
];

const BARE = /^\/(confirm|consent|p|f|s)(\/|$)/; // trang token / công khai (hồ sơ, quán, ca chia sẻ): không có nav chính
const SELF_LAID_OUT = /^\/(f|s)(\/|$)/; // công khai có dải đầu tràn mép: trang tự dựng bố cục như '/'
const WIDE_EXACT = new Set(['/login', '/terms', '/privacy', '/shifts', '/my-shifts', '/employer', '/jobs', '/my-applications', '/employer/jobs']);

/**
 * Bề rộng nội dung theo đường dẫn: trang rộng (nhiều cột, bảng, danh sách + bản đồ) dùng max-w-6xl, còn lại max-w-3xl;
 * '/' tự dựng bố cục nên không bị khung bao. Trang mới cần rộng thì thêm vào đây, không tự đặt max-w-* bao ngoài.
 */
function contentWidth(pathname: string) {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (p === '/' || SELF_LAID_OUT.test(p)) return '';
  const wide = WIDE_EXACT.has(p) || p === '/admin' || p.startsWith('/admin/');
  return `mx-auto w-full px-4 py-6 lg:px-8 lg:py-8 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`;
}

/** Mục nav đang chọn = đường dẫn (href hoặc `also`) dài nhất khớp theo từng đoạn; nhờ vậy /employer/jobs không làm sáng /employer. */
function activeHref(pathname: string, items: NavItem[]) {
  let best = '';
  let bestLen = 0;
  for (const { href, also = [] } of items) {
    for (const h of [href, ...also]) {
      if ((pathname === h || pathname.startsWith(h + '/')) && h.length > bestLen) { best = href; bestLen = h.length; }
    }
  }
  return best;
}

/** Số chưa đọc gọn ("9+"): chữ trên huy hiệu là hình; trình đọc màn hình nghe số đầy đủ qua nhãn của link. */
const badgeText = (n: number) => (n > 9 ? '9+' : String(n));

/** Chuông thông báo: `icon` trên thanh trên (điện thoại), `row` trong rail (desktop). */
function BellLink({ unread, pathname, row = false }: { unread: number; pathname: string; row?: boolean }) {
  const here = pathname === '/notifications';
  const badge = unread > 0 ? (
    <span aria-hidden="true" className={`tabular inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-ui bg-accent px-1 text-sm font-bold leading-none text-ink ${row ? 'ml-auto' : 'absolute right-0 top-0'}`}>
      {badgeText(unread)}
    </span>
  ) : null;
  const label = unread > 0 ? `Thông báo, ${unread} chưa đọc` : 'Thông báo';
  if (row) {
    return (
      <Link
        href="/notifications"
        aria-label={label}
        aria-current={here ? 'page' : undefined}
        className={`flex min-h-[3rem] items-center gap-2 rounded-ui px-4 text-base font-semibold text-white hover:bg-brand ${here ? 'bg-brand' : ''}`}
      >
        <Bell className="h-6 w-6 shrink-0" aria-hidden="true" />
        Thông báo
        {badge}
      </Link>
    );
  }
  return (
    <Link
      href="/notifications"
      aria-label={label}
      aria-current={here ? 'page' : undefined}
      className={`relative inline-flex h-12 w-12 items-center justify-center rounded-ui text-white ${here ? 'bg-brand' : ''}`}
    >
      <Bell className="h-6 w-6" aria-hidden="true" />
      {badge}
    </Link>
  );
}

function MoreMenu({ items, pathname, active }: { items: NavItem[]; pathname: string; active: boolean }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { ref.current?.removeAttribute('open'); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) ref.current.removeAttribute('open');
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  const current = activeHref(pathname, items);
  return (
    <details
      ref={ref}
      className="relative h-full"
      onToggle={(e) => setOpen(e.currentTarget.open)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          ref.current?.removeAttribute('open');
          ref.current?.querySelector('summary')?.focus();
        }
      }}
    >
      <summary
        className={`flex h-full cursor-pointer flex-col items-center justify-start whitespace-nowrap border-t-4 px-1 pt-1 text-center text-sm font-semibold leading-tight ${
          active ? 'border-accent text-accent' : 'border-transparent text-white'
        }`}
      >
        <Ellipsis className="h-6 w-6" aria-hidden="true" />
        Thêm
      </summary>
      <ul className="absolute bottom-full right-0 mb-2 w-60 space-y-2 rounded-ui border border-rule bg-white p-2 text-ink">
        {items.map((it) => (
          <li key={it.href}>
            <Link
              href={it.href}
              aria-current={it.href === current ? 'page' : undefined}
              className={`flex min-h-[3rem] items-center gap-2 rounded px-4 text-base font-semibold hover:bg-chalk ${
                it.href === current ? 'bg-accent-tint' : ''
              }`}
            >
              <it.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function AppShell({ role, signedIn, unread, userName, homeHref, footer, children }: {
  role: Role | null; // null: chưa đăng nhập, chưa đăng ký hoặc bị khóa (không có nav theo vai trò)
  signedIn: boolean;
  unread: number | null; // số thông báo chưa đọc; null = không có chuông (không có vai trò)
  userName: string | null;
  homeHref: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? '/';
  const bare = BARE.test(pathname);
  const items = role && !bare ? NAV[role] : null;
  const more = role === 'admin' ? ADMIN_MORE : null;
  const allItems = items ? [...items, ...(role === 'admin' ? ADMIN_MORE : [])] : [];
  const current = activeHref(pathname, allItems);
  const moreActive = more ? more.some((m) => m.href === current) : false;
  const railHasAccount = allItems.some((i) => i.href === '/account');

  const mainWidth = contentWidth(pathname);

  return (
    <>
      <div className={`flex min-h-dvh flex-col ${items ? 'shell-pad lg:pl-60' : ''}`}>
        <header data-chrome className={`surface-dark sticky top-0 z-30 h-14 bg-brand-deep ${items ? 'lg:hidden' : ''}`}>
          <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-4 lg:px-8">
            {/* -ml-2 trừ phần đệm px-2 của link (vùng chạm), để chữ logo thẳng lề với nội dung bên dưới */}
            <Link href={homeHref} className="-ml-2 inline-flex min-h-[3rem] items-center gap-2 rounded px-2 text-xl font-bold text-white"><Mark /></Link>
            {bare || pathname === '/login' ? null : signedIn ? (
              <div className="-mr-2 flex items-center">
                {items && unread != null ? <BellLink unread={unread} pathname={pathname} /> : null}
                <Link href="/account" className="inline-flex min-h-[3rem] items-center gap-2 rounded-ui px-2 text-base font-semibold text-white">
                  <CircleUser className="h-6 w-6" aria-hidden="true" />
                  {userName ?? 'Tài khoản'}
                </Link>
              </div>
            ) : (
              <Link href="/login" className="inline-flex min-h-[3rem] items-center rounded-ui bg-accent px-4 text-base font-semibold text-ink">
                Đăng nhập
              </Link>
            )}
          </div>
        </header>

        <main key={pathname} className={`flex-1 ${mainWidth} ${bare ? '' : 'page-enter'}`}>{children}</main>

        <footer data-chrome className={`surface-dark bg-brand-deep text-white ${items ? 'pb-[var(--chrome-bottom)] lg:pb-0' : ''}`}>
          {footer}
        </footer>
      </div>

      {items ? (
        <>
          <aside data-chrome data-rail className="surface-dark fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto bg-brand-deep text-white lg:flex">
            <Link href={homeHref} className="m-4 inline-flex min-h-[3rem] items-center gap-2 rounded px-2 text-xl font-bold text-white"><Mark /></Link>
            <nav aria-label="Điều hướng chính" className="flex-1 px-4">
              <ul className="space-y-2">
                {allItems.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      aria-current={it.href === current ? 'page' : undefined}
                      className={`flex min-h-[3rem] items-center gap-2 rounded-ui px-4 text-lg font-semibold ${
                        it.href === current ? 'bg-accent text-ink' : 'text-white hover:bg-brand'
                      }`}
                    >
                      <it.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="space-y-2 border-t border-brand p-4">
              {unread != null ? <BellLink unread={unread} pathname={pathname} row /> : null}
              {railHasAccount ? null : (
                <Link href="/account" className="flex min-h-[3rem] items-center gap-2 rounded-ui px-4 text-base font-semibold text-white hover:bg-brand">
                  <CircleUser className="h-6 w-6 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 break-words">{userName ?? 'Tài khoản'}</span>
                </Link>
              )}
              <form action="/auth/logout" method="post">
                <button type="submit" className="flex min-h-[3rem] w-full items-center gap-2 rounded-ui px-4 text-base font-semibold text-white hover:bg-brand">
                  <LogOut className="h-6 w-6 shrink-0" aria-hidden="true" />
                  Đăng xuất
                </button>
              </form>
            </div>
          </aside>

          <nav
            data-chrome
            aria-label="Điều hướng chính"
            className="surface-dark fixed inset-x-0 bottom-0 z-30 bg-brand-deep pb-[env(safe-area-inset-bottom)] lg:hidden"
          >
            <ul className="flex h-[4.5rem]">
              {items.map((it) => (
                <li key={it.href} className="min-w-0 flex-auto">
                  <Link
                    href={it.href}
                    aria-current={it.href === current ? 'page' : undefined}
                    className={`flex h-full flex-col items-center justify-start whitespace-nowrap border-t-4 px-1 pt-1 text-center text-sm font-semibold leading-tight ${
                      it.href === current ? 'border-accent text-accent' : 'border-transparent text-white'
                    }`}
                  >
                    <it.icon className="h-6 w-6" aria-hidden="true" />
                    {it.label}
                  </Link>
                </li>
              ))}
              {more ? (
                <li className="min-w-0 flex-auto">
                  <MoreMenu items={more} pathname={pathname} active={moreActive} />
                </li>
              ) : null}
            </ul>
          </nav>
        </>
      ) : null}
    </>
  );
}

/** Chia sẻ link một trang công khai (vd. /s/[id]): Web Share API nếu trình duyệt có, luôn có nút sao chép link dự phòng. */
export function ShareButton({ path, title }: { path: string; title: string }) {
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator.share === 'function'), []);
  const url = `${SITE_URL}${path}`;
  return (
    <div className="space-y-2">
      {canShare ? (
        <button type="button" className={btn('secondary')} onClick={() => navigator.share({ title, url }).catch(() => {})}>
          <Share2 className="h-5 w-5" aria-hidden="true" />
          Chia sẻ ca
        </button>
      ) : null}
      <CopyButton text={url}>Sao chép link ca</CopyButton>
    </div>
  );
}
