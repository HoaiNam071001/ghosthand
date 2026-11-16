// Node Thông báo hệ thống (bước 43 S9) – dòng chi tiết thẻ. Chạy ở internal/engine/toast.go.
import { tr } from '../i18n/lang';
import type { Step } from '../types';

// Dòng chi tiết thẻ: "Xong · Đã nén 3 file"
export function fmtNotify(s: Partial<Pick<Step, 'notifyTitle' | 'text'>>): string {
  const parts = [s.notifyTitle?.trim(), s.text?.trim()].filter(Boolean);
  return parts.length ? parts.join(' · ') : tr('fx.notify.empty');
}
