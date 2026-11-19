# PROJECT_HANDOFF — SafeShift

Tài liệu bàn giao cho AI agent tiếp theo (Claude Code). Viết ngày **16/11/2026, 21:00 (giờ VN)**.

**Quy ước nhãn trong tài liệu này**

- **[ĐÃ KIỂM]** — tôi đã tự chạy/đo trong phiên làm việc này.
- **[ĐỀ BÀI]** — chủ dự án nói rõ trong yêu cầu.
- **[TỰ QUYẾT]** — đề bài không nói; agent trước tự quyết, chủ dự án CHƯA xác nhận.
- **[CHƯA KIỂM]** — đã viết mã nhưng chưa từng chạy thật.
- **[KHÔNG CÓ DỮ LIỆU]** — không xuất hiện trong bất kỳ trao đổi nào; đừng suy đoán.

Nguồn của tài liệu này chỉ là **một phiên làm việc duy nhất** (16/11/2026). Agent trước không có quyền xem các cuộc trao đổi nào khác của chủ dự án.

---

## 0. Đọc cái này trước

| | |
|---|---|
| Thư mục dự án | `/Users/macpro/Desktop/Project/startup` |
| Hạn chót | Deploy ổn định **trước 20/11/2026**. Chạy **21–22/11**. Demo **26/11**. Theo quyết định 17/11/2026, app là **bản mô phỏng**: đợt 21–22/11 không dùng người thật, chỉ dữ liệu mẫu. |
| Hiện trạng | **17/11: migration đã áp lên Supabase thật (85/85 test đạt trên Supabase lúc đó; nay có 86 test).** Web đã deploy production tại https://safeshift-beta.vercel.app (Vercel project `safeshift`, team `safeshift`, nối GitHub: merge vào `main` là tự deploy; biến `NEXT_PUBLIC_*` đã đặt). Đăng nhập chỉ bằng 3 nút demo ở `/login` (server action `demoLogin`, mật khẩu chung công khai đặt bởi `seed.sql`); đã bỏ Google OAuth và magic link. **18/11: đã chạy lại `seed.sql` trên Supabase thật (16/16 user demo có mật khẩu; 3 tài khoản của nút demo đăng nhập được qua Supabase Auth). Chưa chạy tay `TESTING.md` mục B trên trình duyệt.** |
| Việc gấp nhất | Chạy lại `seed.sql` trên Supabase thật (để có mật khẩu demo) → chạy tay `TESTING.md` mục B → chuẩn bị demo 26/11. |

Lệnh kiểm tra nhanh trạng thái (đều đã chạy đạt lúc bàn giao):

```bash
npm run test:db
```

```bash
npx tsc --noEmit
```

```bash
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npx next build
```

---

## 1. PROJECT OVERVIEW

### Mục tiêu [ĐỀ BÀI]
SafeShift: web app kết nối ca làm ngắn hạn giữa cơ sở dịch vụ nhỏ ở Vũng Tàu (quán cà phê, nhà hàng, homestay, khách sạn nhỏ) và người làm là học sinh từ 15 tuổi hoặc sinh viên.

### Vấn đề cần giải quyết [ĐỀ BÀI]
- Cơ sở đã xác minh đăng ca; người làm nhận ca; mỗi ca có 1 người chính + 1 người dự phòng.
- Sau ca, chủ quán xác nhận qua link không cần đăng nhập; ca đã xác nhận được ghi vào "hồ sơ ca làm" công khai của người làm.
- Nền tảng **chỉ kết nối**. Lương, hợp đồng, điều kiện làm việc do hai bên tự thỏa thuận. Nền tảng chịu trách nhiệm **kiểm duyệt**: ai được đăng, việc gì được đăng, ai được nhận ca.
- Không thu phí, không có thanh toán trong app.

### Đối tượng người dùng [ĐỀ BÀI]
| Vai trò | Ai | Đặc điểm ảnh hưởng thiết kế |
|---|---|---|
| `worker` | Học sinh ≥ 15 tuổi, sinh viên | Người 15–17 cần phụ huynh đồng ý + admin duyệt |
| `employer` | Chủ quán | Có người lớn tuổi: chữ to, nút to, mỗi việc ≤ 3 bước |
| `admin` | Nhóm vận hành | Duyệt, điều phối, nhắc ca qua Zalo (dán tay) |
| (không tài khoản) | Phụ huynh; chủ quán khi xác nhận sau ca | Mở link có token, không đăng nhập |

### Phạm vi
- **Trong phạm vi [ĐỀ BÀI]:** toàn bộ chức năng ở mục 6.
- **Ngoài phạm vi [ĐỀ BÀI]:** thanh toán, thu phí, SMS, thu CCCD/ảnh chân dung/địa chỉ nhà.
- **Quy mô:** bản mô phỏng với dữ liệu mẫu của `seed.sql` (1 admin, 5 quán, 10 người làm, 12 ca). Đừng tối ưu cho quy mô lớn hơn.

---

## 2. PROJECT HISTORY

### Quá trình hình thành ý tưởng
**[KHÔNG CÓ DỮ LIỆU].** Chủ dự án đưa thẳng một bản đặc tả hoàn chỉnh ở tin nhắn đầu tiên. Không có trao đổi nào về nguồn gốc ý tưởng, nghiên cứu thị trường, hay vì sao chọn Vũng Tàu. Bối cảnh tổ chức (cuộc thi? môn học? startup?) cũng không được nói — chỉ biết có "demo ngày 26/11".

### Diễn biến trong phiên làm việc (16/11/2026)
1. **~10:20** — Chủ dự án giao đề bài dạng "hợp đồng": tự quyết kiến trúc, không hỏi lại những gì tự quyết hợp lý được, làm hết trong một lượt.
2. Agent thiết kế và viết `supabase/migrations/0001_init.sql`. Lúc này máy **không có Postgres/Docker/Supabase CLI**.
3. Chủ dự án fork cuộc trò chuyện sang một phiên khác. **Phiên fork đó đã tạo thư mục `db-test/`** (Postgres nhúng qua gói npm `embedded-postgres` + `run.mjs`). Phiên fork sau đó bị dừng giữa chừng; agent chính **không đọc nội dung phiên fork**, chỉ dùng lại `db-test/run.mjs` có sẵn trên đĩa.
4. Chủ dự án nhắn: *"tôi đã cài postgres, bạn hãy triển khai"*. Thực tế không có Postgres hệ thống (không `psql`, không Homebrew) — "postgres" chính là bản nhúng trong `db-test/node_modules`.
5. Agent viết `seed.sql`, `tests/edge_cases.sql`, `db-test/race.mjs`; chạy đạt 79/79 + chạy đua 5/5.
6. Chủ dự án nhắn: *"khuyến khích bạn chạy subagents để tối ưu hóa nhé, bạn tự chia việc cho subagent"*.
7. Agent viết khung dùng chung của Next.js rồi giao 3 nhóm trang cho 3 subagent chạy song song.
8. **Cả 3 subagent chết vì chạm giới hạn dùng 5 giờ (HTTP 429)**, chưa ghi file nào. Sau 15:10 được gọi lại. Hai subagent (người làm, admin) hoàn thành. **Subagent thứ ba (chủ quán + trang công khai) bị dừng khi phiên kết thúc**: đã viết 6/8 trang, thiếu 2 trang pháp lý.
9. **~20:50** — Chủ dự án yêu cầu tài liệu bàn giao này để chuyển sang Claude Code.

