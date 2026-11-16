// Node Chờ đến giờ (bước 35 N6) – đọc giờ hẹn (cùng công thức ParseAt, internal/script/at.go – test chung
// testdata/wait_until.json), xem trước "còn bao lâu", đếm ngược trên thanh mini. Chạy ở internal/engine/waituntil.go.
import type { Step } from '../types';
import { getLang, tr } from '../i18n/lang';

// '' = đi tiếp ngay (khớp model.PassedModes)
export type IfPassed = '' | 'tomorrow' | 'fail';
export const PASSED_MODES: { id: IfPassed; label: string }[] = [
  { id: '', get label() { return tr('until.passed.0'); } }, { id: 'tomorrow', get label() { return tr('until.passed.1'); } }, { id: 'fail', get label() { return tr('until.passed.2'); } },
];

const AT_RE = /^\s*(?:(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})\/(\d{1,2})\/(\d{4}))?\s*(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,3}))?)?\s*$/;

// null = sai dạng. dated: có ghi ngày.
export function parseAt(at: string, now: Date): { t: Date; dated: boolean } | null {
  const m = AT_RE.exec(at);
  if (!m) return null;
  const n = (s?: string) => Number(s ?? 0);
  let [y, mo, d, dated] = [now.getFullYear(), now.getMonth() + 1, now.getDate(), false];
  if (m[1]) [y, mo, d, dated] = [n(m[1]), n(m[2]), n(m[3]), true];
  else if (m[4]) [y, mo, d, dated] = [n(m[6]), n(m[5]), n(m[4]), true];
  const [h, mi, s] = [n(m[7]), n(m[8]), n(m[9])];
  const ms = m[10] ? n((m[10] + '00').slice(0, 3)) : 0;
  if (h > 23 || mi > 59 || s > 59 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const t = new Date(y, mo - 1, d, h, mi, s, ms);
  if (t.getDate() !== d) return null; // 31/02
  return { t, dated };
}

// "1 giờ 5 phút" / "3 phút 20 giây" / "12,5 giây"
export function fmtDuration(ms: number): string {
  const s = Math.max(ms, 0) / 1000;
  if (s < 60) return `${s.toLocaleString(getLang() === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 1 })} ${tr('wu2.sec')}`;
  if (s < 3600) return tr('wu2.minSec', { m: Math.floor(s / 60), s: Math.floor(s % 60) });
  return tr('wu2.hourMin', { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60) });
}

// Đếm ngược trên thanh mini: "01:59:30" / "04:05.2"
export function fmtCountdown(ms: number): string {
  const t = Math.max(ms, 0);
  const two = (v: number) => String(Math.floor(v)).padStart(2, '0');
  const h = t / 3600000, m = (t % 3600000) / 60000, s = (t % 60000) / 1000;
  return h >= 1 ? `${two(h)}:${two(m)}:${two(s)}` : `${two(m)}:${s.toFixed(1).padStart(4, '0')}`;
}

// Xem trước trong inspector: còn bao lâu / đã qua thì làm gì. null = có biến (chỉ biết lúc chạy).
export function untilText(s: Pick<Step, 'at' | 'ifPassed'>, now: Date): { text: string; bad: boolean } | null {
  const at = s.at ?? '';
  if (at.includes('{{')) return null;
  const p = parseAt(at, now);
  if (!p) return { text: tr('wu2.badFmt'), bad: true };
  const left = p.t.getTime() - now.getTime();
  if (left > 0) return { text: tr('wu2.left', { d: fmtDuration(left) }), bad: false };
  if (s.ifPassed === 'tomorrow' && !p.dated) return { text: tr('wu2.tomorrow', { d: fmtDuration(left + 86400000) }), bad: false };
  return { text: s.ifPassed === 'fail' ? tr('wu2.passedFail') : tr('wu2.passedGo'), bad: s.ifPassed === 'fail' };
}

export const fmtWaitUntil = (s: Pick<Step, 'at' | 'useNtp'>) => tr('wu2.d', { at: s.at?.trim() || tr('wu2.noAt') }) + (s.useNtp ? ` · ${tr('wu2.ntp')}` : '');
