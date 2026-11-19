# Kịch bản test SafeShift

Có hai tầng:

- **A. Test tự động ở tầng database** — 358 test + kiểm quyền + tái chạy + chạy đua + dọn dữ liệu demo, không cần Supabase. Đây là nơi mọi quy tắc nghiệp vụ được chặn.
- **B. Test tay trên giao diện** — chạy trên bản deploy (hoặc local) nối với Supabase thật, sau khi đã chạy `seed.sql`.

---

## A. Test tự động (database)

```bash
npm run test:db
```

Lệnh này dựng một Postgres nhúng, giả lập môi trường Supabase (role `anon` / `authenticated`, `auth.uid()`), chạy `0001_init.sql` → `0002_toa_do_co_so.sql` → `0003_viec_lam_dai_han.sql` → `0004_thong_bao_quan_cong_khai.sql` → `seed.sql` → `supabase/tests/edge_cases.sql`, rồi `supabase/tests/privileges_check.sql` (quyền bảng/hàm của `anon`/`authenticated`), rồi vòng tái chạy seed → edge_cases → seed, rồi chạy đua thật trên nhiều kết nối, rồi thử `supabase/xoa_du_lieu_demo.sql` với người dùng thật giả lập. Kỳ vọng: `358/358 test đạt`, `privileges_check: … 0 dòng SAI/KIỂM`, `tái chạy … ĐẠT`, 5 dòng `✔ chạy đua`, `dọn dữ liệu demo … ĐẠT`.

Lưu ý: Postgres nhúng chạy bằng superuser nên **không bắt được lỗi quyền riêng của Supabase** (role `postgres` ở Supabase không phải superuser). Vì vậy trên Supabase thật chạy thêm `check_before_migration.sql` trước khi dán migration và `privileges_check.sql` sau đó (README mục 2).

Chạy trên Supabase thật: dán `supabase/tests/edge_cases.sql` vào SQL Editor (sau `seed.sql`) → kết quả là bảng `name / passed / detail`, mọi dòng `passed = true`. **Test có ghi dữ liệu → chạy lại `seed.sql` sau khi test.**

Các trường hợp biên bắt buộc và test tương ứng:

| Trường hợp | Test | Chặn ở đâu |
|---|---|---|
| Người 14 tuổi đăng ký | 1a, 1b | RPC `register_worker` + trigger `worker_profiles_guard` (ghi thẳng bảng vẫn bị chặn) |
| 15–17 tuổi chưa có phụ huynh đồng ý | 1e, 1f | trigger `claims_validate`; `admin_review_worker` không cho duyệt |
| Dưới 18 nhận ca kết thúc 23:00 | 2a | trigger `claims_validate` |
| Dưới 18 *nhìn thấy* ca 23:00 | 2b, 2c | `feed_shifts` + RLS policy `shifts_read` |
| Đăng ca "cho dưới 18" sai giờ / quá 8 giờ | 2e, 2f | trigger `shifts_validate` |
| Giờ thứ 41 trong tuần (thứ Hai–Chủ nhật) | 3a (40 giờ: được), 3b (41: chặn) | trigger `claims_validate` |
| Ca trùng giờ | 3c | trigger `claims_validate` |
| Lương dưới mức tối thiểu | 4a, 4b (đúng 25.500: được), 4c, 4d | trigger `shifts_validate` + RPC |
| Cơ sở chưa xác minh đăng ca | 4e, 4k | RPC + trigger `shifts_validate` / `facilities_guard` |
| Không tick cam kết | 4f | RPC + `CHECK (commitment_ack)` |
| Loại việc / loại hình ngoài danh sách | 4g, 4h, 4i | enum + trigger tên cơ sở |
| Token đã dùng | 5d, 5e | `submit_confirmation` (khóa dòng token) |
| Token hết hạn | 5f, 5g | `get_confirmation` / `submit_confirmation` |
| Hai người cùng nhận chỗ cuối cùng | 6a, 6b + **chạy đua** | `SELECT … FOR UPDATE` trên dòng ca + unique index một-dự-phòng |
| Người chưa ghép ca gọi API lấy SĐT | 7a, 7b, 7c, 7e | `get_shift_contacts` + RLS `private_contacts` |
| Người làm đọc SĐT / tên phụ huynh qua API | 7k–7o | quyền theo cột trên `parental_consents` (không cấp `parent_phone`, `parent_name`) |
| Hủy > 2 tiếng → dự phòng lên chính | 8a | `cancel_claim` |
| Hủy < 2 tiếng → `late_cancel` | 8c | `cancel_claim` + báo cáo cho admin |
| Trả lời khác "Đủ" → báo cáo | 9a | trigger `payment_feedback_report` |
| Tự nâng quyền / ghi thẳng bảng / gọi hàm nội bộ | 10a–10f | quyền bảng + quyền hàm |
| Mọi user demo của seed (20 user: `admin@`, `quan1–9@`, `nguoilam1–10@`) đều có mật khẩu demo; user `@demo.safeshift.test` khác (tài khoản test) không có | 10m | `seed.sql` đặt mật khẩu bằng `extensions.crypt`; nút đăng nhập demo ở `/login` dựa vào đây |
| Ghi lại tên 9 cơ sở của seed (9 quán thật ở Vũng Tàu) ngoài chế độ seed: `_facilities_guard` không chặn tên nào (không dính bar, pub, club, karaoke, massage...) | 10n | seed chạy ở chế độ bỏ qua trigger nên không tự kiểm tên; test này ghi lại tên khi không bypass |
| Thao tác admin có audit log | 10g, 10h | mọi RPC `admin_*` |
| Chủ quán tự xóa tài khoản khi ca của họ có báo cáo | 11b | `delete_my_account` + khóa ngoại `ON DELETE SET NULL` |
| Xóa tài khoản xóa sạch dữ liệu | 11a | `delete_my_account` + `ON DELETE CASCADE` |

