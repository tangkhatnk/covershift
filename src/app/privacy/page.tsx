import Link from 'next/link';
import { Alert, Doc, DocList as UL, DocSection } from '@/components/ui';
import { DISCLAIMER } from '@/lib/constants';

export const metadata = { title: 'Chính sách dữ liệu' };

const A = 'font-semibold text-brand underline underline-offset-4';

export default function DataPolicyPage() {
  const sections = [
    { title: "Chúng tôi thu những gì", body: (<>
        <p><b>Người làm:</b></p>
        <UL>
          <li>Họ tên, ngày sinh, trường và lớp</li>
          <li>Số điện thoại, khu vực, khung giờ rảnh</li>
          <li>Email dùng để đăng nhập</li>
        </UL>
        <p><b>Phụ huynh của người làm 15–17 tuổi:</b> họ tên, số điện thoại và thời điểm đồng ý.</p>
        <p><b>Chủ quán:</b> họ tên người liên hệ, số điện thoại, email đăng nhập, tên, loại hình, địa chỉ và khu vực của cơ sở, cùng vị trí ghim trên bản đồ nếu chủ quán chọn ghim.</p>
        <p>Ngoài ra hệ thống ghi lại lịch sử ca: ca đã nhận, đã hủy, kết quả chủ quán xác nhận và câu trả lời về tiền công.</p>
    </>) },
    { title: "Chúng tôi KHÔNG thu", body: (<>
        <UL>
          <li>Căn cước công dân hoặc giấy tờ tùy thân</li>
          <li>Ảnh chân dung</li>
          <li>Địa chỉ nhà</li>
          <li>Thông tin tài khoản ngân hàng hay thẻ (ứng dụng không có thanh toán)</li>
        </UL>
    </>) },
    { title: "Dùng để làm gì", body: (<>
        <UL>
          <li>Ghép người làm với ca phù hợp tuổi, khu vực và giờ rảnh.</li>
          <li>Kiểm duyệt: tính tuổi từ ngày sinh, xác minh cơ sở, duyệt người làm.</li>
          <li>Để hai bên đã ghép ca liên lạc được với nhau.</li>
          <li>Để nhóm vận hành nhắc ca và liên hệ khi có sự cố.</li>
          <li>Thống kê chung về hoạt động (số ca, tỷ lệ đúng giờ…), không gắn với tên từng người.</li>
        </UL>
        <p>Chúng tôi không bán dữ liệu và không dùng dữ liệu để quảng cáo.</p>
    </>) },
    { title: "Ai thấy được gì", body: (<>
        <UL>
          <li>
            <b>Số điện thoại:</b> người làm và chủ quán chỉ thấy số của nhau <b>sau khi đã ghép ca</b>. Hủy ca thì không còn thấy nữa.
          </li>
          <li><b>Ngày sinh, trường, lớp:</b> chỉ bạn và nhóm vận hành thấy. Chủ quán không thấy.</li>
          <li><b>Số điện thoại phụ huynh:</b> chỉ nhóm vận hành thấy.</li>
          <li><b>Câu trả lời về tiền công:</b> chỉ bạn và nhóm vận hành thấy.</li>
          <li>
            <b>Hồ sơ ca làm công khai:</b> mặc định tắt. Khi bạn bật, ai có link sẽ thấy họ tên, số ca đã xác nhận, tổng giờ,
            loại việc, điểm trung bình, tỷ lệ đúng giờ và nhận xét. Hồ sơ này không có số điện thoại, ngày sinh hay trường lớp.
          </li>
          <li><b>Nhóm vận hành:</b> xem được dữ liệu để duyệt và xử lý sự cố; mọi thao tác thay đổi dữ liệu của họ (duyệt, khóa, gỡ cơ sở, ẩn nhận xét, đổi cấu hình…) đều được ghi nhật ký.</li>
        </UL>
    </>) },
    { title: "Trang quán, ca chia sẻ, đánh giá và thông báo", body: (<>
        <UL>
          <li>
            <b>Trang quán công khai:</b> mỗi cơ sở đã xác minh có một trang riêng, ai có link đều xem được mà không cần đăng nhập. Trang chỉ có tên,
            loại hình, khu vực, địa chỉ, vị trí trên bản đồ, số ca đã hoàn thành, điểm đánh giá trung bình và số lượt đánh giá, cùng các ca đang mở.
            Trang không có số điện thoại, không có tên chủ quán và không có nhận xét của người làm.
          </li>
          <li>
            <b>Ca chia sẻ:</b> link của một ca đang mở cho ai cũng xem được, kể cả mô tả công việc do chủ quán tự gõ, tên, địa chỉ và vị trí quán.
            Link không có số điện thoại hay danh sách người đã nhận ca. Chủ quán không nên ghi số điện thoại cá nhân vào mô tả ca.
          </li>
          <li>
            <b>Đánh giá quán:</b> chỉ người làm đã được quán xác nhận có mặt ở ca mới đánh giá được, mỗi ca một lần, từ 1 đến 5 sao kèm nhận xét tùy chọn.
            Đánh giá không sửa được sau khi gửi. Trang quán công khai chỉ hiện điểm trung bình, không hiện nhận xét; chủ quán không đọc được nhận xét.
            Nhóm vận hành xem được nhận xét kèm tên người làm và có thể ẩn đánh giá; đánh giá bị ẩn không tính vào điểm.
          </li>
          <li>
            <b>Thông báo trong app:</b> chỉ bạn đọc được thông báo của mình. Thông báo chỉ nêu việc đã xảy ra (ví dụ lên làm người chính, ca bị hủy, hồ sơ được duyệt)
            kèm loại việc và tên quán, không có số điện thoại, ngày sinh hay thông tin phụ huynh.
          </li>
          <li>
            <b>Số điện thoại chủ quán:</b> có thể là số bàn hoặc tổng đài của quán chứ không phải số di động. Người làm chỉ thấy số này sau khi đã ghép ca, như mọi số điện thoại khác.
          </li>
        </UL>
    </>) },
    { title: "Người dưới 18 tuổi", body: (<>
        <UL>
          <li>Người dưới 15 tuổi không đăng ký được.</li>
          <li>Người 15–17 tuổi cần cha, mẹ hoặc người giám hộ đồng ý qua một link riêng trước khi nhận ca.</li>
          <li>Phụ huynh muốn rút lại sự đồng ý: liên hệ nhóm vận hành, hoặc người làm tự xóa tài khoản.</li>
        </UL>
    </>) },
    { title: "Lưu ở đâu", body: (<>
        <p>
          Dữ liệu được lưu trên dịch vụ cơ sở dữ liệu Supabase và trang web chạy trên Vercel. Đây là bản mô phỏng: mọi dữ liệu
          là dữ liệu mẫu, ba tài khoản demo dùng chung mật khẩu công khai, vì vậy bạn không nhập thông tin thật.
        </p>
    </>) },
    { title: "Bản đồ", body: (<>
        <UL>
          <li>
            Bản đồ ở trang tìm ca và chi tiết ca hiện vị trí quán do chủ quán tự ghim. Người làm nào thấy ca đó cũng thấy ghim này,
            không có số điện thoại đi kèm.
          </li>
          <li>
            Khi bạn mở một trang có bản đồ, trình duyệt tải ảnh bản đồ và phông chữ của bản đồ từ <b>tiles.openfreemap.org</b> (dịch vụ OpenFreeMap).
            Dịch vụ này nhận địa chỉ IP của bạn và vùng bản đồ bạn đang xem. Chúng tôi không gửi tên, số điện thoại hay dữ liệu tài khoản tới dịch vụ này.
          </li>
          <li>
            Nút &quot;Dùng vị trí hiện tại&quot; của chủ quán chỉ đọc vị trí trên máy của chủ quán. Tọa độ chỉ được gửi cho SafeShift khi chủ quán bấm Lưu,
            và chỉ là vị trí quán.
          </li>
          <li>SafeShift không lưu vị trí của người làm.</li>
        </UL>
    </>) },
    { title: "Quyền của bạn", body: (<>
        <UL>
          <li><b>Xem và sửa</b> thông tin trong mục <Link href="/profile" className={A}>Hồ sơ</Link>. Muốn sửa họ tên hoặc ngày sinh, hãy liên hệ nhóm vận hành.</li>
          <li><b>Bật hoặc tắt</b> chia sẻ hồ sơ ca làm bất cứ lúc nào.</li>
          <li>
            <b>Xóa tài khoản và toàn bộ dữ liệu</b> trong mục <Link href="/account" className={A}>Tài khoản</Link>. Việc xóa
            có hiệu lực ngay và không khôi phục được: hồ sơ, số điện thoại, phiếu phụ huynh, lịch sử ca và đánh giá đều bị xóa;
            các ca sắp tới của bạn bị hủy.
          </li>
        </UL>
    </>) },
    { title: "Đồng ý và liên hệ", body: (<>
        <UL>
          <li>Khi đăng ký lần đầu, bạn được hỏi và phải đồng ý cho xử lý dữ liệu cá nhân như mô tả ở trang này.</li>
          <li>Có câu hỏi về dữ liệu: liên hệ nhóm vận hành qua kênh đã được thông báo khi bạn đăng ký.</li>
          <li>Xem thêm <Link href="/terms" className={A}>Điều khoản sử dụng</Link>.</li>
        </UL>
    </>) },
  ];
  return (
    <Doc
      title="Chính sách dữ liệu cá nhân"
      sub="Chúng tôi chỉ thu những gì cần để ghép ca an toàn, và bạn xóa được bất cứ lúc nào."
      toc={sections.map((x, i) => ({ id: `muc-${i + 1}`, label: x.title }))}
      notice={
        <Alert tone="blue">
          <p className="font-semibold">{DISCLAIMER}</p>
        </Alert>
      }
    >
      {sections.map((x, i) => (
        <DocSection key={i} id={`muc-${i + 1}`} n={i + 1} title={x.title}>{x.body}</DocSection>
      ))}
    </Doc>
  );
}
