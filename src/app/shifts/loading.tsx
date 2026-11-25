import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton sub={0} filter boxes={['h-[18rem]', 'h-[18rem]', 'h-[18rem]']} />;
}
