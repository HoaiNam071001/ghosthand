// Cạnh trên canvas flow (bước 20): cong khi đi tới, đường gấp khúc bo góc khi quay lại (vòng lặp).
// Màu: trung tính; đi ra từ cổng thất bại thì nét đứt đỏ nhạt; đã đi qua trong lần chạy thì accent, đang đi thì chạy nét.
// Tên cổng đã ghi trên thẻ nên cạnh không có nhãn; chọn cạnh thì hiện nút × ở giữa để xoá.
import { useT } from '../../i18n';
import { BaseEdge, Edge, EdgeLabelRenderer, EdgeProps, getBezierPath, getSmoothStepPath } from '@xyflow/react';
import { PortKind } from './model';

export type EdgeData = { kind: PortKind; taken?: boolean; active?: boolean; onDelete?: (id: string) => void };
export type FlowEdgeType = Edge<EdgeData, 'flow'>;

export const edgeColor = (d: EdgeData | undefined, selected?: boolean) =>
  selected || d?.taken || d?.active ? 'var(--c-accent)'
    : d?.kind === 'fail' ? 'color-mix(in srgb, var(--c-danger) 60%, transparent)'
    : 'var(--c-line-strong)';

export default function FlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected, markerEnd }: EdgeProps<FlowEdgeType>) {
  const t = useT();
  const back = targetX < sourceX + 24;
  const [path, lx, ly] = back
    ? getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 14, offset: 28 })
    : getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.35 });
  const strong = selected || data?.taken || data?.active;
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} interactionWidth={16}
        className={data?.active ? 'flow-edge-active' : undefined}
        style={{
          stroke: edgeColor(data, selected),
          strokeWidth: strong ? 2.2 : 1.6,
          strokeDasharray: data?.active ? '6 5' : data?.kind === 'fail' && !strong ? '5 4' : undefined,
        }} />
      {selected && data?.onDelete && (
        <EdgeLabelRenderer>
          <button onClick={() => data.onDelete!(id)} aria-label={t('fl.delEdge')} title={t('fl.delEdgeTip')}
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}
            className="nodrag nopan pointer-events-auto absolute grid h-5 w-5 place-items-center rounded-full border border-line bg-surface text-muted hover:text-danger-text">
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