### Chạy đua bằng tay (nếu muốn tự thấy)

`cd db-test && node run.mjs --keep` giữ server chạy ở cổng 54329. Mở hai cửa sổ `psql postgres://postgres:postgres@localhost:54329/postgres`:

```sql
-- Cửa sổ 1                                         -- Cửa sổ 2
begin;                                              begin;
select set_config('request.jwt.claims',             select set_config('request.jwt.claims',
 '{"sub":"a0000000-0000-4000-a000-000000000005"}',   '{"sub":"a0000000-0000-4000-a000-000000000006"}',
 true);                                              true);
select claim_shift(                                 select claim_shift(   -- ĐỨNG CHỜ cửa sổ 1
 '50000000-0000-4000-a000-000000000003');            '50000000-0000-4000-a000-000000000003');
-- => backup
commit;                                             -- => LỖI "Ca đã đủ người. Bạn xem ca khác nhé."
```

---

## B. Test tay trên giao diện

Chuẩn bị: đã chạy migration + seed (seed đặt mật khẩu demo; chạy lại seed để khôi phục dữ liệu sau mỗi lượt test). Đăng nhập bằng 3 nút ở `/login`, không cần tài khoản Google hay email thật: **A** = nhóm vận hành (`admin@`), **Q** = chủ quán (`quan1@`, SOHO Coffee), **N** = người làm (`nguoilam1@`, đã duyệt, 20 tuổi). Muốn đổi vai trò thì đăng xuất rồi bấm nút khác. Không có nút cho các user demo còn lại (`quan2–9@`, `nguoilam2–10@`); các hồ sơ đó dùng làm dữ liệu cho A duyệt hoặc cho ca. Dùng điện thoại hoặc DevTools ở bề rộng 360–414px.

Giới hạn: app không còn đường tạo tài khoản mới, nên form đăng ký (`/register/*`) và các trường hợp phải đăng ký mới (tuổi 14, tên cơ sở "Karaoke ABC", ngày sinh 16 tuổi) **không kiểm tay được** trên bản demo; các quy tắc này vẫn được test tự động ở mục A (1a, 1b, 4g–4i). Cũng không kiểm tay được những việc cần đăng nhập người làm thứ hai hoặc người chưa duyệt (người dự phòng, "chưa duyệt thì không thấy nút Nhận ca"); xem test 1e–1i, 6a–6h, 8a. Đăng nhập demo dùng chung mật khẩu công khai, nên không nhập dữ liệu thật khi test.

