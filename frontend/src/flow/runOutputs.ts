// Gom output của mọi node trong một lần chạy để xem / chép một chỗ (Lịch sử → Tất cả output, bước 49).
import type { FlowNodeView, RunRow } from '../components/flow/model';

export type OutputBlock = {
  key: string; // n2 – nhiều vòng thì n2#3 (vòng 3): khoá khi chép JSON
  ref: string;
  title: string;
  loop: number;
  at: string;
  status: RunRow['status'];
  output: Record<string, unknown>;
};

export function outputBlocks(rows: RunRow[], nodes: Pick<FlowNodeView, 'id' | 'ref' | 'title'>[]): OutputBlock[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const multiLoop = new Set(rows.map((r) => r.loop ?? 1)).size > 1;
  const seen = new Map<string, number>(); // node chạy nhiều lần trong cùng một vòng (thử lại) → thêm số lần
  const out: OutputBlock[] = [];
  for (const r of rows) {
    if (!r.output) continue;
    const n = byId.get(r.nodeId);
    const ref = n?.ref ?? '?';
    const loop = r.loop ?? 1;
    const base = multiLoop ? `${ref}#${loop}` : ref;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    out.push({ key: count > 1 ? `${base}.${count}` : base, ref, title: n?.title ?? 'node đã xoá', loop, at: r.at, status: r.status, output: r.output });
  }
  return out;
}

// Chuỗi hiển thị một giá trị: chữ giữ nguyên, còn lại JSON.
export const valueText = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v, null, 1) ?? String(v));

export const blockJson = (b: OutputBlock) => JSON.stringify(b.output, null, 2);

export const allOutputsJson = (blocks: OutputBlock[]) => JSON.stringify(Object.fromEntries(blocks.map((b) => [b.key, b.output])), null, 2);
