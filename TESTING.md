# Kịch bản test SafeShift

Có hai tầng:

- **A. Test tự động ở tầng database** — 79 test + chạy đua, không cần Supabase. Đây là nơi mọi quy tắc nghiệp vụ được chặn.
- **B. Test tay trên giao diện** — chạy trên bản deploy (hoặc local) nối với Supabase thật, sau khi đã chạy `seed.sql`.

---

## A. Test tự động (database)

```bash
npm run test:db
```

Lệnh này dựng một Postgres nhúng, giả lập môi trường Supabase (role `anon` / `authenticated`, `auth.uid()`), chạy `0001_init.sql` → `seed.sql` → `supabase/tests/edge_cases.sql`, rồi chạy đua thật trên nhiều kết nối. Kỳ vọng: `79/79 test đạt` + 5 dòng `✔ chạy đua`.

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
| Hủy > 2 tiếng → dự phòng lên chính | 8a | `cancel_claim` |
| Hủy < 2 tiếng → `late_cancel` | 8c | `cancel_claim` + báo cáo cho admin |
| Trả lời khác "Đủ" → báo cáo | 9a | trigger `payment_feedback_report` |
| Tự nâng quyền / ghi thẳng bảng / gọi hàm nội bộ | 10a–10f | quyền bảng + quyền hàm |
| Thao tác admin có audit log | 10g, 10h | mọi RPC `admin_*` |
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

Chuẩn bị: đã chạy migration + seed; có 3 tài khoản Google/email thật: **A** (sẽ là admin — chạy `select make_admin('…')`), **Q** (chủ quán), **N** (người làm). Dùng điện thoại hoặc DevTools ở bề rộng 360–414px.

Dữ liệu seed dùng trong kịch bản: "Quán Demo 1–4" đã xác minh, "Quán Demo 5" chờ xác minh; ca 23:00 ở Quán Demo 2 (ngày kia, 18:00–23:00).

### B1. Đăng ký người làm từ 18 tuổi → nhận ca (luồng chính)

1. N đăng nhập → `/dang-ky` → "Tôi tìm việc" → điền form, ngày sinh 20 tuổi, tick đồng ý → Gửi.
   ✔ Sang `/ho-so`, trạng thái "Chờ duyệt". Vào `/ca`: có thông báo chờ duyệt; bấm "Nhận ca" → báo *"Hồ sơ của bạn chưa được duyệt…"*.
2. A vào `/admin/nguoi-lam` → Duyệt N. ✔ `/admin/nhat-ky` có dòng "Duyệt người làm".
3. N vào `/ca` → ✔ ca GẤP nằm trên cùng; lọc theo khu vực / loại việc / ngày ra đúng ca.
4. N mở ca chưa ai nhận → "Nhận ca này" → ✔ báo "Bạn là NGƯỜI CHÍNH", hiện tên + số điện thoại của quán.
5. Mở ca đã có người chính (ca 23:00) → nhận → ✔ "NGƯỜI DỰ PHÒNG".
6. Mở ca đã đủ chính + dự phòng → ✔ không có nút nhận / báo đã đủ người.

### B2. Tuổi

1. Đăng ký với ngày sinh 14 tuổi → ✔ *"Bạn cần đủ 15 tuổi để đăng ký."*, không tạo tài khoản (tải lại vẫn ở `/dang-ky`).
2. Đăng ký ngày sinh 16 tuổi → ✔ `/ho-so` hiện khối "Phiếu phụ huynh" + link + nút sao chép.
3. Mở link `/dong-y/…` ở trình duyệt ẩn danh (không đăng nhập) → điền tên, SĐT, tick → Gửi → ✔ cảm ơn. Mở lại link → ✔ "đã được gửi".
4. A duyệt ở `/admin/nguoi-lam` (trước bước 3 thì nút Duyệt báo lỗi *"phụ huynh chưa gửi phiếu"*).
5. Người 16 tuổi vào `/ca` → ✔ KHÔNG thấy ca 18:00–23:00; chỉ thấy ca có nhãn "Nhận dưới 18 tuổi".
6. Dán thẳng URL `/ca/50000000-0000-4000-a000-000000000003` → ✔ "không tìm thấy".

### B3. Chủ quán

1. Q đăng ký "Tôi là chủ quán" → ✔ `/quan` báo chờ xác minh, không có form đăng ca.
2. Thử đặt tên cơ sở "Karaoke ABC" khi đăng ký → ✔ bị từ chối.
3. A vào `/admin/co-so` → phiếu xác minh: bỏ trống "đúng địa chỉ" → ✔ lỗi; tick đủ → ✔ cơ sở "Đang hoạt động".
4. Q vào `/quan/dang-ca`:
   - lương 20.000 → ✔ *"Lương/giờ phải từ 25500 đ trở lên."*
   - không tick cam kết → ✔ không gửi được
   - tick "Nhận dưới 18" với giờ 18:00–23:00 → ✔ lỗi 06:00–22:00
   - hợp lệ → ✔ sang trang ca, báo "Đã đăng ca".
