// Node Thao tác phần tử (bước 43 E1): tìm phần tử + chọn thao tác (bấm / đặt giá trị / tick…) không dùng chuột.
import NumInput from '../NumInput';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { ELEMENT_ACTS, type ElementAct } from '../../flow/elementAction';
import { Step } from '../../types';
import { fmtSec, Field, hint, NumField, selectBox, useNodeVars } from './shared';
import { ElementQueryFields } from './ElementFields';

export default function ElementActionFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const act = (s.elementAct || 'press') as ElementAct;
  return (
    <>
      <ElementQueryFields step={s} />
      <Field label="Làm gì" help="Thao tác thẳng qua Accessibility – không di chuột, không gõ phím, cửa sổ bị che một phần vẫn chạy.">
        <Select value={act as string} onChange={(v) => updateStep(s.id, { elementAct: v === 'press' ? undefined : (v as ElementAct) })} className={selectBox} aria-label="Thao tác"
          options={ELEMENT_ACTS.map((o) => ({ value: o.id as string, label: o.label }))} />
      </Field>
      {act === 'setValue' && (
        <Field label="Giá trị" wide group help="Ô web dựng bằng React hoặc ô tự vẽ có thể không nhận – khi đó dùng node Gõ chữ.">
          <VarTextInput value={s.text} onChange={(text) => updateStep(s.id, { text })} inputs={script.inputs ?? []} nodeVars={nodeVars}
            onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} rows={1} compact placeholder="Nguyễn Văn An" />
        </Field>
      )}
      <NumField label="Chờ tối đa" step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label="Kiểm tra mỗi">
        <NumInput value={s.intervalMs ?? 250} min={20} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        Sau thao tác node đọc lại phần tử để kiểm (giá trị đã đổi, đã tick); app không nhận thì thử lại tới hết {fmtSec(s.timeoutMs)} → cổng Thất bại.
        macOS cần quyền Accessibility; Windows qua UI Automation. Node sau dùng {`{{${s.ref}.output.value}}`}.
      </span>
    </>
  );
}
