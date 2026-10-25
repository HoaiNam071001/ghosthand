// Canvas soạn flow kiểu n8n (bước 20) trên @xyflow/react. Chỉ hiển thị + báo thao tác qua callback –
// dữ liệu (node, cạnh, vị trí) do nơi gọi giữ: màn mẫu #demo-flow (state cục bộ) hoặc store kịch bản (F4b, qua flowEdit.ts).
import './flow.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background, BackgroundVariant, getNodesBounds, MarkerType, MiniMap, Panel, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow, useStore, useStoreApi,
} from '@xyflow/react';
import NodeCard, { CardNode } from './NodeCard';
import FlowEdge, { edgeColor, FlowEdgeType } from './FlowEdge';
import { GroupActions, GroupCard, GroupCardNode, GROUP_HANDLE, GroupFrame, GroupFrameNode } from './GroupNodes';
import { FlowEdgeView, FlowGroupView, FlowNodeView } from './model';
import type { Positions } from '../../flow/layout';

export type FlowCanvasProps = {
  nodes: FlowNodeView[];
  edges: FlowEdgeView[];
  start: string;
  positions: Positions;
  selected: string | null;
  picked?: string[]; // các node chọn cùng lúc (tô như đang chọn)
  onSelect: (id: string | null, additive?: boolean) => void; // additive: Shift / ⌘ / Ctrl + click (thêm / bỏ khỏi nhóm)
  onSelectBox?: (ids: string[]) => void; // Shift + kéo khung trên nền → các node trong khung
  onMove: (id: string, pos: { x: number; y: number }) => void;
  onConnect: (from: string, port: string, to: string) => void;
  onDeleteEdge: (id: string) => void;
  onDeleteNodes?: (ids: string[]) => void; // Delete / Backspace: các node đang chọn (kèm cạnh) – một lần
  // kéo từ cổng ra rồi thả ở chỗ trống → mở bảng thêm node (client = toạ độ màn hình, flow = toạ độ canvas)
  onDropPort?: (from: string, port: string, client: { x: number; y: number }, flow: { x: number; y: number }) => void;
  onNodeMenu?: (id: string, client: { x: number; y: number }) => void; // chuột phải thẻ node
  onLayout?: () => void;
  fitKey?: number; // đổi số → vừa màn hình (sau khi xếp lại)
  focus?: { id: string; key: number }; // đổi key → cuộn canvas cho node id ra giữa (giữ zoom)
  taken?: Set<string>; // id cạnh đã đi qua trong lần chạy
  activeEdge?: string; // cạnh đang đi
  groups?: FlowGroupView[]; // khung nhóm (bước 39); nhóm thu gọn ẩn các node thành viên
  groupActions?: GroupActions;
  onMoveGroup?: (id: string, dx: number, dy: number) => void; // kéo khung / thẻ nhóm
};

const nodeTypes = { card: NodeCard, group: GroupFrame, groupCard: GroupCard };
const MIN_FIT = 0.65; // tự vừa màn hình không thu nhỏ hơn mức này (dưới đó chữ trên thẻ không đọc được)
const edgeTypes = { flow: FlowEdge };

export default function FlowCanvas(props: FlowCanvasProps) {
  return <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>;
}

