import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton sub={1} boxes={['h-[13rem]', 'h-[13rem]', 'h-[13rem]']} />;
}
