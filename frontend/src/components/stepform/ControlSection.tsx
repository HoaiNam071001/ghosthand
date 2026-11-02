// Trường của node điều khiển trong inspector (bước 20 F3): giao diện ở components/flow/nodes (dùng chung màn mẫu),
// ở đây nối store (sửa node, khoanh ảnh / chọn điểm / lấy màu cho điều kiện) + nút Thử node.
import ControlFields, { canTest, CondCtx } from '../flow/nodes/ControlFields';
import NodeTestPanel from '../flow/nodes/NodeTestPanel';
import { anchorPoint } from '../../anchor';
import { boundsOf, pickCondPoint, toScreen, updateControl, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { pickCondColor, startCapture, testNode, useImageState } from '../../imageSteps';
import { inWails, openOverlay } from '../../windowMode';
import { Step } from '../../types';
import { PreviewList, PreviewText } from '../../../wailsjs/go/app/App';
import { model } from '../../../wailsjs/go/models';
import { useNodeVars } from './shared';

export default function ControlSection({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const { busy, error, nodeTests } = useImageState();
  const ctx: CondCtx = {
    step: s,
    set: (p) => updateControl(s.id, p),
    vars: { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key) => addInput({ key, label: key, type: 'text' }) },
    tools: {
      capture: (at) => startCapture(s.id, at),
      pickPoint: (at) => pickCondPoint(s.id, at),
      pickColor: (at) => pickCondColor(s.id, at),
      reanchor: (p, ax, ay) => anchorPoint(toScreen(p, script.region), boundsOf(script.region), ax, ay),
      busy: busy === s.id,
      previewList: inWails ? () => PreviewList(model.Step.createFrom(s)) : undefined,
      previewText: inWails ? () => PreviewText(model.Step.createFrom(s)) : undefined,
    },
  };
  return (
    <>
      <ControlFields ctx={ctx} />
      {canTest(s) && (
        <NodeTestPanel step={s} result={nodeTests[s.id]} busy={busy === s.id} error={busy === '' ? error : undefined}
          onRun={inWails ? () => testNode(s.id) : undefined} onShow={() => openOverlay('point', s.id)} />
      )}
    </>
  );
}
