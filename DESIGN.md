---
name: SafeShift
description: "Phố cửa chớp: tường vàng, cửa chớp xanh, nền vôi. Ca làm ngắn hạn an toàn ở Vũng Tàu, đọc được ngoài nắng trên điện thoại."
colors:
  chalk: "#F6F4E8"
  ink: "#17231D"
  ink-soft: "#46524B"
  shutter: "#1F5C45"
  shutter-deep: "#153F30"
  shutter-tint: "#DDEBE3"
  wall: "#F2C94C"
  wall-tint: "#FBF0C4"
  roof: "#B0391F"
  roof-tint: "#F8DDD5"
  sea: "#1C5F8A"
  sea-tint: "#D6E6EF"
  rule: "#CFCAB2"
  rule-strong: "#7C8479"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.75rem
  body:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5rem
  body-strong:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.75rem
  label:
    fontFamily: "Be Vietnam Pro, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25rem
  shift-hours:
    fontFamily: "Barlow Condensed, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.25
    fontFeature: "'tnum' 1"
rounded:
  ui: "6px"
spacing:
  unit: "0.5rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  touch: "3rem"
  chrome-top: "3.5rem"
  chrome-bottom: "4.5rem"
  rail: "15rem"
components:
  button-primary:
    backgroundColor: "{colors.shutter}"
    textColor: "{colors.white}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.ui}"
    padding: "0.5rem 1.5rem"
    height: "{spacing.touch}"
  button-primary-hover:
    backgroundColor: "{colors.shutter-deep}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.shutter}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.ui}"
    padding: "0.5rem 1.5rem"
    height: "{spacing.touch}"
  button-secondary-hover:
    backgroundColor: "{colors.shutter-tint}"
  button-danger:
    backgroundColor: "{colors.roof}"
    textColor: "{colors.white}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.ui}"
    padding: "0.5rem 1.5rem"
    height: "{spacing.touch}"
  button-ghost:
    textColor: "{colors.shutter}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.ui}"
    padding: "0.5rem 1.5rem"
    height: "{spacing.touch}"
  button-ghost-hover:
    backgroundColor: "{colors.shutter-tint}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.ui}"
    padding: "0.5rem 1rem"
    height: "{spacing.touch}"
  page-title:
    backgroundColor: "{colors.wall}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.ui}"
    padding: "1rem"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ui}"
    padding: "1rem"
  card-tab:
    backgroundColor: "{colors.wall-tint}"
    textColor: "{colors.ink}"
    padding: "0.5rem 1rem"
  badge-green:
    backgroundColor: "{colors.shutter-tint}"
    textColor: "{colors.shutter-deep}"
    typography: "{typography.label}"
    padding: "0 0.5rem"
    height: "2rem"
  badge-amber:
    backgroundColor: "{colors.wall-tint}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "0 0.5rem"
    height: "2rem"
  badge-red:
    backgroundColor: "{colors.roof-tint}"
    textColor: "{colors.roof}"
    typography: "{typography.label}"
    padding: "0 0.5rem"
    height: "2rem"
  badge-blue:
    backgroundColor: "{colors.sea-tint}"
    textColor: "{colors.sea}"
    typography: "{typography.label}"
    padding: "0 0.5rem"
    height: "2rem"
  badge-gray:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    padding: "0 0.5rem"
    height: "2rem"
  nav-surface:
    backgroundColor: "{colors.shutter-deep}"
    textColor: "{colors.white}"
  nav-item-active:
    backgroundColor: "{colors.wall}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ui}"
    height: "{spacing.touch}"
  map-pin-open:
    backgroundColor: "{colors.shutter}"
    textColor: "{colors.white}"
    typography: "{typography.shift-hours}"
    rounded: "{rounded.ui}"
  map-pin-urgent:
    backgroundColor: "{colors.roof}"
    textColor: "{colors.white}"
  map-pin-full:
    backgroundColor: "{colors.white}"
    textColor: "{colors.shutter}"
  map-pin-pending:
    backgroundColor: "{colors.wall}"
    textColor: "{colors.ink}"
  map-pin-removed:
    backgroundColor: "{colors.rule}"
    textColor: "{colors.ink-soft}"
  map-pin-selected:
    backgroundColor: "{colors.wall}"
    textColor: "{colors.ink}"
---

# Design System: SafeShift

Tài liệu này **mô tả** hệ hình ảnh đang chạy trong mã (đọc từ `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/{ui,client,map}.tsx`). Quy tắc bắt buộc nằm ở `AGENTS.md` mục 18-24; hướng sản phẩm ở `PRODUCT.md`. Khi mâu thuẫn, `AGENTS.md` thắng. Sidecar `.impeccable/design.json` giữ phần frontmatter không chứa được (bảng màu bản đồ, đoạn HTML/CSS mẫu của thành phần, bóng, chuyển động).

## Overview

**Creative North Star: "Phố cửa chớp"**

