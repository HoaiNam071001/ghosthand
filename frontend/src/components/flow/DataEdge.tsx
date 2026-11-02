// Dây dữ liệu (bước 60): output của node này → ô của node kia, nét đứt màu nhóm dữ liệu; sáng khi chọn một trong hai node.
// Không bấm / xoá được trên canvas – bỏ nối ở ô VÀO (inspector tab Dữ liệu).
import { BaseEdge, Edge, EdgeProps, getBezierPath, getSmoothStepPath } from '@xyflow/react';

export type DataEdgeData = { on?: boolean };
export type DataEdgeType = Edge<DataEdgeData, 'data'>;

export default function DataEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<DataEdgeType>) {
  const back = targetX < sourceX + 24;
  const [path] = back
    ? getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12, offset: 18 })
    : getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.3 });
  return <BaseEdge id={id} path={path} interactionWidth={0} className={`flow-data-edge ${data?.on ? 'on' : ''}`} />;
}
