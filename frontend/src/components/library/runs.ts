// Dòng lịch sử chạy hiển thị ở thư viện + hộp thoại Lịch sử chạy (dùng chung): nguồn chạy, giờ, kết quả.
import { getLang, tr } from '../../i18n/lang';
import type { MsgKey } from '../../i18n/vi';
import type { RunSummary } from '../../runStore';

export type LibraryRun = { id?: string; script: string; when: string; result: string; ok: boolean; muted?: boolean; active?: boolean };

const SOURCE: Record<string, MsgKey | 'AI'> = { user: 'runs.src.user', schedule: 'runs.src.schedule', cli: 'runs.src.cli', ai: 'AI' };
const sourceText = (s: string) => { const k = SOURCE[s]; return k === 'AI' ? 'AI' : k ? tr(k) : s; };
const two = (n: number) => String(n).padStart(2, '0');

// "14:32" hôm nay, "14:32 16/10" ngày khác
export const whenOf = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const t = `${two(d.getHours())}:${two(d.getMinutes())}`;
  return d.toDateString() === new Date().toDateString() ? t : `${t} ${two(d.getDate())}/${two(d.getMonth() + 1)}`;
};

export const libraryRun = (h: RunSummary, active = false): LibraryRun => ({
  id: h.id, script: sourceText(h.source), when: whenOf(h.startedAt), ok: h.status !== 'fail', muted: h.status === 'stopped',
  result: h.status === 'fail' ? tr('runs.res.fail', { err: h.error ?? '' }) : h.status === 'stopped' ? tr('runs.res.stopped') : h.message ? tr('runs.res.okMsg', { msg: h.message }) : tr('runs.res.ok'),
  active,
});

export const runDot = (h: LibraryRun) => (h.muted ? 'bg-muted' : h.ok ? 'bg-ok' : 'bg-danger');

// Thống kê lần chạy (bước 28 R2) – khớp RunStats trong internal/model/runstats.go.
export type RunStats = { runs: number; success: number; fail: number; stopped: number; successPct: number; avgMs: number; topFails: { node: string; count: number }[] };

// Các mẩu dải thống kê: "12 lần chạy" · "83 % thành công" · "trung bình 4,2 s" · "hay lỗi: n3 Click (2)". nodeName: id → tên
// node hiện tại (undefined = node đã xoá).
export function runStatsParts(st: RunStats, nodeName: (id: string) => string | undefined): string[] {
  if (!st.runs) return [];
  const out = [tr('runs.st.runs', { n: st.runs })];
  if (st.success + st.fail) out.push(tr('runs.st.pct', { n: st.successPct }));
  if (st.avgMs) out.push(tr('runs.st.avg', { s: (st.avgMs / 1000).toLocaleString(getLang() === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 }) }));
  if (st.topFails.length) out.push(tr('runs.st.fails', { list: st.topFails.map((f) => `${nodeName(f.node) ?? tr('runs.st.deleted')} (${f.count})`).join(', ') }));
  return out;
}
