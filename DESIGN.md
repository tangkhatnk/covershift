---
name: SafeShift
description: "Biển & Nắng: xanh biển, vàng nắng, nền vôi sáng. Ca làm ngắn hạn an toàn ở Vũng Tàu, đọc được ngoài nắng trên điện thoại."
colors:
  chalk: "#F6F3EA"
  ink: "#0F2230"
  ink-soft: "#42525E"
  brand: "#0B5C8A"
  brand-deep: "#083F5F"
  brand-tint: "#DCEBF5"
  accent: "#FFC247"
  accent-tint: "#FFF1CE"
  danger: "#B8321F"
  danger-tint: "#FBDFD8"
  info: "#0F6F7E"
  info-tint: "#D4EDEF"
  ok: "#146B45"
  ok-tint: "#DAF0E4"
  rule: "#D6D1BE"
  rule-strong: "#6F7C86"
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
    backgroundColor: "{colors.brand}"
    textColor: "{colors.white}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.ui}"
    padding: "0.5rem 1.5rem"
    height: "{spacing.touch}"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.brand}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.ui}"
    padding: "0.5rem 1.5rem"
    height: "{spacing.touch}"
  button-secondary-hover:
    backgroundColor: "{colors.brand-tint}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.white}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.ui}"
    padding: "0.5rem 1.5rem"
    height: "{spacing.touch}"
  button-ghost:
    textColor: "{colors.brand}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.ui}"
    padding: "0.5rem 1.5rem"
    height: "{spacing.touch}"
  button-ghost-hover:
    backgroundColor: "{colors.brand-tint}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.ui}"
    padding: "0.5rem 1rem"
    height: "{spacing.touch}"
  page-title:
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    padding: "0"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ui}"
    padding: "1rem"
  card-tab:
    backgroundColor: "{colors.accent-tint}"
    textColor: "{colors.ink}"
    padding: "0.5rem 1rem"
  badge-green:
    backgroundColor: "{colors.ok-tint}"
    textColor: "{colors.ok}"
    typography: "{typography.label}"
    padding: "0 0.5rem"
    height: "2rem"
  badge-amber:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    padding: "0 0.5rem"
    height: "2rem"
  badge-red:
    backgroundColor: "{colors.danger-tint}"
    textColor: "{colors.danger}"
    typography: "{typography.label}"
    padding: "0 0.5rem"
    height: "2rem"
  badge-blue:
    backgroundColor: "{colors.info-tint}"
    textColor: "{colors.info}"
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
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.white}"
  nav-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.ui}"
    height: "{spacing.touch}"
  map-pin-open:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.white}"
    typography: "{typography.shift-hours}"
    rounded: "{rounded.ui}"
  map-pin-urgent:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.white}"
  map-pin-full:
    backgroundColor: "{colors.white}"
    textColor: "{colors.brand}"
  map-pin-pending:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
  map-pin-removed:
    backgroundColor: "{colors.rule}"
    textColor: "{colors.ink-soft}"
  map-pin-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
---

# Design System: SafeShift

Tài liệu này **mô tả** hệ hình ảnh đang chạy trong mã (đọc từ `tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/{ui,client,map}.tsx`). Quy tắc bắt buộc nằm ở `AGENTS.md` mục 18-24; hướng sản phẩm ở `PRODUCT.md`. Khi mâu thuẫn, `AGENTS.md` thắng. Sidecar `.impeccable/design.json` giữ phần frontmatter không chứa được (bảng màu bản đồ, đoạn HTML/CSS mẫu của thành phần, bóng, chuyển động).

## Overview

**Creative North Star: "Biển & Nắng"**

Bãi biển Vũng Tàu lúc sáng: nước xanh biển, nắng vàng, cát vôi sáng. Ca làm là đơn vị của sản phẩm, và hình của nó vẫn là một hàng ô cửa: cánh đóng là đã có người, khung trống là còn chỗ, một ô nét đứt là người dự phòng. Logo là mặt trời nhô trên hai làn sóng. Giao diện từ chối kiểu chợ việc làm màu phấn với thẻ bo tròn và ảnh sinh viên cười; nó giống tấm biển hướng dẫn hơn là ứng dụng.

Mật độ vừa phải, chữ to, một việc chính mỗi màn hình, vì người đọc là chủ quán lớn tuổi mở link từ Zalo ngoài nắng. Mọi thứ phẳng: không bóng, không gradient, không kính mờ, ngoại lệ duy nhất là bóng mềm của pin bản đồ. Hình dạng là chữ nhật viền hairline bo 6px; khung chrome xanh biển đậm (thanh trên, rail, nav dưới, chân trang) bao quanh nền vôi. Chuyển động chỉ CSS, ngắn, tắt dịch chuyển khi người dùng chọn giảm chuyển động (mục Motion).

Nhận ra được dù xóa hết chữ: tiêu đề trang chữ đậm trên nền vôi với một gạch nắng ngắn bên dưới, mô-đun viền mảnh có dải đầu nhạt, rail xanh biển, mục đang chọn màu nắng, và các ô cửa.

**Key Characteristics:**
- Bảng màu: xanh biển (`brand`), vàng nắng (`accent`), thành công (`ok`), lỗi (`danger`), thông tin (`info`), mỗi họ có sắc đậm/chuẩn/nhạt khi cần; nền vôi và mực.
- Vàng đặc là điểm nhấn thật (mục đang chọn, nút "Đăng nhập" trên thanh trên, gạch nắng ngắn dưới tiêu đề, pin đang chọn); vàng nhạt (`accent-tint`) cho dải đầu mô-đun, cảnh báo nhẹ (không còn nền kín cho tiêu đề trang); `danger` chỉ cho lỗi và nguy hiểm; `info` chỉ cho thông tin; `ok` chỉ cho thành công.
- Số giờ ca là con số lớn nhất trên màn hình, Barlow Condensed với chữ số bảng cố định.
- Mỗi trạng thái ca là một cặp icon + chữ + tông, không bao giờ chỉ màu.
- Phẳng, viền hairline, 6px, khoảng cách là bội của 0,5rem.

