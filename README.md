# SafeShift

Web app kết nối ca làm ngắn hạn giữa cơ sở dịch vụ nhỏ ở Vũng Tàu (quán cà phê, nhà hàng, homestay, khách sạn nhỏ) và học sinh từ 15 tuổi / sinh viên.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind 3 · Supabase (Postgres, Auth, RLS, Edge Functions) · Vercel. Chỉ dùng gói miễn phí.

> SafeShift chỉ kết nối người làm và nơi thuê. Lương, hợp đồng và điều kiện làm việc do hai bên tự thỏa thuận. Không bao giờ thu phí người làm.

---

## 1. Kiến trúc trong 1 phút

```
Trình duyệt ──► Next.js trên Vercel (Server Component + Server Action, dùng anon key + cookie phiên)
                    │  supabase.rpc(...) / select
                    ▼
              Supabase Postgres
              ├─ RLS: mọi bảng chỉ có policy SELECT. Client KHÔNG insert/update/delete trực tiếp được bảng nào.
              ├─ RPC (SECURITY DEFINER): cách DUY NHẤT để ghi. Mỗi hàm tự kiểm tra vai trò + quy tắc.
              └─ Trigger/constraint: chặn lần hai các quy tắc cốt lõi (tuổi, lương tối thiểu, cơ sở đã xác minh,
                 giờ làm của người dưới 18, 40 giờ/tuần, số chỗ) — kể cả khi ghi bằng service-role.
```

- Ứng dụng **không dùng service-role key**. Vercel chỉ giữ anon key. Lộ mã nguồn frontend không lộ quyền gì.
- Bản đồ (MapLibre) tải ô bản đồ và phông chữ từ `tiles.openfreemap.org` ngay trên trình duyệt người dùng: không cần khóa, không cấu hình thêm, nhưng cần có mạng; dịch vụ này nhận IP và vùng đang xem, không nhận dữ liệu tài khoản.
- Số điện thoại nằm ở bảng riêng `private_contacts`; chỉ lộ qua `get_shift_contacts()` cho hai bên đã ghép ca.
- Trang không cần đăng nhập (`/xac-nhan/[token]`, `/dong-y/[token]`, `/h/[slug]`) gọi RPC bằng quyền `anon`, bảo vệ bằng token ngẫu nhiên 244 bit.

### Sơ đồ route

| Đường dẫn | Ai dùng | Việc |
|---|---|---|
| `/` | mọi người | Giới thiệu; đã đăng nhập thì tự chuyển theo vai trò |
| `/dang-nhap`, `/auth/dang-xuat` | mọi người | Đăng nhập bằng 3 nút demo (người làm, chủ quán, nhóm vận hành); đăng xuất. `/auth/callback` còn giữ để tương thích, không nút nào dẫn tới |
| `/dang-ky`, `/dang-ky/nguoi-lam`, `/dang-ky/chu-quan` | người mới | Chọn vai trò, đồng ý xử lý dữ liệu, đăng ký |
| `/dieu-khoan`, `/chinh-sach-du-lieu` | mọi người | Điều khoản, chính sách dữ liệu |
| `/ca`, `/ca/[id]` | người làm | Feed ca (gấp lên đầu, lọc ngày/khu vực/loại việc); nhận ca, hủy, xem SĐT quán, trả lời "đã trả đủ chưa", báo cáo |
| `/ca-cua-toi` | người làm | Ca sắp tới / cần trả lời / đã qua |
| `/ho-so` | người làm | Trạng thái duyệt, link phụ huynh, bật/tắt hồ sơ công khai, sửa thông tin |
| `/h/[slug]` | công khai | Hồ sơ ca làm (in / lưu PDF), không có SĐT |
| `/dong-y/[token]` | phụ huynh | Phiếu đồng ý, không đăng nhập |
| `/quan`, `/quan/dang-ca`, `/quan/ca/[id]` | chủ quán | Danh sách ca; đăng ca / nhân bản (`?from=id`); xem người chính–dự phòng, đổi thứ tự, hủy ca, link xác nhận |
| `/xac-nhan/[token]` | chủ quán | Xác nhận sau ca, không đăng nhập, dùng một lần, hết hạn 72 giờ |
| `/tai-khoan` | mọi vai trò | Đăng xuất, xóa tài khoản và toàn bộ dữ liệu |
| `/admin` | admin | Bảng điều phối 24 giờ tới, sao chép tin nhắc ca, "người chính báo bận", ca chờ xác nhận |
| `/admin/co-so`, `/admin/nguoi-lam` | admin | Duyệt cơ sở (checklist), duyệt người làm + phiếu phụ huynh, khóa/mở, gỡ cơ sở |
| `/admin/bao-cao`, `/admin/kpi`, `/admin/kpi/export`, `/admin/nhat-ky` | admin | Hộp báo cáo; KPI + CSV + cấu hình lương tối thiểu; audit log |

