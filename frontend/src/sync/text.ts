// Chữ hiện cho đồng bộ cloud (bước 54 C8) – hàm thuần, có test. Không React, không Wails.
import type { SyncStatus } from './types';

export type SyncTone = 'off' | 'ok' | 'busy' | 'warn' | 'error';

/** Giờ ngắn "14:05" (hôm nay) hoặc "09/11 14:05"; rỗng / hỏng → "chưa". */
export function clockText(iso: string | undefined, now: Date = new Date()): string {
  if (!iso) return 'chưa';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'chưa';
  const p = (n: number) => String(n).padStart(2, '0');
  const hm = `${p(d.getHours())}:${p(d.getMinutes())}`;
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  return sameDay ? hm : `${p(d.getDate())}/${p(d.getMonth() + 1)} ${hm}`;
}

/** Trạng thái tóm tắt cho chấm trên thanh dưới + dòng trạng thái ở Cài đặt. */
export function syncTone(s: SyncStatus): { tone: SyncTone; text: string } {
  if (!s.loggedIn) return { tone: 'off', text: s.backend === 'mcp' ? 'Chưa kết nối MCP server' : 'Chưa đăng nhập' };
  if (s.running) return { tone: 'busy', text: 'Đang đồng bộ…' };
  if (s.lastError) return { tone: 'error', text: 'Đồng bộ lỗi' };
  const n = s.conflicts?.length ?? 0;
  if (n > 0) return { tone: 'warn', text: `${n} xung đột chờ bạn chọn` };
  if (s.missing?.length) return { tone: 'warn', text: `Thiếu ${s.missing.length} tệp đi kèm` };
  if (s.held?.length) return { tone: 'warn', text: 'Có bản mới chờ bạn lưu kịch bản đang mở' };
  return { tone: 'ok', text: s.lastAt ? `Đã đồng bộ lúc ${clockText(s.lastAt)}` : 'Chưa đồng bộ lần nào' };
}

/** Kết quả lượt gần nhất: "Đẩy 2 · Kéo 1 · Xoá 0" (rỗng khi chưa có gì). */
export function summaryText(s: SyncStatus['summary']): string {
  const parts: string[] = [];
  if (s.pushed) parts.push(`Đẩy lên ${s.pushed}`);
  if (s.pulled) parts.push(`Kéo về ${s.pulled}`);
  if (s.deleted) parts.push(`Xoá ${s.deleted}`);
  if (s.kept?.length) parts.push(`Giữ cả hai ${s.kept.length}`);
  return parts.join(' · ');
}

/** Cụm mật khẩu đủ dài để cất (khớp minPassphraseLen bên Go). */
export const MIN_PASSPHRASE = 8;
export const passphraseOk = (p: string) => [...p].length >= MIN_PASSPHRASE;

/** Chu kỳ tự đồng bộ: phút hợp lệ (0 = tắt, 5–1440) – khớp store.SyncMinInterval / SyncMaxInterval. */
export const INTERVAL_MIN = 5;
export const INTERVAL_MAX = 1440;
export const intervalOk = (m: number) => Number.isInteger(m) && (m === 0 || (m >= INTERVAL_MIN && m <= INTERVAL_MAX));

/** Câu hỏi xung đột: ai đổi gì. */
export function conflictLead(c: { localDeleted: boolean; remoteDeleted: boolean; device: string }): string {
  if (c.localDeleted) return `Bạn đã xoá ở máy này, nhưng ${c.device || 'máy khác'} lại sửa bản trên cloud.`;
  if (c.remoteDeleted) return `${c.device || 'Máy khác'} đã xoá bản trên cloud, nhưng bạn lại sửa ở máy này.`;
  return `Bản ở máy này và bản trên cloud (do ${c.device || 'máy khác'} sửa) khác nhau.`;
}

/** Màu chữ / chấm theo trạng thái (token design v2). */
export const TONE_CLASS: Record<SyncTone, string> = { off: 'text-muted', ok: 'text-ok', busy: 'text-accent-text', warn: 'text-warn', error: 'text-danger-text' };
