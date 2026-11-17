# AGENTS.md

File này là quy tắc làm việc cho mọi coding agent (Claude Code, Codex, Cursor…) trong repo SafeShift (`tangkhatnk/covershift`).

Đây là chính sách lâu dài của repo, không phải prompt cho một việc cụ thể và không phải đặc tả đầy đủ của sản phẩm. Dùng nó cùng với yêu cầu hiện tại, mã nguồn, test, schema và các quyết định đã được chủ dự án chấp nhận.

Bối cảnh, lịch sử và các quyết định chi tiết: `PROJECT_HANDOFF.md`. Hướng dẫn cài đặt/deploy: `README.md`. Kịch bản kiểm thử: `TESTING.md`.

---

## 1. Thẩm quyền, phạm vi và nguồn sự thật

Khi có điểm mơ hồ, áp dụng theo thứ tự:

1. Yêu cầu hoặc chỉ thị hiện tại đã được chủ dự án duyệt.
2. Mã hiện tại, test, schema (`supabase/migrations/`), hợp đồng RPC.
3. Tài liệu trong repo khớp với mã hiện tại (`AGENTS.md`, `CLAUDE.md`, `README.md`, `TESTING.md`).
4. Issue, pull request và quyết định đã được ghi nhận (`PROJECT_HANDOFF.md` mục 4).
5. Ghi chú cũ, comment lịch sử, giả định.

Không suy ra quyền hạn từ một yêu cầu không liên quan:

- Yêu cầu rà soát không phải là cho phép sửa.
- Yêu cầu sửa lỗi không phải là cho phép thiết kế lại hệ thống.
- Yêu cầu giao diện không phải là cho phép đổi quy tắc nghiệp vụ.
- Yêu cầu tìm hiểu không phải là cho phép thay đổi repo.
- Được duyệt một thay đổi không có nghĩa là được duyệt các thay đổi khác về sau.

Khi mã và tài liệu mâu thuẫn, điều tra trước khi đổi hành vi. Không lặng lẽ chọn nguồn nào dễ hơn.

Vấn đề nằm ngoài phạm vi việc đang làm: báo lại hoặc mở issue riêng. Không âm thầm mở rộng phạm vi.

---

## 2. Tổng quan sản phẩm

SafeShift là web app kết nối ca làm ngắn hạn giữa cơ sở dịch vụ nhỏ ở Vũng Tàu (quán cà phê, nhà hàng, homestay, khách sạn nhỏ) và người làm là học sinh từ 15 tuổi hoặc sinh viên.

- Cơ sở đã được xác minh thì đăng ca; người làm nhận ca; mỗi ca có người chính và một người dự phòng.
- Sau ca, chủ quán xác nhận qua link không cần đăng nhập; ca đã xác nhận vào hồ sơ ca làm của người làm.
- Nền tảng **chỉ kết nối**. Lương, hợp đồng, điều kiện làm việc do hai bên tự thỏa thuận. Nền tảng chịu trách nhiệm kiểm duyệt ai được đăng, việc gì được đăng, ai được nhận ca.
- Không thu phí, không có thanh toán trong app.

Vai trò: `worker` (người làm), `employer` (chủ quán), `admin` (nhóm vận hành). Phụ huynh và chủ quán khi xác nhận sau ca dùng link có token, không đăng nhập.

Stack: Next.js 15 (App Router) + TypeScript + Tailwind 3 + Supabase (Postgres, Auth, RLS, Edge Functions) + Vercel, chỉ gói miễn phí.

Mốc thời gian đợt đầu: deploy ổn định trước 20/11/2026, chạy thật 21–22/11, demo 26/11. **Ổn định quan trọng hơn tính năng mới.**

---

## 3. Bản đồ repo

Dùng ranh giới sở hữu sẵn có trước khi tạo ranh giới mới. Đặt logic vào nơi nó thuộc về, không đặt vào nơi tiện tay.

### Database (nguồn sự thật của quy tắc nghiệp vụ)

- `supabase/migrations/`
  - schema, trigger, constraint, RLS, RPC;
  - hiện có `0001_init.sql`, đã áp lên Supabase thật ngày 17/11/2026: không sửa nữa, thay đổi mới là file migration mới (`0002_...sql`).
- `supabase/seed.sql`
  - dữ liệu mẫu; phải chạy lại được nhiều lần.
- `supabase/tests/`
  - `edge_cases.sql`: test biên, chạy trong `npm run test:db`;
  - `privileges_check.sql`: kiểm quyền bảng/hàm của `anon`/`authenticated`, chỉ đọc, chạy tự động và chạy tay trong SQL Editor sau migration;
  - `check_before_migration.sql`: kiểm project Supabase mới trước khi dán migration, chỉ đọc.
- `supabase/xoa_du_lieu_demo.sql`
  - xóa dữ liệu demo trước ngày chạy thật, đúng thứ tự khóa ngoại.
- `supabase/functions/`
  - hiện có `shift-reminders/index.ts`.
- `db-test/`
  - bộ chạy `npm run test:db` trên Postgres nhúng (`run.mjs`, `race.mjs`); có `package.json` riêng, tách khỏi app.

### Ứng dụng web (Next.js App Router)

- `src/app/`
  - các route và trang (`admin/`, `quan/`, `ca/`, `dang-ky/`, `dang-nhap/`, `auth/`...);
  - `globals.css`, `layout.tsx`.
- `src/app/actions.ts`
  - mọi server action; một action tương ứng một RPC.
- `src/lib/`
  - `constants.ts`, `types.ts`, `format.ts`, `errors.ts`, `auth.ts`;
  - `supabase/` (client, server, middleware).
- `src/components/`
  - `ui.tsx` (thành phần trình bày), `client.tsx` (thành phần client: `ActionForm`, `SubmitButton`...).
- `middleware.ts`
  - làm mới phiên đăng nhập qua `src/lib/supabase/middleware.ts`; matcher bỏ qua file tĩnh và các trang token công khai.

### Công cụ và tài liệu

- `.claude/agents/`
  - agent điều phối `safeshift-lead` và 4 subagent (`implementer`, `db-guardian`, `contract-reviewer`, `ui-qa`), xem mục 5.
- `.claude/settings.json`
  - cấu hình Claude Code dùng chung: bật `safeshift-lead` làm agent của phiên chính. `.claude/settings.local.json` là cấu hình cá nhân, bị `.gitignore`.
- Tài liệu: `AGENTS.md` (file này), `CLAUDE.md` (ghi chú riêng cho Claude Code, nạp `AGENTS.md`), `PROJECT_HANDOFF.md` (bối cảnh và quyết định), `README.md` (cài đặt, deploy), `TESTING.md` (A: tự động, B: kịch bản tay), `PROMPT_CLAUDE_CODE.md` (prompt tiếp quản).
- Không có `.github/` trên `main` (xem mục 25).

Quy tắc nghiệp vụ nằm ở database, không nằm ở giao diện. Database, quyền, bảo mật, quyền riêng tư: mục 10–17. Giao diện, văn phong sản phẩm, khả năng truy cập: mục 18–24.

---

## 4. Bộ công cụ chuẩn

Repo là một package Next.js ở thư mục gốc, không phải npm workspace. `db-test/` có `package.json` và `node_modules` riêng.