### Cấu trúc thư mục

```
supabase/migrations/0001_init.sql   toàn bộ schema, trigger, RPC, RLS, quyền
supabase/migrations/0002_toa_do_co_so.sql  cột lat/lng của cơ sở (bản đồ) + RPC set_facility_location
supabase/seed.sql                   dữ liệu demo (chạy lại được nhiều lần)
supabase/tests/edge_cases.sql       104 test biên ở tầng database
supabase/tests/check_before_migration.sql  kiểm project Supabase mới TRƯỚC khi dán migration (chỉ đọc)
supabase/tests/privileges_check.sql kiểm quyền bảng/hàm của anon/authenticated SAU migration (chỉ đọc)
supabase/xoa_du_lieu_demo.sql       xóa dữ liệu demo/test (KHÔNG chạy khi app còn là bản mô phỏng, xem mục 7)
supabase/functions/shift-reminders  Edge Function nhắc ca qua email (tùy chọn, mặc định tắt)
db-test/                            chạy migration + seed + test + chạy đua trên Postgres nhúng (không cần Docker)
src/app/actions.ts                  mọi server action (mỗi action = 1 lời gọi RPC)
src/lib, src/components             hằng số, định dạng giờ VN, kiểu dữ liệu, UI dùng chung
```

### Thiết kế

Giao diện theo hướng "Phố cửa chớp": tường vàng, cửa chớp xanh, nền vôi; chỉ có giao diện sáng, chữ gốc 18px, vùng chạm tối thiểu 48px. Font Be Vietnam Pro (chữ) và Barlow Condensed (số giờ ca), tự host qua `next/font`; icon `lucide-react`. Điện thoại 360–414px là bề mặt chính, desktop cũng phải đẹp (rail trái từ 1024px). Bản đồ dùng MapLibre với nền OpenFreeMap, tải trên trình duyệt người dùng (xem mục 1). Mô tả hệ hình ảnh đang chạy: `DESIGN.md`; hướng sản phẩm và người dùng: `PRODUCT.md`; quy tắc bắt buộc: `AGENTS.md` mục 18–24.

---

## 2. Tạo Supabase project

1. https://supabase.com → **New project** (region Singapore). Lưu mật khẩu database.
2. **SQL Editor** → dán `supabase/tests/check_before_migration.sql` → **Run** → mọi dòng khớp cột `ky_vong` (chỉ đọc, không ghi gì).
3. **SQL Editor** → dán toàn bộ `supabase/migrations/0001_init.sql` → **Run**.
   Rồi dán toàn bộ `supabase/migrations/0002_toa_do_co_so.sql` → **Run** (sau 0001, trước seed).
4. Dán `supabase/tests/privileges_check.sql` → **Run** → không có dòng nào cột `ket_luan` bắt đầu bằng `SAI` hoặc `KIỂM` (các dòng đó được xếp lên đầu). Project mới có sẵn hàm `rls_auto_enable()` (event trigger `ensure_rls` của Supabase, tự bật RLS cho bảng mới) — bình thường, câu kiểm coi là đúng.
5. Dán `supabase/seed.sql` → **Run**. Seed tạo 16 tài khoản demo có mật khẩu (mục 3) và dữ liệu mẫu; app là bản mô phỏng nên bước này bắt buộc. Chạy seed bằng **SQL Editor**, không dùng CLI: `_bypass()` chỉ bật khi phiên là `postgres`/`supabase_admin`.
6. Nút **Connect** (hoặc **Project Settings → API Keys**): chép `Project URL` và key công khai — *publishable key* (`sb_publishable_…`) hoặc *anon key* kiểu cũ. **Không** dùng key `secret` / `service_role`.

Gặp lỗi `PGRST202` (không tìm thấy hàm) ngay sau khi dán migration: chạy `notify pgrst, 'reload schema';`.

### Tài khoản admin

