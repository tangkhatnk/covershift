import { PageSkeleton } from '@/components/ui';

export default function Loading() {
  return <PageSkeleton sub={3} form boxes={['h-[13rem]', 'h-[13rem]', 'h-[13rem]']} />;
}