### Hướng đã thử / phương án bị loại (đều là quyết định của agent, xem lý do)
| Phương án bị loại | Lý do | Thay bằng |
|---|---|---|
| Kiểm tra quy tắc ở giao diện / server action | Đề bài yêu cầu chặn ở tầng database | Trigger + RPC + RLS |
| Cho client INSERT/UPDATE qua RLS policy | Khó chứng minh đúng; dễ hở khi thêm cột | Không có policy ghi nào; ghi 100% qua RPC `SECURITY DEFINER` |
| Dùng service-role key ở Next.js | Lộ key = mất hết | Web chỉ dùng anon key |
| Số điện thoại là cột trong `profiles` | RLS theo dòng không che được cột | Bảng riêng `private_contacts` + RPC `get_shift_contacts` |
| Sinh token xác nhận bằng cron lúc hết giờ ca | Phụ thuộc `pg_cron`, thêm điểm hỏng | Sinh lười khi chủ quán/admin mở trang; hạn = giờ kết thúc ca + 72h |
| PGlite (Postgres WASM) để test | Đã có `embedded-postgres` (Postgres 18.6 thật) | `db-test/` |
| Chạy thử web trên máy với DB local | Web cần PostgREST + GoTrue, không chỉ Postgres; máy không có Docker | Chỉ `next build`; chạy thật phải có Supabase project |
| Chủ quán sửa ca sau khi đăng | Giảm bề mặt lỗi trước deadline | Chỉ có: đăng, nhân bản, hủy |
| Trang `/admin/tai-khoan` riêng | Thừa | Khóa/mở nằm trong trang người làm và trang cơ sở |

### Thay đổi tư duy/chiến lược trong phiên
- **Giới hạn 40 giờ/tuần:** ban đầu định áp 40h cho người dưới 18 và 48h cho người lớn; **đổi thành 40h cho tất cả** vì đề bài đặt câu này trong mục về người dưới 18 nhưng viết ở dạng tổng quát, còn kịch bản test "ca thứ 41 giờ" không nói tuổi. Chặt hơn thì không sai trong đợt chạy 2 ngày. → **cần chủ dự án xác nhận.**
- **Cách làm việc:** từ "một agent viết hết" sang "agent chính viết khung + hợp đồng dùng chung, subagent viết trang" theo đề nghị của chủ dự án.

---

## 3. CURRENT STATUS

### Đã hoàn thành
| Hạng mục | Trạng thái |
|---|---|
| `supabase/migrations/0001_init.sql` (15 bảng, 16 enum, trigger, 64 hàm, RLS mọi bảng, phân quyền) | **[ĐÃ KIỂM]** chạy sạch trên Postgres 18.6 nhúng |
| `supabase/seed.sql` (1 admin, 5 quán, 10 người làm trong đó 3 người dưới 18, 12 ca đủ trạng thái) | **[ĐÃ KIỂM]** |
| `supabase/tests/edge_cases.sql` | **[ĐÃ KIỂM]** 86/86 đạt trên Postgres nhúng; trên Supabase thật 85/85 đạt ngày 17/11 (trước khi thêm test 11b) |
| `db-test/race.mjs` — 3 người giành 1 chỗ dự phòng trên 3 kết nối | **[ĐÃ KIỂM]** 5/5 lần: đúng 1 người được |
| Khung Next.js: cấu hình, middleware, client Supabase, `lib/`, `components/`, `actions.ts`, layout, trang chủ, đăng nhập demo | **[ĐÃ KIỂM]** `tsc` sạch, `next build` thành công; đã deploy Vercel |
| Trang người làm: `/register/*`, `/shifts`, `/shifts/[id]`, `/my-shifts`, `/profile`, `/account` | Build được. **[CHƯA KIỂM]** trên trình duyệt |
| Trang admin: `/admin`, `/admin/facilities`, `/admin/workers`, `/admin/reports`, `/admin/kpi` (+CSV), `/admin/audit` | Build được. **[CHƯA KIỂM]** trên trình duyệt |
| Trang chủ quán + công khai: `/employer`, `/employer/new-shift`, `/employer/shifts/[id]`, `/confirm/[token]`, `/consent/[token]`, `/p/[slug]` | Build được; đã rà 6 file này. **[CHƯA KIỂM]** trên trình duyệt |
| `/terms`, `/privacy` | Agent chính viết lúc ~21:15. Build được. **[CHƯA KIỂM]** trên trình duyệt. **Chưa có thông tin liên hệ/tên đơn vị** — đang ghi "liên hệ nhóm vận hành qua kênh đã thông báo khi đăng ký" |
| `README.md`, `TESTING.md` | Xong |
| `supabase/functions/shift-reminders/index.ts` (nhắc ca qua email) | Viết xong. **[CHƯA KIỂM]** — chưa deploy, chưa chạy lần nào. Mặc định tắt |

### Chưa thực hiện
1. ~~Hai trang `/terms`, `/privacy`~~ — **đã viết** (xem bảng trên). Nội dung do agent soạn theo hành vi thật của hệ thống; **chủ dự án chưa đọc duyệt** và đây không phải văn bản do luật sư soạn.
2. ~~Tạo Supabase project, deploy Vercel~~ — đã xong (17/11). Không còn cấu hình Google OAuth (đã bỏ). `seed.sql` đã chạy lại trên Supabase thật (18/11), user demo có mật khẩu.
3. Chưa chạy bất kỳ luồng nào trên trình duyệt (kịch bản tay ở `TESTING.md` mục B chưa ai chạy).
4. ~~`git init`~~ — đã xong; repo `tangkhatnk/covershift`, làm việc theo `AGENTS.md` mục 6.
5. ~~Giao diện cho action `hideComment`~~ — đã có nút ẩn/hiện nhận xét ở `/employer/shifts/[id]` cho nhóm vận hành.
6. ~~Rà soát mã 6 file của subagent thứ ba~~ — đã rà.