## Colors

Bảng màu khai ở `tailwind.config.ts`; trang chỉ dùng tên token. Tên dưới đây là tên Tailwind, hex nằm ở frontmatter (nguồn chuẩn).

### Primary
- **Xanh biển** (`brand`, `brand-deep`, `brand-tint`): `brand` cho nút chính, liên kết, tiêu đề phụ, tick; `brand-deep` cho toàn bộ khung chrome (thanh trên, rail, nav dưới, chân trang), hover của nút chính, vòng focus trên nền sáng, `themeColor`; `brand-tint` cho nền hover, hàng được chọn.

### Secondary
- **Vàng nắng** (`accent`, `accent-tint`): `accent` cho mục nav đang chọn, nút "Đăng nhập" trên thanh trên, gạch nắng 3rem x 4,5px dưới `PageTitle`, vùng chọn văn bản (`::selection`), khối nổi bật của trang chủ, pin đang chọn; `accent-tint` cho dải đầu mô-đun (`Card tab`, đầu `ShiftCard`), Badge vàng, nền cảnh báo nhẹ.

### Tertiary
- **Thành công** (`ok`, `ok-tint`): Badge xanh lá (`Tone` `green`), thông báo thành công, nhãn "Hợp với người dưới 18".
- **Lỗi** (`danger`, `danger-tint`): lỗi, nút nguy hiểm, nhãn "GẤP", pin ca gấp.
- **Thông tin** (`info`, `info-tint`): thông tin trung tính (Badge xanh dương, thông báo thông tin).

### Neutral
- **Nền vôi** (`chalk`): nền toàn app, nền Badge xám.
- **Mực** (`ink`, `ink-soft`): chữ chính và chữ phụ.
- **Đường kẻ** (`rule`, `rule-strong`): `rule` cho viền hairline của mô-đun và đường phân cách; `rule-strong` cho viền ô nhập, ô tick, `Empty` và thông báo xám (viền thành phần tương tác).
- **Trắng** (`white`): nền mô-đun, ô nhập, nút phụ.

### Tỉ lệ tương phản (WCAG 2.x, tính từ hex ở trên)

| Chữ / nền | Tỉ lệ | Dùng ở | Mức |
|---|---|---|---|
| `ink` / `chalk` | 14,65 | chữ nội dung trên nền app | AA, AAA |
| `ink` / `white` | 16,26 | chữ trong mô-đun, ô nhập | AA, AAA |
| `ink-soft` / `chalk` | 7,28 | gợi ý, chữ phụ, Badge xám | AA, AAA |
| `ink-soft` / `white` | 8,08 | nhãn phụ trong mô-đun | AA, AAA |
| `ink-soft` / `chalk` | 7,28 | phụ đề `PageTitle` (nay trên nền vôi) | AA, AAA |
| placeholder (`ink-soft` 80% trên trắng = `#68757E`) | 4,74 | `placeholder` ô nhập | AA |
| trắng / `brand` | 7,21 | nút chính | AA, AAA |
| trắng / `brand-deep` | 11,13 | chữ trên khung chrome, nút chính khi hover | AA, AAA |
| trắng / `danger` | 5,98 | nút nguy hiểm | AA |
| `brand` / trắng | 7,21 | nút phụ, liên kết, `Tel` | AA, AAA |
| `brand` / `chalk` | 6,50 | liên kết trên nền app | AA |
| `brand` / `brand-tint` | 5,92 | nút phụ và ghost khi hover | AA |
| `ink` / `brand-tint` | 13,35 | hàng `Check` được chọn | AA, AAA |
| `ink` / `accent` | 10,11 | mục nav đang chọn, nút "Đăng nhập" | AA, AAA |
| `ink` / `accent-tint` | 14,50 | dải đầu mô-đun | AA, AAA |
| `ink` / trắng | 16,26 | Badge `amber` (nền trắng, viền `accent`; vẫn rõ khi nằm trên dải đầu `accent-tint`) | AA, AAA |
| trắng / `brand-deep` | 11,13 | tên và chữ trên đầu hồ sơ công khai `/p/[slug]` (`brand-deep`; chữ phụ `brand-tint` 9,14) | AA, AAA |
| `accent` / `brand-deep` | 6,92 | `NO_FEE` ở chân trang, nav dưới đang chọn | AA |
| `brand-tint` / `brand-deep` | 9,14 | dòng miễn trừ ở chân trang | AA, AAA |
| `ok` / `ok-tint` | 5,46 | Badge xanh lá, icon thông báo thành công | AA |
| `danger` / `danger-tint` | 4,74 | Badge đỏ (chữ `text-sm`, không phải chữ lớn): cặp sát ngưỡng nhất | AA (sát) |
| `info` / `info-tint` | 4,77 | Badge xanh dương | AA |
| `ink-soft` / `rule` | 5,28 | pin "removed" | AA |
| `rule-strong` / trắng | 4,28 | viền ô nhập, ô tick | chỉ đạt 3:1 cho thành phần giao diện, **không** dùng làm chữ |
| `rule-strong` / `chalk` | 3,86 | viền `Empty`, thanh cuộn | chỉ 3:1 cho UI, không làm chữ |
| `brand-deep` / `chalk` | 10,03 | vòng focus trên nền sáng | đạt 3:1 |
| `accent` / `brand-deep` | 6,92 | vòng focus trên nền xanh đậm | đạt 3:1 |
| `rule` / `chalk` | 1,38 | viền hairline mô-đun | **dưới 3:1, chủ ý**: chỉ là đường ngăn cách trang trí, ranh giới còn do nền trắng trên nền vôi |
| `accent` / `chalk` | 1,45 | (không dùng) | **không bao giờ làm chữ hoặc viền chỉ dẫn trên nền sáng** (chỉ gạch nắng trang trí dưới `PageTitle`) |

