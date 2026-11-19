import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton lead="refresh" form boxes={['h-[19rem]', 'h-[19rem]', 'h-[19rem]']} />;
}