### Lỗi và vấn đề tồn đọng đã biết
| # | Vấn đề | Mức độ |
|---|---|---|
| 1 | Nội dung hai trang pháp lý chưa được chủ dự án duyệt; thiếu thông tin liên hệ | Cần duyệt trước demo |
| 2 | (đã hết) README liệt kê hai trang pháp lý — nay đã khớp | — |
| 3 | Người làm chưa được duyệt vẫn thấy nút "Nhận ca này" ở `/shifts/[id]`; bấm thì database từ chối bằng thông báo tiếng Việt | Thẩm mỹ; an toàn |
| 4 | `primaryBusy` trả về dạng "lỗi" (khung đỏ) khi ca không có người dự phòng, dù sự cố đã được ghi thành công | Chủ ý: đây là cảnh báo cần hành động |
| 5 | Ca đã hết giờ mà không ai nhận sẽ nằm mãi ở trạng thái `open` trong database (giao diện hiện "Không có người nhận") | Không ảnh hưởng đợt chạy; KPI vẫn đúng |
| 6 | `admin_set_facility_status` nhận cả `pending` nhưng giao diện chỉ có nút "Gỡ" | Thiếu nhỏ |
| 7 | `db-test/run.mjs` in dòng "SYNCHRONOUS TERMINATION NOTICE" khi kết thúc | Vô hại (thư viện `embedded-postgres`) |
| 8 | Chân trang nhật ký admin hiện khóa `detail` bằng tiếng Anh (`reason`, `note`, `had_backup`) | Thẩm mỹ |

---

## 4. IMPORTANT DECISIONS

### Quyết định đã thống nhất với chủ dự án [ĐỀ BÀI]
- Stack: Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth, RLS, Edge Functions) + Vercel, **chỉ gói miễn phí**.
- Đăng nhập: ban đầu Google OAuth hoặc email magic link, **không SMS**. Đã thay bằng đăng nhập demo, xem quyết định D2 bên dưới.
- UI tiếng Việt, ưu tiên điện thoại 360–414px.
- **Ổn định quan trọng hơn nhiều tính năng.**
- Quy tắc nghiệp vụ chặn ở tầng database.
- Nhắc ca qua email là phần phụ: được phép bỏ nếu gây rủi ro cho deadline, miễn ghi rõ.

### Quyết định của chủ dự án ngày 17/11/2026 [CHỦ DỰ ÁN]
| # | Quyết định | Hệ quả |
|---|---|---|
| D1 | App chỉ là **bản mô phỏng**; đợt 21–22/11 không dùng người thật, chỉ dữ liệu mẫu | Không cần đưa người dùng thật vào; quy tắc migration (không sửa `0001`) giữ nguyên |
| D2 | **Bỏ Google OAuth và magic link.** `/login` có 3 nút một chạm (người làm `nguoilam1@`, chủ quán `quan1@`, nhóm vận hành `admin@`, đều `@demo.safeshift.test`). Server action `demoLogin` gọi `signInWithPassword` với mật khẩu chung công khai `safeshift-demo` (đặt trong `seed.sql` bằng `extensions.crypt`) | `demoLogin` là ngoại lệ duy nhất của quy tắc "1 action = 1 RPC", chỉ nhận vai trò, không nhận email tùy ý. Không cần Google Cloud, SMTP, Redirect URL. Confirm email vẫn BẬT trên Supabase. Không đưa dữ liệu thật vào project |
| D3 | Test 10m đổi thành "mọi user demo đều có mật khẩu" | Số test vẫn 86 |
| D4 | Khôi phục dữ liệu mẫu bằng cách chạy lại `seed.sql` trong SQL Editor (seed tự xóa và tạo lại 20 user demo) | **Không chạy** `xoa_du_lieu_demo.sql`: xóa user demo thì nút đăng nhập hỏng |
| D5 | Web đã deploy production tại https://safeshift-beta.vercel.app (Vercel project `safeshift`, team `safeshift`, nối GitHub, merge vào `main` là tự deploy; biến `NEXT_PUBLIC_*` đã đặt) | Deploy web không cần hỏi trước (`AGENTS.md` mục 5) |
| D6 | Theo chỉ thị chủ dự án 19/11/2026: **đường dẫn web đổi sang tiếng Anh** (bảng đổi tên ở `AGENTS.md` mục 18), giữ nguyên kiến trúc server trên Vercel; đường dẫn cũ (`/dang-nhap`, `/ca/[id]`, `/xac-nhan/[token]`…) redirect vĩnh viễn 308 trong `next.config.mjs`, giữ query string | Link cũ đã gửi (Zalo, phụ huynh, chủ quán) vẫn mở được. Không static export, không `basePath`, không đổi database. Các chỗ còn ghi đường dẫn cũ trong file này (nếu có) là lịch sử |

