// Canvas flow của màn chính (bước 20 F4b): nối FlowCanvas (chỉ hiển thị) với store kịch bản.
// Dữ liệu thẻ tính ở flow/view.ts; mọi thao tác (nối, xoá, dời, thêm node) gọi hàm store – component không tự sửa script.
import { useEffect, useMemo, useState } from 'react';
import FlowCanvas from './FlowCanvas';
import FlowHeader, { headerBtn } from './FlowHeader';
import EmbedMenu from './EmbedMenu';
import AddStepPalette from '../AddStepPalette';
import { Region } from '../icons';
import { layoutFlow } from '../../flow/layout';
import { portsOf } from '../../flow/model';
import { groupViews, routeEdges } from '../../flow/groups';
import { nodeViews } from '../../flow/view';
import { missingOf, needsOf } from '../../flow/perms';
import { usePerms } from '../../store/permStore';
import { runHead, runRows, runTrace } from '../../flow/run';
import RunLog from './RunLog';
import NodeMenu from './NodeMenu';
import { nodeMenuItems } from './nodeMenuItems';
import {
  applyLayout, clearInsertAt, connectPort, copySelected, insertAfterSelected, moveNode, pasteClip, removeEdge, removeSteps, selectNodes, selectStep,
  deleteGroup, getEditor, groupPicked, moveGroup, renameGroup, setGroupColor, setInsertAt, setRegion, toggleGroup, toggleMultiStep, ungroup, useEditor,
} from '../../store';
import { stepInputCount } from '../../scriptInputs';
import { useEngine } from '../../engineStore';
import { startRun } from '../../runForm';
import { pinResult, unpin, usePins } from '../../pinStore';
import { closeRunLog, shotUrl, useRunLog } from '../../runStore';
import { openOverlay } from '../../windowMode';
import type { Script } from '../../types';

const groupActions = { onToggle: toggleGroup, onUngroup: ungroup, onDelete: deleteGroup, onRename: renameGroup, onColor: setGroupColor };
const isMac = navigator.platform.startsWith('Mac');

// Xếp tự động cho kịch bản (vị trí theo id node)
const layoutOf = (sc: Script) => layoutFlow(sc.steps.map((s) => ({ id: s.id, ports: portsOf(s) })), sc.edges);

