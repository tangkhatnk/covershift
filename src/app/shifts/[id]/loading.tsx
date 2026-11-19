import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton lead="back" boxes={['h-[36rem]', 'h-28']} side="h-48" />;
}