### Quyết định do agent tự đưa ra [TỰ QUYẾT] — chủ dự án chưa xác nhận từng điểm
| # | Quyết định | Lý do |
|---|---|---|
| G1 | Múi giờ nghiệp vụ `Asia/Ho_Chi_Minh` cho mọi quy tắc (22:00, tuần thứ Hai–Chủ nhật, tuổi) | Server Vercel/Supabase chạy UTC |
| G2 | Tuổi tính **tại ngày diễn ra ca**, không phải ngày đăng ký | Người sắp sinh nhật 18 |
| G3 | "Kết thúc trước 22:00" = kết thúc **≤ 22:00**, cùng ngày, và bắt đầu **≥ 06:00** | Thêm vế 06:00 để chặn ca rạng sáng |
| G4 | **40 giờ/tuần áp cho MỌI người làm**, tính cả suất dự phòng | Xem mục 2. Tham số `weekly_hours_cap` |
| G5 | "Số người cần" = N người chính (1–5) + luôn 1 người dự phòng | Đề bài vừa nói "1 chính + 1 dự phòng" vừa có trường "số người cần" |
| G6 | Mỗi chủ quán đúng **một** cơ sở (`facilities.owner_id` unique) | Đơn giản hóa giao diện |
| G7 | Mọi người làm (kể cả ≥ 18) đều cần admin duyệt | Đề bài: "duyệt người làm" |
| G8 | Giấy phép kinh doanh: **ghi nhận, không bắt buộc**. Bắt buộc: đúng địa chỉ + đúng người liên hệ | Nhiều hộ kinh doanh nhỏ |
| G9 | Loại hình cơ sở là **allowlist** 4 giá trị enum; thêm trigger chặn tên chứa bar/pub/club/karaoke/massage/mát xa/vũ trường; thêm ô tick tự khai | Có thể chặn nhầm tên như "Snack Bar" → admin xử lý tay |
| G10 | Hủy dưới 2 tiếng: ghi `late_cancel` **và vẫn đưa người dự phòng lên**, đồng thời tạo báo cáo cho admin | Đề bài chỉ nói "ghi late_cancel" |
| G11 | Không cho nhận hai ca trùng giờ | Đề bài không nói |
| G12 | Ca dài 1–12 giờ; đăng trước tối đa 60 ngày | Đề bài không nói |
| G13 | Một link xác nhận cho **cả ca** (liệt kê mọi người chính), không phải mỗi người một link | Chủ quán bấm một lần |
| G14 | Token lưu **dạng thô** trong bảng không có policy đọc | Để admin/chủ quán sao chép lại link. Đánh đổi: ai đọc được database thì thấy token |
| G15 | Số điện thoại hai bên còn xem được đến **7 ngày sau ca** | Đề bài không nói thời hạn |
| G16 | "Đã được trả đủ chưa" chỉ trả lời **một lần**, không sửa | Admin xử lý tiếp qua báo cáo |
| G17 | Tên và ngày sinh không tự sửa được trong app | Chống gian lận tuổi |
| G18 | Hồ sơ công khai hiện **họ tên đầy đủ**; mặc định **tắt** chia sẻ | Là "CV" của người làm |
| G19 | Xóa tài khoản = xóa cứng, cascade toàn bộ; KPI lịch sử giảm theo | Đề bài: "xóa tài khoản và toàn bộ dữ liệu" |
| G20 | Tài khoản admin không tự xóa/tự khóa được trong app; tạo admin bằng SQL `make_admin()` (bản mô phỏng: `admin@demo.safeshift.test` do seed tạo, xem D2) | An toàn vận hành |
| G21 | Khu vực: Bãi Trước, Bãi Sau, Thắng Tam, Trung tâm, **Rạch Dừa**, Khác | Đề bài ghi "…" — Rạch Dừa là agent tự thêm |
| G22 | Khung giờ rảnh: 6 ô (ngày thường/cuối tuần × sáng/chiều/tối) | Đề bài chỉ ghi "khung giờ rảnh" |
| G23 | Next.js **15.5.29** + Tailwind **3.4.19**, không dùng bản mới hơn | Chọn bản agent nắm chắc; ưu tiên ổn định |

### Giả định mới, chưa xác nhận, theo chỉ thị chủ dự án 19/11/2026 (tuyển dụng lâu dài, migration `0003`)
Chỉ thị: thêm "tuyển dụng lâu dài" (tin + đơn ứng tuyển) và cho phép SĐT hai bên lộ qua một RPC riêng. Các điểm dưới do agent chính chốt, chủ dự án có thể đổi:
| # | Giả định | Ghi chú |
|---|---|---|
| H1 | Chỉ người làm đã duyệt và **đủ 18 tuổi** ứng tuyển và xem tin; chưa mở cho 15–17 | Cần chủ dự án duyệt nếu muốn mở cho 15–17 (liên quan phụ huynh, giờ làm của người dưới 18) |
| H2 | Lương thấp nhất bắt buộc: giờ ≥ `min_hourly_wage` (25.500), tháng ≥ khóa mới `min_monthly_wage` (5.310.000, admin đổi được) | Con số tháng do agent chọn |
| H3 | Tin tối đa 30 ngày, 1–10 chỗ, 1–48 giờ/tuần; không sửa nội dung, chỉ đóng; tin không tự đóng khi đủ người | |
| H4 | Chủ quán xem thống kê hồ sơ ca làm của người ứng tuyển **không cần** họ bật chia sẻ; không có ngày sinh, trường, lớp, SĐT | Ngoại lệ so với "mặc định tắt chia sẻ" (mục 13 `AGENTS.md`) |
| H5 | **Ngoại lệ SĐT mới:** `get_job_contacts()` trả SĐT hai bên khi đơn ở `shortlisted`/`hired` (chủ quán, người nộp hoặc admin); chặn nếu cơ sở bị gỡ hoặc người làm bị khóa (trừ admin) | Ghi ở `AGENTS.md` mục 13, `CLAUDE.md` |
| H6 | Người bị loại (`rejected`) vẫn nộp lại được vào cùng tin (đơn cũ không còn hiệu lực) | Chưa chặn nộp lại, có thể cần giới hạn nếu bị làm phiền |

### Quyết định của chủ dự án ngày 19/11/2026: dữ liệu quán thật trong bản mô phỏng [CHỦ DỰ ÁN]
| # | Quyết định | Hệ quả |
|---|---|---|
| P1 | Chủ dự án cho dùng **tên, địa chỉ và hotline công khai** của 9 quán thật ở Vũng Tàu (SOHO Coffee, Phê La Vũng Tàu, OASIS SEA Coffee & Tea, An Coffee Bean, KATINAT, Quán Ốc Thiên Nhiên 2, Bọt, Phuc Long Coffee & Tea, Texas Chicken) trong `seed.sql`, thay "Quán Demo 1–5" | 9 cơ sở, 9 chủ quán demo (`quan1–9@`; chủ `quan6–9@` mới), seed tạo 20 user demo. 5 cơ sở cũ giữ id và trạng thái (số 4 bị test 10j gỡ, số 5 chờ xác minh) |
| P2 | Hotline nằm ở `private_contacts.phone` của chủ quán tương ứng; SĐT người làm và phụ huynh vẫn là số giả `0900000…` | Cả 9 quán có hotline thật. Phê La (8 chữ số), Phuc Long và Texas Chicken (11 chữ số) chỉ qua được ràng buộc đã nới ở `0004` (`0001` chỉ nhận đúng 10 số): **seed này cần `0004` đã áp** trước khi chạy |
| P3 | Hotline hiện cho người làm qua `get_shift_contacts()` | Giao diện cần dòng nhắc "Dữ liệu mô phỏng. Không gọi số này để hỏi về ca." (làm ở PR sau, chưa có) |
| P4 | Tọa độ ghim lấy từ OpenStreetMap, gần đúng (chỉ quán OASIS SEA ra đúng số nhà); `area` gán theo khu gần nhất trong enum | Chủ quán hoặc nhóm vận hành sửa ghim bằng `set_facility_location` |

