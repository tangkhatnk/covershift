import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton gap={6} sub={1} boxes={['h-[19rem]', 'h-[19rem]']} />;
}
