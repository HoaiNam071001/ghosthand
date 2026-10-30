// Node Chờ sự kiện giao diện (bước 43 E2): chọn sự kiện, lọc cửa sổ (app + tiêu đề) hoặc phần tử (selectors).
import Select from '../Select';
import Segmented from '../Segmented';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { UI_EVENTS, uiEventOf, type UiEvent } from '../../flow/uiEvent';
import { WIN_MATCHES } from '../../flow/window';
import { Step } from '../../types';
import { Field, fmtSec, hint, NumField, selectBox, useNodeVars } from './shared';
import { ElementQueryFields } from './ElementFields';

export default function WaitUIEventFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const ev = uiEventOf(s);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }), rows: 1, compact: true } as const;
  // Đổi sang sự kiện phần tử thì gợi ý sẵn một cách tìm để khỏi hiện lỗi trống.
  const pick = (id: UiEvent) => set({ uiEvent: id, ...(id.endsWith('Element') && !s.selectors?.some((l) => l.trim()) ? { selectors: ['role=dialog'] } : {}) });
  return (
    <>
      <Field label="Chờ gì" wide group help="Node chỉ bắt sự kiện xảy ra trong lúc nó chờ – giao diện đã đổi xong trước đó thì không bắt được (dùng Chờ phần tử).">
        <Select value={ev.id as string} onChange={(v) => pick(v as UiEvent)} className={selectBox} aria-label="Sự kiện"
          options={UI_EVENTS.map((o) => ({ value: o.id as string, label: o.label }))} />
      </Field>
      {ev.target === 'window' ? (
        <>
          <Field label="App" wide group help="Tên app / tên exe / bundle id – trống = mọi app">
            <VarTextInput {...varProps} value={s.winApp ?? ''} onChange={(v) => set({ winApp: v || undefined })} placeholder="trống = mọi app" />
          </Field>
          <Field label="Tiêu đề" wide group help="Trống = mọi tiêu đề">
            <VarTextInput {...varProps} value={s.winTitle ?? ''} onChange={(v) => set({ winTitle: v || undefined })} placeholder="trống = mọi tiêu đề" />
          </Field>
          <Field label="So khớp" wide group>
            <Segmented value={s.winMatch ?? ''} full label="So khớp" onChange={(v) => set({ winMatch: v || undefined })} options={WIN_MATCHES} />
          </Field>
        </>
      ) : <ElementQueryFields step={s} />}
      <NumField label="Chờ tối đa" step={s} field="timeoutMs" unit="ms" min={1} />
      <span className={`col-span-2 -mt-1 ${hint}`}>
        Chưa thấy sự kiện sau {fmtSec(s.timeoutMs)} → cổng Thất bại. Đọc lại mỗi 0,2 giây, không chụp màn hình.
        {ev.target === 'element' && ' Sự kiện phần tử: macOS cần quyền Accessibility.'}
      </span>
    </>
  );
}