Dữ liệu seed dùng trong kịch bản: 9 quán thật ở Vũng Tàu (cơ sở 1–9, chủ `quan1–9@`): các quán 1–4 và 6–9 đã xác minh, quán số 5 (KATINAT) chờ xác minh; ca 23:00 ở quán số 2 (Phê La Vũng Tàu) (ngày kia, 18:00–23:00).

### B1. Người làm đã duyệt: tìm và nhận ca (luồng chính)

1. (Chưa kiểm tay được, xem Giới hạn: form đăng ký người làm 20 tuổi và trạng thái "Chờ duyệt" của người mới.)
2. A vào `/admin/workers` → Duyệt `nguoilam10` (20 tuổi, đang chờ duyệt trong seed). ✔ `/admin/audit` có dòng "Duyệt người làm".
3. N vào `/shifts` → ✔ ca GẤP nằm trên cùng; lọc theo khu vực / loại việc / ngày ra đúng ca.
4. N mở ca chưa ai nhận → "Nhận ca này" → ✔ báo "Bạn là NGƯỜI CHÍNH", hiện tên + số điện thoại của quán.
5. (Chưa kiểm tay được, xem Giới hạn: nhận làm người dự phòng cần ca mà người khác đã là người chính; test tự động 6a–6h.)
6. Mở ca đã đủ chính + dự phòng → ✔ không có nút nhận / báo đã đủ người.

### B2. Tuổi

1–3. (Chưa kiểm tay được, xem Giới hạn: đăng ký 14 tuổi bị từ chối; đăng ký 16 tuổi hiện "Phiếu phụ huynh"; phụ huynh mở link `/consent/…` ở trình duyệt ẩn danh điền tên, SĐT, tick → Gửi. Link phiếu của `nguoilam9` trong seed đã được gửi: nếu có link, mở lại → ✔ "đã được gửi".)
4. A duyệt `nguoilam9` (15 tuổi, phụ huynh đã gửi phiếu) ở `/admin/workers`. ✔ Duyệt được; `/admin/audit` có dòng duyệt.
5–6. Việc ca 18:00–23:00 ẩn với người dưới 18 và URL `/shifts/50000000-0000-4000-a000-000000000003` báo "không tìm thấy" cần đăng nhập bằng người 16–17 tuổi (`nguoilam7`, `nguoilam8`), mà không có nút demo cho các user này; phần này chỉ kiểm bằng test tự động 2a–2f.

### B3. Chủ quán

1–2. (Chưa kiểm tay được, xem Giới hạn: chủ quán đăng ký mới chờ xác minh; tên cơ sở "Karaoke ABC" bị từ chối.)
3. A vào `/admin/facilities` → chọn "KATINAT" (đang chờ xác minh trong seed) → phiếu xác minh: bỏ trống "đúng địa chỉ" → ✔ lỗi; tick đủ → ✔ cơ sở "Đang hoạt động".
4. Q vào `/employer/new-shift`:
   - lương 20.000 → ✔ *"Lương/giờ phải từ 25500 đ trở lên."* và các ô đã nhập (ngày, giờ, loại việc, tick cam kết) **vẫn còn nguyên**, chỉ cần sửa lương
   - không tick cam kết → ✔ không gửi được
   - tick "Nhận dưới 18" với giờ 18:00–23:00 → ✔ lỗi 06:00–22:00
   - hợp lệ → ✔ sang trang ca, báo "Đã đăng ca".
5. "Nhân bản ca này" → ✔ form điền sẵn, chỉ cần chọn ngày → đăng.
6. N và một người làm khác nhận ca → Q thấy người chính + dự phòng kèm SĐT → "Đổi chỗ với người dự phòng" → ✔ hai người đổi vai.

### B4. Số điện thoại

