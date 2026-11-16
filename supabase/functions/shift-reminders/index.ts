// SafeShift — Edge Function nhắc ca qua email trước ca khoảng 2 tiếng (PHẦN PHỤ, mặc định TẮT).
// Kênh nhắc chính trong đợt chạy thật vẫn là nút "Sao chép tin nhắn nhắc ca" ở bảng điều phối (dán vào Zalo).
//
// Bật:
//   supabase secrets set RESEND_API_KEY=re_xxx CRON_SECRET=<chuỗi ngẫu nhiên> REMINDER_FROM="SafeShift <nhac-ca@ten-mien-da-xac-minh>" SITE_URL=https://...
//   supabase functions deploy shift-reminders --no-verify-jwt
//   rồi tạo lịch pg_cron 10 phút/lần (xem README, mục "Nhắc ca qua email").
// Lưu ý Resend gói miễn phí: phải xác minh tên miền mới gửi được cho người khác; 100 email/ngày.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const JOB_LABEL: Record<string, string> = {
  phuc_vu: 'Phục vụ', pha_che: 'Pha chế', thu_ngan: 'Thu ngân', don_phong: 'Dọn phòng',
  le_tan: 'Lễ tân', phu_bep_nhe: 'Phụ bếp nhẹ', ho_tro_su_kien: 'Hỗ trợ sự kiện',
};
const fmt = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

type Row = {
  id: string;
  worker_id: string;
  role: 'primary' | 'backup';
  shifts: {
    id: string; starts_at: string; ends_at: string; job_type: string;
    facilities: { name: string; address: string; maps_url: string | null };
  };
};

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return new Response('forbidden', { status: 403 });
  }
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('REMINDER_FROM');
  const siteUrl = (Deno.env.get('SITE_URL') ?? '').replace(/\/$/, '');
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Tiện thể sinh link xác nhận cho các ca vừa hết giờ (app cũng tự sinh khi mở trang, đây chỉ là dự phòng).
  const { data: tokens } = await supabase.rpc('generate_due_confirmation_tokens');

  if (!resendKey || !from) {
    return Response.json({ tokens, sent: 0, skipped: 'Chưa cấu hình RESEND_API_KEY / REMINDER_FROM' });
  }

  // Cửa sổ: ca bắt đầu trong 30–125 phút tới, chưa nhắc. Cron 10 phút/lần => mỗi người được nhắc đúng một lần.
  const now = Date.now();
  const { data, error } = await supabase
    .from('shift_claims')
    .select('id, worker_id, role, shifts!inner(id, starts_at, ends_at, job_type, status, facilities!inner(name, address, maps_url))')
    .eq('status', 'active')
    .is('reminder_sent_at', null)
    .eq('shifts.status', 'open')
    .gt('shifts.starts_at', new Date(now + 30 * 60_000).toISOString())
    .lte('shifts.starts_at', new Date(now + 125 * 60_000).toISOString())
    .limit(90);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  const failed: string[] = [];
  for (const row of (data ?? []) as unknown as Row[]) {
    const s = row.shifts;
    const f = s.facilities;
    const { data: u } = await supabase.auth.admin.getUserById(row.worker_id);
    const email = u?.user?.email;
    if (!email) continue;
    const maps = f.maps_url ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.name} ${f.address}`)}`;
    const roleText = row.role === 'primary' ? 'NGƯỜI CHÍNH' : 'NGƯỜI DỰ PHÒNG (hãy để ý điện thoại, bạn có thể được gọi vào thay)';
    const html = `
      <p>Chào bạn, đây là lời nhắc ca từ SafeShift.</p>
      <p><b>${esc(JOB_LABEL[s.job_type] ?? s.job_type)}</b> tại <b>${esc(f.name)}</b><br>
      Bắt đầu: <b>${esc(fmt.format(new Date(s.starts_at)))}</b><br>
      Địa chỉ: ${esc(f.address)} — <a href="${esc(maps)}">mở bản đồ</a><br>
      Vai trò của bạn: ${roleText}</p>
      <p>Vui lòng đến sớm 10 phút. Nếu bận, hãy báo ngay cho nhóm vận hành.</p>
      ${siteUrl ? `<p><a href="${siteUrl}/ca/${s.id}">Xem chi tiết ca và số điện thoại của quán</a></p>` : ''}
      <p style="color:#666">Không bao giờ thu phí người làm.</p>`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [email], subject: `Nhắc ca: ${f.name} lúc ${fmt.format(new Date(s.starts_at))}`, html }),
    });
    if (res.ok) {
      // Chỉ đánh dấu khi gửi thành công => lần cron sau sẽ thử lại nếu lỗi.
      await supabase.from('shift_claims').update({ reminder_sent_at: new Date().toISOString() }).eq('id', row.id);
      sent++;
    } else {
      failed.push(`${row.id}: ${res.status}`);
    }
  }
  return Response.json({ tokens, sent, failed });
});