- Node.js 24 (`engines.node` là `24.x`; máy đã kiểm dùng v24.16.0);
- npm (có `package-lock.json` ở gốc và ở `db-test/`);
- Next.js 15.5.29 (App Router), React 19;
- TypeScript 5.9.3, Tailwind CSS 3.4.19;
- `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.119.0;
- `db-test/`: `embedded-postgres` và `pg`.

Lệnh có thật trong `package.json`:

```bash
npm ci                # cài phụ thuộc ở gốc
npm run typecheck     # tương đương npx tsc --noEmit
npm run dev           # cần .env.local trỏ tới Supabase thật
npm run test:db       # tự chạy npm install trong db-test, rồi node run.mjs --race
```

Quy tắc:

- không đổi package manager nếu không có task riêng;
- không nâng phiên bản thư viện như việc phụ; phiên bản `@supabase/*`, `next`, `tailwindcss`, `typescript` đang ghim chính xác, giữ nguyên;
- thay đổi phụ thuộc phải kèm lockfile tương ứng và chỉ khi task cần;
- không thêm bộ định dạng toàn repo (Prettier, ESLint...) chỉ vì repo chưa có; không chạy công cụ định dạng trên file không liên quan;
- không commit `.env*` (trừ `.env.example`), `.next/`, `db-test/.pgdata`, `tsconfig.tsbuildinfo`, `node_modules/`.

---

## 5. Quy trình agent mặc định (3 subagent)

Áp dụng cho mọi phiên làm việc của coding agent trong repo này. Với Claude Code, quy trình được bật sẵn: `.claude/settings.json` chạy agent điều phối `safeshift-lead`, agent này tự gửi lượt đầu tiên theo mục này khi mở phiên.

### Vai trò

- **Agent điều phối** (phiên chính): đọc yêu cầu, lập kế hoạch, chia việc, tự kiểm lại kết quả của subagent, quản lý nhánh/commit/PR, báo cáo cho chủ dự án. Agent điều phối chịu trách nhiệm cuối cùng về mọi thay đổi.
- **Subagent** (trong `.claude/agents/`, cả bốn chạy `claude-sonnet-5-5`, effort `high`, khai trong frontmatter — khi gọi **không** truyền `model`/`effort` để khỏi đè):

| Subagent | Việc | Được sửa file |
|---|---|---|
| `implementer` | Viết/sửa mã trong `src/`, tài liệu, theo danh sách file được giao | Có, chỉ file được giao |
| `db-guardian` | Migration, trigger, RLS, RPC, test SQL; soát độ tương thích Supabase | Có, chỉ trong `supabase/` và `db-test/` |
| `contract-reviewer` | Rà mã giao diện so với RPC, server action, kiểu dữ liệu | Không |
| `ui-qa` | Chạy kịch bản `TESTING.md` mục B trên trình duyệt ở 360–414px | Không |

### Mỗi giai đoạn chạy đúng 3 subagent song song

1. **Tìm hiểu** — 3 subagent cùng lúc, mỗi cái một góc không trùng (vd. `db-guardian` soát tầng database liên quan, `contract-reviewer` soát các trang liên quan, `implementer` ở chế độ chỉ đọc lập danh sách file cần sửa). Bỏ qua giai đoạn này nếu việc nhỏ và đã rõ file cần sửa.
2. **Thực hiện** — tối đa 3 subagent viết song song, mỗi cái một nhóm file **không giao nhau**. Việc ở `supabase/` chỉ giao `db-guardian`. Việc quá nhỏ để chia ba thì giao ít hơn hoặc agent điều phối tự làm; không chia việc giả để đủ số.
3. **Rà soát** — 3 subagent cùng lúc trên diff cuối: `contract-reviewer` (giao diện), `db-guardian` (database, ở chế độ chỉ soát), và `ui-qa` nếu app đang chạy được với Supabase thật — nếu không, một `contract-reviewer` thứ hai rà phần còn lại của diff.

### Quy tắc khi dùng subagent

- Không quá 3 subagent chạy cùng lúc. Tài khoản có giới hạn dùng theo cửa sổ 5 giờ; ngày 16/11/2026 ba agent song song từng bị dừng cả ba vì lỗi 429.
- Mỗi brief cho subagent ghi rõ: mục tiêu, danh sách file được đọc/sửa, cách kiểm tra, định dạng báo cáo.
- Subagent viết mã phải ghi từng file ra đĩa ngay khi xong và chỉ sửa file được giao. Hai subagent không bao giờ cùng sửa một file.
- Subagent không tạo nhánh, không commit, không push, không mở PR. Việc git do agent điều phối làm.
- Báo cáo của subagent là dữ liệu để kiểm, không phải sự thật: agent điều phối đọc lại diff và chạy lại kiểm tra trước khi tin.
- Subagent bị dừng giữa chừng (vd. 429): kiểm tra đĩa (`git status`, `git diff`) xem nó đã ghi gì, đợi giới hạn reset rồi gọi lại chính subagent đó thay vì tạo mới.
- Không dùng subagent cho thao tác cần tài khoản của chủ dự án (Supabase dashboard, Google Cloud, Vercel, đăng nhập Google). Những bước đó chủ dự án tự làm; agent hướng dẫn từng bước.

### Khi mở phiên mà chủ dự án chưa giao việc

1. Kiểm hiện trạng: `git status`, nhánh hiện tại, `git fetch` rồi so với `origin/main`, PR đang mở (`gh pr list`), issue đang mở (`gh issue list`).
2. Chọn việc kế tiếp theo thứ tự: PR đang mở của chính agent cần sửa theo review → issue đang mở có nhãn ưu tiên → mục "NEXT STEPS" trong `PROJECT_HANDOFF.md`.
3. Báo chủ dự án trong 3–5 dòng: hiện trạng và việc định làm. Việc nằm trong danh sách trên và không thuộc nhóm "phải hỏi trước" thì bắt đầu luôn, không chờ.
4. Phải hỏi trước khi làm: đổi quy tắc nghiệp vụ; đổi schema hoặc quyền trên Supabase thật; xóa dữ liệu; merge PR; mọi việc không hoàn tác được.
5. Deploy web lên Vercel không cần hỏi trước. Bước cần đăng nhập hay cấu hình trên tài khoản của chủ dự án (Vercel dashboard, biến môi trường, tên miền) vẫn do chủ dự án tự làm theo hướng dẫn. Bật hay deploy Edge Function vẫn theo mục 16.

---

## 6. Quy trình Git bắt buộc

Mọi thay đổi vào repo đi qua:

```text
branch -> pull request -> review -> merge
```

- Không commit trực tiếp và không push trực tiếp lên `main`.
- Mỗi task dùng một nhánh ngắn hạn, tạo từ `main` đã cập nhật.
- Tên nhánh:

```text
fix/<mo-ta-ngan>
feat/<mo-ta-ngan>
docs/<mo-ta-ngan>
test/<mo-ta-ngan>
chore/<mo-ta-ngan>
refactor/<mo-ta-ngan>
ci/<mo-ta-ngan>
```

- Không đặt tên nhánh mang thương hiệu AI:

```text
claude/*
codex/*
chatgpt/*
agent/*
ai/*
```

- Không force-push `main`.
- Xóa nhánh task sau khi merge.
- Không merge khi review hoặc kiểm tra liên quan chưa xong.

Hiện trạng cần biết: lịch sử trước khi có `AGENTS.md` (14 commit, từ `Initial commit` đến `Bỏ qua cấu hình MCP cục bộ`) đều commit thẳng `main`, chưa có pull request nào, và `main` chưa bật branch protection. Đó là quá khứ của giai đoạn một người làm, không phải tiền lệ. Từ khi có file này, quy trình trên là bắt buộc dù GitHub chưa chặn kỹ thuật.

Hai nhánh `add-claude-github-actions-*` trên remote do GitHub tạo khi cài workflow Claude, không phải mẫu đặt tên cho nhánh task.

---

## 7. Chính sách issue

Mở hoặc liên kết issue trước khi làm:

- lỗi đã xác nhận;
- tính năng, cải tiến hành vi;
- thay đổi schema hoặc migration;
- thay đổi RLS, quyền `grant`/`revoke`, RPC `SECURITY DEFINER`;
- thay đổi xác thực, đăng nhập, phiên;
- thay đổi luồng dữ liệu cá nhân (số điện thoại, ngày sinh, đồng ý của phụ huynh, xóa tài khoản);
- thay đổi quy tắc nghiệp vụ (tuổi, giờ làm của người dưới 18, lương tối thiểu, số chỗ, xác minh cơ sở);
- thay đổi hợp đồng giữa server action và RPC;
- thay đổi hạ tầng đáng kể (Supabase, Vercel, Edge Function).

Thường không cần issue riêng:

- sửa tài liệu nhỏ;
- chỉ sửa test, không đổi hành vi;
- sửa lỗi chính tả hoặc câu chữ không đổi nghĩa (nếu là thông báo lỗi trong `raise exception` thì vẫn phải sửa cả `edge_cases.sql`);
- refactor nội bộ rất nhỏ, không đổi hành vi.

Kiểm tra issue đã có trước khi mở trùng. Issue mô tả vấn đề hoặc hành vi mong muốn trước khi áp đặt cách làm. Không dán dữ liệu cá nhân thật vào issue.

---

## 8. Chính sách commit

Tiêu đề theo kiểu Conventional Commit khi hợp lý:

```text
feat: ...
fix: ...
docs: ...
test: ...
refactor: ...
chore: ...
ci: ...
```

Hiện trạng: lịch sử đến nay dùng tiêu đề tiếng Việt không có tiền tố, ví dụ `Bỏ qua cấu hình MCP cục bộ`, `Sửa lỗi sau khi rà soát giao diện`. Giữ nguyên lịch sử đó, không viết lại.

Quy định từ nay: tiền tố tiếng Anh, mô tả tiếng Việt, một dòng tiêu đề nêu thay đổi thật.

```text
fix: ẩn SĐT phụ huynh khỏi client
feat: thêm file xóa dữ liệu demo an toàn
test: thêm test xóa tài khoản chủ quán khi ca có báo cáo
docs: ghi nhận migration đã áp lên Supabase
chore: bỏ qua cấu hình MCP cục bộ
```

Quy tắc:

- một commit là một thay đổi logic, không phải một lượt thử của agent;
- thân commit chỉ khi lý do hoặc ràng buộc không rõ từ tiêu đề và diff (các commit hiện có dùng thân dạng gạch đầu dòng, giữ cách đó);
- không dùng tiêu đề mơ hồ: `fix`, `fix2`, `wip`, `oops`, `update`, `misc`, `final`, `cải thiện`, `sửa lỗi vặt`;
- không gộp thay đổi không liên quan vào một commit, cũng không chia nhỏ giả tạo;
- tác giả commit là người dùng thật đã cấu hình `git config` (lịch sử hiện có chỉ có tác giả người, không có dòng `Co-authored-by` hay "Generated with" nào);
- không thêm `Co-authored-by` của AI, `Generated-by` hay dòng "Generated with ..." vào commit, PR hay issue, trừ khi chủ repo yêu cầu rõ.

---

## 9. Kỷ luật phạm vi và đọc trước khi sửa

Làm bản vá đúng nhỏ nhất.

- Không refactor module bên cạnh khi task không cần.
- Không đổi tên định danh cũ chỉ vì trông cũ.
- Không nâng phụ thuộc như việc phụ.
- Không sửa schema, quyền hay hợp đồng RPC như hệ quả phụ của task giao diện.
- Không xóa đường dẫn "có vẻ không dùng" khi chưa chứng minh an toàn.
- Yêu cầu review không phải phép implement; yêu cầu sửa một lỗi không phải phép thiết kế lại.
- Vấn đề phát hiện ngoài phạm vi: báo lại hoặc mở issue riêng, không tự sửa.

Trước khi sửa:

1. Đọc `AGENTS.md` và `CLAUDE.md`; với việc lớn đọc thêm phần liên quan của `PROJECT_HANDOFF.md`.
2. Đọc code trực tiếp liên quan và test liên quan.
3. Với dữ liệu hoặc quyền: đọc migration, `edge_cases.sql`, `privileges_check.sql`.
4. Tìm mẫu đã có trước khi tạo mẫu mới (ví dụ thêm thao tác ghi: theo mẫu RPC + server action đã có).
5. Khi code và tài liệu mâu thuẫn, điều tra trước, không chọn bên nào dễ hơn.

Không cần đọc cả repo cho việc nhỏ. Không đoán khi repo đã có câu trả lời.

---

## 10. Bất biến nghiệp vụ

Các quy tắc dưới đây đang được chặn ở database (`supabase/migrations/0001_init.sql`) và có test trong `supabase/tests/edge_cases.sql` (nhãn như `1a`, `4f`). Không đổi con số, ranh giới hay phạm vi áp dụng nếu không có task được duyệt. Một thay đổi như vậy phải đi cùng: migration mới, test mới, và cập nhật `src/lib/constants.ts`, `/dieu-khoan`, `/chinh-sach-du-lieu` khi câu chữ ở đó nhắc tới quy tắc.

Mọi quy tắc tính theo múi giờ nghiệp vụ `Asia/Ho_Chi_Minh`, không theo UTC của server:

- Trong SQL dùng `vn_date()`, `age_on()` và `at time zone 'Asia/Ho_Chi_Minh'`.
- Trong TypeScript dùng `TZ` trong `src/lib/constants.ts` và các hàm trong `src/lib/format.ts`. Không tự định dạng giờ bằng `Date` trần ở server.

### Người làm

- **Tuổi tối thiểu 15.**
  - Chặn ở: `register_worker()`, trigger `_worker_profiles_guard` (tuổi tính tại ngày đăng ký), `_claims_validate` (tuổi tính tại ngày diễn ra ca). Test 1a, 1b.
  - Ngày sinh khóa sau khi đăng ký (cùng trigger). Tên và ngày sinh không có đường sửa trong app.
- **Người 15–17 cần phụ huynh đồng ý và admin duyệt.**
  - Phụ huynh mở link token, điền họ tên, SĐT, tick đồng ý: `submit_parental_consent()`. Link hết hạn sau 30 ngày, chỉ gửi một lần.
  - Admin duyệt bằng `admin_review_worker()`; hàm này từ chối nếu phụ huynh chưa gửi phiếu.
  - `_claims_validate` chỉ cho nhận ca khi `parental_consents.status = 'approved'`. Test 1e–1i.
  - Mọi người làm, kể cả từ 18 tuổi, đều cần `worker_profiles.approval = 'approved'` mới nhận được ca.
- **Dưới 18 tuổi: chỉ ca trong 06:00–22:00, cùng một ngày, dài tối đa 8 giờ.**
  - Điều kiện nằm ở hàm `_minor_safe()`. Ca phải do chủ quán tick `allow_minor`.
  - Chặn ở: `_shifts_validate` (lúc đăng ca), `_claims_validate` (lúc nhận), policy RLS `shifts_read` qua `_shift_open_for_me()` và `feed_shifts()` (ca không an toàn không hiện ra). Test 2a–2f.
  - Tuổi tính tại ngày diễn ra ca, không phải ngày đăng ký.
- **Giới hạn 40 giờ/tuần.**
  - Hiện áp cho **mọi** người làm, không chỉ dưới 18, và tính cả suất dự phòng còn hiệu lực. Tuần tính từ thứ Hai đến Chủ nhật theo giờ Việt Nam. Giá trị lấy từ `app_config.weekly_hours_cap`.
  - Chặn ở: `_claims_validate`. Test 3a, 3b.
  - Phạm vi "mọi người" là quyết định tự quyết (G4 trong `PROJECT_HANDOFF.md`), chủ dự án chưa xác nhận. Không thu hẹp hay mở rộng khi chưa có trả lời.
  - Không nhận hai ca trùng giờ (cùng trigger, test 3c).

### Cơ sở và ca

- **Lương tối thiểu** lấy từ `app_config.min_hourly_wage` (mặc định 25.500đ). Không viết cứng số này trong mã.
  - Chặn ở: `_shifts_validate` qua `cfg_int()`. Admin đổi bằng `admin_set_config()`, có ghi audit log. Test 4a–4d.
- **Cam kết không thu phí, không đặt cọc, không giữ giấy tờ.**
  - Chặn ở: ràng buộc `shifts.commitment_ack` và tham số `p_commit` của `create_shift()`. Test 4f.
  - Hệ thống không có thanh toán, không có trường tiền cọc.
- **Chỉ cơ sở đã xác minh mới đăng ca.**
  - Chặn ở: `create_shift()`, `_shifts_validate`.
  - `facilities.verified = true` chỉ bật được khi có phiếu `facility_verifications` đạt (đúng địa chỉ và đúng người liên hệ): trigger `_facilities_guard`, `admin_verify_facility()`.
  - `admin_set_facility_status()` tắt `verified` và hủy các ca sắp tới. Test 4e, 4j, 4k, 10j.
- **Loại việc là enum cố định 7 giá trị** (`job_type`: `phuc_vu`, `pha_che`, `thu_ngan`, `don_phong`, `le_tan`, `phu_bep_nhe`, `ho_tro_su_kien`).
  - **Loại hình cơ sở là allowlist 4 giá trị** (`facility_type`: `cafe`, `restaurant`, `homestay`, `small_hotel`).
  - Tên cơ sở chứa `bar`, `pub`, `club`, `karaoke`, `massage`, `mát xa`, `matxa`, `vũ trường` bị `_facilities_guard` chặn. Người đăng ký còn phải tick `not_prohibited_ack`.
  - Thêm giá trị enum là thay đổi nghiệp vụ: cần task duyệt, migration mới, và sửa `JOB_LABEL`, `FACILITY_TYPE_LABEL`, `PROHIBITED_TEXT` trong `src/lib/constants.ts` cho khớp. Test 4g–4i.
- **Một ca có N người chính (1–5, cột `headcount`) và luôn tối đa một người dự phòng.**
  - Chặn ở: hai unique index một phần `shift_claims_one_active_per_worker`, `shift_claims_one_backup`; trigger `_claims_validate`.
  - `claim_shift()` khóa dòng ca bằng `select ... for update`, nên hai người giành chỗ cuối được xếp hàng. Test 6a–6h và `db-test/race.mjs`.
  - Người nhận đầu tiên là người chính. Hết chỗ chính thì thành người dự phòng. Khi người chính hủy, `_promote_backup()` đưa người dự phòng lên.
- **Mốc hủy 2 tiếng.**
  - `cancel_claim()`: hủy khi còn ≤ 2 giờ thì ghi `late_cancel` vào `worker_events` và tạo báo cáo cho admin, nhưng vẫn đưa người dự phòng lên (G10, tự quyết, chưa xác nhận).
  - `cancel_shift()`: chủ quán hoặc admin hủy sát giờ khi đã có người nhận cũng tạo báo cáo.
  - Ca đã bắt đầu thì không tự hủy được. Test 8a–8d.

### Link xác nhận

- **Token xác nhận sau ca dùng một lần, hết hạn sau giờ kết thúc ca 72 giờ.**
  - `_ensure_token()` sinh token khi chủ quán hoặc admin mở trang, đặt `expires_at = ends_at + 72 giờ`. Ca không có người chính thì không sinh token.
  - `submit_confirmation()` kiểm tra `used_at` và `expires_at`, rồi đánh dấu đã dùng và chuyển ca sang `completed`. Test 5a–5j.
  - Một link cho cả ca (liệt kê mọi người chính), không phải mỗi người một link.
  - Bảng `shift_confirmation_tokens` không có policy đọc và không được grant cho client. Chỉ đọc qua `get_confirmation()`.
  - Con số 72 giờ còn xuất hiện ở `shiftState()` trong `src/lib/format.ts`. Nếu đổi thì sửa cả hai nơi.
  - `generate_due_confirmation_tokens()` chỉ dành cho `service_role`, dùng khi bật cron (tùy chọn).

---

## 11. Kiến trúc dữ liệu và quyền

Mô hình: Server Component đọc, Server Action ghi, mọi ghi đi qua RPC. RLS bật ở mọi bảng, chỉ có policy `SELECT`.

- Quy tắc nghiệp vụ chặn ở database: trigger, constraint, RLS, RPC. Kiểm tra ở giao diện hoặc server action chỉ để tiện cho người dùng.
- Quy tắc cốt lõi phải nằm ở trigger hoặc constraint, không chỉ ở RPC, để ghi bằng service-role cũng không lách được.
- Client (`anon`, `authenticated`) không có quyền `INSERT`/`UPDATE`/`DELETE`/`TRUNCATE`/`REFERENCES`/`TRIGGER` trên bảng nào, kể cả theo cột. Không thêm policy ghi, không `grant` các quyền này.
- Bảng mới: bật RLS ngay trong migration, `revoke all` khỏi `anon, authenticated`, chỉ grant `select` tối thiểu cần dùng. Bảng chứa dữ liệu nhạy cảm thì grant theo cột hoặc không grant (xem `parental_consents`, `shift_confirmation_tokens`).
- Muốn ghi dữ liệu mới, làm đủ ba việc:
  1. Viết RPC trong migration mới.
  2. Cấp quyền gọi trong cùng migration.
  3. Thêm server action vào `src/app/actions.ts` (một action gọi một RPC, qua hàm `call()`). Không gọi `.from(...).insert/update/delete` từ `src/`.
- Mẫu RPC:

```sql
create function public.ten_ham(...) returns ...
language plpgsql security definer set search_path = public as $$
declare me profiles;
begin
  me := _require_user();   -- hoặc _require_admin()
  ...
end $$;
```

- Danh tính lấy từ `auth.uid()` (qua `_require_user()`), không nhận user id của chính chủ từ tham số. RPC của admin phải gọi `_require_admin()` và ghi `_audit(...)`.
- Hàm tạo sau khối `revoke execute` sẽ được Supabase tự cấp cho mọi người. Luôn `revoke` rồi `grant` rõ ràng:

```sql
revoke execute on function public.ten_ham(...) from public, anon, authenticated;
grant execute on function public.ten_ham(...) to authenticated;
```

- `create or replace function` giữ nguyên quyền cũ chỉ khi chữ ký không đổi. Đổi chữ ký là hàm mới, phải revoke/grant lại.
- Hàm nội bộ đặt tên bắt đầu bằng `_` và không cấp cho client. Ngoại lệ hiện có, đúng như `privileges_check.sql` kiểm:
  - `_owns_facility`, `_owns_shift`, `_has_claim`, `_shift_open_for_me` và `is_admin()` được grant cho `authenticated` (không cho `anon`) vì dùng trong biểu thức RLS.
  - Không thêm ngoại lệ mới nếu không sửa cả `privileges_check.sql` và giải thích lý do.
  - `cfg_int`, `vn_date`, `age_on`, `make_admin` không cấp cho client. `generate_due_confirmation_tokens` chỉ cấp cho `service_role`.
- RPC công khai (không cần đăng nhập) chỉ có năm hàm: `get_parental_consent`, `submit_parental_consent`, `get_confirmation`, `submit_confirmation`, `get_public_profile`. Bảng chỉ có `app_config` là `anon` đọc được. Không mở thêm.
- `_bypass()` chỉ trả `true` khi `app.seed_mode = 'on'` **và** `session_user` là `postgres` hoặc `supabase_admin`. Không nới điều kiện này, không dùng `_bypass()` trong RPC, không thêm đường bỏ qua trigger nào khác. Test 10f.
- Thông báo lỗi nghiệp vụ là tiếng Việt, viết ngay trong `raise exception`, nói người dùng cần làm gì.
  - `friendlyError()` trong `src/lib/errors.ts` hiện nguyên văn lỗi mã `P0001` và `42501` (trừ `permission denied`). Các lỗi khác bị thay bằng câu chung.
  - Vì hiện nguyên văn cho người dùng, câu lỗi không chứa dữ liệu cá nhân hay chi tiết kỹ thuật.
  - Test khớp theo chuỗi này (`t_err` dùng `ilike`). Sửa câu chữ thì sửa cả `edge_cases.sql`.
- Test SQL: hành động và kiểm tra là hai câu riêng (`pg_temp.t_do`), vì một câu không thấy dữ liệu mà hàm volatile vừa ghi trong chính câu đó.
- Mỗi quy tắc mới cần ít nhất hai test: một trường hợp bị chặn và một trường hợp hợp lệ ngay ranh giới.
- Kiểu của JSON mà RPC trả về nằm trong `src/lib/types.ts` (viết tay). Đổi đầu ra RPC thì sửa cả file này.

---

## 12. Migration và dữ liệu thật

- `supabase/migrations/0001_init.sql` đã áp lên Supabase thật ngày 17/11/2026. **Không sửa file này.**
- Thay đổi schema (bảng, cột, hàm, trigger, policy, grant) là một file mới `supabase/migrations/000N_ten_ngan.sql` (số tiếp theo, tên ngắn không dấu). Mỗi file có thể chạy sau `0001` mà không cần xóa gì.
- Một thay đổi schema gồm đủ các phần:
  - file migration;
  - test trong `supabase/tests/edge_cases.sql`;
  - cập nhật `db-test/run.mjs`: hiện file này chỉ chạy đúng `0001_init.sql`, nên migration mới không được kiểm nếu không thêm vào;
  - cập nhật số test kỳ vọng ghi trong `CLAUDE.md`, `README.md`, `TESTING.md` (hiện là `86/86`).
- Chạy `npm run test:db` trước khi báo xong. Kỳ vọng như `CLAUDE.md`: tất cả test đạt, `privileges_check` không có dòng `SAI`/`KIỂM`, `tái chạy` đạt, 5 dòng `✔ chạy đua`, `dọn dữ liệu demo` đạt.
- Chủ dự án dán migration vào Supabase SQL Editor, rồi chạy `supabase/tests/privileges_check.sql` trên project thật. Agent không tự chạy DDL hay ghi dữ liệu lên project Supabase thật, kể cả khi máy có kết nối MCP tới đó.
- Không dùng đường tắt bỏ qua file migration: `supabase db push`, `supabase db reset`, sửa bảng bằng Table Editor, hay sinh schema bằng diff/pull rồi áp thẳng. Mọi thay đổi phải truy vết được trong `supabase/migrations/`.
- `supabase/tests/check_before_migration.sql` chỉ dùng cho project mới, trước khi dán `0001`. Không dùng nó để kiểm thay đổi sau này.
- Từ khi có dữ liệu thật (đợt chạy 21–22/11), giữ nguyên dữ liệu thật:
  - không xóa hay đổi nghĩa dữ liệu hiện có nếu task không yêu cầu;
  - cột `not null` mới phải có `default` hoặc bước backfill rõ ràng;
  - không `drop` bảng hoặc cột đang chứa dữ liệu.
- `supabase/seed.sql` chỉ cho dữ liệu demo (email `@demo.safeshift.test`, id cố định, không mật khẩu). Chạy lại được nhiều lần. Không nạp seed vào project đang có người dùng thật khi chủ dự án chưa yêu cầu.
- Dọn dữ liệu demo bằng `supabase/xoa_du_lieu_demo.sql`:
  - dán nguyên file vào SQL Editor, chạy lại nhiều lần không sao, không hoàn tác được;
  - chỉ chạy khi chủ dự án xác nhận.
- Không xóa user demo bằng `delete from auth.users where email like ...` hay chọn nhiều user trong Dashboard rồi xóa một lượt. Một báo cáo trỏ tới nhiều đối tượng cùng bị xóa gây lỗi khóa ngoại `23503`. File dọn demo xóa theo đúng thứ tự để tránh việc này.
- Khi thêm bảng hoặc cột tham chiếu `auth.users`, `shifts` hay `facilities`: chọn `on delete cascade` hoặc `set null` có chủ ý, rồi cập nhật `xoa_du_lieu_demo.sql`, test 11a/11b (xóa tài khoản) và phần dọn demo trong `db-test/run.mjs`.

---

## 13. Số điện thoại và dữ liệu cá nhân

Số điện thoại:

- SĐT người làm và chủ quán chỉ lưu ở `private_contacts.phone`. Không thêm cột SĐT vào bảng khác.
- Giữa người làm và chủ quán, SĐT chỉ lộ qua `get_shift_contacts()`. Hàm này chỉ trả khi hai bên đang ghép ca (suất còn hiệu lực, hoặc chủ quán của ca), ca chưa hủy, và chưa quá 7 ngày sau giờ kết thúc ca. Test 7a, 7b, 7f, 7g, 8b.
- Ngoại lệ có chủ đích, chỉ hai loại:
  - chính chủ đọc SĐT của mình (policy `private_contacts_read`);
  - admin xem SĐT để vận hành, qua `get_shift_contacts()` và các RPC `admin_dispatch_board`, `admin_list_workers`, `admin_list_facilities`, `admin_list_reports`.
- Không trả SĐT ở bất kỳ RPC hay trang nào khác. Đặc biệt `feed_shifts`, `shift_detail`, `my_shifts`, `employer_shifts`, `get_confirmation`, `get_parental_consent`, `get_public_profile`, và `_shift_json()` (hàm dùng chung cho nhiều RPC; thêm trường vào đó là thêm vào mọi nơi dùng). Test 5a, 7h, 7i.

Phụ huynh:

- `parental_consents` chỉ grant `select` theo cột: `id`, `worker_id`, `token`, `status`, `expires_at`, `agreed_at`, `reviewed_at`, `created_at`. `parent_name`, `parent_phone`, `reviewed_by` không cấp cho client.
- Người làm không đọc được tên và SĐT phụ huynh của chính mình qua REST. Admin xem qua `admin_list_workers()`.
- Không `select *` trên `parental_consents` từ `src/`. Test 7k–7o.

Dữ liệu tối thiểu:

- Không thu CCCD, ảnh chân dung, địa chỉ nhà. Không thêm trường, upload hay Storage cho các loại này.
- Dữ liệu hiện có: họ tên, SĐT, ngày sinh, trường, lớp, khu vực, khung giờ rảnh (người làm); họ tên, SĐT, tên và địa chỉ cơ sở kinh doanh (chủ quán). Thêm loại dữ liệu cá nhân mới là thay đổi cần duyệt và cần cập nhật `/chinh-sach-du-lieu`.
- Chủ quán không đọc được `worker_profiles` (ngày sinh, trường, lớp). Test 7d.

Hồ sơ công khai (`get_public_profile`, trang `/h/[slug]`):

- Chỉ có: họ tên, số ca đã xác nhận, tổng giờ, điểm trung bình, tỉ lệ đúng giờ, loại việc, và nhận xét (ngày, tên cơ sở, loại việc, số sao, đúng giờ, lời nhận xét chưa bị admin ẩn).
- Không bao giờ có SĐT, ngày sinh, trường, lớp. Test 7i.
- Mặc định tắt chia sẻ (`share_enabled = false`); người ngoài không xem được khi tắt. Test 7j.
- Trang `/h`, `/xac-nhan`, `/dong-y` giữ `noindex` và `Referrer-Policy: no-referrer` trong `next.config.mjs`.
- Không mở rộng những gì được công khai (thêm trường, thêm thống kê, bỏ công tắc chia sẻ) khi chưa được duyệt.

Xóa tài khoản và log:

- `delete_my_account()` hủy suất và ca tương lai rồi xóa `auth.users`, các bảng xóa theo (cascade). Tài khoản admin không tự xóa được. Test 11a, 11b.
- Không ghi SĐT, email, token link hay ngày sinh vào log, thông báo lỗi, URL, hoặc tham số truy vấn. `friendlyError()` chỉ log mã và thông điệp lỗi của RPC.

---

## 14. Bí mật và repo công khai

Repo `tangkhatnk/covershift` là **PUBLIC**. Mọi thứ đã commit, kể cả trong lịch sử, coi như đã lộ.

- Mọi biến `NEXT_PUBLIC_*` là cấu hình công khai, được nhúng vào mã gửi về trình duyệt. Không đặt bí mật vào đó.
- Web chỉ dùng publishable key (`sb_publishable_...`) hoặc anon key kiểu cũ, đặt trong `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Không đổi tên biến.
- Không có service-role key, secret key (`sb_secret_...`) hay key tương đương trong Next.js, Vercel, `.env.example` hay bất kỳ mã `src/` nào. Web hiện không có biến môi trường bí mật nào.
- Không commit:
  - `.env`, `.env.local` và mọi `.env.*` (chỉ `.env.example` được commit, chứa giá trị giữ chỗ);
  - API key, token, client secret của Google OAuth, mật khẩu SMTP, `CRON_SECRET`, `RESEND_API_KEY`;
  - `.mcp.json`, `.claude/settings.local.json` (đã nằm trong `.gitignore`; không gỡ khỏi `.gitignore`).
- Không dán key hay token vào issue, PR, commit message, ảnh chụp màn hình hay log. Lỡ commit thì báo chủ dự án để xoay (rotate) key, đừng chỉ xóa trong commit sau.
- Không đưa email, SĐT, họ tên thật của người dùng, quán hay phụ huynh vào test, fixture, seed, ảnh chụp, issue, PR, log hay tài liệu. Dùng dữ liệu giả:
  - email đuôi `@demo.safeshift.test`, ví dụ `nguoilam1@demo.safeshift.test`;
  - SĐT giả như dạng `0900000101` trong `seed.sql`;
  - tên như "Quán Demo 1".
- Trong tài liệu và ví dụ, dùng chỗ giữ chỗ cho project Supabase và domain Vercel (`https://xxxxxxxx.supabase.co`, `<ten-du-an>.vercel.app`), như `.env.example` và `README.md` đang làm.
- Không bịa tên pháp nhân, địa chỉ, email hay số điện thoại liên hệ trong mã, trang pháp lý hay tài liệu.
- Link có token (`/xac-nhan/[token]`, `/dong-y/[token]`) là bí mật dùng một lần: không ghi vào log, không gửi tới dịch vụ ngoài. Middleware bỏ qua hai đường dẫn này; không thêm logic phụ thuộc phiên cho chúng.
- `NEXT_PUBLIC_SITE_URL` dùng để dựng link gửi phụ huynh và chủ quán, không phải bí mật nhưng sai là link hỏng. Đổi giá trị thì kiểm lại các link đó.

---

## 15. Xác thực và vai trò

- Chỉ hai cách đăng nhập: Google OAuth (`signInWithOAuth`) và magic link qua email (`signInWithOtp`), cả hai trong `src/app/dang-nhap/login-form.tsx`.
- Không thêm SMS, OTP điện thoại, mật khẩu, hay nhà cung cấp đăng nhập khác. Tài khoản demo không có mật khẩu. Test 10m.
- Trong Supabase giữ **Confirm email BẬT**. Nếu tắt, ai có anon key (công khai) cũng tạo được tài khoản email và mật khẩu qua API.
- `/auth/callback` chỉ chuyển về `<origin>/` hoặc `/dang-nhap?loi=1`, hỗ trợ `?code=` (PKCE) và `?token_hash=&type=`. Không thêm tham số `next` hay redirect tùy ý (tránh open redirect).
- Không nới Redirect URLs, Site URL hay danh sách origin của Google/Supabase, và không đổi CORS, header bảo mật, hay phạm vi quyền công khai như việc phụ trong một task khác. Đây là thay đổi bảo mật, cần task riêng và chủ dự án duyệt.
- Có đúng ba vai trò: `worker`, `employer`, `admin`.
  - `register_worker()` và `register_employer()` chỉ tạo `worker`/`employer`. Client không ghi được `profiles.role`. Test 10a.
  - Admin chỉ tạo bằng `make_admin(email, tên)`, chạy trong SQL Editor bởi chủ dự án, với email đã đăng nhập ít nhất một lần. Không thêm RPC, trang, seed hay script nào cấp quyền admin cho client. Test 10d.
  - Tài khoản admin không tự xóa hay tự khóa được trong app.
- Phân quyền thật nằm ở RLS và RPC. `requireRole()` trong `src/lib/auth.ts` và `middleware.ts` chỉ để điều hướng và làm mới cookie phiên. Không coi chúng là lớp bảo vệ, và không bỏ kiểm tra ở database vì "trang đã chặn rồi".
- Tài khoản bị khóa (`status = 'locked'`) bị `_require_user()` từ chối ở mọi RPC. Giữ nguyên hành vi này.

---

## 16. Tích hợp ngoài

- Chỉ dùng gói miễn phí của Supabase và Vercel. Không thêm dịch vụ trả phí hay dịch vụ đòi thẻ thanh toán.
- Không thêm dịch vụ bên thứ ba mới (analytics, theo dõi lỗi, chat, CDN font/script, dịch vụ AI) khi chưa được duyệt. Hiện mã web không gọi dịch vụ ngoài nào ngoài Supabase.
- Không gửi dữ liệu cá nhân (họ tên, SĐT, email, ngày sinh, trường, token link) ra dịch vụ ngoài khi luồng sản phẩm chưa cho phép và `/chinh-sach-du-lieu` chưa nêu. Không dán dữ liệu thật vào công cụ AI hay công cụ bên ngoài khi làm việc.
- Edge Function `supabase/functions/shift-reminders/index.ts` (nhắc ca qua email) là phần phụ, **mặc định tắt**: chưa deploy, chưa chạy thử.
  - Không bật, deploy, hay tạo lịch `pg_cron` khi chủ dự án chưa yêu cầu.
  - Hàm cần `SUPABASE_SERVICE_ROLE_KEY`; key này chỉ tồn tại trong môi trường Edge Function của Supabase (đặt bằng `supabase secrets set`), không bao giờ ở Next.js, Vercel hay repo.
  - Trước khi bật cần một migration mới cấp quyền đọc cho `service_role` (xem `README.md`, mục "Nhắc ca qua email"), theo đúng quy tắc mục 12.
  - Hàm gửi email người làm và thông tin quán tới Resend. Không thêm SĐT hay dữ liệu khác vào nội dung email.
  - Lỗi trong hàm này không được làm hỏng luồng chính: link xác nhận vẫn sinh khi chủ quán hoặc admin mở trang.
- Zalo không có API trong dự án này. Admin bấm "Sao chép tin nhắn" ở `/admin` rồi tự dán vào Zalo. Không thêm Zalo OA/ZNS, SMS, webhook tin nhắn hay gửi tự động. Tin nhắn sao chép có thể chứa SĐT hoặc link token, nên chỉ hiện ở trang admin.
- SMTP cho magic link do chủ dự án cấu hình trên Supabase. Không commit thông tin SMTP; không đổi cách đăng nhập chỉ vì giới hạn email (cách thay thế là đăng nhập Google).

---

## 17. Chính sách phụ thuộc

- Ưu tiên cái đã có (Next.js, React, `@supabase/ssr`, `@supabase/supabase-js`, Tailwind) và API của nền tảng. Không thêm thư viện chỉ để tránh viết vài dòng rõ ràng.
- Phiên bản đang được ghim có chủ đích để ổn định (Next `15.5.29`, Tailwind `3.4.19`, TypeScript `5.9.3`, `@supabase/ssr` `0.12.7`, `@supabase/supabase-js` `2.119.0`, Node `24.x`). Không nâng cấp, nhất là nâng major, kèm một việc khác. Nâng cấp là task riêng, phải chạy `npx tsc --noEmit` và `next build`.
- Thay đổi dependency phải kèm lockfile tương ứng (`package-lock.json` ở gốc, hoặc `db-test/package-lock.json`). Không để lockfile đổi vặt: nếu `npm run test:db` làm đổi `db-test/package-lock.json` mà task không đụng dependency thì không commit phần đó.
- Không thêm Supabase admin SDK, service-role client hay thư viện gửi dữ liệu ra ngoài vào mã web.
- `db-test/` có cây phụ thuộc riêng (`embedded-postgres`, `pg`, `package.json` và lockfile riêng). Không gộp vào `package.json` gốc, không import từ `src/`, và không để mã web phụ thuộc vào nó.
- Không gỡ một dependency khi chưa kiểm cách dùng trong `src/`, `db-test/`, cấu hình build và `supabase/functions/`.

---

## 18. Kiến trúc frontend

Next.js 15 App Router, React 19, Tailwind 3.4. Mã giao diện ở `src/app/` (trang) và `src/components/` (thành phần dùng chung).

Đọc bằng Server Component, ghi bằng Server Action:

- Trang là Server Component (`async`). Trang đọc dữ liệu bằng `createClient()` từ `@/lib/supabase/server` (`supabase.rpc(...)` hoặc `.from().select()`), hoặc lấy `supabase` từ `requireRole()` / `getContext()`.
- Mọi thao tác ghi đi qua server action trong `src/app/actions.ts`. Một action gom dữ liệu form rồi gọi đúng một RPC; chữ ký chung `(prev: ActionState, formData: FormData) => Promise<ActionState>`, dùng với `<ActionForm action={...}>`.
- Trong action, dùng helper `call()` có sẵn; lỗi trả qua `friendlyError()` (`src/lib/errors.ts`, import là `friendly`). Không gọi `.insert()` / `.update()` / `.delete()` / `.upsert()` từ web (hiện không có chỗ nào làm vậy).
- Không thêm Route Handler hay `fetch` từ client để ghi dữ liệu. Route Handler hiện chỉ dùng cho `/auth/callback`, `/auth/dang-xuat` và `/admin/kpi/export`.

Quyền và điều hướng:

- `requireRole(...roles)` trong `src/lib/auth.ts` chỉ để điều hướng cho gọn (chưa đăng nhập, chưa đăng ký, bị khóa, sai vai trò). Quyền thật do RLS và RPC ở database quyết định. Không coi việc ẩn nút hay chặn trang là biện pháp bảo mật.
- Không đặt quy tắc nghiệp vụ (ai được nhận ca, giới hạn giờ cho người dưới 18, hạn xác nhận 72 giờ, mức lương tối thiểu) trong component hay action. Component chỉ hiển thị trạng thái và báo trước cho người dùng; database mới là nơi chặn. Khi hiển thị lại một giới hạn đã có ở database (ví dụ `DEFAULT_MIN_WAGE` ở `src/app/quan/dang-ca/page.tsx`), coi đó là gợi ý, không phải căn cứ chặn.

Quy ước Next 15 của repo:

- `params` và `searchParams` là `Promise`: khai kiểu `Promise<...>` và `await` (xem `src/app/xac-nhan/[token]/page.tsx`, `src/app/ca/page.tsx`).
- `'use client'` chỉ khi cần trạng thái, hiệu ứng hoặc API trình duyệt. Hiện chỉ có ba file: `src/components/client.tsx`, `src/app/xac-nhan/[token]/confirm-form.tsx`, `src/app/dang-nhap/login-form.tsx`. Client Component nhỏ, đặt ở lá cây; trang bao ngoài vẫn là Server Component. Client dùng `createClient()` từ `@/lib/supabase/client` chỉ cho đăng nhập (Supabase Auth), không để đọc hay ghi dữ liệu nghiệp vụ.
- Trang chứa token hoặc dữ liệu riêng (`/xac-nhan`, `/dong-y`, `/h`, `/admin`) đặt `robots: { index: false, follow: false }`. Trang mới cùng loại làm tương tự.
- Server chạy UTC. Mọi giờ và ngày hiển thị qua `src/lib/format.ts` (`fmtDate`, `fmtTime`, `fmtRange`, `fmtDateTime`, `fmtPlainDate`, `vnDateInput`, `fmtMoney`, `hoursBetween`, `shiftState`). Không gọi `toLocaleString`, `Date#getHours` hay tự ghép giờ trong component. Giá trị điền vào `<input type="time">` cũng lấy từ đó (có chủ đích dùng `hourCycle: 'h23'`).
- Không chạy `next dev` và `next build` cùng lúc (chung thư mục `.next`).

Dùng lại trước khi tạo mới:

- `src/components/ui.tsx` (Server Component dùng được): `btn(variant, full)`, `inputCls`, `PageTitle`, `Card`, `Badge`, `Alert`, `Field`, `Check`, `Empty`, `Tel`, `Stars`, `ShiftCard`, kiểu `BtnVariant` và `Tone`.
- `src/components/client.tsx`: `ActionForm`, `SubmitButton`, `Flash`, `CopyButton`, `PrintButton`.
- Nhãn hiển thị nằm ở `src/lib/constants.ts` (`JOB_LABEL`, `AREA_LABEL`, ...) và `src/lib/format.ts` (`SHIFT_STATE_LABEL`, `SHIFT_STATE_TONE`). Thêm giá trị enum mới thì thêm nhãn ở đó, không viết chuỗi rời trong trang.
- Chỉ tạo thành phần mới khi mẫu đó đã lặp thật sự (từ hai chỗ trở lên) hoặc thành phần chung không đáp ứng được. Không thêm prop, biến thể hay lớp bọc "để dành" cho nhu cầu chưa có. Thành phần chỉ dùng một trang thì để ngay trong trang đó.
- `ActionForm` đã lo việc điền lại ô sau khi gửi lỗi (React 19 tự xóa form), cuộn tới thông báo và gắn `role="alert"` / `role="status"`. Không tự viết lại logic này trong form mới.

---

## 19. Thiết kế cho người dùng thật

Bề mặt chính là điện thoại 360 đến 414px, thường mở từ Zalo hoặc Facebook. Chủ quán là nhóm có nhiều người lớn tuổi. Thiết kế cho họ trước, desktop chỉ cần không vỡ.

- Khung trang là một cột `max-w-xl` căn giữa (`src/app/layout.tsx`), kể cả trên desktop và trang admin. Không dựng bố cục nhiều cột, bảng rộng hay sidebar nếu không được giao rõ.
- Chữ gốc là 18px (`html { font-size: 18px }` trong `src/app/globals.css`), nên mọi đơn vị `rem` của Tailwind lớn hơn mặc định 12,5%: `text-base` = 18px, `text-lg` ≈ 20px, `text-sm` ≈ 16px. Không hạ cỡ chữ gốc. Hiện không có `text-xs` hay `text-[...]` ở đâu; đừng thêm. Nội dung người dùng cần đọc không dưới `text-base`; `text-sm` chỉ cho gợi ý phụ, nhãn Badge và chân trang.
- Dùng `rem` hoặc lớp Tailwind, không dùng px cứng cho cỡ chữ và kích thước chạm.
- Nút và ô nhập cao tối thiểu `3rem` (= 54px ở cỡ gốc, vượt mức 48px); lấy từ `btn()` và `inputCls`, không tự viết lại. Việc quan trọng nhất của trang có thể to hơn (ví dụ `!min-h-[3.75rem] !text-xl` ở nút "Xác nhận ngay" trong `src/app/quan/ca/[id]/page.tsx`). Ô tick dùng `Check` (ô 1.5rem, cả hàng bấm được). Khoảng cách giữa hai vùng chạm đủ để không bấm nhầm.
- Mỗi việc không quá 3 bước, chỉ một hành động chính nổi bật mỗi màn hình. Nút chính dùng `btn('primary')`; hành động hủy hoặc xóa dùng `danger` và có bước xác nhận (xem mục 22).
- Không có cuộn ngang. `nav` trong header là ngoại lệ có chủ đích (`overflow-x-auto`). Chuỗi dài (tên người, tên quán, địa chỉ) phải xuống dòng được; không cắt (`truncate`) thông tin người dùng cần đọc.
- Mọi màn hình có dữ liệu động phải có đủ trạng thái: rỗng (`Empty`), lỗi (`Alert tone="red"`, nói rõ làm gì tiếp), đang gửi (`SubmitButton` tự đổi nhãn "Đang gửi…" và khóa), thành công (thông báo của `ActionForm` hoặc `Flash`), bị khóa hoặc chưa đủ điều kiện (nói lý do và bước kế tiếp).
- Tránh "card soup". `Card` dùng cho một nhóm nội dung có ranh giới thật; không bọc từng dòng, không lồng thẻ trong thẻ.
- Giữ một hệ thống hình ảnh: màu thương hiệu là `brand` trong `tailwind.config.ts` (50, 100, 600, 700, 800; chính là xanh lục `#047857`), nền `slate`, trạng thái qua `Tone` (green, amber, red, gray, blue). Không đưa vào bảng màu, font, bo góc hay đổ bóng thứ hai. Cần sắc độ `brand` mới thì thêm vào `tailwind.config.ts`, đừng viết mã hex trong trang (ngoại lệ hiện có: `#047857` ở `globals.css` và `themeColor`).
- App chỉ có giao diện sáng: không có `dark:` hay `prefers-color-scheme` nào. Không thêm chế độ tối nếu không được giao.
- Không dùng trang trí không có chức năng (gradient, ảnh minh họa lớn, hiệu ứng). Ảnh hưởng đến tải trang trên 4G yếu.

---

## 20. Icon

Hiện trạng đã kiểm: repo không có thư viện icon nào trong `package.json`, không có file SVG, không có `<svg>` và không có `next/image`. Giao diện dựa vào chữ, màu và `Badge`.

- Không dùng ký tự Unicode hay emoji làm icon thay thế, và không thêm ký tự mới kiểu đó. Các ký tự hiện có (`★` trong `Stars` và nút chấm sao, `✓` trong `Choice` và `CopyButton`, `←` ở link quay lại) là tồn đọng, không phải khuôn mẫu để lặp lại.
- Trạng thái quan trọng phải có chữ (ví dụ "Đã sao chép", "Đã làm"), không chỉ dựa vào icon hay màu.
- Chưa cần icon thì đừng thêm. Khi một tác vụ thật sự cần (ví dụ biểu tượng gọi điện, sao chép), chọn một thư viện được duy trì tốt (như Lucide hoặc Phosphor), import từng icon, không tải từ CDN, kiểm tra giấy phép và dung lượng bundle. Một giao diện chỉ dùng một bộ icon. Thêm thư viện là thay đổi dependency, cần nêu trong PR (mục 21).
- Icon trang trí phải ẩn khỏi trình đọc màn hình (`aria-hidden="true"`). Nút chỉ có icon phải có tên truy cập được (`aria-label` hoặc chữ ẩn bằng `sr-only`). Nút to tối thiểu `3rem` vẫn áp dụng cho nút chỉ có icon.
- `Stars` (`src/components/ui.tsx`) vẽ sao bằng ký tự `★` lặp lại, tô màu `amber-500` cho sao đầy và `slate-300` cho sao rỗng. Nó đặt `aria-label` trên một `<span>` không có `role`; trình đọc màn hình không đảm bảo đọc nhãn đó. Nút chấm sao trong `confirm-form.tsx` thì khác: là `<button>` có `aria-label="{n} sao"`, nên ký tự bên trong không bị đọc thừa. Sửa `Stars` chỉ khi được giao việc (khi sửa: `role="img"` kèm `aria-label`, hoặc chữ `sr-only` và ẩn phần ký tự).
- Custom SVG chỉ dành cho logo hay hình minh họa riêng của SafeShift, không dùng để tự vẽ lại bộ icon.

---

## 21. Thư viện frontend

Dependency hiện tại rất nhỏ: `next`, `react`, `react-dom`, `@supabase/ssr`, `@supabase/supabase-js`; Tailwind 3.4.19, PostCSS, Autoprefixer. Bằng đó là đủ cho một giao diện đơn giản.

- Không thêm UI framework hay hệ thiết kế lớn (MUI, Ant Design, Chakra, Bootstrap, shadcn cho cả repo) để làm đẹp một màn hình. Đề xuất riêng và nêu đánh đổi trước khi coi là được phép.
- Không nâng Tailwind 3 lên 4 như việc phụ. Đổi cách cấu hình (`tailwind.config.ts`, `@tailwind` trong `globals.css`) là việc riêng, cần issue và kiểm lại toàn bộ giao diện.
- Không thêm thư viện để tránh viết vài dòng rõ ràng. Với ngày giờ, tiền, số điện thoại: dùng `Intl` và `src/lib/format.ts`, không thêm `date-fns`, `dayjs`, `moment`.
- Mỗi dependency mới phải trả lời được: giải quyết vấn đề thật nào, dung lượng gửi xuống trình duyệt (chủ quán dùng điện thoại và mạng di động), tree shaking, còn duy trì không, giấy phép, có trùng với thứ đã có không. Có kèm lockfile (`package-lock.json`).
- Không thêm font từ CDN hay web font nặng. Hiện app dùng font hệ thống của Tailwind và hỗ trợ tiếng Việt có dấu; đổi font là quyết định thiết kế, không phải việc phụ.
- Không đưa khóa bí mật vào biến `NEXT_PUBLIC_*`. Web chỉ dùng anon key.

---

## 22. Tương tác và khả năng truy cập

- HTML ngữ nghĩa trước, ARIA bổ sung sau. Dùng `button` cho hành động, `a` / `Link` cho điều hướng, `label` gắn với ô nhập (`Field`, `Check`), `fieldset` + `legend` cho nhóm lựa chọn. Không dùng `div` hay `span` có `onClick`; hiện không có chỗ nào như vậy.
- Giữ viền focus. `globals.css` có `:focus-visible { outline: 3px solid #047857; outline-offset: 2px }`. Không xóa nó. Lưu ý `inputCls` có `focus:outline-none` và chỉ đổi màu viền sang `brand-600`; selector của lớp tiện ích có độ ưu tiên cao hơn `:focus-visible` toàn cục, nên ô nhập nhiều khả năng không hiện outline 3px. Đừng nhân rộng mẫu này sang thành phần khác; muốn đổi thì làm trong một việc riêng và xem trên trình duyệt. `Choice` ở `confirm-form.tsx` dùng `focus-within:ring-4`, là cách làm đúng cho radio ẩn bằng `sr-only`.
- Không có thao tác chỉ-hover. `hover:` chỉ là phụ (màu nền); mọi việc phải làm được bằng chạm và bàn phím.
- Trạng thái đủ bộ: bình thường, hover, active, focus, disabled. `btn()` đã có `disabled:cursor-not-allowed disabled:opacity-50`. Nút gửi form dùng `SubmitButton`: nó đọc `useFormStatus()`, tự khóa và đổi nhãn khi đang gửi để chống bấm hai lần. Không tự viết nút gửi khác trong form dùng `ActionForm`. Nút bấm ngoài form (ví dụ `login-form.tsx`) phải tự khóa khi `busy`.
- Thông báo: lỗi dùng `role="alert"`, thành công dùng `role="status"` (`ActionForm` làm sẵn). `Alert` luôn gắn `role="status"` cho mọi tông, kể cả tông đỏ; lỗi chặn người dùng nên được đọc ngay, hãy cân nhắc khi dùng `Alert tone="red"`.
- Câu hỏi xác nhận trước việc không hoàn tác: `SubmitButton confirm="..."` dùng `window.confirm`. Dùng được ở trang cần đăng nhập (`/ca/[id]`, `/tai-khoan`, `/admin/*`, `/ho-so`). Không dùng `confirm` ở trang chủ quán hoặc phụ huynh mở thẳng từ Zalo hoặc Facebook (`/xac-nhan`, `/dong-y`): trình duyệt nhúng có thể bỏ qua hộp thoại và trả về "không" ngay, nút sẽ như bị liệt. Ở đó dùng câu nhắc cố định ngay trên nút, như `confirm-form.tsx` đang làm ("Kiểm tra lại các lựa chọn. Sau khi gửi sẽ không sửa lại được."). Lý do này được ghi bằng comment ở `client.tsx` và `confirm-form.tsx`; giữ các comment đó.
- Cũng vì trình duyệt nhúng: trang token không phụ thuộc vào `alert`, `prompt`, cửa sổ mới hay đăng nhập Google. `login-form.tsx` đã nhận diện trình duyệt nhúng và hướng dẫn mở bằng Chrome/Safari; giữ hành vi này.
- Nhóm lựa chọn dùng input radio/checkbox thật khi có thể. Bộ chấm sao trong `confirm-form.tsx` dùng `role="radiogroup"` với các `button role="radio"` và chưa có điều khiển bằng phím mũi tên. Nếu viết lại kiểu này, hoặc dùng input radio thật, hoặc bổ sung đủ hành vi bàn phím của radiogroup.
- Chuyển động: hiện chỉ có `transition` màu. Nếu thêm animation, bọc bằng `motion-reduce:` hoặc `@media (prefers-reduced-motion: reduce)`, và chỉ dùng cho phản hồi trạng thái. Không dùng animation che việc thiếu trạng thái đang tải hay lỗi. Cuộn mượt (`scrollIntoView({ behavior: 'smooth' })` ở `ActionForm`, `Flash`) hiện chưa tôn trọng `prefers-reduced-motion`; thêm cuộn kiểu này thì kiểm điều kiện đó.
- Tương phản: chữ trên nền sáng dùng `slate-600` trở lên đậm; không hạ xuống `slate-400` cho nội dung (chỉ `placeholder` dùng `slate-400`). Không chỉ dùng màu để phân biệt trạng thái: luôn kèm chữ như `Badge` đang làm.

---

## 23. Kiểm tra trực quan

`tsc` và `next build` sạch không có nghĩa giao diện đúng. Thay đổi giao diện phải được xem thật trước khi báo xong.

- Kiểm ở 360px, 390px và 414px (điện thoại), cộng một lần ở desktop khoảng 1280px. Tablet không phải ưu tiên; nên xem 768px nếu thay đổi bố cục.
- Ở mỗi bề rộng, kiểm: không cuộn ngang, nút và ô nhập đủ to, chữ đọc được không cần phóng, không bị che bởi header dính (`sticky top-0`).
- Kiểm các trạng thái liên quan đến thay đổi: rỗng, có dữ liệu, đang gửi (nút khóa), lỗi từ server, thành công, disabled, hết hạn/không hợp lệ (trang token), chưa duyệt hoặc bị khóa.
- Dùng chuỗi tiếng Việt dài và có dấu: tên người dài, tên quán dài, địa chỉ dài, mô tả ca nhiều dòng, thông báo lỗi dài từ database. Kiểm xuống dòng, không tràn khung, không cắt mất thông tin.
- Trang `/h/[slug]` có bản in (`@media print` trong `globals.css`; lớp `print:`). Khi sửa trang này hoặc `globals.css`, mở xem trước bản in (Cmd/Ctrl+P): header, footer, nút bị ẩn; nội dung không bị cắt giữa một nhận xét; nền trắng. Thay đổi `main` hay `max-w-xl` có thể ảnh hưởng bản in.
- Trang chủ quán và phụ huynh mở từ Zalo: nếu có thể, thử trong trình duyệt nhúng thật, hoặc ít nhất xem ở bề rộng điện thoại và ghi rõ chưa thử trong Zalo.
- Chạy `npm run dev` cần `.env.local` trỏ tới Supabase thật. Trang cần đăng nhập Google thì dừng lại để chủ dự án tự đăng nhập; không nhập mật khẩu hộ.
- Không tuyên bố "đã kiểm trực quan" nếu chưa mở trang thật. Nếu không kiểm được (không có trình duyệt, không có Supabase), ghi rõ trong PR: chưa xem ở bề rộng nào, trạng thái nào. Dữ liệu dùng để chụp ảnh phải là dữ liệu mẫu, không dùng tên hay số điện thoại thật.

---

## 24. Văn phong sản phẩm tiếng Việt

Chữ trong giao diện phải tự nhiên, trực tiếp, đúng việc.

Xưng hô (đúng với mã hiện tại):

- Chủ quán và phụ huynh: "anh/chị" ("Anh/chị chọn cho từng người rồi bấm Gửi xác nhận", "Cảm ơn anh/chị"). Phụ huynh gọi người làm là "con".
- Người làm (học sinh, sinh viên): "bạn". Chủ quán nói về người làm là "bạn này" hay gọi tên.
- Trang dùng chung cho mọi vai trò (`/dang-nhap`, `/tai-khoan`, `/dieu-khoan`, `/chinh-sach-du-lieu`) hiện dùng "bạn". Trang chỉ một vai trò thì giữ đúng xưng hô của vai trò đó, không trộn trong cùng một trang.
- Tin nhắn mẫu dán vào Zalo (`reminderText`, `ownerText` trong `src/app/admin/page.tsx`) bắt đầu bằng `[SafeShift]`, giữ dạng văn bản thuần.

Thuật ngữ thống nhất, dùng đúng một cách gọi cho một khái niệm:

- "ca" (ca làm); "người làm" (học sinh, sinh viên); "chủ quán"; "nhóm vận hành" (không gọi "admin" hay "quản trị viên" trên giao diện người dùng); "người chính" và "người dự phòng"; "hồ sơ ca làm" cho hồ sơ công khai; "phụ huynh". Dùng "link" như đang dùng.
- Dùng "quán" khi nói với chủ quán hoặc người làm; "cơ sở" ở trang vận hành (`/admin/co-so`) và ở thông báo về xác minh hoặc gỡ.
- Không đổi tên một khái niệm giữa các trang (không "nhân viên", "ứng viên", "dự bị"; tránh "suất" lẫn với "ca" ở chỗ mới, dù nút "Hủy suất của tôi" đã có sẵn). Muốn đổi thuật ngữ thì đổi đồng loạt, kể cả chuỗi `raise exception` và test (xem dưới).
- Nhãn hiển thị lấy từ `src/lib/constants.ts` và `src/lib/format.ts`; không tự viết lại tên trạng thái.

Thông báo lỗi và hướng dẫn:

- Nói điều gì sai và người dùng làm gì tiếp, không đổ lỗi. Mẫu: "Chưa tải được trang. Anh/chị vui lòng thử lại sau ít phút." Lỗi do hệ thống thì nói là do hệ thống.
- Lỗi nghiệp vụ lấy nguyên văn từ database: `raise exception` tiếng Việt trong migration, hiện ra qua `friendlyError()` (mã `P0001`, hoặc `42501` không phải "permission denied"). Không viết lại hay dịch lại ở tầng giao diện. Lỗi kỹ thuật được thay bằng câu chung và ghi log phía server; không để lộ mã lỗi, tên bảng, câu SQL cho người dùng. Sửa câu chữ một lỗi nghiệp vụ là sửa ở migration mới và cả `supabase/tests/edge_cases.sql` (test khớp theo chuỗi).
- Nhãn nút là động từ rõ việc ("Đăng ca", "Gửi xác nhận", "Hủy suất của tôi"), không theo kiểu "OK" hay "Tiếp tục" mơ hồ. Việc không hoàn tác phải nói rõ hậu quả ngay trên nút hoặc ngay trên câu xác nhận.
- Thông báo ngắn, câu đầy đủ, có dấu chấm cuối. Không chấm than thừa, không emoji, không câu cổ vũ sáo rỗng ("Tuyệt vời!", "Chúc mừng bạn!"). Một lời cảm ơn ngắn sau khi chủ quán hoặc phụ huynh làm xong việc là đủ. Không dùng chữ in hoa cả câu để nhấn mạnh; Badge cảnh báo ngắn như "GẤP" là ngoại lệ có sẵn.
- Không hứa điều hệ thống chưa bảo đảm. SafeShift chỉ kết nối; không khẳng định đã xác minh, an toàn tuyệt đối hay đảm bảo thu nhập.

Chuỗi pháp lý và cam kết:

- Giữ nguyên văn `DISCLAIMER` và `NO_FEE` trong `src/lib/constants.ts`; hiện hiển thị ở chân trang (`layout.tsx`) và `NO_FEE` ở trang chủ. Không viết lại, rút gọn hay dịch lại ở chỗ khác; import hằng số để dùng.
- Không bịa tên pháp nhân, địa chỉ, email, số điện thoại liên hệ. Chưa có kênh liên hệ thì nói "liên hệ nhóm vận hành qua kênh đã được thông báo khi đăng ký" như đang làm.
- Không thu CCCD, ảnh chân dung, địa chỉ nhà; không nhắc đến SMS, thanh toán hay gói trả phí trong giao diện.
- Số điện thoại chỉ hiện ở nơi RPC trả về; không tự ghép, không đưa vào URL hay tin nhắn mẫu ngoài các chỗ đã có.

---

## 25. Ma trận kiểm tra

Chạy kiểm tra đúng với phần đã đổi. Ghi trong PR đúng những gì đã chạy.

### Thay đổi trong `supabase/`

```bash
npm run test:db
```

Kỳ vọng (theo `CLAUDE.md`, hiện tại):

```text
86/86 test đạt
privileges_check: ... 0 dòng SAI/KIỂM
tái chạy ... ĐẠT
5 dòng ✔ chạy đua
dọn dữ liệu demo ... ĐẠT
```

Thêm test thì số `86` tăng theo; cập nhật con số trong `CLAUDE.md` và `TESTING.md` cùng PR.

### Thay đổi trong `src/` hoặc `middleware.ts`

```bash
npx tsc --noEmit
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npx next build
```

- Không chạy `next dev` và `next build` cùng lúc (chung `.next`).
- `tsc` và `build` sạch không có nghĩa là chạy đúng.

### Thay đổi schema đã áp lên Supabase thật

- viết migration mới (`0002_...sql`), không sửa file đã áp;
- kèm test trong `supabase/tests/edge_cases.sql`;
- chạy `npm run test:db`;
- chủ dự án dán migration bằng SQL Editor, rồi chạy `supabase/tests/privileges_check.sql`: không dòng nào cột `ket_luan` bắt đầu bằng `SAI` hoặc `KIỂM`. Postgres nhúng chạy bằng superuser nên không bắt được lỗi quyền riêng của Supabase; bước này không thay thế được.

### Giao diện

- xem thật trên trình duyệt ở 360px, 390px, 414px (theo `TESTING.md` mục B: không thanh cuộn ngang, nút cao tối thiểu 48px, chữ tối thiểu 18px);
- nếu chưa xem, ghi rõ "chưa kiểm trên trình duyệt" trong PR; không tuyên bố đã kiểm;
- trang cần phiên đăng nhập chỉ kiểm được với Supabase thật (`npm run dev` có `.env.local`, hoặc bản deploy).

### Hiện trạng CI (đã kiểm)

- `main` không có `.github/`, không có workflow nào.
- Chỉ có hai workflow trên nhánh `origin/add-claude-github-actions-*` (chưa merge): `claude.yml` (trả lời khi được gắn `@claude`) và `claude-code-review.yml` (review PR). Cả hai đều không chạy `npm run test:db`, `tsc` hay `next build`.
- Vì vậy chưa có kiểm tra bắt buộc tự động: người làm phải tự chạy và báo kết quả trong PR. Không viết "CI xanh" khi không có CI chạy test.
- Không thêm, đổi hay xóa workflow nếu task không yêu cầu.

---

## 26. Sửa lỗi và chất lượng test

- Xác nhận lỗi trước khi sửa; sửa nguyên nhân gốc, không che triệu chứng.
- Thêm hoặc cập nhật test hồi quy khi khả thi: test phải fail với code lỗi và đạt sau khi sửa.
- Không sửa test đúng để code sai qua; không nới assertion cho xanh.
- Không sửa lỗi suy đoán không có bằng chứng. Không tái hiện được thì nói rõ và ghi đã kiểm gì.
- Test SQL: hành động và kiểm tra là hai câu lệnh riêng với `pg_temp.t_do`, vì một câu không thấy dữ liệu hàm volatile vừa ghi.
- Thông báo lỗi nghiệp vụ là tiếng Việt trong `raise exception`; `edge_cases.sql` khớp theo chuỗi đó, nên sửa câu chữ thì sửa cả test trong cùng PR.
- Test kiểm quy tắc chặn ở database, không chỉ kiểm giao diện. Không bỏ qua RLS hay quyền để test dễ qua.
- Dữ liệu test là dữ liệu giả; không dùng thông tin người thật.
- Không dùng `sleep` cố định để che race; test chạy đua đã có trong `db-test/race.mjs`.

---

## 27. Viết PR, issue và commit như người bảo trì

Văn bản công khai đọc như do người bảo trì viết, không như bản ghi của agent. Áp dụng cho commit, PR, issue, bình luận, tài liệu. Được viết bằng tiếng Việt.

- Nêu hành vi cụ thể đã đổi, không nêu mức độ ấn tượng.
- Không kể quy trình của agent: "đầu tiên tôi đã đọc...", "tôi nhận thấy...", "sau nhiều lần thử...", nhật ký công cụ, hướng đã bỏ.
- Tránh cụm sáo rỗng khi không thêm nghĩa: "giải pháp toàn diện", "tăng cường tính ổn định", "trải nghiệm liền mạch", "đã triển khai thành công", "hoàn thành mọi yêu cầu", "comprehensive", "robust", "seamless".
- Không nói "tất cả test đều đạt" khi không chạy hết các test liên quan.
- Không dán dữ liệu cá nhân thật (số điện thoại, email, tên phụ huynh) vào PR, issue, ảnh chụp, log.

Ví dụ:

```text
Tốt:  fix: chặn chủ quán xem SĐT khi ca chưa ghép
Kém:  fix: cải thiện toàn diện tính bảo mật của hệ thống
```

Cấu trúc PR mặc định (bỏ mục trống):

```text
## What
Diff cuối cùng đổi gì.

## Why
Vấn đề hoặc yêu cầu thật.

## Linked issue
Closes #

## Validation
Chỉ các lệnh thật sự đã chạy và kết quả; ghi rõ phần chưa kiểm.

## Risk / notes
Migration cần dán tay, việc cần chủ dự án làm, giao diện chưa xem, v.v.
```

- `What` mô tả diff cuối, không kể trình tự làm.
- `Validation` liệt kê đúng ma trận ở mục 25; giao diện thì kèm ảnh chụp hoặc ghi "chưa kiểm trên trình duyệt".
- PR có migration: nêu rõ tên file và nhắc cần chạy `privileges_check.sql` sau khi áp.
- Issue lỗi gồm: tóm tắt, khu vực ảnh hưởng, hành vi hiện tại, hành vi mong đợi, cách tái hiện, tiêu chí chấp nhận. Issue cải tiến gồm: nhu cầu, hành vi mong muốn, tiêu chí chấp nhận, không nằm trong phạm vi.

---

## 28. Lịch sử nhánh task

Được dọn lịch sử của nhánh task chưa merge để commit phản ánh các thay đổi logic, không phản ánh từng lần thử.

- Dùng squash hoặc fixup cho commit vá lặt vặt (`fix lint`, `oops`, `thử lại`).
- Nhánh đã push mà phải viết lại thì dùng:

```bash
git push --force-with-lease
```

  không dùng `--force` trần.
- Chỉ viết lại: commit cục bộ của task, nhánh task chưa merge của chính mình.
- Không viết lại: `main`, tag, nhánh đang làm của người khác.
- Không tự ý dọn lịch sử toàn repo (squash, rebase, filter-repo trên `main`); chỉ làm khi chủ repo cho phép rõ ràng và nêu phạm vi.
- Giữ nguyên tác giả thật; không thêm ghi nhận AI giả (xem mục 8).

---

## 29. Tự rà diff cuối, Definition of done, hành động bị cấm

### Tự rà diff cuối

Trước khi đánh dấu PR sẵn sàng, đọc toàn bộ diff cuối (`git diff main...HEAD`) và kiểm:

- mở rộng phạm vi, định dạng không liên quan;
- file sinh tự động hoặc file cục bộ vô tình vào (`.next/`, `.env.local`, `db-test/.pgdata`, `tsconfig.tsbuildinfo`, `.mcp.json`, `.agents/`, `skills-lock.json`);
- mã chết, `console.log` gỡ lỗi, TODO tạm;
- khóa bí mật hoặc dữ liệu cá nhân thật (kể cả service-role key);
- quyền hoặc RLS bị nới; test bị yếu đi;
- migration cũ bị sửa (`0001_init.sql` không được đổi);
- tài liệu (`CLAUDE.md`, `README.md`, `TESTING.md`, con số test) lệch với hành vi mới;
- phụ thuộc đổi mà task không cần.

Đọc lại diff cuối là bước riêng, không thay bằng việc đã xem lúc đang viết.

### Definition of done

Task xong khi:

- phạm vi được giao đã làm xong;
- kiểm tra trong ma trận mục 25 liên quan đã chạy trên đúng commit cuối và đạt;
- giao diện đã xem thật, hoặc ghi rõ là chưa xem;
- diff cuối đã tự rà;
- tài liệu và hợp đồng cần cập nhật đã cập nhật;
- phần chưa kiểm được nêu trung thực trong PR;
- PR ngắn gọn, sẵn sàng cho người review.

Không báo xong khi kiểm tra liên quan chưa chạy. Không khẳng định "không hồi quy" khi không có bằng chứng.

### Hành động bị cấm

- push hoặc commit thẳng lên `main`;
- force-push `main`;
- sửa `supabase/migrations/0001_init.sql` đã áp lên Supabase thật;
- tắt, bỏ qua hoặc nới test để cho qua;
- bịa kết quả test hoặc khẳng định đã xem giao diện khi chưa xem;
- commit bí mật, `.env*` (trừ `.env.example`), dữ liệu người thật;
- đưa service-role key vào Next.js hoặc Vercel;
- chạy công cụ định dạng hàng loạt lên file không liên quan;
- nâng phụ thuộc hoặc đổi package manager như việc phụ;
- thêm `Co-authored-by` hay "Generated with" của AI vào commit hoặc PR;
- đặt tên nhánh mang thương hiệu AI;
- bịa tên pháp nhân, địa chỉ, email, số điện thoại liên hệ;
- ngụy tạo lịch sử, ngày, tác giả hay lý do của commit.

### Nguyên tắc cuối

```text
bằng chứng hơn giả định
bản vá nhỏ đúng hơn viết lại rộng
kiểm tra thật hơn lời khẳng định tự tin
văn bản của người bảo trì hơn lời kể của agent
```

Khi chưa rõ, xem repo và hành vi hiện tại. Khi ngoài phạm vi, báo lại thay vì tự mở rộng.
