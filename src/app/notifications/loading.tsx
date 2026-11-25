import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton boxes={['h-32', 'h-32', 'h-32']} />;
}
