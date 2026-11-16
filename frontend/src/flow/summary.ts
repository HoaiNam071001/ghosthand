// Tóm tắt một dòng cho đầu khối thu gọn của inspector (design v3, bước 38): hiện bên phải tên khối khi đóng,
// để không phải mở từng khối mới biết node đang cài gì. Hàm thuần – test ở summary.test.ts.
import type { FlowEdgeView, PortView } from '../components/flow/model';
import { tr } from '../i18n/lang';
import { fmtMs, Retry } from '../types';

// Thời gian: chờ sau node (hoặc thời gian chờ của node Chờ) ± ngẫu nhiên. Ô nhận biến thì ghi biến.
export function timingSummary(delay: number | string, jitter: number | string = 0): string {
  if (typeof delay === 'string') return tr('sum.wait', { v: delay });
  if (typeof jitter === 'string') return tr('sum.waitJit', { d: fmtMs(delay), j: jitter });
  if (!delay && !jitter) return tr('sum.noWait');
  if (!jitter) return tr('sum.waitFixed', { d: fmtMs(delay) });
  const lo = Math.max(delay - jitter, 0), hi = delay + jitter;
  return hi < 1000 ? tr('sum.waitRangeMs', { lo, hi }) : tr('sum.waitRange', { lo: fmtMs(lo), hi: fmtMs(hi) });
}

export function retrySummary(r: Retry | undefined): string {
  if (!r?.count) return tr('sum.noRetry');
  return tr('sum.retry', { n: r.count, d: fmtMs(r.delayMs ?? 0) });
}

const short = (p: PortView) => (p.id === 'success' ? tr('sum.ok') : p.id === 'fail' ? tr('sum.err') : p.label);
// Cổng ra: "ok → n4 · lỗi → dừng". Nhiều hơn 2 cổng thì chỉ đếm: "3 cổng · 2 đã nối".
export function portsSummary(nodeId: string, ports: PortView[], edges: FlowEdgeView[], refOf: (id: string) => string): string {
  if (!ports.length) return tr('sum.noPorts');
  const to = (p: PortView) => edges.find((e) => e.from === nodeId && e.port === p.id)?.to;
  if (ports.length > 2) return tr('sum.portsCount', { n: ports.length, m: ports.filter(to).length });
  return ports.map((p) => {
    const t = to(p);
    return `${short(p)} → ${t ? refOf(t) : p.kind === 'fail' ? tr('sum.stop') : tr('sum.end')}`;
  }).join(' · ');
}

export const outputsSummary = (n: number) => tr('sum.vars', { n });
