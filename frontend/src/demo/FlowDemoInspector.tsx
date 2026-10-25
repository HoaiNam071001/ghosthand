// Inspector của màn #demo-flow (bước 20 F4a, design v3): đầu (màu nhóm, mã node, tên, ⓘ, bật / tắt), tab Node / Input.
// Tab Node: khối thu gọn Thiết lập → Thời gian → Khi thất bại (node hành động) → Cổng ra → Output → Lần chạy gần nhất.
// Mọi thay đổi chỉ là state của màn mẫu.
import { useState } from 'react';
import { TabBtn } from '../components/stepform/shared';
import { Switch } from '../components/Switch';
import NumInput from '../components/NumInput';
import InputsPanel from '../components/inputs/InputsPanel';
import { InputView } from '../components/inputs/model';
import { FlowEdgeView, FlowNodeView, RunRow } from '../components/flow/model';
import { LastRunPanel, OutputsPanel, PortsPanel, RetryPanel, StatusChip } from '../components/flow/PortField';
import { footerBtn, footerRow, InfoButton, InspectorHead, Section } from '../components/stepform/InspectorParts';
import { outputsSummary, portsSummary, retrySummary } from '../flow/summary';
import { InfoKey, NODE_INFO } from '../flow/nodeInfo';
import ControlFields, { canTest } from '../components/flow/nodes/ControlFields';
import NodeTestPanel from '../components/flow/nodes/NodeTestPanel';
import { STEP_LABEL, StepType } from '../types';
import { Footer, StepBody } from './DemoInspector';
import { DemoFlowNode, NodeBody, outputsOf } from './flowDemo';

type Props = {
  node: DemoFlowNode; view: FlowNodeView; views: FlowNodeView[]; edges: FlowEdgeView[];
  start: boolean; lastRun?: RunRow;
  inputs: InputView[]; setInputs: (v: InputView[]) => void;
  onChange: (patch: Partial<DemoFlowNode>) => void;
  onConnect: (port: string, to: string) => void; onDisconnect: (port: string) => void;
  onJump: (id: string) => void; onSetStart: () => void; onDelete: () => void;
};

const kindLabel = (n: DemoFlowNode) => (n.body.kind === 'control' ? STEP_LABEL[n.body.step.type] : STEP_LABEL[n.icon as StepType] ?? 'Hành động');

