import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton sub={0} boxes={['h-72', 'h-48']} />;
}
