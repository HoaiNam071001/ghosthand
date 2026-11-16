// Canvas soạn flow kiểu n8n (bước 20) trên @xyflow/react. Chỉ hiển thị + báo thao tác qua callback –
// dữ liệu (node, cạnh, vị trí) do nơi gọi giữ: màn mẫu #demo-flow (state cục bộ) hoặc store kịch bản (F4b, qua flowEdit.ts).
import './flow.css';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background, BackgroundVariant, getNodesBounds, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow, useStore, useStoreApi,
} from '@xyflow/react';
import NodeCard, { CardNode } from './NodeCard';
import NodePopover from './NodePopover';
import FlowEdge, { edgeColor, FlowEdgeType } from './FlowEdge';
import DataEdge, { DataEdgeType } from './DataEdge';
import { isDataHandle, useDataFan } from './dataFan';
import type { DataEdgeView } from '../../flow/dataView';
import { GroupActions, GroupCard, GroupCardNode, GROUP_HANDLE, GroupFrame, GroupFrameNode } from './GroupNodes';
import { CardMode, FlowEdgeView, FlowGroupView, FlowNodeView } from './model';
import type { Positions } from '../../flow/layout';
import { fnOfKey, portForDrag } from '../../flow/dragConnect';
import { onCanvasCommand, onZoomRequest, setCanvasZoom } from '../../canvasBus';

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
  fitKey?: number; // đổi số → vừa màn hình (sau khi xếp lại)
  focus?: { id: string; key: number }; // đổi key → cuộn canvas cho node id ra giữa (giữ zoom)
  taken?: Set<string>; // id cạnh đã đi qua trong lần chạy
  activeEdge?: string; // cạnh đang đi
  groups?: FlowGroupView[]; // khung nhóm (bước 39); nhóm thu gọn ẩn các node thành viên
  groupActions?: GroupActions;
  onMoveGroup?: (id: string, dx: number, dy: number) => void; // kéo khung / thẻ nhóm
  // Dữ liệu giữa node (bước 60): kiểu thẻ, dây dữ liệu (chỉ vẽ ở thẻ Đầy đủ), kéo output → ô; linkBlock = lý do không nối được
  mode?: CardMode;
  dataEdges?: DataEdgeView[];
  onLinkData?: (from: string, key: string, to: string, slot: string) => void;
  linkBlock?: (from: string, to: string) => string | null;
  popover?: ReactNode; // chi tiết node kiểu Popover – hiện dưới node đang chọn
  minimap?: boolean; // bản đồ nhỏ nổi ở góc dưới trái (mặc định bật; vẫn ẩn khi canvas thấp)
};

const nodeTypes = { card: NodeCard, group: GroupFrame, groupCard: GroupCard };
const MIN_FIT = 0.65; // tự vừa màn hình không thu nhỏ hơn mức này (dưới đó chữ trên thẻ không đọc được)
const edgeTypes = { flow: FlowEdge, data: DataEdge };

export default function FlowCanvas(props: FlowCanvasProps) {
  return <ReactFlowProvider><Canvas {...props} /></ReactFlowProvider>;
}

