// Khối flow của inspector node (bước 20, design v3): Khi thất bại, Cổng ra, Output, Lần chạy gần nhất – mỗi khối thu gọn
// được, tóm tắt ở đầu khối (flow/summary) – rồi chân: đặt làm bắt đầu, điểm dừng, xoá node.
// Phần hiển thị dùng chung với màn mẫu (components/flow/PortField, InspectorParts); ở đây chỉ nối vào store.
import { LastRunPanel, OutputsPanel, PortsPanel, RetryPanel, StatusChip } from '../flow/PortField';
import { footerBtn, footerRow, Section } from './InspectorParts';
import { nodeViews, outputsOf } from '../../flow/view';
import { outputsSummary, portsSummary, retrySummary } from '../../flow/summary';
import { runRows } from '../../flow/run';
import { PORT_FAIL } from '../../flow/model';
import { connectPort, disconnectPort, removeStep, selectStep, setStart, updateStep, useScript } from '../../store';
import { useRunLog } from '../../runStore';
import { CAN_FAIL, Step } from '../../types';

export default function FlowSections({ step: s }: { step: Step }) {
  const script = useScript();
  const { results } = useRunLog();
  const views = nodeViews(script);
  const view = views.find((v) => v.id === s.id)!;
  const refOf = (id: string) => views.find((v) => v.id === id)?.ref ?? '?';
  const isStart = script.start === s.id;
  const i = results.findLastIndex((r) => r.nodeId === s.id);
  const lastRun = i < 0 ? undefined : runRows(results.slice(i, i + 2), script.steps, script.edges)[0];
  const outputs = outputsOf(s);
  return (
    <>
      {CAN_FAIL.includes(s.type) && view.ports.some((p) => p.id === PORT_FAIL) && ( // Ứng dụng kiểm tra: chỉ có yes / no
        <Section title="Khi thất bại" scope={s.type} summary={retrySummary(s.retry)}>
          <RetryPanel value={{ count: s.retry?.count ?? 0, delayMs: s.retry?.delayMs ?? 0 }}
            onChange={(r) => updateStep(s.id, { retry: r.count ? r : undefined })} />
        </Section>
      )}
      <Section title="Cổng ra" scope={s.type} summary={portsSummary(s.id, view.ports, script.edges, refOf)}>
        <PortsPanel node={view} nodes={views} edges={script.edges}
          onConnect={(port, to) => connectPort(s.id, port, to)} onDisconnect={(port) => disconnectPort(s.id, port)} onJump={selectStep} />
      </Section>
      {outputs.length > 0 && (
        <Section title="Output" scope={s.type} summary={outputsSummary(outputs.length)}>
          <OutputsPanel refName={s.ref} fields={outputs} />
        </Section>
      )}
      {lastRun && (
        <Section title="Lần chạy gần nhất" scope={s.type} summary={<StatusChip status={lastRun.status} />}>
          <LastRunPanel row={lastRun} refName={s.ref} fields={outputs} />
        </Section>
      )}
      <div className={footerRow}>
        <button disabled={isStart} onClick={() => setStart(s.id)} className={`${footerBtn} text-muted enabled:hover:text-ink`}>
          {isStart ? 'Đang là node bắt đầu' : 'Đặt làm bắt đầu'}
        </button>
        <button onClick={() => updateStep(s.id, { breakpoint: !s.breakpoint || undefined })} aria-pressed={!!s.breakpoint}
          title="Điểm dừng (debug): chạy tới node này thì tạm dừng trước khi chạy nó – Tiếp / F10 để đi tiếp"
          className={`${footerBtn} ${s.breakpoint ? 'bg-danger-soft text-danger-text' : 'text-muted hover:text-ink'}`}>
          <span className={`h-2 w-2 rounded-full ${s.breakpoint ? 'bg-danger' : 'border border-current'}`} />Điểm dừng
        </button>
        <button onClick={() => removeStep(s.id)} className={`${footerBtn} ml-auto text-danger-text hover:bg-danger-soft`}>Xoá node</button>
      </div>
    </>
  );
}
