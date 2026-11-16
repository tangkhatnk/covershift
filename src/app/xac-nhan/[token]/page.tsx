import type { Metadata } from 'next';
import { Alert, Card, PageTitle } from '@/components/ui';
import { JOB_LABEL } from '@/lib/constants';
import { fmtDateTime, fmtRange } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import type { Confirmation } from '@/lib/types';
import { ConfirmForm } from './confirm-form';

export const metadata: Metadata = { title: 'Xác nhận sau ca', robots: { index: false, follow: false } };

export default async function ConfirmPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_confirmation', { p_token: token });

  if (error) {
    return (
      <div className="space-y-4">
        <PageTitle>Xác nhận sau ca</PageTitle>
        <Alert tone="red">Chưa tải được trang. Anh/chị vui lòng thử lại sau ít phút.</Alert>
      </div>
    );
  }

  const c = (data as Confirmation | null) ?? { state: 'invalid' as const };

  if (c.state !== 'ok') {
    return (
      <div className="space-y-4">
        <PageTitle>Xác nhận sau ca</PageTitle>
        {c.state === 'used' ? (
          // Cũng là màn hình chủ quán thấy ngay sau khi gửi thành công (trang được tải lại).
          <Alert tone="green">
            <span className="block text-lg font-semibold">Ca này đã được xác nhận. Cảm ơn anh/chị!</span>
            <span className="mt-1 block">Mỗi link chỉ dùng được một lần.</span>
          </Alert>
        ) : c.state === 'expired' ? (
          <Alert tone="amber">
            <span className="text-lg">Link đã hết hạn (quá 72 giờ sau ca). Vui lòng liên hệ nhóm vận hành.</span>
          </Alert>
        ) : (
          <Alert tone="red"><span className="text-lg">Link không hợp lệ.</span></Alert>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageTitle sub="Anh/chị chọn cho từng người rồi bấm Gửi xác nhận. Không cần đăng nhập.">Xác nhận sau ca</PageTitle>
      <Card>
        <p className="text-xl font-bold text-slate-900">{c.facility_name}</p>
        <p className="text-lg text-slate-800">{JOB_LABEL[c.job_type]} · {fmtRange(c.starts_at, c.ends_at)}</p>
        <p className="mt-1 text-base text-slate-600">Hạn xác nhận: {fmtDateTime(c.expires_at)}</p>
      </Card>
      {c.workers.length ? (
        <ConfirmForm token={token} workers={c.workers} />
      ) : (
        <Alert tone="amber">Ca này không có người làm nào để xác nhận. Anh/chị vui lòng liên hệ nhóm vận hành.</Alert>
      )}
    </div>
  );
}