export default function FlowEditor() {
  const { script, selected, picked, path } = useEditor();
  const { running, progress, failedStep } = useEngine();
  const log = useRunLog();
  const [palette, setPalette] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const pins = usePins();
  const [menu, setMenu] = useState<{ id: string; x: number; y: number }>();
  const [focus, setFocus] = useState<{ id: string; key: number }>();

  // Trạng thái chạy trên thẻ + cạnh đã đi: từ nhật ký lần đang xem (đóng nhật ký thì thôi tô).
  // failedStep: lỗi không gắn với kết quả node nào (vd lặp quá 10 000 node) vẫn tô đỏ node đó.
  const trace = useMemo(() => {
    const t = runTrace(log.open ? log.results : [], script.edges, running ? progress?.nodeId : undefined);
    if (log.open && failedStep && !t.nodes.has(failedStep)) t.nodes.set(failedStep, { run: 'fail' });
    return t;
  }, [log.open, log.results, script.edges, running, progress?.nodeId, failedStep]);
  const { items: permItems } = usePerms();
  const views = useMemo(() => nodeViews(script, { inputs: (id) => stepInputCount(script, id), run: trace.nodes, pinned: (id) => id in pins }).map((v) => {
    const step = script.steps.find((s) => s.id === v.id);
    if (!step?.enabled) return v;
    const lack = missingOf(permItems, needsOf(step)).map((id) => permItems?.find((it) => it.id === id)?.name ?? id);
    return lack.length ? { ...v, warn: [v.warn, `Thiếu quyền: ${lack.join(', ')}`].filter(Boolean).join('\n') } : v;
  }), [script, trace, pins, permItems]);
  const rows = useMemo(() => (log.open ? runRows(log.results, script.steps, script.edges) : []), [log.open, log.results, script.steps, script.edges]);
  const head = runHead(log.results, log.summary, log.live, running);
  const jump = (id: string) => {
    selectStep(id);
    setFocus((f) => ({ id, key: (f?.key ?? 0) + 1 }));
  };
  const positions = useMemo(() => Object.fromEntries(script.steps.flatMap((s) => (s.pos ? [[s.id, s.pos]] : []))), [script.steps]);
  const groups = useMemo(() => groupViews(script.groups, positions, script.steps.map((st) => ({ id: st.id, ports: portsOf(st) }))), [script.groups, positions, script.steps]);
  const edges = useMemo(() => routeEdges(script.edges, script.groups), [script.edges, script.groups]);

  // Mở kịch bản khác: node chưa có vị trí (file viết tay / AI tạo) thì tự xếp – không tính là sửa; xong thì vừa màn hình.
  useEffect(() => {
    const sc = script;
    if (sc.steps.some((s) => !s.pos)) layoutOf(sc).then((pos) => { applyLayout(pos, true); setFitKey((k) => k + 1); });
    else setFitKey((k) => k + 1);
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl+K (macOS: Cmd+K) mở / đóng bảng thêm node – node mới nối sau cổng success của node đang chọn.
  // Ctrl+C / V chép / dán node đang chọn, Ctrl+A chọn mọi node – trừ khi đang gõ trong ô nhập.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(isMac ? e.metaKey : e.ctrlKey) || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      if (k === 'k') {
        e.preventDefault();
        return setPalette((open) => {
          if (open) clearInsertAt();
          else insertAfterSelected();
          return !open;
        });
      }
      const typing = (e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable="true"]');
      if (typing || !(k === 'c' || k === 'v' || k === 'a' || k === 'g')) return;
      e.preventDefault();
      if (k === 'g') groupPicked();
      else if (k === 'c') copySelected();
      else if (k === 'v') pasteClip();
      else selectNodes(getEditor().script.steps.map((s) => s.id));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const openPalette = () => {
    insertAfterSelected();
    setPalette(true);
  };

  const { region } = script;
  return (
    <main aria-label="Flow" className="flex min-w-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <FlowHeader count={script.steps.length}>
          <button onClick={() => openOverlay('region')} title="Chọn vùng trên màn hình – toạ độ điểm tính theo vùng" className={`${headerBtn} text-muted hover:text-ink`}>
            <Region className="h-3.5 w-3.5" />
            {region ? <span className="font-mono">Vùng {region.w} × {region.h}</span> : 'Toàn màn hình'}
          </button>
          {region && (
            <button onClick={() => setRegion(null)} aria-label="Về toàn màn hình" title="Về toàn màn hình"
              className="grid h-8 w-8 place-items-center rounded-control text-muted hover:bg-hover hover:text-ink">✕</button>
          )}
          {picked.length > 1 && (
            <button onClick={groupPicked} title="Gom các node đang chọn vào một khung" className={headerBtn}>
              Nhóm lại <span className="font-mono text-[11px] text-muted">{isMac ? '⌘G' : 'Ctrl+G'}</span>
            </button>
          )}
          <EmbedMenu />
          <button onClick={openPalette} className={headerBtn}>
            + Thêm node <span className="font-mono text-[11px] text-muted">{isMac ? '⌘K' : 'Ctrl+K'}</span>
          </button>
        </FlowHeader>
        <FlowCanvas nodes={views} edges={edges} groups={groups} groupActions={groupActions} onMoveGroup={moveGroup} start={script.start} positions={positions} selected={selected || null} picked={picked} fitKey={fitKey}
          focus={focus} taken={trace.taken} activeEdge={trace.active}
          onSelect={(id, additive) => {
            if (id && additive) return toggleMultiStep(id);
            selectStep(id ?? '');
            selectNodes([]);
          }}
          onSelectBox={selectNodes}
          onMove={moveNode}
          onConnect={connectPort}
          onDeleteEdge={removeEdge}
          onDeleteNodes={removeSteps}
          onDropPort={(from, port, _client, pos) => {
            setInsertAt({ from, port, pos: { x: Math.round(pos.x), y: Math.round(pos.y - 28) } });
            setPalette(true);
          }}
          onNodeMenu={(id, c) => setMenu({ id, x: c.x, y: c.y })}
          onLayout={() => layoutOf(script).then((pos) => { applyLayout(pos); setFitKey((k) => k + 1); })} />
        {script.steps.length === 0 && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-center text-muted">
            Chưa có node nào – bấm “+ Thêm node” hoặc F6 để lưu vị trí chuột.
          </p>
        )}
      </div>

      {log.open && (
        <RunLog key={log.summary?.id ?? 'live'} title={head.title} summary={head.summary} tone={head.tone} rows={rows} nodes={views} selected={selected || null}
          onSelect={jump} onClose={closeRunLog} loadShot={shotUrl} />
      )}

      {menu && (
        <NodeMenu x={menu.x} y={menu.y} title={script.steps.find((s) => s.id === menu.id)?.ref ?? ''} onClose={() => setMenu(undefined)}
          items={nodeMenuItems({
            id: menu.id, ref: script.steps.find((s) => s.id === menu.id)?.ref ?? '', running, picked, pinned: menu.id in pins,
            last: log.results.findLast((r) => r.nodeId === menu.id), seedRun: log.live && !running ? log.summary?.id : undefined,
            run: (dbg) => void startRun(false, dbg), pin: (r) => void pinResult(r), unpin: (id) => void unpin(id),
          })} />
      )}
      {palette && <AddStepPalette onClose={() => setPalette(false)} onCancel={clearInsertAt} />}
    </main>
  );
}