function Canvas({
  nodes, edges, start, positions, selected, picked, onSelect, onSelectBox, onMove, onConnect, onDeleteEdge, onDeleteNodes, onDropPort, onNodeMenu, fitKey, focus,
  taken, activeEdge, groups, groupActions, onMoveGroup, mode = 'compact', dataEdges, onLinkData, linkBlock, popover, minimap = true,
}: FlowCanvasProps) {
  const fan = useDataFan(mode === 'compact', linkBlock);
  const { fanOf } = fan;
  const { fitView, getZoom, getIntersectingNodes, screenToFlowPosition, setCenter, setViewport, zoomIn, zoomOut, zoomTo } = useReactFlow();
  // Thu phóng do nút ngoài canvas ra lệnh (ribbon, status bar) và mức zoom báo ra ngoài – canvasBus
  const zoomNow = useStore((s) => s.transform[2]);
  useEffect(() => {
    setCanvasZoom(zoomNow);
  }, [zoomNow]);
  useEffect(() => onZoomRequest((z) => zoomTo(z)), [zoomTo]);
  useEffect(() => onCanvasCommand((c) => {
    if (c === 'zoomIn') zoomIn({ duration: 150 });
    else if (c === 'zoomOut') zoomOut({ duration: 150 });
    else if (c === 'zoom100') zoomTo(1, { duration: 150 });
    else if (c === 'fit') fitView({ padding: 0.12, maxZoom: 1, duration: 200 });
  }), [zoomIn, zoomOut, zoomTo, fitView]);
  const fnKey = useRef(0); // phím F1..F9 đang giữ (chọn cổng khi kéo node nối node)
  useEffect(() => {
    const set = (e: KeyboardEvent, down: boolean) => {
      const n = fnOfKey(e.code);
      if (!n) return;
      fnKey.current = down ? n : 0;
      if (down) e.preventDefault();
    };
    const dn = (e: KeyboardEvent) => set(e, true), up = (e: KeyboardEvent) => set(e, false);
    window.addEventListener('keydown', dn); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);
  const store = useStoreApi();
  const paneH = useStore((s) => s.height); // canvas thấp (cửa sổ nhỏ / đang mở nhật ký): minimap thu nhỏ, chỉ ẩn khi quá thấp
  const mapSize = paneH > 420 ? { width: 148, height: 92 } : { width: 104, height: 64 };
  const [edgeSel, setEdgeSel] = useState<string | null>(null);

  // Node: React Flow cần giữ `measured` / vị trí lúc kéo trong state riêng – đồng bộ lại từ props mỗi khi dữ liệu đổi.
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<CardNode | GroupFrameNode | GroupCardNode>([]);
  const dragFrom = useRef<Record<string, { x: number; y: number }>>({}); // vị trí thành viên lúc bắt đầu kéo khung
  useEffect(() => {
    const hidden = new Set(groups?.filter((g) => g.collapsed).flatMap((g) => g.members));
    const act = groupActions ?? { onToggle() {}, onUngroup() {}, onDelete() {}, onRename() {}, onColor() {} };
    // khung nằm dưới các thẻ (zIndex -1); thẻ nhóm thu gọn nằm cùng lớp với thẻ node
    const boxes = (groups ?? []).map((g) => g.collapsed
      ? { id: g.id, type: 'groupCard' as const, position: { x: g.box.x, y: g.box.y }, data: { view: g, ...act }, dragHandle: GROUP_HANDLE, selectable: false, deletable: false }
      : { id: g.id, type: 'group' as const, position: { x: g.box.x, y: g.box.y }, data: { view: g, ...act }, dragHandle: GROUP_HANDLE, selectable: false, deletable: false, zIndex: -1 });
    setRfNodes((prev) => [...boxes, ...nodes.filter((v) => !hidden.has(v.id)).map((v) => {
      const old = prev.find((p) => p.id === v.id);
      const data = { view: v, start: v.id === start, linked: edges.filter((e) => e.from === v.id).map((e) => e.port), mode, ...fanOf(v.id) };
      const position = positions[v.id] ?? old?.position ?? { x: 0, y: 0 };
      return { ...old, id: v.id, type: 'card' as const, position, data, selected: v.id === selected || !!picked?.includes(v.id) } as CardNode;
    })]);
  }, [nodes, edges, start, positions, selected, picked, groups, groupActions, setRfNodes, mode, fanOf]);

  const rfEdges = useMemo<(FlowEdgeType | DataEdgeType)[]>(() => [...edges.map((e): FlowEdgeType => {
    const port = nodes.find((n) => n.id === (e.origFrom ?? e.from))?.ports.find((p) => p.id === e.port);
    const data = { kind: port?.kind ?? 'neutral', taken: taken?.has(e.id), active: e.id === activeEdge, onDelete: onDeleteEdge };
    const sel = e.id === edgeSel;
    return {
      id: e.id, source: e.from, sourceHandle: e.fromGroup ? 'out' : e.port, target: e.to, targetHandle: e.toGroup ? 'in' : undefined, type: 'flow' as const, data, selected: sel,
      markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: edgeColor(data, sel) },
      zIndex: sel || data.taken ? 1 : 0,
    };
  }), ...(mode === 'full' ? dataEdges ?? [] : []).map((d): DataEdgeType => ({
    id: d.id, source: d.from, sourceHandle: `o:${d.key}`, target: d.to, targetHandle: `i:${d.slot}`, type: 'data',
    data: { on: d.from === selected || d.to === selected }, selectable: false, focusable: false, zIndex: 2,
  }))], [edges, nodes, taken, activeEdge, edgeSel, onDeleteEdge, mode, dataEdges, selected]);

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

  // Kéo node thả lên node khác kèm phím (xem flow/dragConnect.ts): nối cổng, node về chỗ cũ.
  const linkByDrop = (ev: MouseEvent | TouchEvent, n: { id: string }) => {
    const from = nodes.find((v) => v.id === n.id);
    const target = getIntersectingNodes({ id: n.id }).find((t) => t.type === 'card' && t.id !== n.id);
    const m = ev as MouseEvent;
    const port = from && target && portForDrag(from.ports.map((p) => p.id), { mod: m.ctrlKey || m.metaKey, alt: m.altKey, fn: fnKey.current });
    if (!port || !target) return false;
    const home = positions[n.id];
    if (home) setRfNodes((cur) => cur.map((c) => (c.id === n.id ? { ...c, position: home } : c)));
    onConnect(n.id, port, target.id);
    return true;
  };

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
      onNodeDragStop={(ev, n) => {
        if (n.type === 'card' && linkByDrop(ev, n)) return;
        if (n.type === 'card') return onMove(n.id, { x: Math.round(n.position.x), y: Math.round(n.position.y) });
        const g = groups?.find((x) => x.id === n.id);
        if (g) onMoveGroup?.(g.id, Math.round(n.position.x - g.box.x), Math.round(n.position.y - g.box.y));
      }}
      onNodeClick={(e, n) => { if (n.type !== 'card') return; setEdgeSel(null); onSelect(n.id, e.shiftKey || e.metaKey || e.ctrlKey); }}
      onNodeContextMenu={(e, n) => { if (!onNodeMenu || n.type !== 'card') return; e.preventDefault(); onNodeMenu(n.id, { x: e.clientX, y: e.clientY }); }}
      onEdgeClick={(_, e) => { setEdgeSel(e.id); onSelect(null); }}
      onPaneClick={() => { setEdgeSel(null); onSelect(null); }}
      onConnect={(c) => {
        if (!c.sourceHandle) return;
        if (isDataHandle(c.sourceHandle)) return c.targetHandle?.startsWith('i:') && onLinkData?.(c.source, c.sourceHandle.slice(2), c.target, c.targetHandle.slice(2));
        onConnect(c.source, c.sourceHandle, c.target);
      }}
      isValidConnection={(c) => {
        if (c.source === c.target) return false;
        const dataTo = !!c.targetHandle?.startsWith('i:');
        if (!isDataHandle(c.sourceHandle)) return !dataTo; // cạnh luồng chạy chỉ vào chấm tròn
        return dataTo && !linkBlock?.(c.source, c.target);
      }}
      onNodeMouseEnter={(_, n) => n.type === 'card' && fan.enter(n.id)}
      onNodeMouseLeave={fan.leave}
      onConnectEnd={(ev, st) => {
        if (isDataHandle(st.fromHandle?.id)) { // thả output lên node không nối được → báo lý do (store ghi thông báo)
          const to = st.toNode?.id ?? fan.target; // thả trên thân thẻ (không trúng ô) – node đang toả dưới chuột
          if (!st.isValid && st.fromNode && to && to !== st.fromNode.id) onLinkData?.(st.fromNode.id, st.fromHandle!.id!.slice(2), to, '');
          return;
        }
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
      {popover && selected && <NodePopover nodeId={selected}>{popover}</NodePopover>}
      <Background variant={BackgroundVariant.Dots} gap={18} size={1.4} color="var(--c-dot)" />
      {minimap && paneH > 200 && <MiniMap position="bottom-left" pannable zoomable nodeColor="var(--c-soft)" nodeStrokeColor="var(--c-line-strong)" nodeBorderRadius={6}
        maskColor="color-mix(in srgb, var(--c-bg) 70%, transparent)" style={{ ...mapSize, marginBottom: 10 }} />}
    </ReactFlow>
  );
}


