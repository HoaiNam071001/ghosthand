// Màn #demo-data (bước 60): canvas flow với dữ liệu giữa node – thẻ Gọn (rê để toả cổng) / Đầy đủ (VÀO / RA), kéo output
// sang ô VÀO để nối, chặn nối về node chạy trước. Kịch bản mẫu Bảng giá + lần chạy giả (?run=1 hiện giá trị lượt cuối),
// sửa trong state cục bộ (không store, không Go). ?mode=full mở thẳng thẻ Đầy đủ.
import { useCallback, useEffect, useMemo, useState } from 'react';
import FlowCanvas from '../components/flow/FlowCanvas';
import FlowHeader from '../components/flow/FlowHeader';
import ViewMenu from '../components/flow/ViewMenu';
import { CardMode, ioHeight } from '../components/flow/model';
import { nodeViews } from '../flow/view';
import { portsOf } from '../flow/model';
import { layoutFlow, Positions } from '../flow/layout';
import { dataEdges, dataPins } from '../flow/dataView';
import { dataSlots, linkBlock, linkSlot } from '../flow/dataLinks';
import { connect } from '../flow/edit';
import { demoDataScript, demoRun } from '../demo/dataDemo';
import type { DetailMode } from '../flowPrefs';

const q = new URLSearchParams(location.search);

export default function DemoData() {
  const [sc, setSc] = useState(demoDataScript);
  const [mode, setMode] = useState<CardMode>(q.get('mode') === 'full' ? 'full' : 'compact');
  const [detail, setDetail] = useState<DetailMode>('panel');
  const [selected, setSelected] = useState<string | null>(q.get('sel'));
  const [positions, setPositions] = useState<Positions>({});
  const [fitKey, setFitKey] = useState(0);
  const [notice, setNotice] = useState('Rê chuột lên thẻ một lúc để toả cổng dữ liệu, kéo ô vuông output sang ô VÀO của node chạy sau.');
  const results = useMemo(() => (q.get('run') ? demoRun(false) : []), []);
  const pins = useMemo(() => new Map(sc.steps.map((s) => [s.id, dataPins(s, sc.steps, results.findLast((r) => r.nodeId === s.id))])), [sc.steps, results]);
  const views = useMemo(() => nodeViews(sc).map((v) => ({ ...v, data: pins.get(v.id) })), [sc, pins]);
  const edges = useMemo(() => dataEdges(sc.steps), [sc.steps]);

  useEffect(() => {
    layoutFlow(sc.steps.map((s) => ({ id: s.id, ports: portsOf(s), io: ioHeight(pins.get(s.id), mode) })), sc.edges).then((p) => { setPositions(p); setFitKey((k) => k + 1); });
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const block = useCallback((from: string, to: string) => linkBlock(sc, from, to), [sc]);
  const onLink = (from: string, key: string, to: string, slot: string) => {
    const why = block(from, to);
    const src = sc.steps.find((s) => s.id === from)!, dst = sc.steps.find((s) => s.id === to)!;
    if (why) return setNotice(`Không nối được ${src.ref}.${key} → ${dst.ref}: ${why}`);
    const label = dataSlots(dst).find((s) => s.name === slot)?.label;
    if (!label) return;
    setSc({ ...sc, steps: sc.steps.map((s) => (s.id === to ? linkSlot(s, slot, src.ref, key) : s)) });
    setNotice(`Đã nối ${src.ref}.${key} → ${dst.ref} · ${label}`);
  };

  return (
    <div className="flex h-screen flex-col bg-bg text-ink">
      <div className="relative min-h-0 flex-1">
        <FlowHeader count={sc.steps.length}>
          <ViewMenu card={mode} detail={detail} onCard={setMode} onDetail={setDetail} />
        </FlowHeader>
        <FlowCanvas nodes={views} edges={sc.edges} start={sc.start} positions={positions} selected={selected} fitKey={fitKey}
          onSelect={setSelected} onMove={(id, p) => setPositions((cur) => ({ ...cur, [id]: p }))}
          onConnect={(from, port, to) => setSc({ ...sc, edges: connect(sc.edges, from, port, to) })} onDeleteEdge={() => {}}
          mode={mode} dataEdges={edges} onLinkData={onLink} linkBlock={block} />
      </div>
      <div className="flex-none border-t border-line bg-chrome px-4 py-1.5 text-xs text-accent-text">{notice}</div>
    </div>
  );
}
