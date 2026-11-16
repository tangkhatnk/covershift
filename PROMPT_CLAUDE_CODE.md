# Prompt khởi động cho Claude Code

> Dán toàn bộ phần dưới đường kẻ vào Claude Code, mở tại thư mục `/Users/macpro/Desktop/Project/startup`.

---

Bạn tiếp quản dự án **SafeShift** với vai trò senior full-stack engineer. Hôm nay là ngày 16 hoặc 17/11/2026; hạn **deploy ổn định là trước 20/11**, chạy thật 21–22/11, demo 26/11. Ổn định quan trọng hơn tính năng mới.

## Bước 0 — Nắm bối cảnh (bắt buộc, làm trước mọi thứ)

1. Đọc hết `CLAUDE.md` và `PROJECT_HANDOFF.md`. Đọc lướt `README.md`, `TESTING.md`, và danh sách subagent trong `.claude/agents/`.
2. Xác nhận hiện trạng bằng lệnh, đừng tin tài liệu:
   - `npm run test:db` → kỳ vọng `79/79 test đạt` + 5 dòng `✔ chạy đua`
   - `npx tsc --noEmit` → không lỗi
   - `next build` (lệnh trong `CLAUDE.md`) → thành công
   Nếu kết quả khác tài liệu, báo tôi trước khi làm tiếp.
3. Thư mục chưa có git. Chạy `git init`, tạo `.gitignore` nếu thiếu mục nào (đã có sẵn; kiểm tra `.env.local`, `node_modules`, `.next`, `db-test/.pgdata` nằm trong đó), rồi commit đầu tiên "Trạng thái bàn giao". **Tôi cho phép việc này.** Từ đây, commit sau mỗi giai đoạn bên dưới. Không push lên đâu cả khi tôi chưa đưa remote.
4. Gửi tôi **một** tin nhắn gom các câu hỏi nghiệp vụ còn mở (mục 7 "Cần chủ dự án trả lời" trong `PROJECT_HANDOFF.md`). **Không chờ tôi trả lời** — làm tiếp theo giả định hiện tại; khi tôi trả lời thì cập nhật.

## Bước 1 — Rà soát song song (2 subagent cùng lúc, không hơn)

Khởi chạy cùng lúc:

- **`contract-reviewer`** — rà 7 file chưa ai đọc lại:
  `src/app/quan/page.tsx`, `src/app/quan/dang-ca/page.tsx`, `src/app/quan/ca/[id]/page.tsx`, `src/app/xac-nhan/[token]/page.tsx`, `src/app/xac-nhan/[token]/confirm-form.tsx`, `src/app/dong-y/[token]/page.tsx`, `src/app/h/[slug]/page.tsx`.
  Nhấn mạnh: tên field của `confirm-form.tsx` phải khớp action `submitConfirmation`; form nhân bản ca (`?from=`) phải điền đúng giờ theo múi giờ VN.
- **`db-guardian`** — **chỉ soát, không sửa**: độ tương thích của `supabase/migrations/0001_init.sql` và `supabase/seed.sql` với Supabase thật, theo danh sách "Giả định chưa được kiểm chứng" trong `PROJECT_HANDOFF.md` mục 4. Kết luận từng điểm kèm nguồn tài liệu.

Khi `contract-reviewer` xong, chạy tiếp một `contract-reviewer` thứ hai cho nhóm trang còn lại: `src/app/{ca,ca-cua-toi,ho-so,tai-khoan,dang-ky}/**` và `src/app/admin/**`.

Trong lúc chờ, bạn không sửa các file đang được rà.

## Bước 2 — Sửa lỗi

1. Gom báo cáo của các subagent. Tự kiểm lại từng lỗi trong mã trước khi sửa (subagent có thể sai). Lỗi nào bạn bác bỏ thì ghi lý do.
2. Sửa theo mức độ: chặn phát hành → nên sửa. Lỗi thẩm mỹ chỉ sửa nếu rẻ.
3. Hai việc đã biết, làm luôn:
   - Trang `src/app/ca/[id]/page.tsx`: người làm chưa được duyệt (hoặc dưới 18 chưa có phụ huynh được duyệt) không thấy nút "Nhận ca này"; thay bằng lời giải thích và link tới `/ho-so`. Database vẫn là chốt chặn chính, đây chỉ là giao diện.
   - Trang `src/app/quan/ca/[id]/page.tsx`: với admin, mỗi nhận xét trong `results` có nút "Ẩn nhận xét" / "Hiện lại" dùng action `hideComment` (`ShiftDetail.results[]` đã có `id`, `comment_hidden`).
