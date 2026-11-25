import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton lead="back" boxes={['h-[14.75rem]', 'h-[6.5rem]', 'h-24', 'h-[29rem]']} side="h-40" />;
}