Một dãy nhà phố ở Vũng Tàu: tường vàng, cửa chớp xanh, nền vôi. Ca làm là đơn vị của sản phẩm, và hình của nó là một hàng cửa chớp: cánh đóng là đã có người, khung trống là còn chỗ, một ô nét đứt là người dự phòng. Giao diện từ chối kiểu chợ việc làm màu phấn với thẻ bo tròn và ảnh sinh viên cười; nó giống tấm biển hiệu hơn là ứng dụng.

Mật độ vừa phải, chữ to, một việc chính mỗi màn hình, vì người đọc là chủ quán lớn tuổi mở link từ Zalo ngoài nắng. Mọi thứ phẳng: không bóng, không gradient, không kính mờ, ngoại lệ duy nhất là bóng mềm của pin bản đồ. Hình dạng là chữ nhật viền hairline bo 6px; khung chrome xanh đậm (thanh trên, rail, nav dưới, chân trang) bao quanh nền vôi.

Nhận ra được dù xóa hết chữ: dải tường vàng trên mô-đun viền mảnh có dải đầu nhạt, rail xanh, và các ô cửa chớp.

**Key Characteristics:**
- Bảng màu 4 họ, mỗi họ ba sắc (đậm, chuẩn, nhạt): xanh cửa chớp, tường vàng, ngói, biển; nền vôi và mực.
- Vàng là điểm nhấn duy nhất (băng tiêu đề, mục đang chọn, dải đầu mô-đun); ngói chỉ cho lỗi và nguy hiểm; biển chỉ cho thông tin.
- Số giờ ca là con số lớn nhất trên màn hình, Barlow Condensed với chữ số bảng cố định.
- Mỗi trạng thái ca là một cặp icon + chữ + tông, không bao giờ chỉ màu.
- Phẳng, viền hairline, 6px, khoảng cách là bội của 0,5rem.

## Colors

Bảng màu khai ở `tailwind.config.ts`; trang chỉ dùng tên token. Tên dưới đây là tên Tailwind, hex nằm ở frontmatter (nguồn chuẩn).

### Primary
- **Xanh cửa chớp** (`shutter`, `shutter-deep`, `shutter-tint`): `shutter` cho nút chính, liên kết, tiêu đề phụ, tick; `shutter-deep` cho toàn bộ khung chrome (thanh trên, rail, nav dưới, chân trang), hover của nút chính, vòng focus trên nền sáng, `themeColor`; `shutter-tint` cho nền hover, hàng được chọn, nền thông báo thành công và Badge xanh.

### Secondary
- **Tường vàng** (`wall`, `wall-tint`): `wall` cho băng tiêu đề trang (`PageTitle`), mục nav đang chọn, nút "Đăng nhập" trên thanh trên, vùng chọn văn bản (`::selection`), khối nổi bật của trang chủ; `wall-tint` cho dải đầu mô-đun (`Card tab`, đầu `ShiftCard`), Badge vàng, nền cảnh báo nhẹ.

### Tertiary
- **Ngói** (`roof`, `roof-tint`): lỗi, nút nguy hiểm, nhãn "GẤP", pin ca gấp.
- **Biển** (`sea`, `sea-tint`): thông tin trung tính (Badge xanh dương, thông báo thông tin).

### Neutral
- **Nền vôi** (`chalk`): nền toàn app, nền Badge xám.
- **Mực** (`ink`, `ink-soft`): chữ chính và chữ phụ.
- **Đường kẻ** (`rule`, `rule-strong`): `rule` cho viền hairline của mô-đun và đường phân cách; `rule-strong` cho viền ô nhập, ô tick, `Empty` và thông báo xám (viền thành phần tương tác).
- **Trắng** (`white`): nền mô-đun, ô nhập, nút phụ.

### Tỉ lệ tương phản (WCAG 2.x, tính từ hex ở trên)