Pin bản đồ (tính trên nền bản đồ ghi đè `MAP_COLOR`: land `#F1EEE3`, water `#BDDCEA`, park `#D6E4CE`, road `#FFFFFF`, major `#FFD97A`): chữ trên pin `open` 7,21, `urgent` 5,98, `full` 7,21, `pending` và đang chọn 10,11, `removed` 5,28; viền pin so với từng nền bản đồ thấp nhất là `open`/`full` `brand` 5,01 (trên nước), `urgent` `danger` 4,15 (trên nước), `pending`/đang chọn `brand-deep` 7,73, `removed` `ink-soft` 5,61. Nhãn bản đồ: `label` / land 11,04, `waterLabel` / water 5,91.

### Named Rules
**The One Yellow Rule.** Vàng nắng đặc (`accent`) là nền hoặc dải trang trí, không bao giờ là chữ hay viền chỉ dẫn trên nền sáng (1,45:1 trên `chalk`). Chữ trên `accent` luôn là `ink`; chữ vàng chỉ xuất hiện trên `brand-deep`. Vàng đặc chỉ cho điểm nhấn thật; nền tiêu đề và dải đầu mô-đun dùng `accent-tint`.

**The Danger Is Danger Rule.** `danger` chỉ cho lỗi, hủy, nguy hiểm, "GẤP". Không dùng làm màu nhấn trang trí. `info` chỉ cho thông tin, `ok` chỉ cho thành công.

**The Tint Pair Rule.** Mỗi sắc nhạt (`*-tint`) đi với chữ đậm cùng họ (`brand-deep`, `ok`, `danger`, `info`) hoặc `ink`; không đặt chữ xám nhạt trên nền tint.

**The Token-Only Rule.** Không viết mã hex trong trang. Ngoại lệ có sẵn: `globals.css` (`::selection`, `caret-color`, thanh cuộn, vòng focus), `themeColor` ở `layout.tsx`, `src/app/icon.svg`, và bảng `MAP_COLOR` của bản đồ.

## Typography

**Chữ nội dung:** Be Vietnam Pro 400, 500, 600, 700 (`font-sans`, đặt ở `<body>`; subsets `latin`, `vietnamese`).
**Chữ số giờ ca:** Barlow Condensed 600, 700 (`font-num`, kèm lớp `tabular` = `tabular-nums` và `'tnum' 1`).
Cả hai nạp bằng `next/font/google` (`display: 'swap'`), tự host sau build; người dùng không gọi Google Fonts. Be Vietnam Pro không có chữ số bảng cố định nên số giờ dùng Barlow Condensed để các giờ thẳng cột.

**Character:** Be Vietnam Pro tròn, rộng, dấu tiếng Việt rõ; Barlow Condensed hẹp, đậm, giống số trên biển hiệu. Cặp này làm giờ ca nổi như số nhà.

Cỡ chữ gốc `html { font-size: 18px }`, nên `rem` lớn hơn mặc định 12,5%: `text-base` = 18px, `text-lg` = 20,25px, `text-xl` = 22,5px, `text-2xl` = 27px, `text-4xl` = 40,5px, `text-5xl` = 54px, `text-sm` = 15,75px. Input ép `font-size: 1rem` (18px) để iOS không tự phóng.

### Hierarchy
- **Display** (700, `text-4xl`, `lg:text-5xl`, `leading-tight`): tiêu đề trang chủ.
- **Headline** (700, `text-2xl`, `leading-tight`): `PageTitle` trên nền vôi; chữ đậm `ink`.
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
| Thanh trên | dính, cao `3.5rem` (`--chrome-top`), nền `brand-deep`, nội dung trong `max-w-6xl` với `px-4` (`lg:px-8`, cùng lề với `main` và chân trang; logo lùi `-ml-2` để chữ thẳng lề nội dung, phần đệm chỉ nới vùng chạm); có nav chính thì ẩn ở `lg` | ẩn khi có rail; còn lại vẫn hiện |
| Điều hướng | nav dưới cố định, cao `4.5rem` + `env(safe-area-inset-bottom)` (`--chrome-bottom`); mục `border-t-4` vàng khi đang chọn; người làm 4 mục (Tìm ca, Ca của tôi, Việc làm, Hồ sơ), chủ quán 4 mục (Ca của quán, Đăng ca, Tuyển dụng, Tài khoản), nhóm vận hành 4 tab (Điều phối, Cơ sở, Người làm, Báo cáo) + "Thêm" (`<details>`) | rail trái cố định rộng `15rem` (`w-60`), nền `brand-deep`, đủ các mục, có Tài khoản và Đăng xuất; nội dung lùi `lg:pl-60` |
| Chân trang | nền `brand-deep`, chứa `NO_FEE` và `DISCLAIMER`; có nav thì thêm padding đáy bằng `--chrome-bottom` | giống |
| Nội dung | `mx-auto w-full px-4 py-6` | `lg:px-8 lg:py-8` |

Bề rộng nội dung do `contentWidth(pathname)`: `/`, `/f/[slug]` và `/s/[id]` tự dựng bố cục (không bị khung bao); `max-w-6xl` (72rem) cho `/login`, `/terms`, `/privacy`, `/shifts`, `/my-shifts`, `/jobs`, `/my-applications`, `/employer`, `/employer/jobs`, `/admin` và `/admin/*`; `max-w-3xl` (48rem) cho mọi trang còn lại. Trang token và công khai (`/confirm`, `/consent`, `/p`, `/f`, `/s`) và khi chưa đăng nhập, chưa đăng ký hoặc bị khóa: không có nav chính, chỉ thanh trên. Nhóm `lg:grid` hai cột cho danh sách ca + bản đồ (`ShiftExplorer`) và các lưới `md:grid-cols-2/3`. Breakpoint dùng: `sm` 640, `md` 768, `lg` 1024 (mặc định Tailwind, không khai lại). Tờ đọc `Doc`: cột 40rem căn giữa, mục lục dính bên phải `w-56` ở `lg`, trong `<details>` ở điện thoại.

