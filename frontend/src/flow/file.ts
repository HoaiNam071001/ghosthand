// Node Tệp / thư mục (bước 35 N4) – nhãn thao tác, dòng chi tiết thẻ. Chạy ở internal/engine/file.go; thao tác xoá
// cần xác nhận (flow/danger.ts – script.DangerOps).
import { fmtMs, type Step } from '../types';
import { tr } from '../i18n/lang';

// '' = ghi chữ (khớp model.FileOps)
export type FileOp = '' | 'row' | 'mkdir' | 'trash' | 'emptyTrash';
export const FILE_OPS: { id: FileOp; label: string }[] = [
  { id: '', get label() { return tr('file.op.0'); } }, { id: 'row', get label() { return tr('file.op.1'); } }, { id: 'mkdir', get label() { return tr('file.op.2'); } },
  { id: 'trash', get label() { return tr('file.op.3'); } }, { id: 'emptyTrash', get label() { return tr('file.op.4'); } },
];
export const isDeleteOp = (op?: string) => op === 'trash' || op === 'emptyTrash';

// Đường dẫn trông như file (có đuôi .xxx ở phần cuối) → thư mục chứa nó; còn lại giữ nguyên.
export const folderOf = (p: string) => (/[^\\/]\.[A-Za-z0-9]{1,5}$/.test(p.trim()) ? p.trim().replace(/[\\/][^\\/]*$/, '') : p);

const base = (p?: string) => (p ?? '').trim().replace(/[\\/]+$/, '').split(/[\\/]/).pop() || '';

export function fmtFile(s: Pick<Step, 'fileOp' | 'filePath' | 'fileAppend' | 'cells' | 'filePattern'>): string {
  const name = base(s.filePath) || '(chưa chọn)';
  switch (s.fileOp) {
    case 'row': return `thêm dòng ${(s.cells ?? []).length} ô → ${name}`;
    case 'mkdir': return `tạo thư mục ${name}`;
    case 'trash': return `xoá ${s.filePattern?.trim() || '(chưa có mẫu)'} trong ${name} → Thùng rác`;
    case 'emptyTrash': return 'dọn Thùng rác (xoá hẳn)';
  }
  return `${s.fileAppend ? 'thêm vào cuối' : 'ghi'} ${name}`;
}

// Dòng chi tiết node Chờ tải xong: *.pdf trong Downloads · tối đa 60 s
export function fmtWaitDownload(s: Pick<Step, 'filePath' | 'filePattern' | 'timeoutMs'>): string {
  const dir = base(s.filePath) || 'Downloads';
  return `${s.filePattern?.trim() || 'file mới bất kỳ'} trong ${dir} · tối đa ${fmtMs(s.timeoutMs ?? 0)}`;
}