| Chữ / nền | Tỉ lệ | Dùng ở | Mức |
|---|---|---|---|
| `ink` / `chalk` | 14,70 | chữ nội dung trên nền app | AA, AAA |
| `ink` / `white` | 16,22 | chữ trong mô-đun, ô nhập | AA, AAA |
| `ink-soft` / `chalk` | 7,41 | gợi ý, chữ phụ, Badge xám | AA, AAA |
| `ink-soft` / `white` | 8,17 | nhãn phụ trong mô-đun | AA, AAA |
| placeholder (`ink-soft` 80% trên trắng = `#6B756F`) | 4,77 | `placeholder` ô nhập | AA |
| trắng / `shutter` | 7,85 | nút chính | AA, AAA |
| trắng / `shutter-deep` | 11,76 | chữ trên khung chrome | AA, AAA |
| trắng / `roof` | 6,09 | nút nguy hiểm, pin gấp | AA |
| `shutter` / trắng | 7,85 | nút phụ, liên kết, `Tel` | AA, AAA |
| `shutter` / `shutter-tint` | 6,38 | nút phụ và ghost khi hover | AA |
| `shutter-deep` / `shutter-tint` | 9,56 | Badge xanh | AA, AAA |
| `shutter-deep` / `wall` | 7,41 | phụ đề `PageTitle` | AA, AAA |
| `ink` / `wall` | 10,22 | tiêu đề `PageTitle`, mục nav đang chọn | AA, AAA |
| `ink` / `wall-tint` | 14,18 | Badge vàng, dải đầu mô-đun | AA, AAA |
| `wall` / `shutter-deep` | 7,41 | `NO_FEE` ở chân trang, nav dưới đang chọn | AA, AAA |
| `shutter-tint` / `shutter-deep` | 9,56 | dòng miễn trừ ở chân trang | AA, AAA |
| `roof` / `roof-tint` | 4,72 | Badge đỏ (chữ `text-sm`, không phải chữ lớn): cặp sát ngưỡng nhất | AA (sát) |
| `sea` / `sea-tint` | 5,38 | Badge xanh dương | AA |
| `ink-soft` / `rule` | 4,96 | pin "removed" | AA |
| `rule-strong` / trắng | 3,86 | viền ô nhập, ô tick | chỉ đạt 3:1 cho thành phần giao diện, **không** dùng làm chữ |
| `rule-strong` / `chalk` | 3,50 | viền `Empty`, thanh cuộn | chỉ 3:1 cho UI, không làm chữ |
| `shutter-deep` / `chalk` | 10,65 | vòng focus trên nền sáng | đạt 3:1 |
| `wall` / `shutter-deep` | 7,41 | vòng focus trên nền xanh đậm | đạt 3:1 |
| `rule` / `chalk` | 1,49 | viền hairline mô-đun | **dưới 3:1, chủ ý**: chỉ là đường ngăn cách trang trí, ranh giới còn do nền trắng trên nền vôi |
| `wall` / `chalk` | 1,44 | (không dùng) | **không bao giờ làm chữ hoặc viền trên nền sáng** |

### Named Rules
**The One Yellow Rule.** Vàng là nền, không bao giờ là chữ hay viền trên nền sáng (1,44:1 trên `chalk`). Chữ trên vàng luôn là `ink` hoặc `shutter-deep`; chữ vàng chỉ xuất hiện trên `shutter-deep`.

**The Roof Is Danger Rule.** `roof` chỉ cho lỗi, hủy, nguy hiểm, "GẤP". Không dùng làm màu nhấn trang trí. `sea` chỉ cho thông tin.

**The Tint Pair Rule.** Mỗi sắc nhạt (`*-tint`) đi với chữ đậm cùng họ (`shutter-deep`, `roof`, `sea`) hoặc `ink`; không đặt chữ xám nhạt trên nền tint.

**The Token-Only Rule.** Không viết mã hex trong trang. Ngoại lệ có sẵn: `globals.css` (`::selection`, `caret-color`, thanh cuộn, vòng focus), `themeColor` ở `layout.tsx`, `src/app/icon.svg`, và bảng `MAP_COLOR` của bản đồ.

## Typography

**Chữ nội dung:** Be Vietnam Pro 400, 500, 600, 700 (`font-sans`, đặt ở `<body>`; subsets `latin`, `vietnamese`).
**Chữ số giờ ca:** Barlow Condensed 600, 700 (`font-num`, kèm lớp `tabular` = `tabular-nums` và `'tnum' 1`).
Cả hai nạp bằng `next/font/google` (`display: 'swap'`), tự host sau build; người dùng không gọi Google Fonts. Be Vietnam Pro không có chữ số bảng cố định nên số giờ dùng Barlow Condensed để các giờ thẳng cột.

**Character:** Be Vietnam Pro tròn, rộng, dấu tiếng Việt rõ; Barlow Condensed hẹp, đậm, giống số trên biển hiệu. Cặp này làm giờ ca nổi như số nhà.

Cỡ chữ gốc `html { font-size: 18px }`, nên `rem` lớn hơn mặc định 12,5%: `text-base` = 18px, `text-lg` = 20,25px, `text-xl` = 22,5px, `text-2xl` = 27px, `text-4xl` = 40,5px, `text-5xl` = 54px, `text-sm` = 15,75px. Input ép `font-size: 1rem` (18px) để iOS không tự phóng.

### Hierarchy
- **Display** (700, `text-4xl`, `lg:text-5xl`, `leading-tight`): tiêu đề trang chủ.
- **Headline** (700, `text-2xl`, `leading-tight`): `PageTitle` trên băng tường vàng; chữ đậm `ink`.
- **Title** (700, `text-xl`): tiêu đề mục (`DocSection`, `Point` ở trang chủ, tên thương hiệu ở thanh trên).
- **Body** (400, `text-base`): nội dung. Tờ đọc (`Doc`) dùng `leading-relaxed` và cột rộng 40rem.
- **Body-strong** (600, `text-lg`): chữ trên nút, ô nhập, giá `…/giờ` trong thẻ ca.
- **Label** (600, `text-sm`): Badge, nhãn nav dưới, chữ "Dự phòng" cạnh ô cửa. `text-sm` chỉ cho gợi ý phụ, nhãn Badge, nhãn nav dưới, chân trang, chú thích bản đồ.
- **Shift-hours** (Barlow Condensed 700, `text-4xl`, `leading-tight`, `tabular`): giờ ca trong `ShiftCard`. Trên pin bản đồ cùng họ chữ ở `text-lg`.