Khoảng cách luôn là bội của `0.5rem` (9px ở cỡ gốc): `gap-2`, `p-4`, `py-6`, `lg:py-8`. Nút và ô nhập cao tối thiểu `3rem` (54px). `scroll-padding` của `<html>` theo `--chrome-top`/`--chrome-bottom`. In (`@media print`): ẩn mọi phần có `data-chrome`, bỏ padding và giới hạn bề rộng của `main`, nền trắng.

Chuỗi dài (tên người, quán, địa chỉ) xuống dòng, không `truncate`. Không cuộn ngang.

## Elevation & Depth

Phẳng hoàn toàn. Chiều sâu đến từ viền hairline (`border border-rule`), nền trắng trên nền vôi, dải đầu `accent-tint`, và khung chrome xanh đậm. Không `box-shadow`, không gradient, không `backdrop-filter`, không viền trái màu.

Ngoại lệ duy nhất: pin trên bản đồ, để nổi khỏi nền bản đồ nhiều màu: `shadow-md` lúc thường, `shadow-lg` khi chọn hoặc sáng lên; chấm ghim của `LocationPicker` cũng `shadow-md`. Giá trị Tailwind mặc định, ghi ở sidecar.

### Named Rules
**The Flat-By-Default Rule.** Không thêm bóng ở chỗ nào ngoài pin bản đồ. Muốn nhấn thì dùng viền `brand` hoặc nền `accent`.

## Shapes

Một bán kính duy nhất cho mọi chữ nhật tương tác: `rounded-ui` = **6px** (px cố định, không theo cỡ gốc 18px): nút, ô nhập, mô-đun, `PageTitle`, `Alert`, `Check`, `Empty`, pin. Viền: hairline 1px `rule` cho mô-đun; 2px `rule-strong` cho ô nhập và ô tick (đổi sang `brand` khi focus hoặc được chọn); 2px `brand` cho nút phụ; 2px nét đứt `rule-strong` cho `Empty`. Mô-đun có thể có dải đầu (`overflow-hidden` giữ góc bo).

Hình đặc trưng riêng: ô cửa chớp (SVG 24x32, `rx` 2, các thanh chớp trắng 2px) và logo "Biển & Nắng" (mặt trời `accent` nhô trên hai làn sóng; `src/app/icon.svg` là bản favicon nền `brand-deep` bo 14/64, sóng trắng và xanh nhạt; `Mark` ở `client.tsx` là bản nền trắng dùng trên khung xanh đậm, kèm chữ "Safe" trắng + "Shift" `accent` bằng font của app, không có ảnh raster). Pin bản đồ là biển chữ nhật có đuôi vuông xoay 45 độ.

## Components

### Buttons (`btn(variant, full)`)
Cao tối thiểu `3rem`, `px-6 py-2`, `text-lg font-semibold`, `rounded-ui`, `gap-2`, `disabled:opacity-50 cursor-not-allowed`; nhấn thì co `scale(0.97)` 120ms (chỉ khi không giảm chuyển động, không khi bị khóa), `transition` chỉ liệt kê `color, background-color, border-color, opacity, transform`. Mặc định rộng hết khung (`full`); `full=false` cho nút nằm cạnh nhau.
- **primary**: nền `brand`, chữ trắng; hover và active `brand-deep`. Một nút chính mỗi màn hình.
- **secondary**: nền trắng, viền 2px `brand`, chữ `brand`; hover `brand-tint`.
- **danger**: nền `danger`, chữ trắng; hover `brightness-90`. Luôn kèm bước xác nhận (xem Accessibility).
- **ghost**: chữ `brand` gạch chân `underline-offset-4`; hover `brand-tint`. Là nút đứng riêng nên cũng cao `3rem`.
Nút gửi form dùng `SubmitButton`: tự khóa và đổi nhãn "Đang gửi…" kèm vòng quay `motion-safe:animate-spin`; `confirm` dùng `window.confirm` chỉ ở trang cần đăng nhập.

### Inputs / Fields (`inputCls`, `Field`, `Check`)
- **Ô nhập**: nền trắng, viền 2px `rule-strong`, `rounded-ui`, cao `3rem`, `px-4 py-2`, chữ `text-lg ink`, placeholder `ink-soft/80`. Focus: viền `brand` **và** vòng 3px toàn cục (không `outline-none`).
- **Field**: nhãn `text-base font-semibold` phía trên ô, gợi ý `text-sm ink-soft` phía dưới; bọc input trong `<label>`.
- **Check**: cả hàng là một `<label>` có viền 2px; được chọn thì viền `brand` + nền `brand-tint` (`has-[:checked]`), không chỉ dựa vào dấu tick; ô tick `1.5rem`, `accent-brand`.
- Lỗi/thành công của form do `ActionForm` hiện bằng `Alert`.

### Cards / Containers (`Card`, `PageTitle`, `Empty`, `Disclosure`)
- **Card**: trắng, viền hairline `rule`, `rounded-ui`, `p-4`. Prop `tab` thêm dải đầu `accent-tint` (viền dưới `rule`, `px-4 py-2`) chứa **dữ liệu thật** của mô-đun (trạng thái, loại việc, "GẤP"), không phải nhãn trang trí.
- **PageTitle**: không có khối nền, chữ trên nền vôi: `h1` `text-2xl font-bold ink`, dưới là gạch nắng ngắn `h-1 w-12 bg-accent rounded-sm` (3rem x 4,5px, `aria-hidden`), phụ đề `text-base ink-soft`. Chiều cao ổn định theo số dòng phụ đề (47,25 / 83,25 / 110,25px ở 0 / 1 / 2 dòng, đo ở 360–1440px; 2 dòng chỉ ở điện thoại); `PageSkeleton` khớp các số này (CLS 0).
- **PageSkeleton** (`loading.tsx` của trang có dữ liệu): khung chờ nhấp nháy `motion-safe:animate-pulse`, cao tối thiểu một màn hình. Cấu hình theo trang thật bằng prop: `lead` (`back` cho link quay lại, `refresh` cho dòng `LiveRefresh`), `sub` (0/1/2 dòng phụ đề), `action`, `form`, `filter` (thanh "Bộ lọc" thu gọn và, ở điện thoại, thanh Danh sách/Bản đồ của `/shifts`), `map`, `boxes` (chiều cao từng mô-đun) và `side` (mô-đun cột phải rộng `20rem` từ `lg`, xếp dưới cùng ở điện thoại).
- **Empty**: viền nét đứt 2px `rule-strong`, `text-base ink-soft`, căn giữa.
- **Disclosure**: `<details>`; dòng tóm tắt cao `3rem`, chữ `brand font-semibold`, mũi tên `ChevronDown` xoay khi mở; chạy bằng bàn phím.