1. Người làm chưa nhận ca mở `/shifts/[id]` → ✔ không có SĐT ở đâu trong trang (xem cả View Source).
2. DevTools Console của người làm chưa ghép (đã đăng nhập), gọi thẳng API:
   ```js
   // lấy URL + anon key từ .env; access token nằm trong cookie sb-…-auth-token
   await fetch(`${URL}/rest/v1/rpc/get_shift_contacts`, { method: 'POST',
     headers: { apikey: ANON, Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
     body: JSON.stringify({ p_shift: '50000000-0000-4000-a000-000000000004' }) }).then(r => r.json())
   // ✔ { code: '42501', message: 'Bạn chưa được ghép ca này nên không xem được số điện thoại.' }
   await fetch(`${URL}/rest/v1/private_contacts?select=*`, { headers: { apikey: ANON, Authorization: `Bearer ${ACCESS_TOKEN}` } }).then(r => r.json())
   // ✔ chỉ đúng 1 dòng: số của chính mình
   ```
3. Không đăng nhập (chỉ anon key): `GET /rest/v1/private_contacts` → ✔ `permission denied`.

### B5. Hủy ca

1. N hủy ca còn hơn 2 tiếng → ✔ hủy được, ca mở lại chỗ trống. (Phần người dự phòng được đưa lên không kiểm tay được vì chỉ có một nút người làm; test tự động 8a.)
2. Ca bắt đầu trong vòng 2 tiếng: trang ca cảnh báo "hủy sát giờ" → hủy → ✔ `/profile` tăng "số lần hủy sát giờ"; `/admin/reports` có báo cáo "Hủy sát giờ".
   (Tạo nhanh: Q đăng ca bắt đầu sau 90 phút, N nhận rồi hủy.)

### B6. Xác nhận sau ca

Dùng ca seed "vừa hết giờ" (OASIS SEA Coffee & Tea, dọn dẹp) — link: `/confirm/demo-token-con-han`.

1. Mở link **trong Zalo trên điện thoại** (gửi link cho chính mình qua Zalo rồi bấm; chủ quán thật sẽ mở như vậy), hoặc ở trình duyệt ẩn danh → ✔ thấy tên quán, giờ, tên người làm; không cần đăng nhập. Nút "Gửi xác nhận" không hỏi lại bằng hộp thoại (trình duyệt nhúng của Zalo có thể chặn hộp thoại).
2. Chọn "Đã làm" → "Đúng giờ" → **chưa chấm sao** → Gửi → ✔ lỗi *"Vui lòng chọn Đúng giờ / Trễ và số sao."* hiện trong tầm nhìn, các lựa chọn đã chọn vẫn giữ. Chấm 5 sao → nhận xét → Gửi → ✔ *"Ca này đã được xác nhận. Cảm ơn anh/chị!"*.
3. Mở lại link → ✔ vẫn là *"Ca này đã được xác nhận…"*, không còn form (link chỉ dùng một lần).
4. Mở `/confirm/demo-token-het-han` → ✔ "Link đã hết hạn".
5. Mở `/confirm/abc` → ✔ "Link không hợp lệ".
6. Với ca thật: sau giờ kết thúc, Q vào `/employer/shifts/[id]` thấy nút "Xác nhận ngay"; A thấy ca ở `/admin` mục "chờ xác nhận" kèm nút sao chép tin nhắn.

### B7. Sau ca phía người làm

1. N (người chính của ca vừa xác nhận) mở `/my-shifts` → ✔ ca nằm ở "Cần bạn trả lời".
2. Chọn "Chưa đủ" → ✔ `/admin/reports` có báo cáo "Tiền công" đang mở. Chọn "Đủ" (ở ca khác) → không tạo báo cáo.
3. N vào `/profile` bật chia sẻ → mở link `/p/[slug]` ở trình duyệt ẩn danh → ✔ thấy số ca, tổng giờ, loại việc, điểm, tỷ lệ đúng giờ, nhận xét; KHÔNG có SĐT. Bấm "In / Lưu PDF" → ✔ bản in gọn, không có thanh điều hướng.
4. Tắt chia sẻ → tải lại link ở trình duyệt ẩn danh → ✔ "không tồn tại hoặc đang tắt chia sẻ".

### B8. Admin

