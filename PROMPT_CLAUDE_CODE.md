# Prompt khởi động cho Claude Code

> Dán toàn bộ phần dưới đường kẻ vào Claude Code, mở tại thư mục `/Users/macpro/Desktop/Project/startup`.

---

Bạn tiếp quản dự án **SafeShift** với vai trò senior full-stack engineer. Hạn **deploy ổn định là trước 20/11/2026**, chạy 21–22/11 (bản mô phỏng), demo 26/11. Ổn định quan trọng hơn tính năng mới.

## Bước 0 — Nắm bối cảnh (làm trước mọi thứ)

1. Đọc hết `CLAUDE.md` và `PROJECT_HANDOFF.md`. Đọc lướt `README.md`, `TESTING.md` và 3 subagent trong `.claude/agents/` (`db-guardian`, `contract-reviewer`, `ui-qa`).
   **Cả 3 subagent chạy Sonnet 5.5 (`claude-sonnet-5-5`), effort `high`** — đã khai trong frontmatter của từng file. Khi gọi subagent, **không truyền tham số `model` hay `effort`** để khỏi đè cấu hình này. Nếu một subagent không nạp được vì dòng `model:` (lỗi khi gọi, hoặc `/agents` báo lỗi), đổi dòng đó thành `model: sonnet` (bí danh, hiện trỏ tới Sonnet 5.5), giữ `effort: high`, và báo tôi.
2. Xác nhận hiện trạng bằng lệnh, đừng tin tài liệu:
   - `npm run test:db` → kỳ vọng `79/79 test đạt` + 5 dòng `✔ chạy đua`
   - `npx tsc --noEmit` → không lỗi
   - `next build` (lệnh trong `CLAUDE.md`) → thành công
   Kết quả khác tài liệu thì báo tôi trước khi làm tiếp.
3. (Đã làm.) Thư mục chưa có git. Chạy `git init`, kiểm tra `.gitignore` có `.env.local`, `node_modules`, `.next`, `db-test/.pgdata`, rồi commit đầu tiên "Trạng thái bàn giao". **Tôi cho phép việc này.** Từ đây commit sau mỗi bước bên dưới. Không push khi tôi chưa đưa remote.
4. Gửi tôi **một** tin nhắn gom các câu hỏi nghiệp vụ còn mở (mục 7 "Cần chủ dự án trả lời" trong `PROJECT_HANDOFF.md`). **Không chờ tôi trả lời**: làm tiếp theo giả định hiện tại, khi tôi trả lời thì cập nhật.

## Bước 1 — Rà soát song song (3 subagent cùng lúc)

Khởi chạy **cùng lúc** 3 subagent, phạm vi không chồng nhau:

- **`contract-reviewer` #1 — chủ quán và trang công khai** (7 file chưa ai đọc lại):
  `src/app/quan/page.tsx`, `src/app/quan/dang-ca/page.tsx`, `src/app/quan/ca/[id]/page.tsx`, `src/app/xac-nhan/[token]/page.tsx`, `src/app/xac-nhan/[token]/confirm-form.tsx`, `src/app/dong-y/[token]/page.tsx`, `src/app/h/[slug]/page.tsx`.
  Nhấn mạnh: tên field trong `confirm-form.tsx` phải khớp action `submitConfirmation`; form nhân bản ca (`?from=`) phải điền đúng giờ theo múi giờ VN.
- **`contract-reviewer` #2 — người làm, đăng ký, tài khoản, admin:**
  `src/app/{ca,ca-cua-toi,ho-so,tai-khoan,dang-ky}/**` và `src/app/admin/**`.
- **`db-guardian` — chỉ soát, KHÔNG sửa:** độ tương thích của `supabase/migrations/0001_init.sql` và `supabase/seed.sql` với Supabase thật, theo danh sách "Giả định chưa được kiểm chứng" ở `PROJECT_HANDOFF.md` mục 4. Kết luận từng điểm (ổn / rủi ro / chắc chắn hỏng) kèm nguồn tài liệu.

Trong lúc chờ, bạn không sửa file nào trong phạm vi đang rà. Nếu subagent nào chết giữa chừng (vd. lỗi 429 do giới hạn dùng): kiểm tra đĩa, đợi reset rồi gọi lại chính subagent đó, đừng tạo mới.

## Bước 2 — Sửa lỗi

1. Gom báo cáo. **Tự kiểm lại từng lỗi trong mã trước khi sửa** (subagent có thể sai). Lỗi nào bác bỏ thì ghi lý do một dòng.
2. Sửa theo mức độ: chặn phát hành → nên sửa. Lỗi thẩm mỹ chỉ sửa nếu rẻ.
3. Hai việc đã biết, làm luôn:
   - `src/app/ca/[id]/page.tsx`: người làm chưa được duyệt (hoặc dưới 18 chưa có phiếu phụ huynh được duyệt) không thấy nút "Nhận ca này"; thay bằng lời giải thích và link tới `/ho-so`. Database vẫn là chốt chặn chính.
   - `src/app/quan/ca/[id]/page.tsx`: với admin, mỗi nhận xét trong `results` có nút "Ẩn nhận xét" / "Hiện lại" dùng action `hideComment` (`ShiftDetail.results[]` đã có `id`, `comment_hidden`).