### Badges (`Badge`, `StateBadge`)
`min-h-[2rem]`, `px-2`, `text-sm font-semibold`, `whitespace-nowrap`, bo `rounded` mặc định. Tông: `green` (`ok-tint`/`ok`), `amber` (nền trắng, viền 1px `accent`, chữ `ink`), `red` (`danger-tint`/`danger`), `blue` (`info-tint`/`info`), `gray` (`chalk` + viền `rule`/`ink-soft`). `StateBadge` là từ điển đóng của trạng thái ca: mỗi trạng thái đúng một icon Lucide + nhãn + tông (nhãn và tông lấy từ `format.ts`): `open` DoorOpen, `filled` DoorClosed, `in_progress` CirclePlay, `awaiting_confirm` Hourglass, `expired` TriangleAlert, `unfilled` CircleAlert, `confirmed` CircleCheck, `cancelled` Ban. Không tự ghép Badge trạng thái ca ở trang khác.

### Alert
Nền tint + viền 1px + icon `h-6 w-6` (CircleCheck, TriangleAlert, OctagonAlert, Info) + chữ `ink`, `rounded-ui px-4 py-2`. Tông đỏ là `role="alert"`, còn lại `role="status"`; `ActionForm` truyền rõ theo lỗi/thành công và thêm `scroll-my-4`.

### Tel, Stars
- **Tel** `inline` (mặc định): nằm giữa dòng chữ, `py-2` chỉ nới vùng chạm, không nới dòng, không `min-h`. `block`: đứng riêng một hàng, cao `3rem`, kèm icon Phone. Không có số: "(chưa có số)".
- **Stars**: năm icon `Star` `h-5 w-5` (đầy `fill-accent stroke-brand-deep`, rỗng chỉ `stroke-rule-strong`); bao ngoài `role="img"` có `aria-label="… trên 5 sao"`.

### Signature: Dãy cửa chớp (`SlotStrip`)
Hàng ô cửa SVG (`h-10 w-8`): mỗi người chính một ô; đóng (`fill-brand`, `stroke-brand-deep`, bốn thanh chớp trắng) = đã có người; mở (`fill-white`, `stroke-rule-strong`) = còn chỗ; sau một trụ `rule` (`h-10 w-1`) là một ô dự phòng nét đứt `4 3` (đóng khi đã có dự phòng) kèm chữ "Dự phòng" `text-sm`. Hình `aria-hidden`; luôn có câu chữ đọc được bên dưới ("2/3 người chính · chưa có dự phòng", `text-base`). Không rút gọn chữ "Dự phòng", không chỉ dựa vào hình và màu.

### Shift card (`ShiftCard`)
Mô-đun hairline (viền `danger` khi gấp và còn sắp diễn ra, `hover:border-brand` khi là link). Dải đầu `accent-tint`: nhãn "GẤP" đỏ, loại việc `text-base font-bold`, Badge xanh "Hợp với người dưới 18" (ca cho phép nhận người dưới 18), `StateBadge` khi `showState`. Thân `p-4`: dòng "ngày · số giờ" `text-base ink-soft`; **giờ `font-num tabular text-4xl font-bold`** và lương `text-lg font-semibold brand` ("…/giờ") **cùng một hàng** (`flex-wrap items-baseline justify-between`, hết chỗ thì lương xuống dòng dưới giờ); tên quán · khu vực; `SlotStrip` nếu ca sắp diễn ra; phần `extra`. Cả thẻ là `Link` khi có `href`.

### Navigation
Nền `brand-deep`, chữ trắng, mục đang chọn mang `aria-current="page"`.
- **Rail (lg)**: mục `min-h-[3rem] px-4 rounded-ui text-lg font-semibold`, icon `h-6 w-6`; đang chọn nền `accent` chữ `ink`; hover `brand`. Người làm và chủ quán 4 mục như nav dưới; nhóm vận hành đủ 9 mục (4 tab + 5 mục của "Thêm"). Mục "Việc làm" của người làm cũng sáng ở `/my-applications`, "Tuyển dụng" của chủ quán sáng ở `/employer/jobs/*` (nhóm `also` trong `NAV`; mục đang chọn là đường dẫn khớp dài nhất). Dưới có chuông Thông báo, Tài khoản (nếu chưa nằm trong nav) và nút Đăng xuất.
- **Nav dưới (điện thoại)**: ô cao `4.5rem`, icon `h-6 w-6` trên nhãn `text-sm leading-tight` căn giữa; đang chọn `border-t-4 border-accent text-accent`. Mục chia theo độ rộng nhãn (`flex-auto`, `whitespace-nowrap`) nên nhãn như "Điều phối", "Người làm" không xuống dòng ở 360–414px (4 mục + "Thêm" vừa vặn ở 360px, nhãn sát lề). Nav không có viền trên: chân trang cùng màu `brand-deep` nên khi vừa lộ ra phía trên nav hai khối liền nhau, không có đường kẻ. "Thêm" của nhóm vận hành là `<details>`: đóng bằng Esc, chạm ra ngoài hoặc khi đổi trang; danh sách thả `w-60` trắng viền hairline (Tin tuyển dụng, Đánh giá quán, KPI, Nhật ký, Tài khoản).
- **Thanh trên**: logo `Mark` (ô trắng bo, mặt trời `accent`, hai làn sóng `brand`; chữ "Safe" trắng + "Shift" `accent`) trong liên kết về trang chủ; bên phải chuông thông báo (khi có nav) và tên người dùng (tới `/account`), hoặc nút vàng "Đăng nhập" (ẩn ở chính `/login`). Ở trang token và công khai (`/confirm`, `/consent`, `/p`, `/f`, `/s`) chỉ còn logo.
- **Chuông thông báo** (`BellLink`): ở điện thoại nằm trên thanh trên (`h-12 w-12`), ở desktop là một hàng trong rail ("Thông báo"); có thông báo chưa đọc thì hiện huy hiệu `accent` chữ `ink` ở góc ("9+" khi quá 9; số là hình `aria-hidden`, nhãn của link nói đủ "Thông báo, N chưa đọc"). Số lấy từ `my_notifications` ở `layout.tsx`, 0 khi lỗi hay chưa đăng nhập. Đang ở `/notifications` thì chuông mang `aria-current="page"`.