Việc sau khi merge: chạy lại `seed.sql` trên Supabase thật (không trong 21–22/11).

### Giả định mới, chưa xác nhận, theo chỉ thị chủ dự án 19/11/2026 (thông báo, trang quán công khai, đánh giá quán, chia sẻ ca; migration `0004`)
Chỉ thị: "khỏi giới hạn, cứ làm hết mình"; chủ dự án đã duyệt hai RPC công khai `anon` mới và việc nới SĐT chủ quán. Các điểm dưới do agent tự chốt:
| # | Giả định | Ghi chú |
|---|---|---|
| I1 | **Hai RPC công khai mới** `get_public_facility`, `get_public_shift` (nay có bảy RPC `anon`); lỗi chung cho mọi trường hợp không đủ điều kiện | Chủ dự án đã duyệt; `AGENTS.md` mục 11, 13 |
| I2 | Trang quán công khai chỉ có điểm trung bình và số lượt đánh giá, **không có nhận xét**, không có tên/SĐT chủ quán | Để không lộ danh tính người làm; muốn hiện nhận xét là quyết định riêng |
| I3 | Đánh giá quán: chỉ người được chủ quán xác nhận "đã làm", mỗi ca một lần, không sửa, không giới hạn thời gian sau ca; nhóm vận hành ẩn/hiện | Chưa có hạn (vd. 30 ngày) và chưa cho chủ quán xem nhận xét |
| I4 | Mô tả ca (≤ 500 ký tự, do chủ quán gõ) hiện công khai ở `get_public_shift`; chủ quán có thể tự ghi SĐT vào đó | Cần nhắc ở form đăng ca; DB không lọc được |
| I5 | Thông báo: sinh bằng trigger (6 loại), không có hạn lưu, người dự phòng bị đổi xuống không được báo, người làm tự rút đơn không báo chủ quán; seed không sinh thông báo tự động (chế độ `_bypass`) | Có thể thêm sau |
| I6 | SĐT: cột `private_contacts.phone` nới chung (`0` + 9–10 số, hoặc `1800`/`1900` + 4–6 số); người làm và phụ huynh vẫn 10 số | Quán thật nhập hotline; mọi SĐT cũ vẫn hợp lệ |
| I7 | Mã công khai của quán ngẫu nhiên 12 ký tự hex, đổi không có RPC (chủ quán chưa tự đổi/thu hồi mã được) | Lộ mã thì chỉ lộ thông tin đã công khai, nhưng chưa có cách thu hồi |

### Giả định chưa được kiểm chứng [CHƯA KIỂM]
- Migration chạy được trên **Supabase thật**. Mới chỉ chạy trên Postgres 18 nhúng với schema `auth` giả lập. Điểm rủi ro cụ thể:
  - `delete from auth.users` trong `delete_my_account()` — giả định role `postgres` của Supabase có quyền này.
  - `revoke ... from anon, authenticated` có thắng được default privileges của Supabase không.
  - Seed chèn thẳng `auth.users` / `auth.identities` với danh sách cột do agent nhớ; và `extensions.crypt()` / `gen_salt()` tồn tại.
  - `_bypass()` dựa vào `session_user in ('postgres','supabase_admin')` khi chạy seed trong SQL Editor.
- PostgREST nhận đúng kiểu tham số RPC (enum dạng chuỗi, `text[]`, `time`, `jsonb`).
- Gói miễn phí Supabase tạm dừng project sau ~1 tuần không truy cập (**chưa tra cứu lại**).
- Resend gói miễn phí cần tên miền đã xác minh mới gửi cho người nhận tùy ý (**chưa tra cứu lại**).

---

## 5. TECHNICAL INFORMATION

### Công nghệ (phiên bản đã cài, khóa trong `package.json`)
Next.js 15.5.29 · React 19 · TypeScript 5.9.3 · Tailwind 3.4.19 · `@supabase/ssr` 0.12.7 · `@supabase/supabase-js` 2.119.0 · Node 24.16 trên máy (yêu cầu ≥ 20). Test DB: `embedded-postgres` (Postgres 18.6) + `pg`.

### Kiến trúc
```
Trình duyệt ─► Next.js (Server Component đọc, Server Action ghi; anon key + cookie phiên)
                   │ supabase.rpc() / select
                   ▼
             Postgres (Supabase)
             ├─ RLS bật ở MỌI bảng; chỉ có policy SELECT
             ├─ RPC SECURITY DEFINER = đường ghi DUY NHẤT; tự kiểm tra vai trò
             └─ Trigger/constraint = chặn lần hai (kể cả service-role)
```
- Web **không có** service-role key và không có biến môi trường bí mật.
- `middleware.ts` chỉ làm mới cookie phiên; bỏ qua `/confirm`, `/consent`. Phân quyền thật nằm ở database; `requireRole()` chỉ để điều hướng.

### Cấu trúc thư mục
```
supabase/
  migrations/0001_init.sql        NGUỒN SỰ THẬT của mọi quy tắc nghiệp vụ
  seed.sql                        dữ liệu demo, chạy lại được
  tests/edge_cases.sql            86 test; có ghi dữ liệu → chạy lại seed sau khi test
  functions/shift-reminders/      Edge Function email (tùy chọn)
db-test/                          run.mjs (migration→seed→test), race.mjs (chạy đua)
src/
  app/actions.ts                  TẤT CẢ server action; mỗi action = 1 RPC
  app/**/page.tsx                 trang (xem sơ đồ route trong README.md)
  lib/constants.ts                nhãn tiếng Việt cho enum, APP_NAME, DISCLAIMER, NO_FEE
  lib/types.ts                    kiểu của JSON mà RPC trả về (viết tay)
  lib/format.ts                   định dạng giờ VN, shiftState(), normalizePhone()
  lib/auth.ts                     getContext(), requireRole(), homeFor()
  lib/supabase/{server,client,middleware}.ts
  components/ui.tsx               server-safe: btn(), Card, Badge, Alert, Field, Check, ShiftCard, Tel, Stars…
  components/client.tsx           ActionForm, SubmitButton, CopyButton, PrintButton
README.md                         cài đặt, deploy, OAuth, vận hành
TESTING.md                        A: test tự động · B: kịch bản tay trên giao diện
```