4. Được phép chia việc sửa cho tối đa 3 subagent cùng lúc, với điều kiện: mỗi subagent một nhóm file riêng không giao nhau, và phải ghi từng file ra đĩa ngay khi sửa xong. Lỗi ở tầng database giao cho `db-guardian` sửa kèm thêm test.
5. Chạy `npm run test:db`, `npx tsc --noEmit`, `next build`. Commit.

## Bước 3 — Deploy cùng tôi

Các bước cần tài khoản (Supabase, Vercel) **tôi tự làm**; bạn không nhập mật khẩu, không tạo tài khoản thay tôi. Việc của bạn: hướng dẫn **từng bước một**, đợi tôi báo xong mới sang bước tiếp, và tự kiểm những gì kiểm được.

Thứ tự (chi tiết ở `README.md` mục 2–6):
1. Tôi tạo Supabase project → dán `0001_init.sql` vào SQL Editor → dán `seed.sql` → dán `supabase/tests/edge_cases.sql` và gửi lại bảng kết quả. Mọi dòng `passed = true` mới đi tiếp; dòng sai thì cùng `db-guardian` xử lý (**từ lúc này mọi thay đổi schema là file migration mới**). Xong chạy lại `seed.sql`.
2. Tạo `.env.local` từ `.env.example` với giá trị tôi đưa (không in lại anon key trong chat).
3. (Đã bỏ: không còn Google OAuth, magic link hay Redirect URL. Đăng nhập là 3 nút demo, tài khoản do `seed.sql` tạo; xem `README.md` mục 3.)
4. `npm run dev`; tôi bấm nút demo ở `/dang-nhap` để đăng nhập thử.
5. Deploy Vercel (đã có tại https://safeshift-beta.vercel.app), cập nhật `NEXT_PUBLIC_SITE_URL` nếu đổi domain.

## Bước 4 — Kiểm thử trên giao diện

- Nếu phiên có công cụ điều khiển trình duyệt: dùng **`ui-qa`** chạy `TESTING.md` mục B theo thứ tự B1 → B6 → B4 → B2 → B3 → còn lại, trên bản local trước, bản Vercel sau. Có thể chạy song song tối đa 3 `ui-qa`, mỗi cái một nhóm mục kịch bản không đụng cùng dữ liệu (vd. không cùng dùng token `demo-token-con-han`). Bước cần đăng nhập thì tự bấm nút demo ở `/dang-nhap`.
- Nếu không có công cụ trình duyệt: đưa tôi danh sách kiểm tra ngắn theo đúng thứ tự trên để tôi tự bấm, rồi ghi lại kết quả tôi báo.
- Lỗi tìm được → quay lại Bước 2. Commit sau mỗi đợt sửa.

## Bước 5 — Chuẩn bị demo 26/11 và bàn giao

1. (Cập nhật 17/11) App là bản mô phỏng chỉ dùng dữ liệu demo: **không** xóa dữ liệu demo (`README.md` mục 7), vì xóa thì nút đăng nhập demo hỏng. Khôi phục dữ liệu mẫu bằng chạy lại `seed.sql`.
2. Cập nhật `PROJECT_HANDOFF.md` (mục 3 hiện trạng, mục 7 việc tiếp theo) và `README.md` cho khớp thực tế.
3. Gửi tôi bản tổng kết cuối: giả định đã tự quyết (cái nào tôi đã xác nhận), những gì đã kiểm trên Supabase thật / trên trình duyệt, và **danh sách ngắn những gì chưa làm hoặc còn rủi ro trước demo 26/11**.

## Quy tắc chung

- Luật trong `CLAUDE.md` thắng prompt này nếu mâu thuẫn.
- Tự quyết chi tiết kỹ thuật; chỉ hỏi tôi khi quyết định ảnh hưởng nghiệp vụ mà đề bài chưa nói. Tự quyết thì ghi giả định lại.
- Không thêm tính năng ngoài đề bài. Không nâng cấp phiên bản thư viện.
- Báo cáo trung thực: chưa chạy thì nói chưa chạy; test fail thì dán kết quả.
- Nhắc ca qua email (`supabase/functions/shift-reminders`) là phần phụ: **không động tới** cho đến khi Bước 1–4 xong; không kịp thì ghi rõ đã bỏ.
- Trả lời tôi bằng tiếng Việt, ngắn gọn.