Không dùng `text-xs` hay `text-[...]`.

### Named Rules
**The Biggest Numeral Rule.** Giờ ca là con số lớn nhất trong thẻ ca, luôn `font-num tabular`.

**The No Small Print Rule.** Nội dung người dùng cần đọc không nhỏ hơn `text-base`.

## Layout

Khung do `AppShell` (`src/components/client.tsx`) dựng; `layout.tsx` chỉ truyền vai trò, tên, chân trang.

| Thành phần | Điện thoại (< 1024px) | Từ `lg` (1024px) |
|---|---|---|
| Thanh trên | dính, cao `3.5rem` (`--chrome-top`), nền `shutter-deep`, nội dung trong `max-w-6xl`; có nav chính thì ẩn ở `lg` | ẩn khi có rail; còn lại vẫn hiện |
| Điều hướng | nav dưới cố định, cao `4.5rem` + `env(safe-area-inset-bottom)` (`--chrome-bottom`); mục `border-t-4` vàng khi đang chọn; nhóm vận hành 4 tab + "Thêm" (`<details>`) | rail trái cố định rộng `15rem` (`w-60`), nền `shutter-deep`, đủ các mục, có Tài khoản và Đăng xuất; nội dung lùi `lg:pl-60` |
| Chân trang | nền `shutter-deep`, chứa `NO_FEE` và `DISCLAIMER`; có nav thì thêm padding đáy bằng `--chrome-bottom` | giống |
| Nội dung | `mx-auto w-full px-4 py-6` | `lg:px-8 lg:py-8` |

Bề rộng nội dung do `contentWidth(pathname)`: `/` tự dựng bố cục; `max-w-6xl` (72rem) cho `/dang-nhap`, `/dieu-khoan`, `/chinh-sach-du-lieu`, `/ca`, `/ca-cua-toi`, `/quan`, `/admin` và `/admin/*`; `max-w-3xl` (48rem) cho mọi trang còn lại. Trang token và hồ sơ công khai (`/xac-nhan`, `/dong-y`, `/h`) và khi chưa đăng nhập, chưa đăng ký hoặc bị khóa: không có nav chính, chỉ thanh trên. Nhóm `lg:grid` hai cột cho danh sách ca + bản đồ (`ShiftExplorer`) và các lưới `md:grid-cols-2/3`. Breakpoint dùng: `sm` 640, `md` 768, `lg` 1024 (mặc định Tailwind, không khai lại). Tờ đọc `Doc`: cột 40rem căn giữa, mục lục dính bên phải `w-56` ở `lg`, trong `<details>` ở điện thoại.

Khoảng cách luôn là bội của `0.5rem` (9px ở cỡ gốc): `gap-2`, `p-4`, `py-6`, `lg:py-8`. Nút và ô nhập cao tối thiểu `3rem` (54px). `scroll-padding` của `<html>` theo `--chrome-top`/`--chrome-bottom`. In (`@media print`): ẩn mọi phần có `data-chrome`, bỏ padding và giới hạn bề rộng của `main`, nền trắng.

Chuỗi dài (tên người, quán, địa chỉ) xuống dòng, không `truncate`. Không cuộn ngang.

## Elevation & Depth

Phẳng hoàn toàn. Chiều sâu đến từ viền hairline (`border border-rule`), nền trắng trên nền vôi, dải đầu `wall-tint`, và khung chrome xanh đậm. Không `box-shadow`, không gradient, không `backdrop-filter`, không viền trái màu.

Ngoại lệ duy nhất: pin trên bản đồ, để nổi khỏi nền bản đồ nhiều màu: `shadow-md` lúc thường, `shadow-lg` khi chọn hoặc sáng lên; chấm ghim của `LocationPicker` cũng `shadow-md`. Giá trị Tailwind mặc định, ghi ở sidecar.

### Named Rules
**The Flat-By-Default Rule.** Không thêm bóng ở chỗ nào ngoài pin bản đồ. Muốn nhấn thì dùng viền `shutter` hoặc nền `wall`.

## Shapes

Một bán kính duy nhất cho mọi chữ nhật tương tác: `rounded-ui` = **6px** (px cố định, không theo cỡ gốc 18px): nút, ô nhập, mô-đun, `PageTitle`, `Alert`, `Check`, `Empty`, pin. Viền: hairline 1px `rule` cho mô-đun; 2px `rule-strong` cho ô nhập và ô tick (đổi sang `shutter` khi focus hoặc được chọn); 2px `shutter` cho nút phụ; 2px nét đứt `rule-strong` cho `Empty`. Mô-đun có thể có dải đầu (`overflow-hidden` giữ góc bo).

