import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton gap={6} action boxes={['h-[13rem]', 'h-[13rem]']} />;
}
