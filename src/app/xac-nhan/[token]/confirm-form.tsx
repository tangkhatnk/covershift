'use client';

import { useState } from 'react';
import { Check, Star } from 'lucide-react';
import { ActionForm, SubmitButton } from '@/components/client';
import { inputCls } from '@/components/ui';
import { submitConfirmation } from '@/app/actions';

type Worker = { claim_id: string; name: string };
type Answer = { attended: '' | 'yes' | 'no'; onTime: '' | 'yes' | 'no'; rating: number; comment: string };

const EMPTY: Answer = { attended: '', onTime: '', rating: 0, comment: '' };

// Vòng focus vẽ trên nhãn khi ô radio ẩn (sr-only) bên trong đang được focus bằng bàn phím.
const focusCls =
  'has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-shutter-deep';

const choiceCls = (on: boolean, tone: 'green' | 'red' | 'amber') =>
  `flex min-h-[3.5rem] cursor-pointer items-center justify-center gap-2 rounded-ui border-2 px-4 text-center text-lg font-bold transition-colors ${focusCls} ${
    on
      ? tone === 'green'
        ? 'border-shutter bg-shutter text-white'
        : tone === 'red'
          ? 'border-roof bg-roof text-white'
          : 'border-wall bg-wall text-ink'
      : 'border-rule-strong bg-white text-ink hover:bg-chalk'
  }`;

/** Nút radio to. Là input thật nên server action đọc được; state giữ lựa chọn nếu form bị reset sau khi gửi lỗi. */
function Choice({ name, value, current, tone, onPick, children }: {
  name: string; value: 'yes' | 'no'; current: string; tone: 'green' | 'red' | 'amber'; onPick: (v: 'yes' | 'no') => void; children: React.ReactNode;
}) {
  const on = current === value;
  return (
    <label className={choiceCls(on, tone)}>
      <input type="radio" name={name} value={value} checked={on} onChange={() => onPick(value)} className="sr-only" />
      {on ? <Check className="h-6 w-6 shrink-0" aria-hidden="true" /> : null}
      {children}
    </label>
  );
}

/** Một ô sao: radio thật (mũi tên trái/phải đổi sao), sao vẽ bằng icon, nhãn đọc là "{n} sao". */
function StarChoice({ name, n, rating, onPick }: { name: string; n: number; rating: number; onPick: (n: number) => void }) {
  const lit = n <= rating;
  return (
    <label
      className={`flex min-h-[3.5rem] cursor-pointer flex-col items-center justify-center rounded-ui border-2 transition-colors ${focusCls} ${
        lit ? 'border-wall bg-wall-tint' : 'border-rule-strong bg-white hover:bg-chalk'
      }`}
    >
      <input type="radio" name={name} value={n} checked={rating === n} onChange={() => onPick(n)} className="sr-only" />
      <span className="sr-only">{n} sao</span>
      <Star aria-hidden="true" className={`h-7 w-7 ${lit ? 'fill-wall stroke-shutter-deep' : 'fill-none stroke-rule-strong'}`} />
      <span aria-hidden="true" className="text-sm font-semibold text-ink">{n}</span>
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
    <ActionForm action={submitConfirmation} className="space-y-6">
      <input type="hidden" name="token" value={token} />

      {workers.map((w, i) => {
        const id = w.claim_id;
        const a = get(id);
        return (
          <fieldset key={id} className="min-w-0 space-y-6 rounded-ui border border-rule bg-white p-4">
            <legend className="px-2 text-xl font-bold text-ink">
              {workers.length > 1 ? `${i + 1}. ` : ''}{w.name}
            </legend>
            <input type="hidden" name="claim_id" value={id} />

            <fieldset className="min-w-0">
              <legend className="mb-2 text-base font-semibold text-ink">Bạn này có đến làm không?</legend>
              <div className="grid grid-cols-2 gap-4">
                <Choice name={`attended_${id}`} value="yes" current={a.attended} tone="green" onPick={(v) => set(id, { attended: v })}>
                  Đã làm
                </Choice>
                <Choice name={`attended_${id}`} value="no" current={a.attended} tone="red" onPick={(v) => set(id, { attended: v })}>
                  Không đến
                </Choice>
              </div>
            </fieldset>

            {a.attended === 'yes' ? (
              <>
                <fieldset className="min-w-0">
                  <legend className="mb-2 text-base font-semibold text-ink">Đến có đúng giờ không?</legend>
                  <div className="grid grid-cols-2 gap-4">
                    <Choice name={`on_time_${id}`} value="yes" current={a.onTime} tone="green" onPick={(v) => set(id, { onTime: v })}>
                      Đúng giờ
                    </Choice>
                    <Choice name={`on_time_${id}`} value="no" current={a.onTime} tone="amber" onPick={(v) => set(id, { onTime: v })}>
                      Trễ
                    </Choice>
                  </div>
                </fieldset>

                <fieldset className="min-w-0">
                  <legend className="mb-2 text-base font-semibold text-ink">
                    Chấm điểm {a.rating ? <span className="font-normal text-ink-soft">— {a.rating}/5 sao</span> : null}
                  </legend>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <StarChoice key={n} name={`rating_${id}`} n={n} rating={a.rating} onPick={(v) => set(id, { rating: v })} />
                    ))}
                  </div>
                </fieldset>

                <label className="block">
                  <span className="mb-2 block text-base font-semibold text-ink">Nhận xét (không bắt buộc)</span>
                  <textarea
                    name={`comment_${id}`}
                    rows={2}
                    maxLength={500}
                    value={a.comment}
                    onChange={(e) => set(id, { comment: e.target.value })}
                    placeholder="Ví dụ: chăm chỉ, lễ phép"
                    className={inputCls}
                  />
                  <span className="mt-2 block text-base text-ink-soft">
                    Tối đa 500 ký tự. Nhận xét sẽ hiện trên hồ sơ ca làm công khai của người làm.
                  </span>
                </label>
              </>
            ) : null}

            {a.attended === 'no' ? (
              <p className="rounded-ui bg-roof-tint px-4 py-2 text-base text-roof">
                Nhóm vận hành sẽ được báo là bạn này không đến ca.
              </p>
            ) : null}
          </fieldset>
        );
      })}

      {missing > 0 ? (
        <p className="rounded-ui border border-wall bg-wall-tint px-4 py-2 text-base font-medium text-ink">
          {workers.length > 1
            ? `Còn ${missing} người chưa chọn xong (đã làm / không đến, đúng giờ, số sao).`
            : 'Anh/chị chọn xong các mục ở trên (đã làm / không đến, đúng giờ, số sao) rồi bấm gửi.'}
        </p>
      ) : null}
      {/* Không dùng window.confirm: chủ quán thường mở link này trong Zalo, trình duyệt nhúng có thể bỏ qua hộp thoại
          và trả "không" ngay — nút sẽ như bị liệt. Thay bằng câu nhắc cố định ngay trên nút. */}
      <p className="text-base font-medium text-ink">Kiểm tra lại các lựa chọn. Sau khi gửi sẽ không sửa lại được.</p>
      {/* Nút gửi to hơn nút thường: việc duy nhất của trang. SubmitButton không nhận className nên chỉnh qua phần tử bao. */}
      <div className="[&_button]:!min-h-[4rem] [&_button]:!text-xl">
        <SubmitButton>Gửi xác nhận</SubmitButton>
      </div>
    </ActionForm>
  );
}
