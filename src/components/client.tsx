'use client';

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import type { ActionState } from '@/lib/types';
import { btn, type BtnVariant } from './ui';

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Form gọi server action và tự hiện lỗi / thông báo thành công ngay trên form.
 * `resetOnOk`: xóa trắng form sau khi thành công.
 */
export function ActionForm({ action, children, className = 'space-y-4', resetOnOk = false }: {
  action: Action; children: ReactNode; className?: string; resetOnOk?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnOk) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {state?.error ? (
        <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-base font-medium text-red-900">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-900">{state.ok}</p>
      ) : null}
      {children}
    </form>
  );
}

/** Nút gửi form: tự khóa khi đang gửi (chống bấm hai lần). `confirm` = câu hỏi xác nhận trước khi gửi. */
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
