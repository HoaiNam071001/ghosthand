// Node Shortcuts hệ điều hành (bước 43 S2) – dòng chi tiết thẻ. Chạy ở internal/engine/osshortcut.go.
import { tr } from '../i18n/lang';
import type { Step } from '../types';

export function fmtOSShortcut(s: Partial<Pick<Step, 'shortcutName' | 'text'>>): string {
  const name = s.shortcutName?.trim() || tr('fx.os.none');
  return s.text?.trim() ? tr('fx.os.input', { n: name }) : name;
}
