'use client';

import { useState } from 'react';
import { ActionForm, SubmitButton } from '@/components/client';
import { inputCls } from '@/components/ui';
import { submitConfirmation } from '@/app/actions';

type Worker = { claim_id: string; name: string };
type Answer = { attended: '' | 'yes' | 'no'; onTime: '' | 'yes' | 'no'; rating: number; comment: string };

const EMPTY: Answer = { attended: '', onTime: '', rating: 0, comment: '' };

const choiceCls = (on: boolean, tone: 'green' | 'red' | 'amber') =>
  `flex min-h-[3.5rem] cursor-pointer items-center justify-center rounded-xl border-2 px-3 text-center text-lg font-bold transition focus-within:ring-4 focus-within:ring-brand-600/30 ${
    on
      ? tone === 'green'
        ? 'border-emerald-600 bg-emerald-600 text-white'
        : tone === 'red'
          ? 'border-red-600 bg-red-600 text-white'
          : 'border-amber-500 bg-amber-500 text-white'
      : 'border-slate-300 bg-white text-slate-900'
  }`;

/** Nút radio to. Là input thật nên server action đọc được; state giữ lựa chọn nếu form bị reset sau khi gửi lỗi. */
function Choice({ name, value, current, tone, onPick, children }: {
  name: string; value: 'yes' | 'no'; current: string; tone: 'green' | 'red' | 'amber'; onPick: (v: 'yes' | 'no') => void; children: React.ReactNode;
}) {
  const on = current === value;
  return (
    <label className={choiceCls(on, tone)}>
      <input type="radio" name={name} value={value} checked={on} onChange={() => onPick(value)} className="sr-only" />
      {on ? '✓ ' : ''}{children}
    </label>
  );
}

export function ConfirmForm({ token, workers }: { token: string; workers: Worker[] }) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const get = (id: string) => answers[id] ?? EMPTY;
  const set = (id: string, patch: Partial<Answer>) =>
    setAnswers((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY), ...patch } }));

  const missing = workers.filter((w) => {
    const a = get(w.claim_id);
    return a.attended === '' || (a.attended === 'yes' && (a.onTime === '' || a.rating < 1));
  }).length;

  return (
    <ActionForm action={submitConfirmation} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      {workers.map((w, i) => {
        const id = w.claim_id;
        const a = get(id);
        return (
          <fieldset key={id} className="space-y-4 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">
            <legend className="px-1 text-xl font-bold text-slate-900">
              {workers.length > 1 ? `${i + 1}. ` : ''}{w.name}
            </legend>
            <input type="hidden" name="claim_id" value={id} />

            <div>
              <p className="mb-2 text-base font-semibold text-slate-900">Bạn này có đến làm không?</p>
              <div className="grid grid-cols-2 gap-3">
                <Choice name={`attended_${id}`} value="yes" current={a.attended} tone="green" onPick={(v) => set(id, { attended: v })}>
                  Đã làm
                </Choice>
                <Choice name={`attended_${id}`} value="no" current={a.attended} tone="red" onPick={(v) => set(id, { attended: v })}>
                  Không đến
                </Choice>
              </div>
            </div>

            {a.attended === 'yes' ? (
              <>
                <div>
                  <p className="mb-2 text-base font-semibold text-slate-900">Đến có đúng giờ không?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Choice name={`on_time_${id}`} value="yes" current={a.onTime} tone="green" onPick={(v) => set(id, { onTime: v })}>
                      Đúng giờ
                    </Choice>
                    <Choice name={`on_time_${id}`} value="no" current={a.onTime} tone="amber" onPick={(v) => set(id, { onTime: v })}>
                      Trễ
                    </Choice>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-base font-semibold text-slate-900">
                    Chấm điểm {a.rating ? <span className="font-normal text-slate-600">— {a.rating}/5 sao</span> : null}
                  </p>
                  <input type="hidden" name={`rating_${id}`} value={a.rating || ''} />
                  <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={`Số sao cho ${w.name}`}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={a.rating === n}
                        aria-label={`${n} sao`}
                        onClick={() => set(id, { rating: n })}
                        className={`flex min-h-[3.5rem] flex-col items-center justify-center rounded-xl border-2 text-2xl leading-none transition ${
                          n <= a.rating ? 'border-amber-400 bg-amber-50 text-amber-500' : 'border-slate-300 bg-white text-slate-300'
                        }`}
                      >
                        ★<span className="mt-1 text-sm font-semibold text-slate-700">{n}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-base font-semibold text-slate-900">Nhận xét (không bắt buộc)</span>
                  <textarea
                    name={`comment_${id}`}
                    rows={2}
                    maxLength={500}
                    value={a.comment}
                    onChange={(e) => set(id, { comment: e.target.value })}
                    placeholder="Ví dụ: chăm chỉ, lễ phép"
                    className={inputCls}
                  />
                  <span className="mt-1 block text-base text-slate-600">
                    Tối đa 500 ký tự. Nhận xét sẽ hiện trên hồ sơ ca làm công khai của người làm.
                  </span>
                </label>
              </>
            ) : null}

            {a.attended === 'no' ? (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-base text-red-900">
                Nhóm vận hành sẽ được báo là bạn này không đến ca.
              </p>
            ) : null}
          </fieldset>
        );
      })}

      {missing > 0 ? (
        <p className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-base font-medium text-amber-900">
          {workers.length > 1
            ? `Còn ${missing} người chưa chọn xong (đã làm / không đến, đúng giờ, số sao).`
            : 'Anh/chị chọn xong các mục ở trên (đã làm / không đến, đúng giờ, số sao) rồi bấm gửi.'}
        </p>
      ) : null}
      {/* Không dùng window.confirm: chủ quán thường mở link này trong Zalo, trình duyệt nhúng có thể bỏ qua hộp thoại
          và trả "không" ngay — nút sẽ như bị liệt. Thay bằng câu nhắc cố định ngay trên nút. */}
      <p className="text-base font-medium text-slate-700">Kiểm tra lại các lựa chọn. Sau khi gửi sẽ không sửa lại được.</p>
      <SubmitButton>Gửi xác nhận</SubmitButton>
    </ActionForm>
  );
}
