type DbError = { code?: string; message: string };

/**
 * Câu báo lỗi hiện cho người dùng.
 * Lỗi nghiệp vụ do database `raise exception` (tiếng Việt) giữ nguyên văn;
 * lỗi kỹ thuật (mạng, PostgREST, quyền…) thay bằng câu chung và ghi log phía server.
 */
export function friendlyError(error: DbError): string {
  const business = error.code === 'P0001' || (error.code === '42501' && !/^permission denied/i.test(error.message));
  if (business) return error.message;
  if (error.code === '22P02') return 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại các ô đã nhập.';
  console.error('[rpc]', error.code, error.message);
  return 'Có lỗi xảy ra. Vui lòng thử lại sau ít phút.';
}
