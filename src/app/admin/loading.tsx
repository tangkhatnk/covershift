import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton gap={6} lead="refresh" sub={1} map boxes={['h-64', 'h-64']} side="h-64" />;
}