### Database
**Bảng (15):** `app_config`, `profiles`, `private_contacts`, `worker_profiles`, `parental_consents`, `facilities`, `facility_verifications`, `shifts`, `shift_claims`, `shift_confirmation_tokens`, `shift_results`, `payment_feedback`, `reports`, `worker_events`, `admin_audit_log`.

**Trigger chặn quy tắc:** `worker_profiles_guard` (≥ 15 tuổi, khóa ngày sinh) · `facilities_guard` (tên bị cấm, `verified` cần phiếu xác minh) · `shifts_validate` (cơ sở đã xác minh, lương tối thiểu, giờ cho người dưới 18) · `claims_validate` (duyệt, phụ huynh, giờ dưới 18, trùng giờ, 40h/tuần, số chỗ) · `payment_feedback_report` (tự tạo báo cáo).

**Chống nhận trùng:** `claim_shift()` khóa dòng ca bằng `SELECT … FOR UPDATE` + hai unique index một phần trên `shift_claims`.

**RPC cho client** (đều trả `jsonb` hoặc kiểu đơn; chữ ký đầy đủ ở cuối file migration, khối `grant execute`):
- Không cần đăng nhập: `get_parental_consent`, `submit_parental_consent`, `get_confirmation`, `submit_confirmation`, `get_public_profile`
- Tài khoản: `register_worker`, `register_employer`, `update_worker_profile`, `set_profile_sharing`, `regenerate_consent_link`, `delete_my_account`
- Ca: `create_shift`, `cancel_shift`, `claim_shift`, `cancel_claim`, `swap_roles`, `get_shift_contacts`, `feed_shifts`, `shift_detail`, `my_shifts`, `employer_shifts`, `submit_payment_feedback`, `create_report`
- Admin: `admin_verify_facility`, `admin_set_facility_status`, `admin_review_worker`, `admin_set_account_status`, `admin_primary_busy`, `admin_resolve_report`, `admin_hide_comment`, `admin_set_config`, `admin_dispatch_board`, `admin_list_workers`, `admin_list_facilities`, `admin_list_reports`, `admin_audit`, `admin_kpis`
- Chỉ chạy bằng quyền postgres: `make_admin(email, tên)`; chỉ service-role: `generate_due_confirmation_tokens()`

**Tham số cấu hình** (`app_config`, sửa ở `/admin/kpi`): `min_hourly_wage` = 25500, `weekly_hours_cap` = 40.

### Tích hợp
| Tích hợp | Trạng thái |
|---|---|
| Supabase Auth (mật khẩu demo qua `demoLogin`; đã bỏ Google OAuth và magic link) | Seed đã chạy lại (18/11); 3 tài khoản demo đăng nhập được qua API Supabase Auth. **[CHƯA KIỂM]** bấm nút trên trình duyệt |
| Vercel | Đã deploy: https://safeshift-beta.vercel.app |
| Resend (email nhắc ca) | Tùy chọn, chưa cấu hình |
| Zalo | **Không tích hợp API** — admin bấm "sao chép tin nhắn" rồi dán tay [ĐỀ BÀI] |

### Biến môi trường
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (dùng tạo link gửi phụ huynh/chủ quán — sai là link hỏng). Mẫu ở `.env.example`.

### Lưu ý khi phát triển
- **Đừng thêm policy INSERT/UPDATE/DELETE hay `grant insert…` cho client.** Cần thao tác ghi mới → viết RPC `SECURITY DEFINER` có `set search_path = public`, thêm vào khối `grant execute` cuối migration, thêm action vào `actions.ts`.
- Hàm tạo sau khối `revoke execute on all functions` sẽ **tự được cấp quyền cho mọi người** theo mặc định của Supabase → luôn revoke rồi grant lại rõ ràng.
- Thông báo lỗi nghiệp vụ là **tiếng Việt, viết ngay trong `raise exception`** và hiện nguyên văn cho người dùng (`friendly()` trong `actions.ts`). Test khớp theo chuỗi này — sửa câu chữ thì sửa cả `edge_cases.sql`.
- Trong một câu SQL, phần đọc **không thấy** dữ liệu mà hàm volatile vừa ghi trong chính câu đó. Vì vậy test dùng `t_do(hành động, kiểm tra)` hai câu riêng. Đã mắc lỗi này một lần.
- Server chạy UTC: mọi hiển thị giờ phải qua `src/lib/format.ts`.
- Next 15: `params` / `searchParams` là `Promise`.
- `_bypass()` (bỏ qua trigger khi seed) chỉ bật khi `app.seed_mode = 'on'` **và** `session_user` là `postgres`/`supabase_admin`. Không nới điều kiện này.
- **`0001_init.sql` (17/11/2026) và `0002_toa_do_co_so.sql` (18/11/2026) đã áp lên Supabase thật → không sửa hai file này nữa.** Mọi thay đổi schema là file migration mới (`0003_...sql`) kèm test.
- `next build` và `next dev` dùng chung `.next/` — đừng chạy song song.

---

## 6. USER REQUIREMENTS

### Yêu cầu bắt buộc [ĐỀ BÀI] và trạng thái
| # | Quy tắc | Database | Giao diện |
|---|---|---|---|
| 1 | < 15 tuổi không đăng ký được; 15–17 cần phụ huynh đồng ý qua link token (họ tên, SĐT, tick) + admin duyệt | ✅ test 1a–1i | có, chưa chạy thử |
| 2 | Chỉ cơ sở `verified = true` đăng ca; admin bật sau xác minh thực tế kèm checklist (địa chỉ, người liên hệ, giấy phép, ngày, người xác minh, ghi chú) | ✅ 4e, 4j, 4k | có, chưa chạy thử |
| 3 | Loại việc enum cố định 7 giá trị; chặn bar, karaoke, massage, công trường, việc dưới nước, giao hàng xe máy | ✅ 4g–4i | có |
| 4 | < 18: chỉ thấy và nhận ca kết thúc trước 22:00, ≤ 8 giờ; tổng giờ tuần ≤ 40 | ✅ 2a–2f, 3a–3b | có |
| 5 | Lương/giờ bắt buộc; < mức tối thiểu (mặc định 25.500đ) thì từ chối | ✅ 4a–4d | có |
| 6 | Đăng ca phải tick cam kết: không thu phí, không đặt cọc, không giữ giấy tờ | ✅ 4f | có |
| 7 | SĐT chỉ hiện cho nhau sau khi ghép ca; không đọc được qua API khi chưa ghép | ✅ 7a–7j | có |
| 8 | Dữ liệu tối thiểu; không CCCD/ảnh/địa chỉ nhà; có xóa tài khoản + toàn bộ dữ liệu | ✅ 11a | có |
| 9 | Xin đồng ý xử lý dữ liệu khi đăng ký; trang Điều khoản + Chính sách dữ liệu có câu "…chỉ kết nối người làm và nơi thuê…"; chân trang "Không bao giờ thu phí người làm." | ✅ 1c | có (hai trang dùng hằng `DISCLAIMER`), chưa chạy thử |

