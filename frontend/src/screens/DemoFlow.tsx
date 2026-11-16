// Màn #demo-flow (bước 20 F4a): soạn kịch bản dạng flow kiểu n8n với dữ liệu mẫu – để duyệt giao diện trước khi làm model / engine.
// Sửa được thật trong state cục bộ (kéo node, nối / xoá cạnh, kéo cổng ra chỗ trống để thêm node, sửa inspector),
// không nối Go, không đụng store kịch bản. Thao tác đồ thị đi qua flowEdit.ts (dùng lại ở F4b).
import { useCallback, useEffect, useMemo, useState } from 'react';
import TitleBar from '../components/TitleBar';
import { StatusBar } from '../components/AppChrome';
import DemoRibbon from '../demo/DemoRibbon';
import Backstage from '../components/backstage/Backstage';
import ZoomBar from '../components/shell/ZoomBar';
import EdgeResize from '../components/shell/EdgeResize';
import { requestZoom, sendCanvas, useCanvasZoom } from '../canvasBus';
import { openSettingsDialog } from '../shellStore';
import SettingsDialog from '../components/settings/SettingsDialog';
import Segmented from '../components/Segmented';
import { PaletteGroup, PaletteView } from '../components/PaletteView';
import { InfoKey, NODE_INFO } from '../flow/nodeInfo';
import FlowCanvas from '../components/flow/FlowCanvas';
import RunLog from '../components/flow/RunLog';
import { FlowNodeView } from '../components/flow/model';
import FlowDemoInspector from '../demo/FlowDemoInspector';
import { addConnected, connect, disconnect, Edge, reachable, removeEdge, removeNode } from '../flow/edit';
import { layoutFlow, Positions } from '../flow/layout';
import { nodeCategory } from '../flow/category';
import type { StepType } from '../types';
import { demoInputs } from '../demo/demoScript';
import {
  DemoFlowNode, demoFlowEdges, demoFlowNodes, demoFlowStart, DemoRun, failedRun, newDemoNode, portsOf, runningRun,
} from '../demo/flowDemo';

type Mode = 'edit' | 'running' | 'failed';
type Drop = { from: string; port: string; at: { x: number; y: number } } | null;

