// Thao tác nguy hiểm cần người dùng đồng ý trước lần chạy đầu (script.DangerOps – internal/script/danger.go): xoá file
// vào / dọn Thùng rác, buộc thoát app, thoát app có buộc thoát khi quá giờ, đóng cửa sổ.

import { tr } from '../i18n/lang';
import { STEP_LABEL } from '../types';

// Khớp script.DangerOp.
export type DangerOp = { ref: string; op: string; folder?: string; pattern?: string; target?: string; lang?: string; script?: string; dir?: string; file?: string; fileHash?: string };

const POWER_TEXT: Record<string, string> = { get sleep() { return tr('dg.sleep'); }, get logout() { return tr('dg.logout'); }, get shutdown() { return tr('dg.shutdown'); }, get restart() { return tr('dg.restart'); } };

// Câu cho hộp xác nhận.
export function dangerOpText(d: DangerOp): string {
  switch (d.op) {
    case 'emptyTrash': return tr('dg.emptyTrash');
    case 'trash': return tr('dg.trash', { p: d.pattern ?? '', f: d.folder ?? '' });
    case 'forceQuit': return tr('dg.forceQuit', { t: d.target ?? '' });
    case 'quit': return tr('dg.quit', { t: d.target ?? '' });
    case 'shell': return tr('dg.shell', { lang: d.lang ? ` ${d.lang}` : '', dir: d.dir ? ` ${tr('dg.shellIn', { d: d.dir })}` : '', file: d.file ? ` – ${tr('dg.shellFile', { f: d.file })}` : '' });
    case 'power': return tr('dg.power', { what: POWER_TEXT[d.target ?? ''] ?? tr('dg.powerOp') });
    case 'marked': return tr('dg.marked', { ref: d.ref, kind: STEP_LABEL[d.target as keyof typeof STEP_LABEL] ?? d.target ?? '' });
    case 'close': return tr('dg.close', { t: d.target ?? '' });
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
  if (ops.every((o) => o.op === 'power')) return tr('dg.t.power');
  if (ops.every((o) => o.op === 'shell')) return tr('dg.t.shell');
  const app = ops.every((o) => o.op === 'quit' || o.op === 'forceQuit' || o.op === 'close');
  return file ? tr('dg.t.file') : app ? tr('dg.t.app') : tr('dg.t.other');
}