Hình đặc trưng riêng: ô cửa chớp (SVG 24x32, `rx` 2, các thanh chớp trắng 2px) và logo (`src/app/icon.svg`: nền vàng bo 5, cánh cửa xanh đậm, ba thanh vàng). Pin bản đồ là biển chữ nhật có đuôi vuông xoay 45 độ.

## Components

### Buttons (`btn(variant, full)`)
Cao tối thiểu `3rem`, `px-6 py-2`, `text-lg font-semibold`, `rounded-ui`, `gap-2`, `transition-colors`, `disabled:opacity-50 cursor-not-allowed`. Mặc định rộng hết khung (`full`); `full=false` cho nút nằm cạnh nhau.
- **primary**: nền `shutter`, chữ trắng; hover và active `shutter-deep`. Một nút chính mỗi màn hình.
- **secondary**: nền trắng, viền 2px `shutter`, chữ `shutter`; hover `shutter-tint`.
- **danger**: nền `roof`, chữ trắng; hover `brightness-90`. Luôn kèm bước xác nhận (xem Accessibility).
- **ghost**: chữ `shutter` gạch chân `underline-offset-4`; hover `shutter-tint`. Là nút đứng riêng nên cũng cao `3rem`.
Nút gửi form dùng `SubmitButton`: tự khóa và đổi nhãn "Đang gửi…" kèm vòng quay `motion-safe:animate-spin`; `confirm` dùng `window.confirm` chỉ ở trang cần đăng nhập.

### Inputs / Fields (`inputCls`, `Field`, `Check`)
- **Ô nhập**: nền trắng, viền 2px `rule-strong`, `rounded-ui`, cao `3rem`, `px-4 py-2`, chữ `text-lg ink`, placeholder `ink-soft/80`. Focus: viền `shutter` **và** vòng 3px toàn cục (không `outline-none`).
- **Field**: nhãn `text-base font-semibold` phía trên ô, gợi ý `text-sm ink-soft` phía dưới; bọc input trong `<label>`.
- **Check**: cả hàng là một `<label>` có viền 2px; được chọn thì viền `shutter` + nền `shutter-tint` (`has-[:checked]`), không chỉ dựa vào dấu tick; ô tick `1.5rem`, `accent-shutter`.
- Lỗi/thành công của form do `ActionForm` hiện bằng `Alert`.

### Cards / Containers (`Card`, `PageTitle`, `Empty`, `Disclosure`)
- **Card**: trắng, viền hairline `rule`, `rounded-ui`, `p-4`. Prop `tab` thêm dải đầu `wall-tint` (viền dưới `rule`, `px-4 py-2`) chứa **dữ liệu thật** của mô-đun (trạng thái, loại việc, "GẤP"), không phải nhãn trang trí.
- **PageTitle**: băng `wall` `rounded-ui px-4 py-4`, `h1` `text-2xl font-bold ink`, phụ đề `text-base shutter-deep`.
- **Empty**: viền nét đứt 2px `rule-strong`, `text-base ink-soft`, căn giữa.
- **Disclosure**: `<details>`; dòng tóm tắt cao `3rem`, chữ `shutter font-semibold`, mũi tên `ChevronDown` xoay khi mở; chạy bằng bàn phím.

### Badges (`Badge`, `StateBadge`)
`min-h-[2rem]`, `px-2`, `text-sm font-semibold`, `whitespace-nowrap`, bo `rounded` mặc định. Tông: `green` (`shutter-tint`/`shutter-deep`), `amber` (`wall-tint`/`ink`), `red` (`roof-tint`/`roof`), `blue` (`sea-tint`/`sea`), `gray` (`chalk` + viền `rule`/`ink-soft`). `StateBadge` là từ điển đóng của trạng thái ca: mỗi trạng thái đúng một icon Lucide + nhãn + tông (nhãn và tông lấy từ `format.ts`): `open` DoorOpen, `filled` DoorClosed, `in_progress` CirclePlay, `awaiting_confirm` Hourglass, `expired` TriangleAlert, `unfilled` CircleAlert, `confirmed` CircleCheck, `cancelled` Ban. Không tự ghép Badge trạng thái ca ở trang khác.

### Alert
Nền tint + viền 1px + icon `h-6 w-6` (CircleCheck, TriangleAlert, OctagonAlert, Info) + chữ `ink`, `rounded-ui px-4 py-2`. Tông đỏ là `role="alert"`, còn lại `role="status"`; `ActionForm` truyền rõ theo lỗi/thành công và thêm `scroll-my-4`.

### Tel, Stars
- **Tel** `inline` (mặc định): nằm giữa dòng chữ, `py-2` chỉ nới vùng chạm, không nới dòng, không `min-h`. `block`: đứng riêng một hàng, cao `3rem`, kèm icon Phone. Không có số: "(chưa có số)".
- **Stars**: năm icon `Star` `h-5 w-5` (đầy `fill-wall stroke-shutter-deep`, rỗng chỉ `stroke-rule-strong`); bao ngoài `role="img"` có `aria-label="… trên 5 sao"`.

