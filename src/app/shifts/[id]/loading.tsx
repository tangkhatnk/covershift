import { PageSkeleton } from '@/components/ui';

// Từ lg: hai cột bằng nhau như trang thật. Trái = thẻ giờ-lương, chỗ trống, mô tả, lưu ý; phải = nhận ca + nơi làm + chia sẻ (một khối cao).
// Điện thoại giữ nguyên một cột; phần `lg:h-...` chỉ đổi chiều cao khối ở desktop.
export default function Loading() {
  return (
    <PageSkeleton
      lead="back"
      equal
      boxes={['h-[14.75rem] lg:h-[12.25rem]', 'h-[6.5rem]', 'h-24 lg:h-[15rem]', 'h-[27rem] lg:h-[8.5rem]']}
      side="h-40 lg:h-[50.5rem]"
    />
  );
}
