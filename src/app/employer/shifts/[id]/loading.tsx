import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton gap={6} boxes={['h-80', 'h-48', 'h-48']} />;
}