### Signature: Dãy cửa chớp (`SlotStrip`)
Hàng ô cửa SVG (`h-10 w-8`): mỗi người chính một ô; đóng (`fill-shutter`, `stroke-shutter-deep`, bốn thanh chớp trắng) = đã có người; mở (`fill-white`, `stroke-rule-strong`) = còn chỗ; sau một trụ `rule` (`h-10 w-1`) là một ô dự phòng nét đứt `4 3` (đóng khi đã có dự phòng) kèm chữ "Dự phòng" `text-sm`. Hình `aria-hidden`; luôn có câu chữ đọc được bên dưới ("2/3 người chính · chưa có dự phòng", `text-base`). Không rút gọn chữ "Dự phòng", không chỉ dựa vào hình và màu.

### Shift card (`ShiftCard`)
Mô-đun hairline (viền `roof` khi gấp và còn sắp diễn ra, `hover:border-shutter` khi là link). Dải đầu `wall-tint`: nhãn "GẤP" đỏ, loại việc `text-base font-bold`, Badge "Nhận dưới 18 tuổi", `StateBadge` khi `showState`. Thân `p-4`: ngày `text-base ink-soft`; **giờ `font-num tabular text-4xl font-bold`**; tên quán · khu vực; lương `text-lg font-semibold shutter` + số giờ; `SlotStrip` nếu ca sắp diễn ra; phần `extra`. Cả thẻ là `Link` khi có `href`.

### Navigation
Nền `shutter-deep`, chữ trắng, mục đang chọn mang `aria-current="page"`.
- **Rail (lg)**: mục `min-h-[3rem] px-4 rounded-ui text-lg font-semibold`, icon `h-6 w-6`; đang chọn nền `wall` chữ `ink`; hover `shutter`. Dưới có Tài khoản (nếu chưa nằm trong nav) và nút Đăng xuất.
- **Nav dưới (điện thoại)**: ô cao `4.5rem`, icon `h-6 w-6` trên nhãn `text-sm leading-tight` căn giữa; đang chọn `border-t-4 border-wall text-wall`. "Thêm" của nhóm vận hành là `<details>`: đóng bằng Esc, chạm ra ngoài hoặc khi đổi trang; danh sách thả `w-60` trắng viền hairline.
- **Thanh trên**: logo `Mark` (SVG cùng hình `icon.svg`, dùng token `wall`/`shutter-deep`) + tên; bên phải tên người dùng (tới `/tai-khoan`) hoặc nút vàng "Đăng nhập".

### Doc, DocSection, DocList (chế độ Read)
Tờ đọc: `PageTitle`, khối thông báo, mục lục (dính bên phải ở `lg`, trong `<details>` ở điện thoại, mục cao `3rem`), bài `rounded-ui border border-rule bg-white px-4 sm:px-8`. `DocSection` có tiêu đề đánh số `text-xl font-bold`, kẻ trên `border-rule`, `scroll-mt-4`; `DocList` chấm `marker:text-shutter`.

### Bản đồ (`src/components/map.tsx`, MapLibre, tải động)
- **Nền**: style `positron` của OpenFreeMap (`tiles.openfreemap.org`), tô lại theo bảng màu bằng `restyle()` khi style tải xong. Màu (bảng `MAP_COLOR`, nguồn chuẩn: mã):

| Lớp | Hex |
|---|---|
| Đất / nền (`land`) | `#F3EFD9` |
| Công viên, rừng (`park`) | `#D9E4C6` |
| Nước (`water`) | `#B9D7D3` |
| Nhà (`building`) | `#E9DFB4` |
| Đường thường (`road`) | `#FFFFFF`, viền `#DAD3B0` (`roadEdge`, thêm lớp viền dưới đường thường và đường mòn) |
| Đường lớn (`major`) | `#F2C94C`, viền `#B89A22` (`majorEdge`) |
| Nhãn (`label`) | `#2A3B33` (tương phản 10,25 trên đất) |
| Nhãn nước (`waterLabel`) | `#1D4A54` (6,35 trên nước) |