5. "Nhân bản ca này" → ✔ form điền sẵn, chỉ cần chọn ngày → đăng.
6. N và một người làm khác nhận ca → Q thấy người chính + dự phòng kèm SĐT → "Đổi chỗ với người dự phòng" → ✔ hai người đổi vai.

### B4. Số điện thoại

1. Người làm chưa nhận ca mở `/ca/[id]` → ✔ không có SĐT ở đâu trong trang (xem cả View Source).
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

1. N hủy ca còn hơn 2 tiếng (N đang là người chính, ca có dự phòng) → ✔ người dự phòng thành người chính (xem ở `/quan/ca/[id]` hoặc `/admin`).
2. Ca bắt đầu trong vòng 2 tiếng: trang ca cảnh báo "hủy sát giờ" → hủy → ✔ `/ho-so` tăng "số lần hủy sát giờ"; `/admin/bao-cao` có báo cáo "Hủy sát giờ".
   (Tạo nhanh: Q đăng ca bắt đầu sau 90 phút, N nhận rồi hủy.)

### B6. Xác nhận sau ca

Dùng ca seed "vừa hết giờ" (Quán Demo 3, dọn phòng) — link: `/xac-nhan/demo-token-con-han`.

1. Mở link ở trình duyệt ẩn danh → ✔ thấy tên quán, giờ, tên người làm; không cần đăng nhập.
2. Chọn "Đã làm" → "Đúng giờ" → 5 sao → nhận xét → Gửi → ✔ cảm ơn.
3. Mở lại link → ✔ "Link này đã được dùng".
4. Mở `/xac-nhan/demo-token-het-han` → ✔ "Link đã hết hạn".
5. Mở `/xac-nhan/abc` → ✔ "Link không hợp lệ".
6. Với ca thật: sau giờ kết thúc, Q vào `/quan/ca/[id]` thấy nút "Xác nhận ngay"; A thấy ca ở `/admin` mục "chờ xác nhận" kèm nút sao chép tin nhắn.

### B7. Sau ca phía người làm

1. N (người chính của ca vừa xác nhận) mở `/ca-cua-toi` → ✔ ca nằm ở "Cần bạn trả lời".
2. Chọn "Chưa đủ" → ✔ `/admin/bao-cao` có báo cáo "Tiền công" đang mở. Chọn "Đủ" (ở ca khác) → không tạo báo cáo.
3. N vào `/ho-so` bật chia sẻ → mở link `/h/[slug]` ở trình duyệt ẩn danh → ✔ thấy số ca, tổng giờ, loại việc, điểm, tỷ lệ đúng giờ, nhận xét; KHÔNG có SĐT. Bấm "In / Lưu PDF" → ✔ bản in gọn, không có thanh điều hướng.
4. Tắt chia sẻ → tải lại link ở trình duyệt ẩn danh → ✔ "không tồn tại hoặc đang tắt chia sẻ".

### B8. Admin

1. `/admin`: ca trong 24 giờ tới hiện người chính / dự phòng; "Sao chép tin nhắn nhắc ca" → dán vào ghi chú → ✔ có tên quán, địa chỉ, giờ, link Google Maps.
2. "Người chính báo bận" trên ca có dự phòng → ✔ dự phòng lên chính; `/admin/bao-cao` có sự cố; `/admin/nhat-ky` có dòng tương ứng. Trên ca không có dự phòng → ✔ cảnh báo đỏ "KHÔNG có người dự phòng".
3. Khóa tài khoản N → N tải lại trang → ✔ bị đưa về `/tai-khoan` với thông báo khóa; các ca sắp tới của N bị hủy. Mở khóa → dùng lại bình thường.
4. Gỡ một cơ sở → ✔ các ca sắp tới của cơ sở bị hủy; chủ quán không đăng ca được nữa.
5. `/admin/kpi` → đủ 12 chỉ số → "Tải CSV" → mở bằng Excel ✔ tiếng Việt không lỗi font.
6. Đổi lương tối thiểu thành 30.000 → Q đăng ca 27.000 → ✔ bị từ chối. Đổi lại 25.500.
7. Đăng nhập bằng tài khoản không phải admin rồi mở `/admin` → ✔ bị chuyển về trang của vai trò đó.

### B9. Xóa tài khoản

1. N vào `/tai-khoan` → tick xác nhận → Xóa → ✔ về trang chủ với thông báo đã xóa.
2. SQL Editor: `select * from auth.users where email = '<email N>'` → ✔ 0 dòng; `profiles`, `private_contacts`, `worker_profiles`, `shift_claims`, `shift_results` không còn dòng nào của N.
3. Đăng nhập lại bằng email đó → ✔ như người mới (về `/dang-ky`).

### B10. Kiểm tra giao diện

- Bề rộng 360px: không có thanh cuộn ngang ở mọi trang; nút cao ≥ 48px; chữ ≥ 18px.
- Đưa điện thoại cho một người lớn tuổi thử: đăng ca (mở form → điền → gửi) và xác nhận sau ca (mở link → chọn → gửi) đều ≤ 3 bước.
- Chân mọi trang có "Không bao giờ thu phí người làm."; `/dieu-khoan` có câu "SafeShift chỉ kết nối người làm và nơi thuê…".
