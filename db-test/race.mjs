// Chạy đua thật: ca 03 đã có người chính, chỉ còn MỘT chỗ dự phòng.
// Ba người (4, 5, 6) bấm "Nhận ca" cùng lúc trên ba kết nối riêng => đúng 1 người được, 2 người bị từ chối.
import pg from 'pg';

const SHIFT = '50000000-0000-4000-a000-000000000003';
const WORKERS = [4, 5, 6].map((n) => `a0000000-0000-4000-a000-00000000000${n}`);

async function claim(conn, uid) {
  const c = new pg.Client(conn);
  c.on('error', () => {});
  await c.connect();
  try {
    await c.query('begin');
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]);
    await c.query('set local role authenticated');
    const r = await c.query('select claim_shift($1) as role', [SHIFT]);
    await c.query('commit');
    return { ok: true, role: r.rows[0].role };
  } catch (e) {
    await c.query('rollback').catch(() => {});
    return { ok: false, error: e.message };
  } finally {
    await c.end();
  }
}

export async function raceTest(conn) {
  const admin = new pg.Client(conn);
  admin.on('error', () => {});
  await admin.connect();
  // Trả ca 03 về trạng thái gốc và mở khóa các tài khoản mà edge_cases.sql đã khóa.
  await admin.query(`delete from shift_claims where shift_id = $1 and worker_id = any($2)`, [SHIFT, WORKERS]);
  await admin.query(`update profiles set status = 'active' where id = any($1)`, [WORKERS]);
  let pass = true;
  for (let round = 1; round <= 5; round++) {
    const results = await Promise.all(WORKERS.map((w) => claim(conn, w)));
    const won = results.filter((r) => r.ok);
    const { rows } = await admin.query(
      `select count(*) filter (where role = 'primary')::int p, count(*) filter (where role = 'backup')::int b
       from shift_claims where shift_id = $1 and status = 'active'`, [SHIFT]);
    const good = won.length === 1 && won[0].role === 'backup' && rows[0].p === 1 && rows[0].b === 1
      && results.filter((r) => !r.ok).every((r) => /đủ người/.test(r.error));
    console.log(`${good ? '✔' : '✘'} chạy đua lần ${round}: ${won.length} người được (${won.map((r) => r.role).join(',')}), DB có ${rows[0].p} chính + ${rows[0].b} dự phòng`);
    if (!good) { pass = false; console.log(results); }
    await admin.query(`delete from shift_claims where shift_id = $1 and worker_id = any($2)`, [SHIFT, WORKERS]);
  }
  await admin.end();
  return pass;
}
