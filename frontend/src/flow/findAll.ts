// Node Tìm tất cả (bước 42 G3, engine/findall.go): chữ hiển thị số chỗ cần thấy và kết quả Thử tìm.
import { tr } from '../i18n/lang';
import type { Step } from '../types';

type Counts = Pick<Step, 'minCount' | 'maxCount'>;

// Khoảng số chỗ chấp nhận: "≥ 1", "2–5" (minCount 0 = 1, maxCount 0 = không giới hạn) – khớp countOK ở Go.
export function countRange(s: Counts): string {
  const lo = Math.max(s.minCount ?? 0, 1);
  return s.maxCount ? (s.maxCount === lo ? `${lo}` : `${lo}–${s.maxCount}`) : `≥ ${lo}`;
}

export const countOK = (s: Counts, n: number) => n >= Math.max(s.minCount ?? 0, 1) && (!s.maxCount || n <= s.maxCount);

// Một dòng kết quả Thử tìm: "Thấy 6 chỗ · 420 ms" / "Thấy 2 chỗ – cần ≥ 6".
export function findAllSummary(f: { count?: number; ms?: number; fromRun?: boolean }, s: Counts): string {
  const n = f.count ?? 0;
  const ms = f.ms ? ` · ${f.ms} ms` : '';
  if (f.fromRun) return tr('fx.fa.prev', { n, r: countRange(s) });
  return countOK(s, n) ? tr('fx.fa.ok', { n, ms }) : tr('fx.fa.bad', { n, r: countRange(s), ms });
}
