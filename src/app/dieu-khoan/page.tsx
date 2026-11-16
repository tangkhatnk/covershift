import Link from 'next/link';
import type { ReactNode } from 'react';
import { Alert, Card, PageTitle } from '@/components/ui';
import { APP_NAME, DISCLAIMER, JOB_LABEL, NO_FEE, PROHIBITED_TEXT } from '@/lib/constants';

export const metadata = { title: 'Điều khoản sử dụng' };

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-slate-900">{n}. {title}</h2>
      <div className="mt-2 space-y-2 text-base leading-relaxed text-slate-800">{children}</div>
    </Card>
  );
}
const UL = ({ children }: { children: ReactNode }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>;

export default function TermsPage() {
  const jobs = Object.values(JOB_LABEL).join(', ').toLowerCase();
  return (
    <div className="space-y-4">
      <PageTitle sub="Viết ngắn gọn để ai cũng đọc được. Dùng ứng dụng nghĩa là bạn đồng ý với các điều dưới đây.">
        Điều khoản sử dụng
      </PageTitle>

      <Alert tone="blue">
        <p className="font-semibold">{DISCLAIMER}</p>
        <p className="mt-1 font-bold">{NO_FEE}</p>
      </Alert>

      <Section n={1} title={`${APP_NAME} là gì`}>
        <p>
          {APP_NAME} là nơi kết nối ca làm ngắn hạn giữa các cơ sở dịch vụ nhỏ ở Vũng Tàu (quán cà phê, nhà hàng, homestay,
          khách sạn nhỏ) và người làm là học sinh từ 15 tuổi hoặc sinh viên.
        </p>
        <UL>
          <li>{APP_NAME} <b>không phải</b> bên thuê lao động và không trả lương thay cho ai.</li>
          <li>Không thu phí của người làm lẫn chủ quán. Không có thanh toán trong ứng dụng.</li>
          <li>Tiền công do chủ quán trả trực tiếp cho người làm theo thỏa thuận của hai bên.</li>
        </UL>
      </Section>

      <Section n={2} title="Phần việc của nền tảng">
        <p>{APP_NAME} chịu trách nhiệm kiểm duyệt ba việc:</p>
        <UL>
          <li><b>Ai được đăng ca:</b> chỉ cơ sở đã được nhóm vận hành đến tận nơi xác minh.</li>
          <li><b>Việc gì được đăng:</b> chỉ các loại việc trong danh sách ở mục 5.</li>
          <li><b>Ai được nhận ca:</b> chỉ người làm đã được nhóm vận hành duyệt.</li>
        </UL>
      </Section>

      <Section n={3} title="Điều kiện với người làm">
        <UL>
          <li>Phải đủ <b>15 tuổi</b> trở lên. Khai đúng họ tên và ngày sinh.</li>
          <li>Từ 15 đến 17 tuổi: cần cha, mẹ hoặc người giám hộ đồng ý qua link, và nhóm vận hành duyệt, rồi mới nhận ca được.</li>
          <li>
            Dưới 18 tuổi chỉ thấy và nhận được ca nằm trong khoảng 06:00–22:00 và dài tối đa <b>8 giờ</b>.
          </li>
          <li>Tổng số giờ các ca đã nhận trong một tuần (thứ Hai đến Chủ nhật) không quá <b>40 giờ</b>.</li>
          <li>Không nhận hai ca trùng giờ nhau.</li>
        </UL>
      </Section>

      <Section n={4} title="Điều kiện với chủ quán">
        <UL>
          <li>Cơ sở phải được xác minh thực tế trước khi đăng ca.</li>
          <li>Không nhận các loại hình: {PROHIBITED_TEXT}.</li>
          <li>Lương mỗi giờ là bắt buộc và không thấp hơn mức tối thiểu do nền tảng quy định tại thời điểm đăng ca.</li>
          <li>
            Mỗi lần đăng ca, chủ quán cam kết: <b>không thu phí, không đặt cọc, không giữ giấy tờ</b> của người làm.
          </li>
          <li>Mô tả công việc đúng sự thật; không giao việc khác với việc đã đăng.</li>
        </UL>
      </Section>

      <Section n={5} title="Các loại việc được phép">
        <p>Chỉ có 7 loại việc: {jobs}. Không có cách nào đăng loại việc khác.</p>
      </Section>

      <Section n={6} title="Nhận ca, người chính và người dự phòng">
        <UL>
          <li>Người nhận trước là <b>người chính</b>. Khi đã đủ người chính, người nhận tiếp theo là <b>người dự phòng</b>.</li>
          <li>Nếu người chính hủy, người dự phòng được đưa lên làm người chính.</li>
          <li>Chủ quán có thể đổi thứ tự người chính và người dự phòng trước giờ bắt đầu ca.</li>
          <li>Số điện thoại của hai bên chỉ hiện cho nhau sau khi đã ghép ca.</li>
        </UL>
      </Section>

      <Section n={7} title="Hủy ca">
        <UL>
          <li>Người làm hủy khi còn <b>hơn 2 tiếng</b> trước ca: không bị tính là hủy sát giờ.</li>
          <li>
            Hủy khi còn <b>dưới 2 tiếng</b>: được ghi vào lịch sử là &ldquo;hủy sát giờ&rdquo; và nhóm vận hành được báo.
          </li>
          <li>Ca đã bắt đầu thì không tự hủy được; hãy gọi ngay cho nhóm vận hành.</li>
          <li>Chủ quán hủy ca sát giờ khi đã có người nhận cũng được báo cho nhóm vận hành.</li>
        </UL>
      </Section>

      <Section n={8} title="Xác nhận sau ca và hồ sơ ca làm">
        <UL>
          <li>Sau ca, chủ quán nhận một link để xác nhận: đã làm hay không đến, đúng giờ hay trễ, số sao và nhận xét. Link dùng một lần và hết hạn sau 72 giờ.</li>
          <li>Ca đã xác nhận được ghi vào hồ sơ ca làm của người làm. Người làm tự quyết bật hay tắt chia sẻ hồ sơ này.</li>
          <li>Người làm được hỏi &ldquo;Đã được trả đủ chưa?&rdquo;. Câu trả lời chỉ nhóm vận hành thấy.</li>
          <li>Nhận xét xúc phạm hoặc sai sự thật có thể bị nhóm vận hành ẩn.</li>
        </UL>
      </Section>

      <Section n={9} title="Báo cáo và xử lý vi phạm">
        <UL>
          <li>Bất kỳ ai cũng có thể gửi báo cáo cho nhóm vận hành ngay trong trang ca.</li>
          <li>Nhóm vận hành có thể khóa tài khoản hoặc gỡ cơ sở khi có vi phạm, ví dụ: thu phí, đặt cọc, giữ giấy tờ, không trả công, khai sai tuổi, không đến ca nhiều lần.</li>
          <li>Khi cơ sở bị gỡ hoặc tài khoản bị khóa, các ca sắp tới liên quan sẽ bị hủy.</li>
        </UL>
      </Section>

      <Section n={10} title="Giới hạn trách nhiệm">
        <p>
          {APP_NAME} kiểm duyệt như mô tả ở mục 2, nhưng không thay hai bên thỏa thuận hay giám sát buổi làm. Tranh chấp về
          tiền công và điều kiện làm việc do hai bên giải quyết với nhau; nhóm vận hành sẽ ghi nhận báo cáo và hỗ trợ liên hệ.
        </p>
      </Section>

      <Section n={11} title="Xóa tài khoản và liên hệ">
        <UL>
          <li>
            Bạn có thể xóa tài khoản và toàn bộ dữ liệu bất cứ lúc nào trong mục <Link href="/tai-khoan" className="font-semibold text-brand-700 underline underline-offset-4">Tài khoản</Link>.
          </li>
          <li>Cần hỗ trợ: liên hệ nhóm vận hành qua kênh đã được thông báo khi bạn đăng ký.</li>
          <li>
            Cách chúng tôi dùng dữ liệu của bạn: xem <Link href="/chinh-sach-du-lieu" className="font-semibold text-brand-700 underline underline-offset-4">Chính sách dữ liệu</Link>.
          </li>
        </UL>
      </Section>
    </div>
  );
}
