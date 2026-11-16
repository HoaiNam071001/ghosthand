// Node Bộ gõ (bước 43 S6) – nhãn thao tác, dòng chi tiết thẻ. Chạy ở internal/engine/inputsource.go.
import type { Step } from '../types';
import { tr } from '../i18n/lang';

// '' = đọc (khớp model.InputOps)
export type InputOp = '' | 'set' | 'toggleIME';
export const INPUT_OPS: { id: InputOp; label: string }[] = [{ id: '', get label() { return tr('ime.op.0'); } }, { id: 'set', get label() { return tr('ime.op.1'); } }, { id: 'toggleIME', get label() { return tr('ime.op.2'); } }];
export const IME_DEFAULT_HOTKEY = 'ctrl+shift'; // khớp model.InputDefaultHotkey

// Dòng chi tiết thẻ: "đổi sang ABC" / "đọc bộ gõ đang dùng"
export function fmtInputSource(s: Pick<Step, 'inputOp' | 'inputLayout' | 'inputHotkey'>): string {
  if (s.inputOp === 'toggleIME') return tr('fx.ime.toggle', { k: s.inputHotkey?.trim() || IME_DEFAULT_HOTKEY });
  return s.inputOp === 'set' ? tr('fx.ime.set', { l: s.inputLayout?.trim() || tr('fx.ime.noLayout') }) : tr('fx.ime.read');
}
