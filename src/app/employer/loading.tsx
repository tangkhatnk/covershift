import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton gap={6} sub={2} action boxes={['h-[23rem]', 'h-[19rem]']} />;
}