1. `/admin`: ca trong 24 giờ tới hiện người chính / dự phòng; "Sao chép tin nhắn nhắc ca" → dán vào ghi chú → ✔ có tên quán, địa chỉ, giờ, link Google Maps.
2. "Người chính báo bận" trên ca có dự phòng → ✔ thông báo xanh ở đầu trang `/admin`, dự phòng lên chính; `/admin/reports` có sự cố; `/admin/audit` có dòng tương ứng. Trên ca không có dự phòng → ✔ cảnh báo đỏ "KHÔNG có người dự phòng" ở đầu trang `/admin`.
3. Khóa tài khoản N → N tải lại trang → ✔ bị đưa về `/account` với thông báo khóa; các ca sắp tới của N bị hủy. Mở khóa → dùng lại bình thường.
4. Gỡ một cơ sở → ✔ các ca sắp tới của cơ sở bị hủy; chủ quán không đăng ca được nữa.
5. `/admin/kpi` → đủ 12 chỉ số → "Tải CSV" → mở bằng Excel ✔ tiếng Việt không lỗi font.
6. Đổi lương tối thiểu thành 30.000 → Q đăng ca 27.000 → ✔ bị từ chối. Đổi lại 25.500.
7. Đăng xuất, bấm nút "người làm" (hoặc "chủ quán") ở `/login` rồi mở `/admin` → ✔ bị chuyển về trang của vai trò đó.
8. `/admin/workers`: gõ ghi chú rồi nhấn Enter → ✔ chỉ xuống dòng, **không** tự duyệt.
9. Ẩn nhận xét: A mở `/employer/shifts/[id]` của ca đã xác nhận có nhận xét (vd. ca ở B6) → "Ẩn nhận xét" → ✔ nút đổi thành "Hiện lại"; hồ sơ công khai `/p/[slug]` của người làm đó không còn nhận xét; `/admin/audit` có dòng "Ẩn/hiện nhận xét". Bấm "Hiện lại" → nhận xét hiện lại.

### B9. Xóa tài khoản

1. Đăng nhập N (nút "người làm") → `/account` → tick xác nhận → Xóa → ✔ về trang chủ với thông báo đã xóa. **Sau bước này nút "người làm" không đăng nhập được nữa: chạy lại `seed.sql` để tạo lại `nguoilam1@`.**
2. SQL Editor: `select * from auth.users where email = '<email N>'` → ✔ 0 dòng; `profiles`, `private_contacts`, `worker_profiles`, `shift_claims`, `shift_results` không còn dòng nào của N.
3. Bấm lại nút "người làm" ở `/login` → ✔ báo lỗi đăng nhập (tài khoản đã xóa). Chạy lại `seed.sql` để khôi phục.

### B11. Bản đồ

Cần `0002_toa_do_co_so.sql` đã áp và `seed.sql` đã chạy lại (seed ghi tọa độ). Bản đồ tải nền từ `tiles.openfreemap.org`: máy test cần có mạng.

