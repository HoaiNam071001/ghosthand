// Node Màn hình / âm thanh (bước 43 S7) – nhãn thao tác, dòng chi tiết thẻ. Chạy ở internal/engine/display.go.
import type { Step } from '../types';
import { tr } from '../i18n/lang';

// '' = đọc (khớp model.DisplayOps)
export type DisplayOp = '' | 'theme' | 'brightness' | 'audioOut' | 'audioIn' | 'sound';
export const DISPLAY_OPS: { id: DisplayOp; label: string }[] = [
  { id: '', get label() { return tr('disp.op.0'); } }, { id: 'theme', get label() { return tr('disp.op.1'); } }, { id: 'brightness', get label() { return tr('disp.op.2'); } },
  { id: 'audioOut', get label() { return tr('disp.op.3'); } }, { id: 'audioIn', get label() { return tr('disp.op.4'); } }, { id: 'sound', get label() { return tr('disp.op.5'); } },
];
export const THEMES: { id: string; label: string }[] = [{ id: 'light', get label() { return tr('disp.op.6'); } }, { id: 'dark', get label() { return tr('disp.op.7'); } }, { id: 'toggle', get label() { return tr('disp.op.8'); } }];
export const SYSTEM_SOUNDS = ['Glass', 'Ping', 'Hero', 'Sosumi', 'Funk', 'Submarine', 'Tink']; // macOS; Windows: Asterisk, Beep, Exclamation…

const THEME_LABEL: Record<string, string> = { get light() { return tr('disp.t.light'); }, get dark() { return tr('disp.t.dark'); }, get toggle() { return tr('disp.t.toggle'); } };

// Dòng chi tiết thẻ: "độ sáng 70 %" / "loa → AirPods"
export function fmtDisplay(s: Pick<Step, 'displayOp' | 'displayValue'>): string {
  const v = s.displayValue?.trim() || '';
  switch (s.displayOp ?? '') {
    case 'theme': return tr('disp.d.theme', { v: THEME_LABEL[v] ?? (v || tr('disp.unpicked')) });
    case 'brightness': return tr('disp.d.bright', { v: v || '?' });
    case 'audioOut': return tr('disp.d.out', { v: v || tr('disp.unset') });
    case 'audioIn': return tr('disp.d.in', { v: v || tr('disp.unset') });
    case 'sound': return tr('disp.d.sound', { v: v || tr('disp.unset') });
  }
  return tr('disp.d.read');
}
