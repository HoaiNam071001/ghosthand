// Node Hỏi người dùng (bước 56 D1) – dòng chi tiết thẻ + danh sách mục. Chạy ở internal/engine/askuser.go.
import type { Step } from '../types';

// Mục kèm câu hỏi: mỗi dòng một mục, bỏ dòng trống (khớp engine askUser).
export const askItems = (text?: string) => (text ?? '').split('\n').map((l) => l.trim()).filter(Boolean);

// Dòng chi tiết thẻ: "Gửi 3 email? · 3 mục · có ô nhập"
export function fmtAskUser(s: Partial<Pick<Step, 'message' | 'askItems' | 'askInput'>>): string {
  const n = askItems(s.askItems).length;
  const parts = [s.message?.trim() || '(chưa nhập câu hỏi)', n ? `${n} mục` : '', s.askInput ? 'có ô nhập' : ''];
  return parts.filter(Boolean).join(' · ');
}