1. Trang chủ `/` (chưa đăng nhập): dưới băng đầu có bản đồ minh họa, chú thích "Bản đồ minh họa, dữ liệu mẫu" hiện rõ, ✔ 4 ghim (SOHO Coffee, Phê La Vũng Tàu, OASIS SEA Coffee & Tea, Texas Chicken; các quán đã xác minh), không chồng lên nhau ở 360–414px. Cuộn tới bản đồ mới tải (không chặn phần đầu trang).
2. N vào `/shifts`: ✔ bản đồ chỉ hiện ghim cho ca còn chỗ ở quán số 1–4 (SOHO Coffee, Phê La, OASIS SEA, An Coffee Bean; KATINAT chưa xác minh nên không có ca); chạm một ghim → ✔ thẻ ca tương ứng được chọn và cuộn tới; chạm một thẻ ca → ✔ ghim tương ứng nổi lên. Lọc khu vực/loại việc → ✔ bản đồ và danh sách cùng đổi. Ca không có tọa độ (nếu có) vẫn hiện trong danh sách.
3. Tự làm mới: Q đăng thêm một ca (hoặc N nhận ca) ở tab khác, N để `/shifts` mở ≥ 30 giây ✔ danh sách và ghim tự cập nhật, không nhảy mất vị trí cuộn.
4. N mở một ca ở `/shifts/[id]`: ✔ bản đồ nhỏ một ghim; "Chỉ đường" mở Google Maps tới đúng tọa độ ghim; không có số điện thoại ở bản đồ hay popup.
5. Q vào `/employer`: dòng "Vị trí quán: đã ghim" (bấm vào để sửa) ✔ nằm ở cuối trang, sau các nhóm ca, và thu gọn (bản đồ chưa tải). Bấm vào dòng đó → ✔ bản đồ dựng đúng khung, hiện ghim SOHO Coffee; đóng rồi mở lại vẫn đúng khung. (Quán chưa có ghim: ✔ dòng "Chưa ghim vị trí quán" nền vàng nằm sau nhóm "Cần anh/chị xác nhận", trước các nhóm ca khác, cũng thu gọn.) Chạm chỗ khác trên bản đồ (hoặc kéo ghim) → Lưu vị trí → ✔ "Đã lưu vị trí quán."; N mở `/shifts/[id]` ca của SOHO Coffee → ghim đã đổi. Thử "Dùng vị trí hiện tại" (cho phép định vị) khi đang ở ngoài Vũng Tàu → ✔ báo lỗi tiếng Việt, không lưu. **Cuối bài test, đặt lại tọa độ seed** của SOHO Coffee (10.3306, 107.0768) hoặc chạy lại `seed.sql`.
6. A vào `/admin`: ✔ bản đồ ca trong 24 giờ tới, chạm ghim mở `/employer/shifts/<id>`; trang tự làm mới mỗi 30 giây. A vào `/admin/facilities`: ✔ bản đồ mọi cơ sở (đã xác minh / chờ xác minh / đã gỡ khác màu), mở "Vị trí trên bản đồ" của một cơ sở để đặt ghim. **Đừng thử đặt ghim bằng tài khoản nhóm vận hành**: thao tác này ghi nhật ký (`Đặt vị trí cơ sở`) vào `/admin/audit`; nếu lỡ làm thì chạy lại `seed.sql` để trả tọa độ.
7. Bàn phím và đọc màn hình: ghim chọn được bằng Tab, mỗi ghim có tên đọc được ("SOHO Coffee, ..."). Bề rộng 360px: bản đồ không gây cuộn ngang, kéo bản đồ không làm cuộn cả trang bị kẹt (có thể lướt qua bản đồ bằng một ngón).
8. Mất mạng hoặc chặn `tiles.openfreemap.org` → ✔ danh sách ca vẫn dùng được, bản đồ báo không tải được bằng chữ.
9. Dòng nhắc SĐT quán (theo chỉ thị chủ dự án 19/11/2026): N đã nhận suất mở `/shifts/[id]` của ca đó → ✔ ngay dưới "Liên hệ quán: … · <số>" có dòng "Dữ liệu mô phỏng. Không gọi số này để hỏi về ca."; A vào `/admin` (ca sắp tới và ca chờ xác nhận), `/admin/facilities` và `/admin/reports` → ✔ dòng đó nằm dưới mỗi dòng "Chủ quán/Chủ: … · <số>" (ở báo cáo: dưới dòng "Người liên quan", vì người đó có thể là chủ quán). Ở 360–414px: ✔ chữ nhỏ hơn thân nhưng đọc được, xuống dòng không bị cắt, không cuộn ngang.

### B10. Kiểm tra giao diện

- Bề rộng 360px: không có thanh cuộn ngang ở mọi trang; nút cao ≥ 48px; chữ ≥ 18px. Lặp lại ở 390px, 414px, 1024px (đổi giữa thanh dưới và rail trái), 1280px và 1440px.
- Link nằm trong đoạn văn (vd. "Xem trước" ở `/profile`) là chữ gạch chân liền dòng, không làm dòng cao bất thường; link đứng riêng và nút vẫn cao ≥ 48px.
- Tab trình duyệt hiện biểu tượng ô cửa chớp (`src/app/icon.svg`), đọc được ở 16px.
- Đưa điện thoại cho một người lớn tuổi thử: đăng ca (mở form → điền → gửi) và xác nhận sau ca (mở link → chọn → gửi) đều ≤ 3 bước.
- Chân mọi trang có "Không bao giờ thu phí người làm."; `/terms` có câu "SafeShift chỉ kết nối người làm và nơi thuê…".
- Gửi link trang web cho chính mình qua Zalo, bấm mở **trong Zalo** → `/login` ✔ ba nút demo hiện đủ và bấm được trong Zalo (không cần Google, không mở cửa sổ ngoài). Bấm "chủ quán" → ✔ vào `/employer`.