function Canvas({
  nodes, edges, start, positions, selected, picked, onSelect, onSelectBox, onMove, onConnect, onDeleteEdge, onDeleteNodes, onDropPort, onNodeMenu, onLayout, fitKey, focus,
  taken, activeEdge, groups, groupActions, onMoveGroup,
}: FlowCanvasProps) {
  const { fitView, getZoom, screenToFlowPosition, setCenter, setViewport, zoomIn, zoomOut } = useReactFlow();
  const store = useStoreApi();
  const tall = useStore((s) => s.height > 520); // canvas thấp (đang mở nhật ký) thì ẩn minimap cho đỡ che node
  const [edgeSel, setEdgeSel] = useState<string | null>(null);

  // Node: React Flow cần giữ `measured` / vị trí lúc kéo trong state riêng – đồng bộ lại từ props mỗi khi dữ liệu đổi.
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<CardNode | GroupFrameNode | GroupCardNode>([]);
  const dragFrom = useRef<Record<string, { x: number; y: number }>>({}); // vị trí thành viên lúc bắt đầu kéo khung
  useEffect(() => {
    const hidden = new Set(groups?.filter((g) => g.collapsed).flatMap((g) => g.members));
    const act = groupActions ?? { onToggle() {}, onUngroup() {}, onRename() {}, onColor() {} };
    // khung nằm dưới các thẻ (zIndex -1); thẻ nhóm thu gọn nằm cùng lớp với thẻ node
    const boxes = (groups ?? []).map((g) => g.collapsed
      ? { id: g.id, type: 'groupCard' as const, position: { x: g.box.x, y: g.box.y }, data: { view: g, ...act }, dragHandle: GROUP_HANDLE, selectable: false, deletable: false }
      : { id: g.id, type: 'group' as const, position: { x: g.box.x, y: g.box.y }, data: { view: g, ...act }, dragHandle: GROUP_HANDLE, selectable: false, deletable: false, zIndex: -1 });
    setRfNodes((prev) => [...boxes, ...nodes.filter((v) => !hidden.has(v.id)).map((v) => {
      const old = prev.find((p) => p.id === v.id);
      const data = { view: v, start: v.id === start, linked: edges.filter((e) => e.from === v.id).map((e) => e.port) };
      const position = positions[v.id] ?? old?.position ?? { x: 0, y: 0 };
      return { ...old, id: v.id, type: 'card' as const, position, data, selected: v.id === selected || !!picked?.includes(v.id) } as CardNode;
    })]);
  }, [nodes, edges, start, positions, selected, picked, groups, groupActions, setRfNodes]);

  const rfEdges = useMemo<FlowEdgeType[]>(() => edges.map((e) => {
    const port = nodes.find((n) => n.id === (e.origFrom ?? e.from))?.ports.find((p) => p.id === e.port);
    const data = { kind: port?.kind ?? 'neutral', taken: taken?.has(e.id), active: e.id === activeEdge, onDelete: onDeleteEdge };
    const sel = e.id === edgeSel;
    return {
      id: e.id, source: e.from, sourceHandle: e.fromGroup ? 'out' : e.port, target: e.to, targetHandle: e.toGroup ? 'in' : undefined, type: 'flow' as const, data, selected: sel,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: edgeColor(data, sel) },
      zIndex: sel || data.taken ? 1 : 0,
    };
  }), [edges, nodes, taken, activeEdge, edgeSel, onDeleteEdge]);

  // Tự vừa màn hình sau khi xếp: flow nhỏ thì vừa khít; flow quá rộng thì giữ zoom MIN_FIT và đặt mép trái
  // (node bắt đầu) sát cạnh trái – kéo / cuộn để xem tiếp, nút "Vừa màn hình" mới thu toàn bộ.
  const smartFit = useCallback(() => {
    const { width, height, nodeLookup } = store.getState();
    const all = [...nodeLookup.values()];
    if (!all.length || !width) return;
    const b = getNodesBounds(all);
    const pad = 40;
    const zoom = Math.min(1, (width - 2 * pad) / b.width, (height - 2 * pad) / b.height);
    if (zoom >= MIN_FIT) return void fitView({ padding: 0.12, maxZoom: 1, duration: 200 });
    const z = MIN_FIT;
    const y = b.height * z < height - 2 * pad ? height / 2 - (b.y + b.height / 2) * z : pad - b.y * z;
    setViewport({ x: pad - b.x * z, y, zoom: z }, { duration: 200 });
  }, [store, fitView, setViewport]);

  useEffect(() => {
    if (!fitKey) return;
    const t = setTimeout(smartFit, 60);
    return () => clearTimeout(t);
  }, [fitKey, smartFit]);

  useEffect(() => {
    if (!focus) return;
    const n = store.getState().nodeLookup.get(focus.id);
    if (!n) return;
    const { x, y } = n.internals.positionAbsolute;
    setCenter(x + (n.measured.width ?? 0) / 2, y + (n.measured.height ?? 0) / 2, { zoom: getZoom(), duration: 250 });
  }, [focus, store, setCenter, getZoom]);

  return (
    <ReactFlow className="flow-canvas" nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onNodeDragStart={(_, n) => {
        if (n.type === 'group') dragFrom.current = Object.fromEntries(groups?.find((g) => g.id === n.id)?.members.flatMap((m) => (positions[m] ? [[m, positions[m]]] : [])) ?? []);
      }}
      onNodeDrag={(_, n) => {
        if (n.type !== 'group') return;
        const g = groups?.find((x) => x.id === n.id);
        if (!g) return;
        const dx = n.position.x - g.box.x, dy = n.position.y - g.box.y;
        setRfNodes((cur) => cur.map((c) => (dragFrom.current[c.id] ? { ...c, position: { x: dragFrom.current[c.id].x + dx, y: dragFrom.current[c.id].y + dy } } : c)));
      }}
      onNodeDragStop={(_, n) => {
        if (n.type === 'card') return onMove(n.id, { x: Math.round(n.position.x), y: Math.round(n.position.y) });
        const g = groups?.find((x) => x.id === n.id);
        if (g) onMoveGroup?.(g.id, Math.round(n.position.x - g.box.x), Math.round(n.position.y - g.box.y));
      }}
      onNodeClick={(e, n) => { if (n.type !== 'card') return; setEdgeSel(null); onSelect(n.id, e.shiftKey || e.metaKey || e.ctrlKey); }}
      onNodeContextMenu={(e, n) => { if (!onNodeMenu || n.type !== 'card') return; e.preventDefault(); onNodeMenu(n.id, { x: e.clientX, y: e.clientY }); }}
      onEdgeClick={(_, e) => { setEdgeSel(e.id); onSelect(null); }}
      onPaneClick={() => { setEdgeSel(null); onSelect(null); }}
      onConnect={(c) => c.sourceHandle && onConnect(c.source, c.sourceHandle, c.target)}
      isValidConnection={(c) => c.source !== c.target}
      onConnectEnd={(ev, st) => {
        if (st.isValid || !st.fromNode || !st.fromHandle?.id || st.fromHandle.type !== 'source' || !onDropPort) return;
        const pt = 'changedTouches' in ev ? ev.changedTouches[0] : ev;
        onDropPort(st.fromNode.id, st.fromHandle.id, { x: pt.clientX, y: pt.clientY }, screenToFlowPosition({ x: pt.clientX, y: pt.clientY }));
      }}
      onSelectionEnd={() => onSelectBox?.(store.getState().nodes.filter((n) => n.selected && n.type === 'card').map((n) => n.id))}
      onDelete={({ nodes: ns, edges: es }) => {
        if (ns.length) return onDeleteNodes?.(ns.map((n) => n.id)); // cạnh nối vào node xoá đi theo node
        es.forEach((e) => onDeleteEdge(e.id));
      }}
      deleteKeyCode={['Delete', 'Backspace']}
      connectionLineStyle={{ stroke: 'var(--c-accent)', strokeWidth: 2 }}
      minZoom={0.3} maxZoom={1.6} proOptions={{ hideAttribution: true }}>
      <Background variant={BackgroundVariant.Dots} gap={18} size={1.4} color="var(--c-dot)" />
      {tall && <MiniMap pannable zoomable nodeColor="var(--c-soft)" nodeStrokeColor="var(--c-line-strong)" nodeBorderRadius={6}
        maskColor="color-mix(in srgb, var(--c-bg) 70%, transparent)" style={{ width: 148, height: 92 }} />}
      <Panel position="bottom-left" className="flex gap-1.5">
        <div className="flex gap-1 rounded-control border border-line bg-surface p-1 shadow-[0_1px_3px_rgb(0_0_0/.06)]">
          <ToolBtn label="Phóng to" onClick={() => zoomIn({ duration: 150 })} d="M12 5v14M5 12h14" />
          <ToolBtn label="Thu nhỏ" onClick={() => zoomOut({ duration: 150 })} d="M5 12h14" />
          <ToolBtn label="Vừa màn hình" onClick={() => fitView({ padding: 0.12, maxZoom: 1, duration: 200 })} d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
          {onLayout && <ToolBtn label="Sắp xếp lại tự động" onClick={onLayout} d="M4 5h6v5H4zM14 14h6v5h-6zM10 7.5h2a2 2 0 0 1 2 2v7" />}
        </div>
        <span tabIndex={0} aria-label="Phím tắt canvas" title={HELP}
          className="grid h-9 w-9 cursor-help place-items-center rounded-control border border-line bg-surface font-semibold text-muted shadow-[0_1px_3px_rgb(0_0_0/.06)]">?</span>
      </Panel>
    </ReactFlow>
  );
}

const HELP = 'Kéo từ chấm cổng ra sang node để nối · thả ở chỗ trống để thêm node · Shift + kéo chọn nhiều · Delete xoá';

function ToolBtn({ label, onClick, d }: { label: string; onClick: () => void; d: string }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-hover hover:text-ink">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
    </button>
  );
}