export default function FlowDemoInspector(p: Props) {
  const { node, view, inputs, setInputs } = p;
  const [tab, setTab] = useState<'step' | 'inputs'>('step');
  const action = node.body.kind === 'step' || node.body.kind === 'wait';
  const scope = node.icon;
  const outputs = outputsOf(node.body);
  return (
    <aside aria-label={`Thuộc tính node ${node.ref} (mẫu)`} className="flex w-[340px] flex-none flex-col gap-3 overflow-y-auto border-l border-line bg-surface p-3.5 max-[1100px]:w-[300px]">
      <InspectorHead cat={view.cat} icon={node.icon}
        name={<input value={node.title} onChange={(e) => p.onChange({ title: e.target.value })} aria-label="Tên node"
          className="w-full truncate bg-transparent text-[15px] font-semibold outline-none" />}
        sub={<>
          <input value={node.ref} onChange={(e) => p.onChange({ ref: e.target.value.replace(/[^a-z0-9_]/gi, '') })} aria-label="Mã node"
            title="Mã node – dùng trong biến {{n2.output.x}}" className="w-12 rounded bg-soft px-1 font-mono outline-none" />
          <span className="truncate text-cat">{kindLabel(node)}</span>
          {p.start && <span className="rounded-full bg-accent-soft px-1.5 font-semibold text-accent-text">Bắt đầu</span>}
        </>}
        actions={<>
          {node.icon in NODE_INFO && <InfoButton info={NODE_INFO[node.icon as InfoKey]} />}
          <Switch on={node.enabled !== false} onChange={(on) => p.onChange({ enabled: on })} label="Bật node" />
        </>} />

      <div className="flex flex-none gap-4 border-b border-line" role="tablist">
        <TabBtn active={tab === 'step'} onClick={() => setTab('step')}>Node</TabBtn>
        <TabBtn active={tab === 'inputs'} onClick={() => setTab('inputs')}>
          Input <span className="rounded-full bg-accent-soft px-1.5 text-[11px] font-semibold text-accent-text">{inputs.length}</span>
        </TabBtn>
      </div>

      {tab === 'inputs' ? (
        <InputsPanel inputs={inputs} onAdd={() => {}} onMove={() => {}}
          onUpdate={(key, x) => setInputs(inputs.map((i) => (i.key === key ? { ...i, ...x } : i)))}
          onRemove={(key) => setInputs(inputs.filter((i) => i.key !== key))} />
      ) : (
        <>
          {view.warn && <div className="rounded-control border border-warn/40 bg-warn/10 px-2.5 py-2 text-[13px] text-ink"><b className="text-warn">!</b> {view.warn}</div>}
          <Section title="Thiết lập" scope={scope} defaultOpen><Body node={node} inputs={inputs} setInputs={setInputs} onChange={p.onChange} /></Section>
          {action && node.body.kind === 'step' && (
            <Section title="Thời gian" scope={scope} summary={`chờ ${node.body.step.delay}`}><Footer step={node.body.step} /></Section>
          )}
          {action && (
            <Section title="Khi thất bại" scope={scope} summary={retrySummary(node.retry)}>
              <RetryPanel value={node.retry ?? { count: 0, delayMs: 300 }} onChange={(retry) => p.onChange({ retry, chips: retry.count ? [`thử lại ${retry.count}`] : [] })} />
            </Section>
          )}
          <Section title="Cổng ra" scope={scope} summary={portsSummary(node.id, view.ports, p.edges, (id) => p.views.find((v) => v.id === id)?.ref ?? '?')}>
            <PortsPanel node={view} nodes={p.views} edges={p.edges} onConnect={p.onConnect} onDisconnect={p.onDisconnect} onJump={p.onJump} />
          </Section>
          {outputs.length > 0 && <Section title="Output" scope={scope} summary={outputsSummary(outputs.length)}><OutputsPanel refName={node.ref} fields={outputs} /></Section>}
          {p.lastRun && <Section title="Lần chạy gần nhất" scope={scope} summary={<StatusChip status={p.lastRun.status} />}><LastRunPanel row={p.lastRun} refName="n1" /></Section>}
          <div className={footerRow}>
            <button disabled={p.start} onClick={p.onSetStart} className={`${footerBtn} text-muted enabled:hover:text-ink`}>
              {p.start ? 'Đang là node bắt đầu' : 'Đặt làm bắt đầu'}
            </button>
            <button onClick={p.onDelete} className={`${footerBtn} ml-auto text-danger-text hover:bg-danger-soft`}>Xoá node</button>
          </div>
        </>
      )}
    </aside>
  );
}

function Body({ node, inputs, setInputs, onChange }: { node: DemoFlowNode; inputs: InputView[]; setInputs: (v: InputView[]) => void; onChange: Props['onChange'] }) {
  const b = node.body;
  const set = (body: NodeBody) => onChange({ body });
  switch (b.kind) {
    case 'step': return <StepBody step={b.step} inputs={inputs} setInputs={setInputs} flow />;
    case 'wait': return <label className="flex flex-col gap-1.5 text-muted">Chờ<NumInput value={b.ms} unit="ms" onChange={(ms) => onChange({ body: { kind: 'wait', ms }, detail: `${ms} ms` })} /></label>;
    case 'control': return (
      <>
        <ControlFields ctx={{ step: b.step, set: (p) => set({ kind: 'control', step: { ...b.step, ...p } }), vars: { inputs } }} />
        {canTest(b.step) && <NodeTestPanel step={b.step} />}
      </>
    );
  }
}