export default function DemoFlow() {
  const [nodes, setNodes] = useState<DemoFlowNode[]>(demoFlowNodes);
  const [edges, setEdges] = useState<Edge[]>(demoFlowEdges);
  const [start, setStart] = useState(demoFlowStart);
  const [positions, setPositions] = useState<Positions>({});
  const [fitKey, setFitKey] = useState(0);
  // ?sel=a7 – mở sẵn inspector node khác; ?mode=running | failed – mở thẳng trạng thái chạy mẫu (chụp màn hình để duyệt)
  const [selected, setSelected] = useState<string | null>(() => new URLSearchParams(location.search).get('sel') || 'a2');
  const [mode, setMode] = useState<Mode>(() => (new URLSearchParams(location.search).get('mode') as Mode) || 'edit');
  const [notice, setNotice] = useState('');
  const [drop, setDrop] = useState<Drop>(null);
  const [focus, setFocus] = useState<{ id: string; key: number }>();
  // chọn node + cuộn canvas tới nó (bấm dòng nhật ký, nút → ở Cổng ra, đổi trạng thái chạy)
  const jump = useCallback((id: string) => { setSelected(id); setFocus((f) => ({ id, key: (f?.key ?? 0) + 1 })); }, []);
  const [inputs, setInputs] = useState(demoInputs);
  const [paletteOpen, setPaletteOpen] = useState(false); // mở bằng nút / Ctrl+K – node mới chưa nối

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setDrop(null);
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const run: DemoRun | null = mode === 'running' ? runningRun : mode === 'failed' ? failedRun : null;
  // vào trạng thái chạy: chọn node đang chạy / node lỗi (dòng nhật ký cuối) – chờ canvas xếp xong
  useEffect(() => {
    if (!run || !fitKey) return;
    const t = setTimeout(() => jump(run.rows[run.rows.length - 1].nodeId), 400);
    return () => clearTimeout(t);
  }, [run, fitKey, jump]);

  // Thẻ hiển thị: cổng theo loại node, cảnh báo node không đi tới được, trạng thái của lần chạy mẫu
  const views = useMemo<FlowNodeView[]>(() => {
    const ok = reachable(edges, start);
    return nodes.map(({ body, retry: _, ...n }) => ({
      ...n,
      cat: nodeCategory({ type: n.icon as StepType }),
      ports: portsOf(body),
      warn: ok.has(n.id) ? undefined : 'Không có đường nào đi tới node này – sẽ không bao giờ chạy',
      run: run?.nodes[n.id]?.run,
      visits: run?.nodes[n.id]?.visits,
    }));
  }, [nodes, edges, start, run]);

  const relayout = useCallback((ns: DemoFlowNode[], es: Edge[]) => {
    layoutFlow(ns.map((n) => ({ id: n.id, ports: portsOf(n.body).map((p) => p.id) })), es).then((pos) => {
      setPositions(pos);
      setFitKey((k) => k + 1);
    });
  }, []);
  useEffect(() => relayout(demoFlowNodes, demoFlowEdges), [relayout]);

  const patch = (id: string, p: Partial<DemoFlowNode>) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, ...p } : n)));
  const del = (id: string) => {
    const g = removeNode({ nodes, edges, start }, id);
    setNodes(g.nodes); setEdges(g.edges); setStart(g.start);
    if (selected === id) setSelected(null);
  };

  // Thêm node từ bảng: nối từ cổng vừa thả (chèn vào giữa nếu cổng đã có cạnh), đặt ở chỗ thả
  const add = (type: Parameters<typeof newDemoNode>[0]) => {
    const n = newDemoNode(type, nodes);
    if (drop) {
      const g = addConnected({ nodes, edges }, n, drop.from, drop.port, portsOf(n.body)[0]?.id);
      setNodes(g.nodes); setEdges(g.edges);
      setPositions((p) => ({ ...p, [n.id]: { x: Math.round(drop.at.x), y: Math.round(drop.at.y - 28) } }));
    } else {
      const last = positions[selected ?? ''] ?? { x: 0, y: 0 };
      setNodes([...nodes, n]);
      setPositions((p) => ({ ...p, [n.id]: { x: last.x + 320, y: last.y } }));
    }
    setSelected(n.id);
    setDrop(null);
    setPaletteOpen(false);
  };

  const cur = nodes.find((n) => n.id === selected);
  const curView = views.find((v) => v.id === selected);
  const fromView = drop && views.find((v) => v.id === drop.from);
  const palette = drop !== null || paletteOpen;
  const zoom = useCanvasZoom();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-ink">
      <TitleBar name="Nhắn tin Facebook" unsaved onSettings={openSettingsDialog} canUndo canRedo />
      <div className="relative flex min-h-0 flex-1 flex-col">
        <DemoRibbon notify={setNotice} loop="3 vòng" running={mode === 'running'} onRun={() => setMode(mode === 'running' ? 'edit' : 'running')}
          insert={paletteGroups(add)} acts={{ palette: () => { setDrop(null); setPaletteOpen(true); }, layout: () => relayout(nodes, edges) }}
          extra={
            <span className="flex items-center gap-2 text-xs text-muted">Trạng thái (mẫu)
              <Segmented value={mode} onChange={setMode} label="Trạng thái mẫu"
                options={[{ id: 'edit', label: 'Soạn' }, { id: 'running', label: 'Đang chạy' }, { id: 'failed', label: 'Thất bại' }]} />
            </span>
          } />

      <div className="flex min-h-0 flex-1 border-t border-line">
        <main aria-label="Flow (mẫu)" className="flex min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
            <FlowCanvas nodes={views} edges={edges} start={start} positions={positions} selected={selected} fitKey={fitKey} focus={focus}
              onSelect={setSelected}
              onMove={(id, pos) => setPositions((p) => ({ ...p, [id]: pos }))}
              onConnect={(from, port, to) => setEdges((es) => connect(es, from, port, to))}
              onDeleteEdge={(id) => setEdges((es) => removeEdge(es, id))}
              onDeleteNodes={(ids) => ids.forEach(del)}
              onDropPort={(from, port, _client, at) => setDrop({ from, port, at })}
              taken={run ? new Set(run.taken) : undefined} activeEdge={run?.active} />
          </div>
          {run && <RunLog title={run.title} summary={run.summary} tone={run.ok === null ? 'running' : run.ok ? 'ok' : 'fail'} rows={run.rows} nodes={views} selected={selected} onSelect={jump} />}
        </main>

        {cur && curView && (
          <FlowDemoInspector key={cur.id} node={cur} view={curView} views={views} edges={edges} start={cur.id === start}
            lastRun={run ? [...run.rows].reverse().find((r) => r.nodeId === cur.id) : undefined}
            inputs={inputs} setInputs={setInputs}
            onChange={(p) => patch(cur.id, p)}
            onConnect={(port, to) => setEdges((es) => connect(es, cur.id, port, to))}
            onDisconnect={(port) => setEdges((es) => disconnect(es, cur.id, port))}
            onJump={jump} onSetStart={() => setStart(cur.id)} onDelete={() => del(cur.id)} />
        )}
      </div>
        <Backstage />
      </div>

      <SettingsDialog />
      <StatusBar running={mode === 'running'} mouse="X 1204 Y 388"
        end={<ZoomBar zoom={zoom} onZoom={requestZoom} onIn={() => sendCanvas('zoomIn')} onOut={() => sendCanvas('zoomOut')} onFit={() => sendCanvas('fit')} onReset={() => sendCanvas('zoom100')} />}>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-accent-text">Màn mẫu #demo-flow</span>
        <span>{nodes.length} node</span><span>Bản nháp tự lưu lúc 14:32</span>{notice && <span className="text-accent-text">{notice}</span>}
      </StatusBar>
      <EdgeResize />

      {palette && (
        <PaletteView groups={paletteGroups(add)} onClose={() => { setDrop(null); setPaletteOpen(false); }}
          context={fromView ? <>Nối từ <span className="font-mono">{fromView.ref}</span> · {fromView.ports.find((p) => p.id === drop!.port)?.label}</> : 'Node mới đặt cạnh node đang chọn, chưa nối'}
          footer={<><span><span className="font-mono">Enter</span> thêm node</span><span className="ml-auto">Kéo cổng ra chỗ trống cũng mở bảng này</span></>} />
      )}
    </div>
  );
}

