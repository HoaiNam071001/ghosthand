// Node Clipboard (bước 35 N2) – nhãn phép, dòng chi tiết thẻ. Chạy ở internal/engine/clip.go.
import type { Step } from '../types';
import { tr } from '../i18n/lang';

// '' = đọc (khớp model.ClipOps)
export type ClipOp = '' | 'write' | 'image';
export const CLIP_OPS: { id: ClipOp; label: string }[] = [{ id: '', get label() { return tr('clip.op.0'); } }, { id: 'write', get label() { return tr('clip.op.1'); } }, { id: 'image', get label() { return tr('clip.op.2'); } }];

const short = (t: string, n = 40) => (t.length > n ? `${t.slice(0, n)}…` : t);

export function fmtClip(s: Pick<Step, 'clipOp' | 'text' | 'filePath'>): string {
  switch (s.clipOp) {
    case 'write': return s.text ? tr('clip.d.write', { t: short(s.text) }) : tr('clip.d.clear');
    case 'image': return s.filePath?.trim() ? tr('clip.d.image', { f: short(s.filePath) }) : tr('clip.d.noFile');
  }
  return tr('clip.d.read');
}