Không cần tạo tay: `seed.sql` đã tạo `admin@demo.safeshift.test`, nút "nhóm vận hành" ở `/dang-nhap` đăng nhập vào tài khoản này và vào thẳng `/admin`. Hàm `make_admin(email, tên)` vẫn còn nhưng chỉ chạy được trong SQL Editor, không gọi được từ client.

---

## 3. Đăng nhập demo

App là bản mô phỏng (quyết định 17/11/2026): không có người thật, chỉ dữ liệu mẫu. Đã bỏ Google OAuth và magic link nên không cần cấu hình Google Cloud, SMTP hay Redirect URL.

- `/dang-nhap` có 3 nút một chạm: người làm (`nguoilam1@`), chủ quán (`quan1@`), nhóm vận hành (`admin@`), đều đuôi `@demo.safeshift.test`. Mỗi nút gọi server action `demoLogin`, action này đăng nhập bằng mật khẩu chung công khai `safeshift-demo`.
- Mật khẩu do `supabase/seed.sql` đặt cho cả 16 user demo. Project Supabase thật cần **chạy lại `seed.sql`** trong SQL Editor ít nhất một lần sau khi có thay đổi này, nếu không nút đăng nhập báo lỗi.
- Khôi phục dữ liệu mẫu (ca bị hủy, tài khoản demo bị xóa, dữ liệu lộn xộn sau khi thử): chạy lại `seed.sql`. Seed tự xóa và tạo lại 16 user demo, đưa lương tối thiểu và giới hạn giờ/tuần về mặc định, chạy lại nhiều lần không sao.
- **Authentication → Sign In / Providers → Email**: giữ **Confirm email BẬT**. Nếu tắt, ai cầm anon key (công khai trong web) cũng tạo được tài khoản email + mật khẩu qua API.
- Mật khẩu demo công khai có chủ đích, nên **không đưa dữ liệu thật** vào project này.

---

## 4. Biến môi trường

Chép `.env.example` thành `.env.local`:

| Biến | Giá trị |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | key **công khai**: publishable key `sb_publishable_…` (project tạo từ 11/2025 chỉ có loại này) hoặc anon key `eyJ…` của project cũ. Giữ nguyên tên biến. **Không** dùng secret / service_role |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` (local) hoặc `https://<ten-du-an>.vercel.app` — dùng để tạo link gửi phụ huynh / chủ quán |

Không có biến bí mật nào phía web.

## 5. Chạy local

```bash
npm install
```

```bash
npm run dev
```

Mở http://localhost:3000 (Node 24 — bản đã chạy thử, ghim trong `package.json`). Web local nối thẳng tới Supabase project trên cloud.

Kiểm tra tầng database mà không cần Supabase/Docker (Postgres nhúng, tải về lần đầu ~1 phút):

```bash
npm run test:db
```

Kỳ vọng: `104/104 test đạt`, `privileges_check: … 0 dòng SAI/KIỂM`, dòng `tái chạy … ĐẠT`, 5 dòng `✔ chạy đua` và dòng `dọn dữ liệu demo … ĐẠT`.

## 6. Deploy Vercel

Đã deploy production tại https://safeshift-beta.vercel.app (Vercel project `safeshift`, team `safeshift`, nối GitHub: merge vào `main` là tự deploy; biến `NEXT_PUBLIC_*` đã đặt). Các bước dưới là cách dựng lại từ đầu.

1. https://vercel.com/new → kết nối GitHub → chọn repo (framework tự nhận Next.js). Node lấy theo `package.json` (**24.x**; Vercel mặc định 26.x, chưa thử với Next 15.5).
2. **Environment Variables**: thêm 3 biến ở mục 4, loại *Config* (đều là giá trị công khai), môi trường Production. Lần đầu chưa biết domain: đặt `NEXT_PUBLIC_SITE_URL` tạm là `https://<tên-project>.vercel.app`.
3. **Deploy** → xem domain thật ở **Settings → Domains**. Khác giá trị tạm thì sửa `NEXT_PUBLIC_SITE_URL` rồi **Redeploy**.
4. Không cần điền domain vào Supabase hay Google: đăng nhập demo không dùng redirect.
5. Biến `NEXT_PUBLIC_*` được nhúng lúc build: đổi **bất kỳ** biến nào (domain, key Supabase) đều phải **Redeploy** mới có hiệu lực. Đổi domain → sửa biến `NEXT_PUBLIC_SITE_URL` rồi Redeploy.
6. Mở domain production ở cửa sổ ẩn danh: không được đòi đăng nhập Vercel (nếu có: **Settings → Deployment Protection**).
7. Điều khoản gói Hobby: *"You shall only use the Services under a Hobby plan for your personal or non-commercial use"* — chủ dự án tự đánh giá; không chắc thì hỏi Vercel Support.