function paletteGroups(add: (t: Parameters<typeof newDemoNode>[0]) => void): PaletteGroup[] {
  const it = (icon: Parameters<typeof newDemoNode>[0], label: string, keywords: string) =>
    ({ icon: icon as never, label, keywords, info: NODE_INFO[icon as InfoKey], run: () => add(icon) });
  return [
    { cat: 'mouse', items: [it('click', 'Click', 'bam chuot'), it('scroll', 'Cuộn', 'scroll'), it('clickImage', 'Click theo ảnh', 'image anh')] },
    { cat: 'kb', items: [it('type', 'Gõ chữ', 'type text'), it('key', 'Phím tắt', 'key enter')] },
    { cat: 'wait', items: [it('wait', 'Chờ', 'wait delay'), it('waitImage', 'Chờ ảnh', 'wait image'), it('waitPixel', 'Chờ màu pixel', 'pixel mau')] },
    { cat: 'data', items: [it('setVar', 'Đặt biến', 'set var bien gan')] },
    { cat: 'app', items: [it('open', 'Mở URL / app', 'url web')] },
    { cat: 'flow', items: [
      it('if', 'Nếu', 'if dieu kien re nhanh else'), it('switchScreen', 'Switch theo màn hình', 'switch case man hinh thay'),
      it('switch', 'Switch theo giá trị', 'switch case gia tri bien'), it('counter', 'Đếm', 'counter lap loop dem'),
      it('end', 'Kết thúc', 'end stop dung ket thuc'),
    ] },
  ];
}
