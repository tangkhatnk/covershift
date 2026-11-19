# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Đã có: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind 3.4 + Supabase, deploy Vercel (https://safeshift-beta.vercel.app). Thư viện giao diện được chủ dự án cho phép khi làm lại giao diện: `lucide-react` (icon), `next/font` (font tự host), MapLibre với nền OpenFreeMap (bản đồ, sắp có).

## Users
- **Chủ quán nhỏ ở Vũng Tàu** (quán cà phê, nhà hàng, homestay, khách sạn nhỏ), nhiều người lớn tuổi, dùng điện thoại, thường mở từ link Zalo/Facebook. Việc cần làm: đăng ca khi thiếu người; sau ca xác nhận qua link không cần đăng nhập.
- **Học sinh từ 15 tuổi và sinh viên** ở Vũng Tàu: tìm và nhận ca ngắn hạn; mỗi ca đã xác nhận thành hồ sơ ca làm.
- **Phụ huynh** của người làm 15–17 tuổi: đồng ý qua link có token, không đăng nhập.
- **Nhóm vận hành**: duyệt người làm, xác minh cơ sở, điều phối ca, xử lý báo cáo.
- Buổi demo 26/11/2026 trình bày cho **ban giám khảo**, có thể trên laptop hoặc máy chiếu.

## Product Purpose
Kết nối ca làm ngắn hạn an toàn giữa cơ sở dịch vụ nhỏ và người làm là học sinh/sinh viên. Nền tảng **chỉ kết nối**: không thu phí, không thanh toán trong app; lương, hợp đồng, điều kiện làm việc do hai bên tự thỏa thuận. Thành công là ca được lấp đủ, đúng giờ, người làm an toàn, chủ quán xác nhận sau ca bằng một cú bấm.

## Positioning
- Mỗi ca luôn có một người dự phòng, tự lên thay khi người chính hủy.
- Chỉ cơ sở đã được xác minh tận nơi mới đăng được ca.
- Rào an toàn cho người dưới 18 chặn ngay ở database (giờ làm, độ dài ca, phụ huynh đồng ý, admin duyệt), không chỉ ở giao diện.
- Ca được chủ quán xác nhận thành hồ sơ ca làm chia sẻ được (tắt mặc định).

## Operating Context
- Bề mặt chính là điện thoại 360–414px; trình duyệt nhúng của Zalo/Facebook; mạng 4G có thể yếu; dùng ngoài trời, ánh nắng.
- Chủ quán và phụ huynh mở link token một lần, không đăng nhập, không phụ thuộc `alert`/cửa sổ mới.
- Server chạy UTC, mọi giờ hiển thị theo `Asia/Ho_Chi_Minh`.
- Đăng nhập chỉ bằng 3 nút tài khoản demo (người làm, chủ quán, nhóm vận hành).
- Sắp có: bản đồ trực quan các ca và cơ sở (MapLibre + nền OpenFreeMap), tự cập nhật.

## Capabilities and Constraints
- Ba vai trò: `worker`, `employer`, `admin`. Quy tắc nghiệp vụ nằm ở database; giao diện chỉ hiển thị. Ghi dữ liệu chỉ qua server action.
- Giữ nguyên văn `DISCLAIMER` và `NO_FEE` trong `src/lib/constants.ts`.
- Không thu CCCD, ảnh chân dung, địa chỉ nhà. Không SMS, không thanh toán, chỉ gói miễn phí.
- Giữa người làm và chủ quán, số điện thoại chỉ lộ qua `get_shift_contacts()`.
- Thuật ngữ: "ca", "người làm", "chủ quán", "nhóm vận hành" (không gọi "admin" trên giao diện), "người chính", "người dự phòng", "hồ sơ ca làm", "phụ huynh". Xưng hô: "anh/chị" với chủ quán và phụ huynh; "bạn" với người làm.
- Không bịa tên pháp nhân, địa chỉ, email, số điện thoại liên hệ.
- **Chưa quyết**: có chạy với người thật sau buổi demo hay không.

## Brand Commitments
Hướng giao diện hiện tại là "Biển & Nắng" (chỉ thị chủ dự án 19/11/2026, thay "Phố cửa chớp"): xanh biển cho khung và nút chính, vàng nắng làm điểm nhấn, nền vôi sáng, logo mặt trời nhô trên hai làn sóng, giao diện có chuyển động CSS ngắn (tôn trọng giảm chuyển động). Chi tiết: `DESIGN.md`.

Tên SafeShift. Cam kết "Không bao giờ thu phí người làm." (`NO_FEE`) và dòng miễn trừ (`DISCLAIMER`) là nguyên văn bất biến. Chủ dự án đã cho phép đổi một số quy tắc giao diện hiện tại (nền sáng được giữ; thêm `lucide-react`, font `next/font`, bố cục desktop rộng, thanh điều hướng dưới trên điện thoại); các quy tắc đó sẽ được cập nhật trong `AGENTS.md` khi build.

## Evidence on Hand
**Chưa có bằng chứng thật.** App là bản mô phỏng chỉ dùng dữ liệu mẫu (20 tài khoản `@demo.safeshift.test`, seed ở `supabase/seed.sql`). Không có khách hàng, số liệu sử dụng, lời chứng thực hay báo chí. Tuyệt đối không bịa những thứ đó; dữ liệu minh họa phải là dữ liệu mẫu và được nhận ra là mẫu.

## Product Principles
1. An toàn của người làm trẻ đứng trên tiện lợi; rào an toàn phải thấy được trên giao diện, nhưng thật sự nằm ở database.
2. Người lớn tuổi dùng điện thoại ngoài nắng phải làm xong việc không cần học: một việc chính mỗi màn hình, chữ lớn, vùng chạm lớn.
3. Chỉ kết nối, nói thật: không hứa lương, không hứa an toàn tuyệt đối, không khẳng định điều hệ thống chưa bảo đảm.
4. Chỉ hiển thị điều có thật; dữ liệu mẫu được gọi đúng là dữ liệu mẫu.
5. Ổn định hơn tính năng: chạy được trong trình duyệt nhúng, trên mạng yếu.

## Accessibility & Inclusion
Chữ nội dung tối thiểu 18px; vùng chạm tối thiểu 48px; tương phản WCAG AA; chạy được trong trình duyệt nhúng của Zalo; tiếng Việt có dấu đầy đủ; không dùng màu làm tín hiệu duy nhất; tôn trọng `prefers-reduced-motion`.