## 7. Trước đợt chạy 21–22/11 và demo 26/11

1. **KHÔNG chạy `supabase/xoa_du_lieu_demo.sql`.** App chỉ dùng dữ liệu demo; xóa user demo thì ba nút đăng nhập hỏng. File này chỉ dành cho trường hợp sau này chuyển sang dữ liệu thật và phải do chủ dự án xác nhận (không hoàn tác được). Muốn đưa dữ liệu về trạng thái ban đầu thì chạy lại `seed.sql`.
   - ⚠️ Đừng xóa user demo bằng `delete from auth.users where …` hay chọn nhiều user trong Dashboard rồi xóa một lượt: một báo cáo trỏ tới nhiều user demo cùng lúc làm lệnh lỗi khóa ngoại `23503`.
2. Kiểm tra cấu hình: `select * from public.app_config;` → `min_hourly_wage = 25500`, `weekly_hours_cap = 40`.

- Mức lương tối thiểu và giới hạn giờ/tuần đổi được ở `/admin/kpi` (có ghi audit log).
- Gói Supabase miễn phí **tự tạm dừng project sau khoảng 1 tuần không có truy cập**: mở web/SQL editor mỗi vài ngày từ nay đến 26/11.
- Sao lưu trước demo: **Database → Backups** không có ở gói miễn phí → xuất CSV KPI ở `/admin/kpi` sau đợt chạy 21–22/11 và giữ lại.

## 8. Nhắc ca qua email (tùy chọn — mặc định TẮT)

Kênh nhắc chính là nút **"Sao chép tin nhắn nhắc ca"** ở `/admin` (dán vào Zalo). Email là phần phụ; chỉ bật khi đã có tên miền xác minh trên Resend (gói miễn phí không gửi được cho người nhận tùy ý nếu thiếu tên miền).

⚠️ Chưa từng chạy thử. Project Supabase tạo sau 30/5/2026 **không còn tự cấp quyền bảng** cho `service_role`, mà Edge Function này đọc/ghi bảng bằng `service_role` → cần thêm một migration mới trước khi bật:
`grant select on public.shift_claims, public.shifts, public.facilities to service_role; grant update (reminder_sent_at) on public.shift_claims to service_role;`

```bash
supabase secrets set RESEND_API_KEY=re_xxx CRON_SECRET=<chuoi-ngau-nhien> REMINDER_FROM="SafeShift <nhac-ca@ten-mien>" SITE_URL=https://<ten-du-an>.vercel.app
```

```bash
supabase functions deploy shift-reminders --no-verify-jwt
```

Bật extension `pg_cron` và `pg_net` (Database → Extensions), rồi chạy trong SQL Editor:

```sql
select cron.schedule('shift-reminders', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/shift-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<chuoi-ngau-nhien>'),
    body := '{}'::jsonb)
$$);
-- tắt: select cron.unschedule('shift-reminders');
```

Link xác nhận sau ca **không phụ thuộc cron**: token được sinh khi chủ quán mở trang ca hoặc admin mở bảng điều phối, và hạn luôn tính là *giờ kết thúc ca + 72 giờ*.

## 9. Việc vận hành hay gặp

| Việc | Cách làm |
|---|---|
| Duyệt cơ sở | `/admin/co-so` → điền phiếu xác minh (đúng địa chỉ, đúng người liên hệ là bắt buộc) |
| Duyệt người dưới 18 | Người làm vào `/ho-so` sao chép link gửi phụ huynh → phụ huynh điền → `/admin/nguoi-lam` bấm Duyệt |
| Nhắc ca | `/admin` → "Sao chép tin nhắn nhắc ca" → dán Zalo |
| Người chính báo bận | `/admin` → "Người chính báo bận" → hệ thống đưa người dự phòng lên, ghi sự cố; admin gọi báo hai bên |
| Gửi link xác nhận cho chủ quán | `/admin` → mục "Ca chờ chủ quán xác nhận" → sao chép tin nhắn |
| Đổi tên / ngày sinh người làm | Không có trong app (chống gian lận tuổi). Sửa bằng SQL với quyền postgres |
| Thêm admin | `select public.make_admin('email');` |
