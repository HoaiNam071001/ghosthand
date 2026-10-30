// Dòng lịch sử chạy hiển thị ở thư viện + hộp thoại Lịch sử chạy (dùng chung): nguồn chạy, giờ, kết quả.
import type { RunSummary } from '../../runStore';

export type LibraryRun = { id?: string; script: string; when: string; result: string; ok: boolean; muted?: boolean; active?: boolean };

const SOURCE: Record<string, string> = { user: 'Chạy tay', schedule: 'Hẹn giờ', cli: 'Dòng lệnh', ai: 'AI' };
const two = (n: number) => String(n).padStart(2, '0');

// "14:32" hôm nay, "14:32 16/10" ngày khác
export const whenOf = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const t = `${two(d.getHours())}:${two(d.getMinutes())}`;
  return d.toDateString() === new Date().toDateString() ? t : `${t} ${two(d.getDate())}/${two(d.getMonth() + 1)}`;
};

export const libraryRun = (h: RunSummary, active = false): LibraryRun => ({
  id: h.id, script: SOURCE[h.source] ?? h.source, when: whenOf(h.startedAt), ok: h.status !== 'fail', muted: h.status === 'stopped',
  result: h.status === 'fail' ? `Thất bại: ${h.error ?? ''}` : h.status === 'stopped' ? 'Đã dừng' : `Thành công${h.message ? `: ${h.message}` : ''}`,
  active,
});

export const runDot = (h: LibraryRun) => (h.muted ? 'bg-muted' : h.ok ? 'bg-ok' : 'bg-danger');

// Thống kê lần chạy (bước 28 R2) – khớp RunStats trong internal/model/runstats.go.
export type RunStats = { runs: number; success: number; fail: number; stopped: number; successPct: number; avgMs: number; topFails: { node: string; count: number }[] };

// Các mẩu dải thống kê: "12 lần chạy" · "83 % thành công" · "trung bình 4,2 s" · "hay lỗi: n3 Click (2)". nodeName: id → tên
// node hiện tại (undefined = node đã xoá).
export function runStatsParts(st: RunStats, nodeName: (id: string) => string | undefined): string[] {
  if (!st.runs) return [];
  const out = [`${st.runs} lần chạy`];
  if (st.success + st.fail) out.push(`${st.successPct} % thành công`);
  if (st.avgMs) out.push(`trung bình ${(st.avgMs / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} s`);
  if (st.topFails.length) out.push(`hay lỗi: ${st.topFails.map((f) => `${nodeName(f.node) ?? 'node đã xoá'} (${f.count})`).join(', ')}`);
  return out;
}
