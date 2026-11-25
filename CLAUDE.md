# SafeShift — quy tắc cho Claude Code

@AGENTS.md

`AGENTS.md` (nạp ở dòng trên) là quy tắc chung của repo cho mọi coding agent: quy trình git/PR, quy trình agent (chính, manager, 2 worker), bất biến nghiệp vụ, bảo mật, giao diện. File này chỉ giữ ghi chú riêng cho Claude Code; nếu hai file mâu thuẫn, `AGENTS.md` thắng.

Web app kết nối ca làm ngắn hạn giữa cơ sở dịch vụ nhỏ ở Vũng Tàu và học sinh (từ 15 tuổi) / sinh viên.
Bối cảnh đầy đủ, lịch sử và các quyết định: đọc `PROJECT_HANDOFF.md` trước khi làm bất cứ việc gì.

## Hạn chót
Deploy ổn định trước **20/11/2026** · chạy **21–22/11** · demo **26/11**. Ổn định quan trọng hơn tính năng mới.

Hiện trạng (quyết định 17/11/2026): app là **bản mô phỏng**, chỉ dùng dữ liệu mẫu, không người thật. Đã deploy production ở https://safeshift-beta.vercel.app (Vercel project `safeshift`; merge vào `main` là tự deploy). Đăng nhập chỉ bằng 3 nút demo ở `/login` qua server action `demoLogin` (mật khẩu chung công khai, đặt bởi `seed.sql`); đã bỏ Google OAuth và magic link. Không đưa dữ liệu thật vào project này.

## Luật không được phá
- Quy tắc nghiệp vụ chặn ở **database** (trigger, constraint, RLS, RPC), không chỉ ở giao diện.
- Client **không có** quyền INSERT/UPDATE/DELETE trên bảng nào. Không thêm policy ghi, không `grant insert/update/delete` cho `anon`/`authenticated`.
- Muốn ghi dữ liệu mới: viết RPC `SECURITY DEFINER` + `set search_path = public`, thêm vào khối `grant execute` cuối migration, thêm server action vào `src/app/actions.ts`.
- Web chỉ dùng anon key. Không đưa service-role key vào Next.js hay Vercel.
- Giữa người làm và chủ quán, số điện thoại chỉ lộ qua `get_shift_contacts()`. Ngoại lệ có chủ đích: chính chủ đọc SĐT của mình; admin xem SĐT qua các RPC `admin_*` (điều phối, danh sách người làm/cơ sở/báo cáo) để vận hành; (theo chỉ thị chủ dự án 19/11/2026, tuyển dụng lâu dài) `get_job_contacts()` chỉ khi đơn ứng tuyển ở `shortlisted`/`hired`; và (theo chỉ thị chủ dự án 19/11/2026) SĐT chủ quán trong seed là hotline công khai của 9 quán thật (xem `AGENTS.md` mục 14; 3 quán có số 8 hoặc 11 chữ số nên cần migration 0004 đã áp trước khi chạy seed; `0004` đã áp ngày 19/11/2026). SĐT người làm và phụ huynh vẫn là số giả `0900000…`. SĐT và tên phụ huynh không cấp cho client (`parental_consents` chỉ grant theo cột). Không trả số điện thoại ở bất kỳ RPC/trang nào khác.
- RPC công khai (`anon`) hiện có bảy hàm: năm hàm gốc (`get_parental_consent`, `submit_parental_consent`, `get_confirmation`, `submit_confirmation`, `get_public_profile`) và hai hàm chủ dự án duyệt ngày 19/11/2026 (`get_public_facility` trang quán công khai, `get_public_shift` chia sẻ ca; không SĐT, không tên chủ quán, không nhận xét). Không mở thêm. Chi tiết: `AGENTS.md` mục 11 và 13.
- Không thu CCCD, ảnh chân dung, địa chỉ nhà. Không SMS. Không thanh toán. Chỉ gói miễn phí.
- Giữ nguyên văn hằng `DISCLAIMER` và `NO_FEE` trong `src/lib/constants.ts`.
- Không bịa tên pháp nhân, địa chỉ, email, số điện thoại liên hệ.