### Doc, DocSection, DocList (chế độ Read)
Tờ đọc: `PageTitle`, khối thông báo, mục lục (dính bên phải ở `lg`, trong `<details>` ở điện thoại, mục cao `3rem`), bài `rounded-ui border border-rule bg-white px-4 sm:px-8`. `DocSection` có tiêu đề đánh số `text-xl font-bold`, kẻ trên `border-rule`, `scroll-mt-4`; `DocList` chấm `marker:text-brand`.

### Bản đồ (`src/components/map.tsx`, MapLibre, tải động)
- **Nền**: style `positron` của OpenFreeMap (`tiles.openfreemap.org`), tô lại theo bảng màu bằng `restyle()` khi style tải xong. Màu (bảng `MAP_COLOR`, nguồn chuẩn: mã):

| Lớp | Hex |
|---|---|
| Đất / nền (`land`) | `#F1EEE3` |
| Công viên, rừng (`park`) | `#D6E4CE` |
| Nước (`water`) | `#BDDCEA` |
| Nhà (`building`) | `#E6E1D0` |
| Đường thường (`road`) | `#FFFFFF`, viền `#D9D4C1` (`roadEdge`, thêm lớp viền dưới đường thường và đường mòn) |
| Đường lớn (`major`) | `#FFD97A`, viền `#D9A532` (`majorEdge`) |
| Nhãn (`label`) | `#24343F` (tương phản 11,04 trên đất) |
| Nhãn nước (`waterLabel`) | `#16526F` (5,91 trên nước) |

- **Pin = biển giờ** (nút `<button>` có `aria-label` đầy đủ, `aria-pressed`): chữ Barlow Condensed `text-lg font-bold`, `min-w-[3.5rem]`, viền 2px, đuôi vuông xoay 45 độ, vùng chạm nới bằng `::after` cho đủ 48px. Tông: `open` nền `brand` chữ trắng; `urgent` nền `danger` chữ trắng; `full` nền trắng chữ và viền `brand`; `pending` nền `accent` chữ `ink` viền `brand-deep`; `removed` nền `rule` chữ `ink-soft` viền `ink-soft` (viền mọi tông đều >= 3:1 với đất, nước, công viên, đường; xem bảng tương phản). Chọn hoặc sáng lên (hover thẻ): nền `accent`, viền 3px `brand-deep`, nhấc lên 4px (`-translate-y-1`), `shadow-lg`.
- **Pin chồng**: nhiều ca cùng tọa độ (một quán) xếp dọc cách nhau 60px (offset pixel, không đổi khi zoom; pin dưới cùng vẫn chỉ đúng điểm). Pin của các quán khác nhau mà chồng nhau trên màn hình (đo sau mỗi `moveend`/`zoomend`) rút gọn chữ (`18:00` thành `18h`, tên nhiều từ lấy từ cuối, còn lại cắt 3 ký tự; `min-w-[2.5rem]`) cho tới khi được chọn hoặc zoom đủ gần; tên đầy đủ ở `aria-label`.
- **`ShiftMap`**: khung `rounded-ui border border-rule`; lazy bằng `IntersectionObserver` (`rootMargin` 200px) rồi mới `import('maplibre-gl')`; trung tâm `[107.09, 10.36]` zoom 12,5; `maxBounds` quanh Vũng Tàu; `cooperativeGestures` (một ngón cuộn trang, hai ngón kéo bản đồ; chú thích tiếng Việt); nút +/- to `3rem`, chữ ghi nguồn (văn bản, không thu gọn thành nút) `text-sm` có đệm dọc `py-1`; khung nhìn ôm các điểm (`fitBounds`, lề `top 64, bottom 64, left 56, right 100`), người dùng đã kéo thì không giật lại; Esc bỏ chọn; chưa tải được thì hiện chữ "Chưa tải được bản đồ. Danh sách ca vẫn ở bên dưới."; ghim được chọn hiện dòng tóm tắt + nút "Xem ca" bên dưới. Điểm chỉ mang `id, lat, lng, text, label, href, tone`: **không có số điện thoại**.
- **Chú giải** (prop `caption` của `ShiftMap`): một dòng `text-sm ink-soft` ngay dưới khung bản đồ, cũng là `aria-label` của khung. `ShiftExplorer` ghi: "Bản đồ các ca. Ghim đỏ là ca gấp, ghim trắng là ca đã đủ người."; trang chủ ghi "Bản đồ minh họa, dữ liệu mẫu".
- **`ShiftExplorer`**: danh sách ca + bản đồ; điện thoại có hai nút "Danh sách"/"Bản đồ" (`aria-pressed`), từ `lg` hai cột, bản đồ dính (`sticky`). Chọn pin thì cuộn thẻ vào tầm nhìn (giảm chuyển động thì không mượt); hover/focus thẻ thì pin sáng lên.
- **`LiveRefresh`**: nằm ngay dưới tiêu đề trang (`/shifts`, `/admin`); tự `router.refresh()` mỗi **30 giây** (chỉ khi tab đang hiện, `document.visibilityState === 'visible'`). Một dòng cao cố định `3rem` (`h-12`): chữ `text-sm` "Tự cập nhật · hh:mm" (giờ `tabular`, "--:--" trước khi hydrate không đổi chiều cao) và nút ghost "Làm mới" có icon `RefreshCw` (vùng chạm `3rem`, quay khi đang làm mới và không giảm chuyển động). Khung bản đồ của `ShiftExplorer` cao cố định: `h-[28rem]` trên điện thoại, `lg:h-[min(36rem,calc(100dvh-8rem))]` từ `lg`.
- **`LocationPicker`** (chủ quán, nhóm vận hành): bấm bản đồ hoặc kéo chấm ghim (tròn `1.5rem`, nền `danger`, viền trắng 3px) để chọn; nút "Dùng vị trí hiện tại", "Xóa ghim", mục "Nhập tọa độ" (`<details>`, vĩ độ/kinh độ); báo sớm nếu ngoài khung Vũng Tàu (database mới là nơi chặn). Tọa độ nằm trong input ẩn, chỉ gửi khi form được lưu; không lưu hay gửi vị trí người dùng đi đâu khác.
- Chuyển động: `prefers-reduced-motion` thì `fitBounds` tắt hoạt ảnh và `easeTo` thành `jumpTo`.
- Kết nối ngoài `tiles.openfreemap.org` đã được chủ dự án duyệt; không thêm nguồn khác.