- **Pin = biển giờ** (nút `<button>` có `aria-label` đầy đủ, `aria-pressed`): chữ Barlow Condensed `text-lg font-bold`, `min-w-[3.5rem]`, viền 2px, đuôi vuông xoay 45 độ, vùng chạm nới bằng `::after` cho đủ 48px. Tông: `open` nền `shutter` chữ trắng; `urgent` nền `roof` chữ trắng; `full` nền trắng chữ và viền `shutter`; `pending` nền `wall` chữ `ink`; `removed` nền `rule` chữ `ink-soft`. Chọn hoặc sáng lên (hover thẻ): nền `wall`, viền 3px `shutter-deep`, nhấc lên 4px (`-translate-y-1`), `shadow-lg`.
- **Pin chồng**: nhiều ca cùng tọa độ (một quán) xếp dọc cách nhau 60px (offset pixel, không đổi khi zoom; pin dưới cùng vẫn chỉ đúng điểm). Pin của các quán khác nhau mà chồng nhau trên màn hình (đo sau mỗi `moveend`/`zoomend`) rút gọn chữ (`18:00` thành `18h`, tên nhiều từ lấy từ cuối, còn lại cắt 3 ký tự; `min-w-[2.5rem]`) cho tới khi được chọn hoặc zoom đủ gần; tên đầy đủ ở `aria-label`.
- **`ShiftMap`**: khung `rounded-ui border border-rule`; lazy bằng `IntersectionObserver` (`rootMargin` 200px) rồi mới `import('maplibre-gl')`; trung tâm `[107.09, 10.36]` zoom 12,5; `maxBounds` quanh Vũng Tàu; `cooperativeGestures` (một ngón cuộn trang, hai ngón kéo bản đồ; chú thích tiếng Việt); nút +/- và chữ ghi nguồn `text-sm` to `3rem`; khung nhìn ôm các điểm (`fitBounds`, lề `top 64, bottom 64, left 56, right 100`), người dùng đã kéo thì không giật lại; Esc bỏ chọn; chưa tải được thì hiện chữ "Chưa tải được bản đồ. Danh sách ca vẫn ở bên dưới."; ghim được chọn hiện dòng tóm tắt + nút "Xem ca" bên dưới. Điểm chỉ mang `id, lat, lng, text, label, href, tone`: **không có số điện thoại**.
- **`ShiftExplorer`**: danh sách ca + bản đồ; điện thoại có hai nút "Danh sách"/"Bản đồ" (`aria-pressed`), từ `lg` hai cột, bản đồ dính (`sticky`). Chọn pin thì cuộn thẻ vào tầm nhìn (giảm chuyển động thì không mượt); hover/focus thẻ thì pin sáng lên.
- **`LiveRefresh`**: tự `router.refresh()` mỗi **30 giây** (chỉ khi tab đang hiện, `document.visibilityState === 'visible'`) kèm nút "Làm mới" và dòng "Tự cập nhật mỗi 30 giây · lần cuối hh:mm".
- **`LocationPicker`** (chủ quán, nhóm vận hành): bấm bản đồ hoặc kéo chấm ghim (tròn `1.5rem`, nền `roof`, viền trắng 3px) để chọn; nút "Dùng vị trí hiện tại", "Xóa ghim", mục "Nhập tọa độ" (`<details>`, vĩ độ/kinh độ); báo sớm nếu ngoài khung Vũng Tàu (database mới là nơi chặn). Tọa độ nằm trong input ẩn, chỉ gửi khi form được lưu; không lưu hay gửi vị trí người dùng đi đâu khác.
- Chuyển động: `prefers-reduced-motion` thì `fitBounds` tắt hoạt ảnh và `easeTo` thành `jumpTo`.
- Kết nối ngoài `tiles.openfreemap.org` đã được chủ dự án duyệt; không thêm nguồn khác.

## Do's and Don'ts

### Do:
- **Do** dùng tên token (`bg-shutter`, `text-ink-soft`, `border-rule`); đặt `surface-dark` lên mọi vùng nền xanh đậm mới để vòng focus đổi sang vàng.
- **Do** lấy nút từ `btn()`, ô nhập từ `inputCls`, trạng thái ca từ `StateBadge`, hộp thông báo từ `Alert`; kéo khoảng cách theo bội `0.5rem`.
- **Do** để giờ ca là số lớn nhất của thẻ (`font-num tabular text-4xl font-bold`).
- **Do** kèm chữ cho mọi tín hiệu: ô cửa luôn có "n/m người chính · …" và chữ "Dự phòng"; Badge và `Alert` luôn có icon + chữ.
- **Do** để link giữa dòng chữ (`Tel` inline) không đặt `min-h`; còn link hay nút đứng riêng một hàng phải cao tối thiểu `3rem`.
- **Do** cho dải đầu của mô-đun chứa dữ liệu thật (loại việc, trạng thái, "GẤP").
- **Do** thêm sắc mới vào `tailwind.config.ts`, kèm tính tỉ lệ tương phản (4,5:1 cho chữ thường) trước khi dùng.

### Don't:
- **Don't** dùng gradient, kính mờ, bóng đổ (trừ pin bản đồ), viền trái màu, `dark:`.
- **Don't** dùng ký tự Unicode hoặc emoji làm icon; icon chỉ từ `lucide-react`, mỗi icon đi kèm chữ và `aria-hidden`.
- **Don't** thêm nhãn kicker hoặc eyebrow (dòng chữ nhỏ viết hoa trên tiêu đề).
- **Don't** đặt chữ hoặc viền `wall` trên nền sáng; không đặt chữ nhạt hơn `ink-soft` cho nội dung.
- **Don't** bọc từng dòng trong thẻ, lồng thẻ trong thẻ, hay dùng thẻ làm trang trí.
- **Don't** bỏ `focus-visible` hoặc thêm `outline-none`; không hạ cỡ chữ gốc, không thêm `text-xs`/`text-[...]`.
- **Don't** đặt số điện thoại lên bản đồ hoặc vào dữ liệu của pin.
- **Don't** đưa vào font, bảng màu, bo góc, kiểu đổ bóng thứ hai.

