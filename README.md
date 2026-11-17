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
- Số điện thoại nằm ở bảng riêng `private_contacts`; chỉ lộ qua `get_shift_contacts()` cho hai bên đã ghép ca.
- Trang không cần đăng nhập (`/xac-nhan/[token]`, `/dong-y/[token]`, `/h/[slug]`) gọi RPC bằng quyền `anon`, bảo vệ bằng token ngẫu nhiên 244 bit.

### Sơ đồ route

| Đường dẫn | Ai dùng | Việc |
|---|---|---|
| `/` | mọi người | Giới thiệu; đã đăng nhập thì tự chuyển theo vai trò |
| `/dang-nhap`, `/auth/callback`, `/auth/dang-xuat` | mọi người | Google OAuth / magic link |
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
supabase/seed.sql                   dữ liệu demo (chạy lại được nhiều lần)
supabase/tests/edge_cases.sql       86 test biên ở tầng database
supabase/tests/check_before_migration.sql  kiểm project Supabase mới TRƯỚC khi dán migration (chỉ đọc)
supabase/tests/privileges_check.sql kiểm quyền bảng/hàm của anon/authenticated SAU migration (chỉ đọc)
supabase/xoa_du_lieu_demo.sql       xóa dữ liệu demo/test trước ngày chạy thật (giữ nguyên dữ liệu thật)
supabase/functions/shift-reminders  Edge Function nhắc ca qua email (tùy chọn, mặc định tắt)
db-test/                            chạy migration + seed + test + chạy đua trên Postgres nhúng (không cần Docker)
src/app/actions.ts                  mọi server action (mỗi action = 1 lời gọi RPC)
src/lib, src/components             hằng số, định dạng giờ VN, kiểu dữ liệu, UI dùng chung
```

---

## 2. Tạo Supabase project

1. https://supabase.com → **New project** (region Singapore). Lưu mật khẩu database.
2. **SQL Editor** → dán `supabase/tests/check_before_migration.sql` → **Run** → mọi dòng khớp cột `ky_vong` (chỉ đọc, không ghi gì).
3. **SQL Editor** → dán toàn bộ `supabase/migrations/0001_init.sql` → **Run**.
4. Dán `supabase/tests/privileges_check.sql` → **Run** → không có dòng nào cột `ket_luan` bắt đầu bằng `SAI` hoặc `KIỂM` (các dòng đó được xếp lên đầu). Project mới có sẵn hàm `rls_auto_enable()` (event trigger `ensure_rls` của Supabase, tự bật RLS cho bảng mới) — bình thường, câu kiểm coi là đúng.
5. (Chỉ cho demo/thử nghiệm) dán `supabase/seed.sql` → **Run**. Chạy seed bằng **SQL Editor**, không dùng CLI: `_bypass()` chỉ bật khi phiên là `postgres`/`supabase_admin`.
6. Nút **Connect** (hoặc **Project Settings → API Keys**): chép `Project URL` và key công khai — *publishable key* (`sb_publishable_…`) hoặc *anon key* kiểu cũ. **Không** dùng key `secret` / `service_role`.

Gặp lỗi `PGRST202` (không tìm thấy hàm) ngay sau khi dán migration: chạy `notify pgrst, 'reload schema';`.

### Tạo tài khoản admin

Admin đăng nhập vào web **một lần** (Google hoặc magic link; dừng ở màn hình "Đăng ký", không cần điền), rồi chạy trong SQL Editor:

```sql
select public.make_admin('email-cua-admin@gmail.com', 'Tên hiển thị');
```

Tải lại trang web → vào thẳng `/admin`. Hàm `make_admin` không gọi được từ client.

---

## 3. Đăng nhập: Google OAuth, magic link, redirect URL

**Authentication → URL Configuration** (Site URL mặc định là `http://localhost:3000` — đổi sang domain thật khi đã deploy)

- **Site URL**: `https://<ten-du-an>.vercel.app`
- **Redirect URLs** (thêm cả hai, đúng đường dẫn — mã luôn quay về `<origin>/auth/callback`):
  - `https://<ten-du-an>.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`
- Chỉ khi muốn đăng nhập trên URL *preview* của Vercel: thêm mẫu `https://*-<slug-tai-khoan>.vercel.app/**` (lấy slug thật từ URL preview).

**Google OAuth** (Google Cloud Console, giao diện *Google Auth Platform*)

1. https://console.cloud.google.com → tạo/chọn project → menu **Google Auth Platform** → **Get started**: *App Information* (tên app + email hỗ trợ) → *Audience*: **External** → *Contact Information* → **Finish**.
2. **Data Access**: chỉ scope cơ bản `.../auth/userinfo.email`, `.../auth/userinfo.profile` và thêm `openid`. **Không** thêm scope nhạy cảm (sẽ phải xác minh app với Google).
3. **Audience → Publish app** (để ở *Testing* thì chỉ email trong danh sách test đăng nhập được).
4. **Clients → Create client → Web application**:
   - *Authorized redirect URIs*: `https://<project-ref>.supabase.co/auth/v1/callback` — chép đúng chuỗi hiện trong Supabase ở bước 5 (đây là địa chỉ của **Supabase**, không phải của web).
   - *Authorized JavaScript origins*: `http://localhost:3000`, `https://<ten-du-an>.vercel.app` (luồng chuyển hướng của Supabase không cần mục này; nếu Console từ chối thì bỏ qua). Nếu Console đòi khai *Authorized domains* (mục Branding) thì thêm `supabase.co`.
   - **Create** → chép **Client ID** và **Client secret** (secret chỉ hiện một lần).