## Motion

Chỉ CSS, không thư viện, không JS để chạy hiệu ứng. Hằng số: easing `cubic-bezier(0.23, 1, 0.32, 1)` (`--ease-out` trong `globals.css`, cũng là `transition` mặc định của Tailwind trong `tailwind.config.ts`); phản hồi giao diện <= 250ms, mặc định 150ms.
- **Vào trang** (`.page-enter` ở `<main>`, `key` theo đường dẫn nên chạy lại khi đổi trang): mờ dần + trượt lên 4px, 200ms. Không áp ở trang token và công khai (`/confirm`, `/consent`, `/p`, `/f`, `/s`): không thêm hiệu ứng ở trang mở trong trình duyệt nhúng của Zalo.
- **Danh sách** (`.stagger` ở phần tử cha): sáu mục đầu vào lần lượt cách nhau 40ms, từ mục thứ bảy hiện luôn. Chỉ gắn cho danh sách tải một lần; không gắn cho thứ đổi qua lại (tab, bộ lọc) hay tự làm mới.
- **Nhấn nút**: `scale(0.97)` trong 120ms, chỉ khi không giảm chuyển động và không khi nút bị khóa. Không animate nav dưới và hành động lặp nhiều lần.
- **Không `transition: all`**: liệt kê thuộc tính (`color`, `background-color`, `border-color`, `opacity`, `transform`). `hover:` chỉ chạy trên thiết bị có con trỏ (`future.hoverOnlyWhenSupported` sinh `@media (hover: hover) and (pointer: fine)`, đã kiểm trong CSS build).
- **Giảm chuyển động** (`prefers-reduced-motion: reduce`): giữ mờ dần và đổi màu, bỏ trượt và co giãn; cuộn mượt về `auto`. Khung chờ `PageSkeleton` nhấp nháy bằng `motion-safe:animate-pulse`. Không dùng chuyển động để che việc đang tải.
- **Ngoại lệ ở trang chủ**: nền ánh nước của hero (`HeroFx`, mục Page modes) là WebGL chạy bằng JS, và vé ca minh họa có một chuỗi CSS chạy một lần; cả hai chỉ có ở `/`, tắt khi giảm chuyển động.

## Do's and Don'ts

### Do:
- **Do** dùng tên token (`bg-brand`, `text-ink-soft`, `border-rule`); đặt `surface-dark` lên mọi vùng nền xanh biển đậm mới để vòng focus đổi sang vàng.
- **Do** lấy nút từ `btn()`, ô nhập từ `inputCls`, trạng thái ca từ `StateBadge`, hộp thông báo từ `Alert`; kéo khoảng cách theo bội `0.5rem`.
- **Do** để giờ ca là số lớn nhất của thẻ (`font-num tabular text-4xl font-bold`).
- **Do** kèm chữ cho mọi tín hiệu: ô cửa luôn có "n/m người chính · …" và chữ "Dự phòng"; Badge và `Alert` luôn có icon + chữ.
- **Do** để link giữa dòng chữ (`Tel` inline) không đặt `min-h`; còn link hay nút đứng riêng một hàng phải cao tối thiểu `3rem`.
- **Do** cho dải đầu của mô-đun chứa dữ liệu thật (loại việc, trạng thái, "GẤP").
- **Do** thêm sắc mới vào `tailwind.config.ts`, kèm tính tỉ lệ tương phản (4,5:1 cho chữ thường) trước khi dùng.

### Don't:
- **Don't** dùng gradient, kính mờ, bóng đổ (trừ pin bản đồ), viền trái màu, `dark:` (nền ánh nước WebGL của hero trang chủ là ngoại lệ duy nhất cho phần "không gradient").
- **Don't** dùng ký tự Unicode hoặc emoji làm icon; icon chỉ từ `lucide-react`, mỗi icon đi kèm chữ và `aria-hidden`.
- **Don't** thêm nhãn kicker hoặc eyebrow (dòng chữ nhỏ viết hoa trên tiêu đề).
- **Don't** đặt chữ hoặc viền chỉ dẫn `accent` trên nền sáng; không đặt chữ nhạt hơn `ink-soft` cho nội dung.
- **Don't** bọc từng dòng trong thẻ, lồng thẻ trong thẻ, hay dùng thẻ làm trang trí.
- **Don't** bỏ `focus-visible` hoặc thêm `outline-none`; không hạ cỡ chữ gốc, không thêm `text-xs`/`text-[...]`.
- **Don't** đặt số điện thoại lên bản đồ hoặc vào dữ liệu của pin.
- **Don't** đưa vào font, bảng màu, bo góc, kiểu đổ bóng thứ hai.

## Accessibility

