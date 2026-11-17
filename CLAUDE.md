# SafeShift — quy tắc cho Claude Code

Web app kết nối ca làm ngắn hạn giữa cơ sở dịch vụ nhỏ ở Vũng Tàu và học sinh (từ 15 tuổi) / sinh viên.
Bối cảnh đầy đủ, lịch sử và các quyết định: đọc `PROJECT_HANDOFF.md` trước khi làm bất cứ việc gì.

## Hạn chót
Deploy ổn định trước **20/11/2026** · chạy thật **21–22/11** · demo **26/11**. Ổn định quan trọng hơn tính năng mới.

## Luật không được phá
- Quy tắc nghiệp vụ chặn ở **database** (trigger, constraint, RLS, RPC), không chỉ ở giao diện.
- Client **không có** quyền INSERT/UPDATE/DELETE trên bảng nào. Không thêm policy ghi, không `grant insert/update/delete` cho `anon`/`authenticated`.
- Muốn ghi dữ liệu mới: viết RPC `SECURITY DEFINER` + `set search_path = public`, thêm vào khối `grant execute` cuối migration, thêm server action vào `src/app/actions.ts`.
- Web chỉ dùng anon key. Không đưa service-role key vào Next.js hay Vercel.
- Giữa người làm và chủ quán, số điện thoại chỉ lộ qua `get_shift_contacts()`. Ngoại lệ có chủ đích: chính chủ đọc SĐT của mình; admin xem SĐT qua các RPC `admin_*` (điều phối, danh sách người làm/cơ sở/báo cáo) để vận hành. SĐT và tên phụ huynh không cấp cho client (`parental_consents` chỉ grant theo cột). Không trả số điện thoại ở bất kỳ RPC/trang nào khác.
- Không thu CCCD, ảnh chân dung, địa chỉ nhà. Không SMS. Không thanh toán. Chỉ gói miễn phí.
- Giữ nguyên văn hằng `DISCLAIMER` và `NO_FEE` trong `src/lib/constants.ts`.
- Không bịa tên pháp nhân, địa chỉ, email, số điện thoại liên hệ.

## Cách làm việc
- Chủ dự án muốn: tự quyết những gì hợp lý, ghi lại giả định, chỉ hỏi khi quyết định ảnh hưởng nghiệp vụ mà đề bài chưa nói.
- Trả lời bằng tiếng Việt.
- Mỗi thay đổi ở `supabase/` phải chạy lại `npm run test:db` (kỳ vọng `86/86`, `privileges_check: … 0 dòng SAI/KIỂM`, `tái chạy … ĐẠT`, 5 dòng `✔ chạy đua`, `dọn dữ liệu demo … ĐẠT`; hoặc nhiều test hơn nếu thêm test).
- Mỗi thay đổi ở `src/` phải chạy `npx tsc --noEmit`; trước khi báo xong chạy thêm `next build` (lệnh ở mục Lệnh).
- `tsc` và `build` sạch **không** có nghĩa là chạy đúng. Chưa mở trên trình duyệt thì nói rõ là chưa kiểm.
- Migration `0001_init.sql` **đã áp lên Supabase thật ngày 17/11/2026** (85/85 test đạt trên Supabase) → **KHÔNG sửa file này nữa**. Mọi thay đổi schema là file migration mới (`0002_...sql`) kèm test, chủ dự án dán bằng SQL Editor, rồi chạy `supabase/tests/privileges_check.sql`.
- Thông báo lỗi nghiệp vụ là tiếng Việt trong `raise exception`; `edge_cases.sql` khớp theo chuỗi này → sửa câu chữ thì sửa cả test.
- Test SQL: hành động và kiểm tra phải là hai câu lệnh riêng (`pg_temp.t_do`), vì một câu không thấy dữ liệu hàm volatile vừa ghi.
- Server chạy UTC: mọi hiển thị giờ đi qua `src/lib/format.ts`.
- Next 15: `params` / `searchParams` là `Promise`.
- Không chạy `next dev` và `next build` cùng lúc (chung thư mục `.next`).

## Subagent
- Có sẵn trong `.claude/agents/`: `db-guardian`, `contract-reviewer`, `ui-qa` — cả 3 chạy **Sonnet 5.5 (`claude-sonnet-5-5`), effort `high`**, khai trong frontmatter. Khi gọi không truyền `model`/`effort` để giữ cấu hình này.
- Chạy **tối đa 3 subagent cùng lúc** (chủ dự án cho phép). Tài khoản có giới hạn dùng theo cửa sổ 5 giờ; ngày 16/11 ba agent song song từng chết cả ba vì lỗi 429. Nếu subagent chết vì giới hạn: kiểm tra đĩa xem nó đã ghi gì, đợi giới hạn reset rồi gọi lại chính subagent đó (SendMessage) thay vì tạo mới.
- Subagent được giao viết mã phải ghi từng file ra đĩa ngay khi viết xong, và chỉ sửa các file được giao.
- Subagent bị dừng không báo cáo gì → kiểm tra đĩa (`git status`, `find`) thay vì tin là đã xong.
- Hai subagent không bao giờ cùng sửa một file.

## Lệnh
```bash
npm run test:db                 # migration + seed + 86 test + kiểm quyền + tái chạy + chạy đua + dọn demo, trên Postgres nhúng
npx tsc --noEmit
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npx next build
npm run dev                     # cần .env.local trỏ tới Supabase thật
```

## Bản đồ nhanh
- `supabase/migrations/0001_init.sql` — nguồn sự thật của mọi quy tắc
- `supabase/seed.sql` · `supabase/tests/edge_cases.sql` · `db-test/`
- `supabase/tests/check_before_migration.sql` (trước migration) · `supabase/tests/privileges_check.sql` (sau migration) — chỉ đọc, dán vào SQL Editor
- `supabase/xoa_du_lieu_demo.sql` — xóa dữ liệu demo trước ngày chạy thật (đúng thứ tự, giữ dữ liệu thật). Không xóa user demo hàng loạt bằng tay: lỗi khóa ngoại 23503
- `src/app/actions.ts` — mọi server action (1 action = 1 RPC)
- `src/lib/{constants,types,format,auth}.ts` · `src/components/{ui,client}.tsx`
- `README.md` (cài đặt, deploy) · `TESTING.md` (A: tự động, B: kịch bản tay)
