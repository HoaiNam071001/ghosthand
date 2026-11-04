// Nhóm "AI thử" ở thư viện (61 M5) – phần tính, không React.

const DAY_MS = 24 * 3600 * 1000;

// daysLeft – còn bao nhiêu ngày (làm tròn lên, ít nhất 0) trước khi app tự dọn; days 0 = không dọn → null.
export function daysLeft(lastUsed: number, days: number, now: number): number | null {
  if (days <= 0) return null;
  return Math.max(0, Math.ceil((lastUsed + days * DAY_MS - now) / DAY_MS));
}

// trialNote – dòng giải thích dưới nhóm.
export const trialNote = (days: number) =>
  days > 0 ? `Tự vào Thùng rác sau ${days} ngày không mở. Lưu tay (${navigator.platform.startsWith('Mac') ? '⌘' : 'Ctrl+'}S) để giữ lại.` : 'Không tự dọn (Cài đặt → AI (MCP)).';
