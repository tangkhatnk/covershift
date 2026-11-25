import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton lead="back" boxes={['h-[26rem]', 'h-48']} side="h-48" />;
}
