import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton sub={1} boxes={['h-64', 'h-40', 'h-48']} />;
}