Chức năng: đăng ca / nhân bản / đổi thứ tự chính–dự phòng ✅ · feed (gấp lên đầu, lọc ngày/khu vực/loại việc) ✅ · nhận ca có khóa ✅ · hủy ca (mốc 2 tiếng) ✅ · câu hỏi trả đủ → báo cáo ✅ · hồ sơ công khai bật/tắt + in ✅ · link xác nhận dùng một lần, hết hạn 72h ✅ · admin: duyệt, điều phối 24h, sao chép tin nhắc ca, "người chính báo bận", hộp báo cáo, khóa/mở, gỡ cơ sở, KPI + CSV (đủ 11 chỉ số đề bài + số ca bị hủy), audit log ✅ · email nhắc ca: viết xong, **mặc định tắt**.

(✅ ở cột giao diện = có mã và build được; **chưa cái nào được bấm thử trên trình duyệt**.)

### Những điều không được thay đổi [ĐỀ BÀI]
- Stack và ràng buộc "chỉ gói miễn phí".
- Không SMS. Không thanh toán/thu phí trong app.
- Không thu CCCD, ảnh chân dung, địa chỉ nhà.
- Quy tắc nghiệp vụ phải ở tầng database, không chỉ giao diện.
- Danh sách 7 loại việc và các loại hình bị cấm.
- Hai câu chữ nguyên văn: *"SafeShift chỉ kết nối người làm và nơi thuê. Lương, hợp đồng và điều kiện làm việc do hai bên tự thỏa thuận."* (hằng `DISCLAIMER`) và *"Không bao giờ thu phí người làm."* (hằng `NO_FEE`).
- Cách làm việc chủ dự án muốn: tự quyết những gì hợp lý, ghi lại giả định, chỉ hỏi khi quyết định ảnh hưởng nghiệp vụ mà đề bài chưa nói; không giải thích kiến thức cơ bản.

### Tiêu chí đánh giá kết quả
- [ĐỀ BÀI] Deploy và chạy ổn định trước 20/11; qua được đợt chạy 21–22/11 (bản mô phỏng); demo 26/11.
- [ĐỀ BÀI] 7 trường hợp biên phải bị chặn: 14 tuổi đăng ký · dưới 18 nhận ca 23:00 · giờ thứ 41 trong tuần · lương dưới tối thiểu · token đã dùng / hết hạn · hai người cùng nhận chỗ cuối · người chưa ghép gọi API lấy SĐT. → Cả 7 đã có test tự động đạt.
- [ĐỀ BÀI] 7 hạng mục giao hàng: (1) giả định, kiến trúc, route · (2) SQL migration · (3) mã nguồn · (4) seed · (5) README · (6) kịch bản test · (7) danh sách việc chưa làm/rủi ro. → (1)(7) nằm trong tài liệu này; **chưa có bản tổng kết cuối gửi chủ dự án**.
- Tiêu chí chấm điểm của buổi demo: **[KHÔNG CÓ DỮ LIỆU]**.

---

## 7. NEXT STEPS

