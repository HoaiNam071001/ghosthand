// Node Nén / giải nén (bước 43 S8) – nhãn thao tác, dòng chi tiết thẻ. Chạy ở internal/engine/zip.go.
import type { Step } from '../types';
import { tr } from '../i18n/lang';

// '' = nén (khớp model.ZipOps)
export type ZipOp = '' | 'extract';
export const ZIP_OPS: { id: ZipOp; label: string }[] = [{ id: '', get label() { return tr('zip.op.0'); } }, { id: 'extract', get label() { return tr('zip.op.1'); } }];

const base = (p?: string) => p?.trim().split(/[\\/]/).filter(Boolean).pop() ?? '';

// Dòng chi tiết thẻ: "bao-cao → nén (*.pdf)" / "pack.zip → giải nén"
export function fmtZip(s: Pick<Step, 'zipOp' | 'filePath' | 'filePattern'>): string {
  const src = base(s.filePath) || tr('zip.noSrc');
  if (s.zipOp === 'extract') return tr('zip.d.extract', { src });
  const pat = s.filePattern?.trim();
  return tr('zip.d.zip', { src }) + (pat ? ` (${pat})` : '');
}
