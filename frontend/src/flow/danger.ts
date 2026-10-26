// Thao tác nguy hiểm cần người dùng đồng ý trước lần chạy đầu (script.DangerOps – internal/script/danger.go): xoá file
// vào / dọn Thùng rác, buộc thoát app, thoát app có buộc thoát khi quá giờ, đóng cửa sổ.

import { STEP_LABEL } from '../types';

// Khớp script.DangerOp.
export type DangerOp = { ref: string; op: string; folder?: string; pattern?: string; target?: string; lang?: string; script?: string; dir?: string };

const POWER_TEXT: Record<string, string> = { sleep: 'Cho máy ngủ', logout: 'Đăng xuất', shutdown: 'Tắt máy', restart: 'Khởi động lại máy' };

// Câu cho hộp xác nhận.
export function dangerOpText(d: DangerOp): string {
  switch (d.op) {
    case 'emptyTrash': return 'Dọn Thùng rác – xoá hẳn mọi thứ trong Thùng rác, không khôi phục được';
    case 'trash': return `Chuyển các file khớp “${d.pattern}” trong ${d.folder} vào Thùng rác (khôi phục được)`;
    case 'forceQuit': return `Buộc thoát ${d.target} – mất dữ liệu chưa lưu`;
    case 'quit': return `Thoát ${d.target}, quá giờ chưa thoát thì buộc thoát – mất dữ liệu chưa lưu`;
    case 'shell': return `Chạy lệnh${d.lang ? ` ${d.lang}` : ''}${d.dir ? ` trong ${d.dir}` : ''} – lệnh có toàn quyền như bạn trên máy này`;
    case 'power': return `${POWER_TEXT[d.target ?? ''] ?? 'Thao tác nguồn'} – mất công việc chưa lưu; đếm ngược để huỷ bằng Dừng`;
    case 'marked': return `Node ${d.ref} (${STEP_LABEL[d.target as keyof typeof STEP_LABEL] ?? d.target}) – bạn đã đánh dấu là ghi / xoá dữ liệu`;
    case 'close': return `Đóng cửa sổ ${d.target} (app có thể hỏi lưu)`;
  }
  return d.op;
}

// Thao tác không khôi phục được – tô màu cảnh báo.
export const isPermanent = (d: DangerOp) => d.op !== 'trash' && d.op !== 'close';

// Nội dung lệnh cần hiện nguyên văn cho người dùng đọc trước khi đồng ý.
export const dangerScript = (d: DangerOp) => (d.op === 'shell' ? d.script ?? '' : '');

// Tiêu đề hộp xác nhận theo nhóm thao tác.
export function dangerTitle(ops: DangerOp[]): string {
  const file = ops.every((o) => o.op === 'trash' || o.op === 'emptyTrash');
  if (ops.every((o) => o.op === 'power')) return 'Kịch bản này sẽ tác động nguồn máy';
  if (ops.every((o) => o.op === 'shell')) return 'Kịch bản này sẽ chạy lệnh trên máy';
  const app = ops.every((o) => o.op === 'quit' || o.op === 'forceQuit' || o.op === 'close');
  return file ? 'Kịch bản này sẽ xoá file' : app ? 'Kịch bản này sẽ thoát app / đóng cửa sổ' : 'Kịch bản có thao tác cần xác nhận';
}
