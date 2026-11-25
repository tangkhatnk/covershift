import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton gap={6} boxes={['h-28', 'h-[18rem]', 'h-[18rem]']} />;
}