5. **Supabase → Authentication → Sign In / Providers → Google**: bật, dán Client ID + Client secret → **Save**.

App chưa được Google xác minh thì màn hình chọn tài khoản hiện tên miền `<project-ref>.supabase.co` thay cho tên app — bình thường, đăng nhập vẫn chạy (xác minh mất vài ngày đến vài tuần, không cần cho đợt chạy thật).

**Magic link (email)**

- **Authentication → Sign In / Providers → Email**: bật *Email* và **giữ *Confirm email* BẬT**. Nếu tắt, ai cầm anon key (công khai trong web) cũng tạo được tài khoản email + mật khẩu qua API mà không cần xác minh email.
- ⚠️ SMTP mặc định của Supabase chỉ gửi **2 email/giờ** và **chỉ tới email thành viên team của project** — người ngoài nhận lỗi "Email address not authorized" ([tài liệu](https://supabase.com/docs/guides/auth/auth-smtp)). Tức là magic link **không dùng được** với người làm/chủ quán thật nếu chưa nối SMTP riêng (mục *SMTP / Custom SMTP* trong Authentication; sau khi nối, giới hạn mặc định 30 email/giờ, chỉnh ở *Rate Limits*; Resend: host `smtp.resend.com`, port `465`, user `resend`, password = API key; bắt buộc có tên miền đã xác minh). Không có tên miền: mọi người **đăng nhập bằng Google**.
- Magic link dùng PKCE: phải bấm link **trên cùng trình duyệt** đã yêu cầu link. Muốn bấm ở trình duyệt nào cũng được: sửa template *Magic Link* (Authentication → Email Templates) thành `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Đăng nhập</a>` — `/auth/callback` đã hỗ trợ `token_hash` (cách này chưa thử thật).
- Google chặn đăng nhập trong trình duyệt nhúng của Zalo/Facebook. Trang `/dang-nhap` tự hiện cảnh báo "Mở bằng trình duyệt" khi phát hiện; khi gửi link qua Zalo nên nhắc mọi người mở bằng Chrome/Safari.
- Email template mặc định (`{{ .ConfirmationURL }}`) chạy được ngay với `/auth/callback`.

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

Kỳ vọng: `86/86 test đạt`, `privileges_check: … 0 dòng SAI/KIỂM`, dòng `tái chạy … ĐẠT`, 5 dòng `✔ chạy đua` và dòng `dọn dữ liệu demo … ĐẠT`.

## 6. Deploy Vercel

1. https://vercel.com/new → kết nối GitHub → chọn repo (framework tự nhận Next.js). Node lấy theo `package.json` (**24.x**; Vercel mặc định 26.x, chưa thử với Next 15.5).
2. **Environment Variables**: thêm 3 biến ở mục 4, loại *Config* (đều là giá trị công khai), môi trường Production. Lần đầu chưa biết domain: đặt `NEXT_PUBLIC_SITE_URL` tạm là `https://<tên-project>.vercel.app`.
3. **Deploy** → xem domain thật ở **Settings → Domains**. Khác giá trị tạm thì sửa `NEXT_PUBLIC_SITE_URL` rồi **Redeploy**.
4. Quay lại mục 3: điền domain vào Supabase (Site URL, Redirect URLs) và Google (origins).
5. Biến `NEXT_PUBLIC_*` được nhúng lúc build: đổi **bất kỳ** biến nào (domain, key Supabase) đều phải **Redeploy** mới có hiệu lực. Đổi domain → sửa cả 3 chỗ: biến, Supabase URL Configuration, Google origins.
6. Mở domain production ở cửa sổ ẩn danh: không được đòi đăng nhập Vercel (nếu có: **Settings → Deployment Protection**).
7. Điều khoản gói Hobby: *"You shall only use the Services under a Hobby plan for your personal or non-commercial use"* — chủ dự án tự đánh giá; không chắc thì hỏi Vercel Support.

## 7. Trước ngày chạy thật (21–22/11)

1. **Xóa dữ liệu demo** (không hoàn tác được — chỉ làm khi chủ dự án xác nhận): SQL Editor → dán toàn bộ `supabase/xoa_du_lieu_demo.sql` → **Run**.
   - Chỉ xóa dữ liệu demo/test (email `@demo.safeshift.test`, id cố định của seed/test); giữ nguyên tài khoản và dữ liệu thật, kể cả nhật ký thao tác của admin thật. Chạy lại nhiều lần không sao.
   - Bảng kết quả: nhóm *CÒN LẠI DEMO* phải toàn `0`; nhóm *SỐ DÒNG* cho thấy dữ liệu thật còn lại (`app_config` = 2).
   - ⚠️ Đừng xóa user demo bằng `delete from auth.users where …` hay chọn nhiều user trong Dashboard rồi xóa một lượt: một báo cáo trỏ tới nhiều user demo cùng lúc làm lệnh lỗi khóa ngoại `23503` (file trên xóa theo đúng thứ tự để tránh).
2. Kiểm tra cấu hình: `select * from public.app_config;` → `min_hourly_wage = 25500`, `weekly_hours_cap = 40`.

- Mức lương tối thiểu và giới hạn giờ/tuần đổi được ở `/admin/kpi` (có ghi audit log).
- Gói Supabase miễn phí **tự tạm dừng project sau khoảng 1 tuần không có truy cập**: mở web/SQL editor mỗi vài ngày từ nay đến 26/11.
- Sao lưu trước demo: **Database → Backups** không có ở gói miễn phí → xuất CSV KPI ở `/admin/kpi` sau đợt chạy thật và giữ lại.

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
