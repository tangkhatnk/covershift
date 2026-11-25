import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton lead="back" sub={1} boxes={['h-[26rem]', 'h-48']} />;
}