## Cách làm việc
- Chủ dự án muốn: tự quyết những gì hợp lý, ghi lại giả định, chỉ hỏi khi quyết định ảnh hưởng nghiệp vụ mà đề bài chưa nói.
- Trả lời bằng tiếng Việt.
- Mỗi thay đổi ở `supabase/` phải chạy lại `npm run test:db` (kỳ vọng `358/358`, `privileges_check: … 0 dòng SAI/KIỂM`, `tái chạy … ĐẠT`, 5 dòng `✔ chạy đua`, `dọn dữ liệu demo … ĐẠT`; hoặc nhiều test hơn nếu thêm test).
- Mỗi thay đổi ở `src/` phải chạy `npx tsc --noEmit`; trước khi báo xong chạy thêm `next build` (lệnh ở mục Lệnh).
- `tsc` và `build` sạch **không** có nghĩa là chạy đúng. Chưa mở trên trình duyệt thì nói rõ là chưa kiểm.
- Migration `0001_init.sql` **đã áp lên Supabase thật ngày 17/11/2026** (lúc đó 85/85 test đạt trên Supabase; từ đó thêm test 11b nên là 86; migration `0002_toa_do_co_so.sql` thêm 18 test nhóm 12 nên là 104; migration `0003_viec_lam_dai_han.sql` (tuyển dụng lâu dài, đã áp lên Supabase thật ngày 19/11/2026) thêm 125 test nhóm 13 nên là 229; migration `0004_thong_bao_quan_cong_khai.sql` (thông báo, trang quán công khai, đánh giá quán, chia sẻ ca, nới SĐT chủ quán; đã áp lên Supabase thật ngày 19/11/2026, cùng đợt với `0003`; `privileges_check` ra 0 dòng SAI/KIỂM, đã chạy lại seed) thêm 128 test nhóm 14 và PR dữ liệu quán thật thêm test 10n nên nay là 358) → **KHÔNG sửa `0001`, `0002`, `0003`, `0004` nữa**. Mọi thay đổi schema là file migration mới (`0005_...sql` trở đi) kèm test, chủ dự án dán bằng SQL Editor, rồi chạy `supabase/tests/privileges_check.sql`.
- Thông báo lỗi nghiệp vụ là tiếng Việt trong `raise exception`; `edge_cases.sql` khớp theo chuỗi này → sửa câu chữ thì sửa cả test.
- Test SQL: hành động và kiểm tra phải là hai câu lệnh riêng (`pg_temp.t_do`), vì một câu không thấy dữ liệu hàm volatile vừa ghi.
- Server chạy UTC: mọi hiển thị giờ đi qua `src/lib/format.ts`.
- `'use client'` chỉ còn năm file: `src/components/client.tsx` (có `AppShell`), `src/components/map.tsx` (bản đồ MapLibre, cần trình duyệt), `src/components/hero-fx.tsx` (nền ánh nước WebGL của hero trang chủ, cần `window`/canvas, tải lười), `src/app/confirm/[token]/confirm-form.tsx`, `src/app/error.tsx` (error boundary của Next bắt buộc là Client Component). `/login` là Server Component, không có client Supabase cho đăng nhập.
- Next 15: `params` / `searchParams` là `Promise`.
- Không chạy `next dev` và `next build` cùng lúc (chung thư mục `.next`).

## Subagent
Xem `AGENTS.md`, mục 5 ("Quy trình agent mặc định"). Mặc định mở `claude` là phiên thường, không tự chạy subagent (đã tắt ngày 22/11/2026; `.claude/settings.json` không còn khóa `agent`). Muốn chạy quy trình này thì mở bằng `claude --agent safeshift-lead`. Agent `safeshift-lead` chỉ điều phối, thiết kế và review cuối, không viết mã hay chạy test. Việc chạy qua `execution-manager` và tối đa 2 `worker`, cả hai chạy Sonnet 5.5, effort `high`. Agent tự push nhánh và merge PR khi đủ các cổng ở mục 6, không chờ duyệt.

## Lệnh
```bash
npm run test:db                 # migration (0001 + 0002 + 0003 + 0004) + seed + 358 test + kiểm quyền + tái chạy + chạy đua + dọn demo, trên Postgres nhúng
npx tsc --noEmit
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npx next build
npm run dev                     # cần .env.local trỏ tới Supabase thật
```

## Bản đồ nhanh
- `supabase/migrations/0001_init.sql`, `0002_toa_do_co_so.sql`, `0003_viec_lam_dai_han.sql`, `0004_thong_bao_quan_cong_khai.sql` — nguồn sự thật của mọi quy tắc
- `supabase/seed.sql` · `supabase/tests/edge_cases.sql` · `db-test/`
- `supabase/tests/check_before_migration.sql` (trước migration) · `supabase/tests/privileges_check.sql` (sau migration) — chỉ đọc, dán vào SQL Editor
- `supabase/xoa_du_lieu_demo.sql` — xóa dữ liệu demo theo đúng thứ tự. **Không chạy** khi app còn là bản mô phỏng: xóa user demo thì nút đăng nhập hỏng (khôi phục bằng chạy lại `seed.sql`). Không xóa user demo hàng loạt bằng tay: lỗi khóa ngoại 23503
- `src/app/actions.ts` — mọi server action (1 action = 1 RPC; ngoại lệ duy nhất là `demoLogin`); đã có sẵn action cho tuyển dụng lâu dài (0003) và thông báo/đánh giá quán (0004), danh sách ở `AGENTS.md` mục 18
- `src/lib/{constants,types,format,auth}.ts` · `src/components/{ui,client}.tsx` · `tailwind.config.ts` (bảng màu, font) · `PRODUCT.md` (hướng giao diện) · `DESIGN.md` (hệ hình ảnh đang chạy) · `src/app/icon.svg` (biểu tượng trình duyệt); quy tắc bắt buộc ở `AGENTS.md` mục 18–23
- `README.md` (cài đặt, deploy) · `TESTING.md` (A: tự động, B: kịch bản tay)