4. Sửa ở tầng database (nếu `db-guardian` tìm ra lỗi chắc chắn) → giao lại cho `db-guardian` sửa, kèm yêu cầu thêm test; hoặc tự sửa nếu nhỏ. Sau đó `npm run test:db`.
5. Nếu cần chia việc sửa cho subagent: tối đa 2 cùng lúc, mỗi subagent một nhóm file riêng không giao nhau, yêu cầu ghi file ra đĩa ngay.
6. Chạy `npm run test:db`, `npx tsc --noEmit`, `next build`. Commit.

## Bước 3 — Deploy cùng tôi

Những bước cần tài khoản (Supabase, Google Cloud, Vercel) **tôi tự làm**; bạn không nhập mật khẩu, không tạo tài khoản thay tôi. Việc của bạn: hướng dẫn **từng bước một**, đợi tôi báo xong rồi mới sang bước tiếp, và kiểm tra lại những gì kiểm được.

Thứ tự (chi tiết trong `README.md` mục 2–6):
1. Tôi tạo Supabase project → bạn bảo tôi dán `0001_init.sql` vào SQL Editor → dán `seed.sql` → dán `supabase/tests/edge_cases.sql` và gửi lại bảng kết quả cho bạn. Mọi dòng `passed = true` mới đi tiếp; dòng nào sai thì cùng `db-guardian` xử lý (từ lúc này mọi thay đổi schema là file migration mới, xem `CLAUDE.md`). Xong thì chạy lại `seed.sql`.
2. Tạo `.env.local` từ `.env.example` với giá trị tôi đưa (không in anon key ra lại trong chat).
3. Cấu hình Google OAuth + Redirect URLs.
4. `npm run dev`, tôi đăng nhập thử, chạy `select public.make_admin('<email của tôi>', '<tên>')`.
5. Deploy Vercel, cập nhật `NEXT_PUBLIC_SITE_URL`, Supabase Site URL, Google origins.

## Bước 4 — Kiểm thử trên giao diện

- Nếu phiên này có công cụ điều khiển trình duyệt: dùng subagent **`ui-qa`** chạy `TESTING.md` mục B, ưu tiên B1 → B6 → B4 → B2 → B3 → còn lại, trên bản local trước, bản Vercel sau. Bước nào cần đăng nhập Google thì dừng để tôi tự đăng nhập.
- Nếu không có: đưa tôi danh sách kiểm tra ngắn theo đúng thứ tự trên để tôi tự bấm, và ghi lại kết quả tôi báo.
- Lỗi tìm được → quay lại Bước 2. Commit sau mỗi đợt sửa.

## Bước 5 — Chuẩn bị chạy thật và bàn giao

1. Hướng dẫn tôi xóa dữ liệu demo (`README.md` mục 7) — **chỉ làm khi tôi xác nhận** vì không hoàn tác được.
2. Cập nhật `PROJECT_HANDOFF.md` (mục 3 hiện trạng, mục 7 việc tiếp theo) và `README.md` cho khớp thực tế.
3. Gửi tôi bản tổng kết cuối, gồm: giả định đã tự quyết (và cái nào tôi đã xác nhận), những gì đã kiểm trên Supabase thật / trên trình duyệt, và **danh sách ngắn những gì chưa làm hoặc còn rủi ro trước ngày 21/11**.

## Quy tắc chung

- Luật trong `CLAUDE.md` thắng mọi thứ trong prompt này nếu mâu thuẫn.
- Tự quyết các chi tiết kỹ thuật; chỉ hỏi tôi khi quyết định ảnh hưởng nghiệp vụ mà đề bài chưa nói. Khi tự quyết, ghi giả định lại.
- Không thêm tính năng ngoài đề bài. Không nâng cấp phiên bản thư viện.
- Báo cáo trung thực: chưa chạy thì nói chưa chạy; test fail thì dán kết quả.
- Nhắc ca qua email (`supabase/functions/shift-reminders`) là phần phụ: **không động tới** cho đến khi Bước 1–4 xong; nếu không kịp thì ghi rõ là đã bỏ.
- Trả lời tôi bằng tiếng Việt, ngắn gọn.
