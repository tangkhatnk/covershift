'use client';

import { useActionState, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/lib/types';
import { Alert, btn, type BtnVariant, type Tone } from './ui';

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
  const msgRef = useRef<HTMLParagraphElement>(null);
  const submitted = useRef<FormData | null>(null);
  // useLayoutEffect: điền lại ngay sau khi React reset form (cùng commit), trước khi vẽ — không nháy ô trống.
  useLayoutEffect(() => {
    if (!state) return;
    if (state.error && ref.current && submitted.current) restoreFields(ref.current, submitted.current);
    if (state.ok && resetOnOk) ref.current?.reset();
    // Thông báo nằm ở đầu form còn nút gửi ở cuối: cuộn tới để người dùng thấy ngay.
    msgRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
        <p
          ref={msgRef}
          role={state?.error ? 'alert' : 'status'}
          className={`rounded-xl border-2 px-4 py-3 text-base font-medium ${
            state?.error ? 'border-red-300 bg-red-50 text-red-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900'
          }`}
        >
          {msg}
        </p>
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
    ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const url = new URL(window.location.href);
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
  }, [param]);
  return <div ref={ref}><Alert tone={tone}>{children}</Alert></div>;
}

/**
 * Nút gửi form: tự khóa khi đang gửi (chống bấm hai lần). `confirm` = câu hỏi xác nhận trước khi gửi.
 * Không dùng `confirm` ở trang mở từ Zalo/Facebook (/xac-nhan, /dong-y): trình duyệt nhúng có thể bỏ qua hộp thoại
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
      {pending ? 'Đang gửi…' : children}
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
      {done ? '✓ Đã sao chép' : children}
    </button>
  );
}

export function PrintButton({ children = 'In / Lưu PDF' }: { children?: ReactNode }) {
  return (
    <button type="button" className={`${btn('secondary')} print:hidden`} onClick={() => window.print()}>
      {children}
    </button>
  );
}
