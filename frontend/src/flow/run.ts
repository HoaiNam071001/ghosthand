// Kết quả lần chạy (StepResult[] – event engine:node hoặc lịch sử chạy) → dữ liệu hiển thị: trạng thái từng thẻ,
// cạnh đã đi, dòng bảng Nhật ký (bước 20 F5). Hàm thuần, test ở run.test.ts.
import { getLang, tr } from '../i18n/lang';
import type { LogLine, RunRow, RunState } from '../components/flow/model';
import type { Edge, Step, StepResult } from '../types';

export type NodeRun = { run: RunState; visits?: number };
export type Trace = {
  nodes: Map<string, NodeRun>;
  taken: Set<string>; // id cạnh đã đi qua
  active?: string; // cạnh vừa đi vào node đang chạy
};

const RUN_STATE: Record<StepResult['status'], RunState | undefined> = { success: 'ok', fail: 'fail', skipped: 'skipped', cancelled: undefined };

const edgeOf = (edges: Edge[], from: string, port?: string) => (port ? edges.find((e) => e.from === from && e.port === port) : undefined);

// running: id node đang chạy (lúc đang chạy), node đó hiện "đang chạy" thay cho kết quả lần trước.
export function runTrace(results: StepResult[], edges: Edge[], running?: string): Trace {
  const nodes = new Map<string, NodeRun>();
  const taken = new Set<string>();
  results.forEach((r, i) => {
    const visits = (nodes.get(r.nodeId)?.visits ?? 0) + 1;
    nodes.set(r.nodeId, { run: RUN_STATE[r.status] ?? nodes.get(r.nodeId)?.run ?? 'skipped', visits });
    const next = results[i + 1];
    const e = edgeOf(edges, r.nodeId, r.port);
    if (e && next && next.loop === r.loop && next.nodeId === e.to) taken.add(e.id);
  });
  let active: string | undefined;
  if (running) {
    nodes.set(running, { run: 'running', visits: nodes.get(running)?.visits });
    const last = results[results.length - 1];
    const e = last && edgeOf(edges, last.nodeId, last.port);
    if (e?.to === running) {
      active = e.id;
      taken.add(e.id);
    }
  }
  return { nodes, taken, active };
}

const two = (n: number) => String(n).padStart(2, '0');
export const clockOf = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`;
};
const secs = (ms: number) => `+${(ms / 1000).toFixed(1).replace('.', ',')}`;

// Một dòng mỗi lần chạy node; cột "đi tiếp": mã node kế (cùng vòng), không có thì "dừng" (thất bại) / "hết".
export function runRows(results: StepResult[], steps: Pick<Step, 'id' | 'ref'>[], edges: Edge[]): RunRow[] {
  const refs = new Map(steps.map((s) => [s.id, s.ref]));
  return results.map((r, i) => {
    const after = results[i + 1];
    const to = after && after.loop === r.loop ? after.nodeId : edgeOf(edges, r.nodeId, r.port)?.to;
    const logs: LogLine[] | undefined = r.logs?.map((l) => ({ t: secs(l.atMs), level: l.level, msg: l.msg }));
    return {
      nodeId: r.nodeId,
      at: clockOf(r.startedAt),
      loop: r.loop,
      status: r.status,
      port: r.port || undefined,
      next: to ? refs.get(to) ?? '?' : r.status === 'cancelled' ? undefined : r.status === 'fail' ? tr('rn.stop') : r.port ? tr('rn.end') : undefined,
      ms: r.durationMs,
      attempts: r.attempts,
      output: r.output && Object.keys(r.output).length ? r.output : undefined,
      error: r.error,
      logs,
      shot: r.shot,
    };
  });
}

// Lần chạy cuối của node trong danh sách dòng (mục "Lần chạy gần nhất" của inspector).
export const lastRowOf = (rows: RunRow[], id: string) => {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].nodeId === id) return rows[i];
  return undefined;
};

// Tóm tắt lần chạy cho tiêu đề bảng Nhật ký / thanh trạng thái.
export type RunHead = { title: string; summary: string; tone: 'ok' | 'fail' | 'running' | 'muted' };
export function runHead(
  results: StepResult[], sum: { status: 'success' | 'fail' | 'stopped'; error?: string; message?: string; durationMs: number; nodes: number; startedAt: string } | null,
  live: boolean, running: boolean,
): RunHead {
  const at = sum?.startedAt ?? results[0]?.startedAt;
  const d = at ? new Date(at) : null;
  const when = d && !isNaN(d.getTime()) ? clockOf(at!) : '';
  const title = live ? tr('rn.liveTitle', { w: when }) : tr('rn.histTitle', { w: when, d: d ? `${two(d.getDate())}/${two(d.getMonth() + 1)}` : '' });
  const n = sum?.nodes ?? results.length;
  if (!sum) return { title, summary: running ? tr('rn.running', { n }) : tr('rn.nodes', { n }), tone: running ? 'running' : 'muted' };
  const took = tr('rn.took', { n, s: (sum.durationMs / 1000).toFixed(1).replace('.', getLang() === 'en' ? '.' : ',') });
  if (sum.status === 'fail') return { title, summary: tr('rn.failed', { e: sum.error ?? '' }), tone: 'fail' };
  if (sum.status === 'stopped') return { title, summary: tr('rn.stopped', { t: took }), tone: 'muted' };
  return { title, summary: tr('rn.ok', { m: sum.message ? ` · ${sum.message}` : '', t: took }), tone: 'ok' };
}