## Accessibility

- Chữ gốc 18px; nút, ô nhập, dòng tóm tắt, mục nav, link đứng riêng cao tối thiểu `3rem` (54px, vượt 48px).
- **Focus hai tông**: `:focus-visible { outline: 3px solid #153F30; outline-offset: 2px }` (xanh đậm, 10,65:1 trên `chalk`) và `.surface-dark :focus-visible { outline-color: #F2C94C }` (vàng, 7,41:1 trên `shutter-deep`) cho thanh trên, rail, nav dưới, chân trang. Ô nhập vừa có vòng vừa đổi viền sang `shutter`. Radio ẩn bằng `sr-only` dùng `focus-within:ring-4`.
- Thông báo: lỗi `role="alert"`, thành công/thông tin `role="status"`; `ActionForm` cuộn thông báo vào giữa tầm nhìn (`scroll-my-4` và `scroll-padding` của `<html>` tránh thanh dính).
- `prefers-reduced-motion: reduce`: `globals.css` rút mọi `animation`/`transition` về gần 0 và tắt cuộn mượt; cuộn mã (`scrollBehavior()`, `fitBounds`, `easeTo`) cũng tôn trọng. Vòng quay là `motion-safe`.
- Không chỉ dùng màu; HTML ngữ nghĩa trước (`button`, `Link`, `label`, `details`, `fieldset`); nav có `aria-label="Điều hướng chính"` và `aria-current="page"`.
- Trang token (`/xac-nhan`, `/dong-y`) không dùng `window.confirm`, `alert`, cửa sổ mới hay bước đăng nhập (trình duyệt nhúng của Zalo/Facebook có thể bỏ qua hộp thoại); dùng câu nhắc cố định ngay trên nút.
- Menu "Thêm" dùng `<details>`/`<summary>`, chạy bằng bàn phím và trong trình duyệt nhúng.

## Page modes

| Chế độ | Trang | Cách dựng |
|---|---|---|
| Persuade | trang chủ `/` | băng `wall` toàn bề rộng: tiêu đề `text-4xl lg:text-5xl`, câu `NO_FEE` có icon, một nút chính "Bắt đầu"; bên cạnh một `ShiftCard` mẫu ghi rõ "ca mẫu, không phải ca thật" và bản đồ minh họa dữ liệu mẫu; dưới là các mục `Point` kẻ `border-rule`. Chưa có số liệu, lời chứng thực hay khách hàng. |
| Operate | mọi trang trong app (người làm, chủ quán, nhóm vận hành), trang token `/xac-nhan`, `/dong-y` | `PageTitle` rồi các mô-đun hairline xếp dọc; một hành động chính nổi bật; trang rộng (`max-w-6xl`) dùng nhiều cột và bảng thật. |
| Read | `/dieu-khoan`, `/chinh-sach-du-lieu` | `Doc`: cột đọc 40rem, mục lục, `leading-relaxed`. |

## Known gaps

Ghi nhận hiện trạng, không phải quy tắc cho trang mới. Mục (a)-(e) do người rà soát giao diện nêu; tài liệu này chưa tự kiểm lại bằng trình duyệt.

- (a) Ô số liệu lớn ở `/h/[slug]`, `/ho-so`, `/admin/nguoi-lam` còn là hạng mục chưa làm lại (theo người rà soát; chưa tự kiểm).
- (b) Nhãn nav dưới có thể xuống 2 dòng ở màn hình hẹp (`text-sm leading-tight`, ô chia đều 3-5 mục).
- (c) Có khối trống ở `/dang-nhap` ở bề rộng 1280px.
- (d) Pin dạng số ở bản đồ cơ sở (`/admin/co-so`) chưa có chú giải.
- (e) Chưa thử trong trình duyệt nhúng thật của Zalo/Facebook.
- Pin `pending` (nền `wall`) và `removed` (nền `rule`) có viền gần như cùng màu nền đất của bản đồ (`wall`/`#F3EFD9` 1,37:1; `rule`/`#F3EFD9` 1,42:1); chữ trong pin vẫn đạt, nhưng ranh giới pin chỉ nhờ bóng. Chưa đo trên thiết bị.
- Một số chỗ dùng `rounded` mặc định của Tailwind (`0.25rem` = 4,5px) thay vì `rounded-ui` 6px: Badge, link nav trong rail/menu, mục lục của `Doc`. Đây là lệch so với nguyên tắc "một bán kính", **không** được coi là bán kính thứ hai của hệ; trang mới dùng `rounded-ui`.
- Chưa có kiểm trực quan tự động (không có CI) cho các cặp màu hay bề rộng; bảng tỉ lệ ở trên chỉ tính từ hex, chưa đo trên màn hình thật.