- Chữ gốc 18px; nút, ô nhập, dòng tóm tắt, mục nav, link đứng riêng cao tối thiểu `3rem` (54px, vượt 48px).
- **Focus hai tông**: `:focus-visible { outline: 3px solid #083F5F; outline-offset: 2px }` (xanh đậm, 10,65:1 trên `chalk`) và `.surface-dark :focus-visible { outline-color: #FFC247 }` (vàng, 7,41:1 trên `brand-deep`) cho thanh trên, rail, nav dưới, chân trang. Ô nhập vừa có vòng vừa đổi viền sang `brand`. Radio ẩn bằng `sr-only` dùng `focus-within:ring-4`.
- Thông báo: lỗi `role="alert"`, thành công/thông tin `role="status"`; `ActionForm` cuộn thông báo vào giữa tầm nhìn (`scroll-my-4` và `scroll-padding` của `<html>` tránh thanh dính).
- `prefers-reduced-motion: reduce`: `globals.css` rút mọi `animation`/`transition` về gần 0 và tắt cuộn mượt; cuộn mã (`scrollBehavior()`, `fitBounds`, `easeTo`) cũng tôn trọng. Vòng quay là `motion-safe`.
- Không chỉ dùng màu; HTML ngữ nghĩa trước (`button`, `Link`, `label`, `details`, `fieldset`); nav có `aria-label="Điều hướng chính"` và `aria-current="page"`.
- Trang token (`/confirm`, `/consent`) không dùng `window.confirm`, `alert`, cửa sổ mới hay bước đăng nhập (trình duyệt nhúng của Zalo/Facebook có thể bỏ qua hộp thoại); dùng câu nhắc cố định ngay trên nút.
- Menu "Thêm" dùng `<details>`/`<summary>`, chạy bằng bàn phím và trong trình duyệt nhúng.

## Page modes

| Chế độ | Trang | Cách dựng |
|---|---|---|
| Persuade | trang chủ `/` | hero `brand-deep` (`surface-dark`) toàn bề rộng: tiêu đề `text-4xl lg:text-5xl`, câu `NO_FEE` có icon `ShieldCheck`, nút vàng `accent` "Dùng thử bản mô phỏng" (nút `primary` xanh sẽ chìm vào nền); nền là ánh nước (`HeroFx` trong `src/components/hero-fx.tsx`, shader caustics WebGL của `/fx/fx.js`, tải lười sau khi trang đã load và trình duyệt rảnh; mặc định, không có WebGL, giảm chuyển động hay lỗi thì chỉ là khối `brand-deep` đặc; dừng khi tab ẩn hoặc hero ra khỏi màn hình). Bên phải là vé ca minh họa (ngày mai 08:00–12:00, quán mẫu, lương, giờ `font-num text-5xl lg:text-6xl`, dãy ô cửa tự chạy một lần: người chính hủy, ô dự phòng trượt lên chỗ đó; giảm chuyển động thì mờ dần) kèm dòng "Ví dụ minh họa, dữ liệu mẫu.". Bên dưới, trên nền vôi: "Cách hoạt động" (6 bước, số lớn `font-num text-5xl brand`) với ba `SlotStrip` minh họa; bản đồ minh họa 3 ghim; "Những gì giữ cho ca làm an toàn" (4 mục `Point` kẻ `border-rule`); hai cột "Dành cho người làm / chủ quán" trên nền trắng; dải `accent` cuối trang "Đây là bản mô phỏng, chỉ có dữ liệu mẫu." kèm nút `primary`. Chưa có số liệu, lời chứng thực hay khách hàng. |
| Public | `/f/[slug]` (trang quán), `/s/[id]` (ca chia sẻ) | không nav chính; tự dựng bố cục (`SELF_LAID_OUT`). Dải đầu `PublicBand` nền `brand-deep` nối liền thanh trên: tên quán hoặc loại việc `text-3xl` trắng, gạch nắng, phụ đề `brand-tint`; thân `PublicBody` `max-w-3xl`. Không SĐT, không chuyển động; mở trong trình duyệt nhúng của Zalo. Người làm đang hoạt động mở `/s/[id]` thấy nút "Mở ca trong ứng dụng"; người khác (chưa đăng nhập hay vai trò khác) thấy "Đăng nhập để nhận ca". |
| Operate | mọi trang trong app (người làm, chủ quán, nhóm vận hành, gồm `/jobs`, `/my-applications`, `/notifications`), trang token `/confirm`, `/consent` | `PageTitle` rồi các mô-đun hairline xếp dọc; một hành động chính nổi bật; trang rộng (`max-w-6xl`) dùng nhiều cột và bảng thật. |
| Read | `/terms`, `/privacy` | `Doc`: cột đọc 40rem, mục lục, `leading-relaxed`. |

## Known gaps

Ghi nhận hiện trạng, không phải quy tắc cho trang mới. Mục (a)-(e) do người rà soát giao diện nêu; tài liệu này chưa tự kiểm lại bằng trình duyệt.

- (a) Ô số liệu lớn ở `/p/[slug]`, `/profile`, `/admin/workers` còn là hạng mục chưa làm lại (theo người rà soát; chưa tự kiểm).
- (b) Nhãn nav dưới của nhóm vận hành (4 mục + "Thêm") vừa vặn ở 360px nhưng sát lề trái/phải; không còn xuống 2 dòng.
- (c) Có khối trống ở `/login` ở bề rộng 1280px.
- (d) Pin dạng số ở bản đồ cơ sở (`/admin/facilities`) chưa có chú giải.
- (e) Chưa thử trong trình duyệt nhúng thật của Zalo/Facebook.
- Một số chỗ dùng `rounded` mặc định của Tailwind (`0.25rem` = 4,5px) thay vì `rounded-ui` 6px: Badge, link nav trong rail/menu, mục lục của `Doc`. Đây là lệch so với nguyên tắc "một bán kính", **không** được coi là bán kính thứ hai của hệ; trang mới dùng `rounded-ui`.
- Chưa có kiểm trực quan tự động (không có CI) cho các cặp màu hay bề rộng; bảng tỉ lệ ở trên chỉ tính từ hex, chưa đo trên màn hình thật.