### Đã xong
- Migration `0001_init.sql` đã áp lên Supabase thật (17/11).
- Migration `0002_toa_do_co_so.sql` (cột `lat`/`lng` của cơ sở, RPC `set_facility_location`) đã áp lên Supabase thật ngày 18/11: chủ dự án tự dán bằng SQL Editor, chạy `privileges_check.sql` (theo chủ dự án không có dòng SAI/KIỂM; chưa có agent nào tự kiểm trực tiếp) và chạy lại `seed.sql`. Kiểm công khai sau khi áp (chỉ đọc): anon gọi `set_facility_location` → 401 `42501`; anon đọc `private_contacts`, `parental_consents` (cột `parent_phone`), `facilities` (cột `lat`,`lng`) → đều 401 `42501`; anon đọc `app_config` → 200. Trên production chỉ bấm 3 nút đăng nhập: cả 3 vai trò vào được; `/shifts` có 3 ca; ca `…0002` của `nguoilam1` không còn "Bạn là người chính"; `/confirm/demo-token-con-han` hiện lại form; `/employer`, `/admin/facilities`, `/admin` mở không có thông báo lỗi.
- Đã rà 6 file trang chủ quán và trang công khai do subagent thứ ba viết.
- Nút ẩn/hiện nhận xét cho nhóm vận hành ở `/employer/shifts/[id]`.
- Deploy Vercel (https://safeshift-beta.vercel.app).
- Giao diện đã làm lại theo hướng "Phố cửa chớp" (`PRODUCT.md`, `DESIGN.md`): PR #10 (khung trang, thành phần, trang công khai), #12 (người làm, hồ sơ ca làm, phiếu phụ huynh), #13 (chủ quán, xác nhận sau ca, nhóm vận hành), #14 (bản đồ ca và cơ sở, ghim vị trí quán; cần migration 0002, đã áp) và PR hoàn thiện (dọn lớp màu cũ và bí danh `brand`, link trong đoạn văn, biểu tượng trình duyệt `src/app/icon.svg`, thẻ vị trí quán ở `/employer` thu gọn).
- Bản đồ: MapLibre + OpenFreeMap (`src/components/map.tsx`): `/` (minh họa, dữ liệu mẫu), `/shifts`, `/shifts/[id]`, `/employer` (ghim vị trí), `/admin`, `/admin/facilities`. Kịch bản kiểm tay: `TESTING.md` B11.

- Migration `0004_thong_bao_quan_cong_khai.sql` (thông báo, trang quán công khai, đánh giá quán, chia sẻ ca, nới SĐT chủ quán) viết xong kèm 128 test (nay 358/358 trên Postgres nhúng), **chưa áp lên Supabase thật**. Chủ dự án cần: dán `0004` bằng SQL Editor (sau `0003`) → chạy `privileges_check.sql` → chạy lại `seed.sql`. Giao diện cho các tính năng này chưa có; mã web gọi RPC mới chỉ merge sau khi `0004` đã áp.
- Migration `0003_viec_lam_dai_han.sql` (tin tuyển dụng lâu dài, đơn ứng tuyển) viết xong kèm 125 test, **chưa áp lên Supabase thật**. Chủ dự án cần: dán `0003` bằng SQL Editor → chạy `privileges_check.sql` → chạy lại `seed.sql`. Giao diện cho tính năng này chưa có; mã web gọi RPC mới chỉ merge sau khi `0003` đã áp (`AGENTS.md` mục 6, cổng 5).

### Còn lại, theo thứ tự
1. ~~Chạy lại `supabase/seed.sql` trên Supabase thật~~ — đã xong (18/11). Còn lại: thử bấm 3 nút ở `/login` trên bản deploy.
2. **Chạy tay toàn bộ `TESTING.md` mục B** (gồm B10 giao diện và B11 bản đồ; giao diện mới chưa được kiểm trên điện thoại thật và trong Zalo) trên điện thoại thật, đăng nhập bằng nút demo. Ưu tiên B1 (luồng chính), B6 (xác nhận sau ca), B4 (số điện thoại). Chạy lại `seed.sql` sau mỗi lượt test để khôi phục dữ liệu.
3. Nhờ chủ dự án đọc duyệt hai trang `/terms`, `/privacy` và cung cấp thông tin liên hệ. **Không bịa tên pháp nhân, địa chỉ, email, số điện thoại.** Nếu đổi quy tắc nghiệp vụ (bảng G ở mục 4) thì sửa câu chữ tương ứng trong hai trang này.
4. Demo **26/11**: chạy lại `seed.sql` ngay trước buổi demo để dữ liệu mẫu về trạng thái ban đầu. Gói miễn phí Supabase tự tạm dừng sau khoảng 1 tuần không truy cập: mở web mỗi vài ngày.
5. Gửi chủ dự án bản tổng kết (giả định + rủi ro).

Không làm nữa: cấu hình SMTP, Google OAuth, Redirect URL; chạy `xoa_du_lieu_demo.sql`.

### Cần chủ dự án trả lời
- **G4:** 40 giờ/tuần áp cho mọi người hay chỉ người dưới 18?
- **G5:** hiểu "số người cần" là N người chính + 1 dự phòng có đúng không?
- **G8:** giấy phép kinh doanh có bắt buộc không?
- **G10:** hủy sát giờ có nên tự đưa người dự phòng lên không?
- Thông tin liên hệ / tên đơn vị để ghi vào Điều khoản và Chính sách dữ liệu.
- Có tên miền riêng không (quyết định email nhắc ca, nếu muốn bật)?
- ~~Demo 26/11 dùng dữ liệu thật hay nạp lại seed?~~ — đã trả lời: dữ liệu mẫu, chạy lại seed (D1, D4).

---

## 8. IMPORTANT CONVERSATION INSIGHTS

### Thông tin chỉ có trong hội thoại
- Chủ dự án giao việc theo kiểu **hợp đồng**: muốn sản phẩm chạy được, không muốn bị hỏi lại. Ba tin nhắn chen giữa đều rất ngắn: *"tôi đã cài postgres, bạn hãy triển khai"*, *"khuyến khích bạn chạy subagents…"*, *"Try again"*.
- "Đã cài postgres" nghĩa là bản nhúng trong `db-test/`, do **phiên fork** tạo ra. Không có Postgres hệ thống, không Docker, không Homebrew, không Supabase CLI trên máy này (kiểm tra lúc ~12:30).
- Chủ dự án **chủ động muốn dùng subagent** để chạy song song.
- Tài khoản đang dùng có **giới hạn dùng theo cửa sổ 5 giờ**; đã chạm trần một lần lúc ~15:00 khi 3 subagent chạy cùng lúc.
- Chủ dự án chuyển từ Claude Desktop sang Claude Code; lý do **[KHÔNG CÓ DỮ LIỆU]**.

### Phản biện và góp ý đã được đưa ra
Từ chủ dự án: không có phản biện nào về nội dung kỹ thuật — chưa có bản tổng kết nào được gửi để họ nhận xét.

Từ subagent (agent chính đã xử lý hoặc ghi nhận):
- `admin_list_reports` cắt 300 dòng trước khi xếp "đang mở lên đầu" → **đã sửa** trong migration.
- Lo rằng ca không ai nhận lọt vào danh sách "chờ xác nhận" → **không đúng**: `_ensure_token()` không sinh token khi ca không có người chính.
- Lo tên `worker_events.kind` không khớp → **khớp** (`late_cancel`, `no_show`).
- Các điểm còn lại nằm trong bảng "vấn đề tồn đọng" ở mục 3.

### Bài học không được lặp lại
1. **Chạy 3 subagent song song đốt hạn mức rất nhanh** và khi chết thì không để lại file nào. Nếu dùng lại: chạy tuần tự hoặc tối đa 2, và yêu cầu ghi từng file ra đĩa ngay khi viết xong.
2. **Subagent bị dừng không báo cáo gì.** Phải kiểm tra đĩa (`find src/app -type f`) thay vì tin vào trạng thái "đã gọi lại". Subagent thứ ba trông như đang chạy nhưng bỏ sót 2 trang.
3. **`tsc` sạch và `next build` thành công không có nghĩa là chạy đúng.** Chưa trang nào được mở trên trình duyệt. Đừng báo "xong" cho chủ dự án trước khi làm bước 4–6 ở mục 7.
4. **Đừng viết test kiểu `select f() and exists(select …)`** — phần `exists` không thấy dữ liệu `f()` vừa ghi.
5. **Nhiều phiên cùng ghi một thư mục không có git** (phiên chính, phiên fork, 3 subagent). Đã không xảy ra ghi đè, nhưng không có gì bảo đảm. Bật git trước khi làm tiếp.
6. **README đã viết trước khi mã xong** nên từng mô tả thứ chưa tồn tại (2 trang pháp lý, nay đã có). Khi sửa mã, đối chiếu lại README và TESTING.

### Những gì tài liệu này KHÔNG biết
- Nội dung phiên fork (`local_818ee1b6-…`) ngoài việc nó tạo `db-test/`.
- Mọi cuộc trao đổi của chủ dự án ngoài phiên này.
- Bối cảnh tổ chức, thành viên nhóm, người chấm demo, ngân sách.
- Danh sách quán và người làm thật cho đợt 21–22/11.
