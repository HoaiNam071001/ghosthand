// Trường riêng từng loại node web (bước 25d) – phần chung (Chrome của app, cách tìm, tab, chờ tối đa) ở WebFields.
import { ReactNode } from 'react';
import NumInput, { fieldBox } from '../NumInput';
import Segmented from '../Segmented';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { ScrollDirection, Step } from '../../types';
import { canBackground, parseSelector, READ_LABEL, ReadFrom, SCROLL_MODE_LABEL, ScrollMode, SELECTOR_LABEL, selectorLines, stableSelector } from '../../flow/web';
import { ButtonField, DIRECTION_OPTIONS, Field, NumField, SwitchField, useNodeVars, varHint } from './shared';
import { TypeModeField } from './TextFields';
import { SelectorFixHint } from './SelectorFixHint';

const set = (s: Step, patch: Partial<Step>) => updateStep(s.id, patch);

// Ô "mỗi dòng một cách tìm" – dùng cho cách tìm phần tử và khung cuộn (webScroll tới khi thấy).
export function SelectorsField({ step: s, label, value, onChange, placeholder, emptyText, help, children }: {
  step: Step; label: string; value: string[] | undefined; onChange: (v: string[]) => void; placeholder: string; emptyText: string;
  help?: string; children?: ReactNode;
}) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const lines = selectorLines(value);
  const parsed = lines.map(parseSelector);
  const bad = parsed.findIndex((p) => !p);
  const all = value ?? [];
  const volatile = all.findIndex((l) => stableSelector(l));
  return (
    <Field label={label} wide group help={help} side={<span className="text-xs text-muted">mỗi dòng một cách</span>}>
      <VarTextInput value={(value ?? []).join('\n')} onChange={(v) => onChange(v.split('\n'))} inputs={script.inputs ?? []} nodeVars={nodeVars}
        onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} rows={lines.length > 1 ? 3 : 2} placeholder={placeholder} />
      <span className={`text-xs ${bad >= 0 || (lines.length === 0 && emptyText.startsWith('Chưa')) ? 'text-danger-text' : 'text-muted'}`}>
        {lines.length === 0 ? emptyText
          : bad >= 0 ? `Dòng “${lines[bad].trim()}” chưa có giá trị / sai dạng`
          : `${parsed.map((p) => SELECTOR_LABEL[p!.by] + (p!.exact ? ' (đúng cả chuỗi)' : '')).join(' → ')} · cách đầu thấy thì dùng`}
      </span>
      {volatile >= 0 && (
        <SelectorFixHint why={`“${all[volatile].trim()}” có phần hay đổi (số) – gãy khi số đổi.`} fix={stableSelector(all[volatile])!}
          onUse={() => onChange(all.map((l, i) => (i === volatile ? stableSelector(l)! : l)))} />
      )}
      {children}
    </Field>
  );
}

export function WebWaitFields({ step: s }: { step: Step }) {
  return (
    <Field label="Chờ tới khi" wide group>
      <Segmented value={s.webGone ? 'gone' : 'shown'} onChange={(v) => set(s, { webGone: v === 'gone' || undefined })} full label="Chờ tới khi"
        options={[{ id: 'shown', label: 'Phần tử hiện' }, { id: 'gone', label: 'Phần tử mất' }]} />
    </Field>
  );
}

export function WebClickFields({ step: s }: { step: Step }) {
  return <>
    <Field label="Lệch so với tâm" wide>
      <div className="flex gap-2">
        <NumInput signed prefix="ΔX" value={s.dx ?? 0} onChange={(dx) => set(s, { dx })} className="flex-1" />
        <NumInput signed prefix="ΔY" value={s.dy ?? 0} onChange={(dy) => set(s, { dy })} className="flex-1" />
      </div>
    </Field>
    <ButtonField step={s} />
    <NumField label="Số lần click" step={s} field="clicks" min={1} stepper />
    <NumField label="Giữa các click" step={s} field="clickInterval" unit="ms" />
  </>;
}

export function WebTypeFields({ step: s }: { step: Step }) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  return <>
    <Field label="Nội dung gõ" wide group side={varHint}>
      <VarTextInput value={s.text} onChange={(text) => set(s, { text })} inputs={script.inputs ?? []} nodeVars={nodeVars} rows={2}
        placeholder="{{email}}" onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} />
    </Field>
    {!s.webBackground && <TypeModeField step={s} />}
    <SwitchField label="Xoá chữ cũ" help="Xoá chữ cũ trong ô trước khi gõ" on={!!s.webClear} onChange={(webClear) => set(s, { webClear: webClear || undefined })} />
    <SwitchField label="Enter sau khi gõ" on={!!s.webEnter} onChange={(webEnter) => set(s, { webEnter: webEnter || undefined })} />
    <SwitchField label="Bỏ kiểm tra focus" help="Không kiểm tra ô đã nhận focus sau khi click – cho ô tuỳ biến (chọn ngày, editor) focus vào phần tử khác"
      on={!!s.skipFocusCheck} onChange={(skipFocusCheck) => set(s, { skipFocusCheck: skipFocusCheck || undefined })} />
  </>;
}

export function WebReadFields({ step: s }: { step: Step }) {
  const from = s.readFrom ?? '';
  return <>
    <Field label="Đọc" wide group>
      <Segmented value={from} onChange={(v) => set(s, { readFrom: (v || undefined) as ReadFrom | undefined })} full label="Đọc"
        options={(Object.keys(READ_LABEL) as (keyof typeof READ_LABEL)[]).map((id) => ({ id, label: READ_LABEL[id][0].toUpperCase() + READ_LABEL[id].slice(1) }))} />
    </Field>
    {from === 'attr' && (
      <Field label="Tên thuộc tính" help="href / src trả URL đầy đủ.">
        <span className={`${fieldBox} w-full ${s.attr?.trim() ? '' : 'border-danger'}`}>
          <input value={s.attr ?? ''} onChange={(e) => set(s, { attr: e.target.value })} placeholder="href" spellCheck={false}
            className="min-w-0 flex-1 bg-transparent font-mono text-[13px] text-ink outline-none" />
        </span>
      </Field>
    )}
  </>;
}

export function WebScrollFields({ step: s }: { step: Step }) {
  const mode = s.scrollMode ?? '';
  return <>
    <Field label="Cuộn" wide group>
      <Segmented value={mode} onChange={(v) => set(s, { scrollMode: (v || undefined) as ScrollMode | undefined })} full label="Cách cuộn"
        options={(Object.keys(SCROLL_MODE_LABEL) as (keyof typeof SCROLL_MODE_LABEL)[]).map((id) => ({ id, label: SCROLL_MODE_LABEL[id] }))} />
    </Field>
    {mode !== '' && <>
      <Field label="Hướng" wide group>
        <Segmented value={s.direction ?? 'down'} onChange={(direction: ScrollDirection) => set(s, { direction })} full label="Hướng cuộn"
          options={DIRECTION_OPTIONS} />
      </Field>
      <NumField label={mode === 'until' ? 'Mỗi lần lăn' : 'Số nấc'} step={s} field="amount" unit="nấc" min={1} stepper />
    </>}
    {mode === 'until' && (
      <SelectorsField step={s} label="Lăn trong khung (tuỳ chọn)" value={s.scrollIn} onChange={(scrollIn) => set(s, { scrollIn })}
        placeholder="bỏ trống = giữa trang · css=#feed" emptyText="Lăn chuột giữa trang" />
    )}
  </>;
}

// Chuột thật / chạy nền (D4b) – chỉ loại có thao tác (canBackground).
export function WebModeField({ step: s }: { step: Step }) {
  if (!canBackground(s)) return null;
  return (
    <Field label="Điều khiển" wide group help={s.webBackground
      ? 'Bấm / gõ / lăn qua Chrome của app, không đụng chuột – Chrome bị che hay thu nhỏ vẫn chạy. Toạ độ output theo trang. Trang chống bot kỹ nên dùng chuột thật.'
      : 'Chuột / phím thật như người dùng, đưa Chrome lên trước khi bấm.'}>
      <Segmented value={s.webBackground ? 'bg' : 'real'} onChange={(v) => set(s, { webBackground: v === 'bg' || undefined })} full label="Điều khiển"
        options={[{ id: 'real', label: 'Chuột thật' }, { id: 'bg', label: 'Chạy nền' }]} />
    </Field>
  );
}

// Dòng giải thích cuối inspector theo loại node.
export function webHintText(s: Step, after: string): string {
  if (s.webBackground && canBackground(s)) {
    if (s.type === 'webType') return `Click vào ô qua Chrome của app, ô phải nhận focus mới chèn chữ (không thì cổng Thất bại). Không thấy sau ${after} → cổng Thất bại.`;
    if (s.type === 'webScroll' && s.scrollMode) return s.scrollMode === 'until' ? `Lăn qua Chrome của app mỗi lần kiểm tra tới khi phần tử vào khung nhìn; quá ${after} → cổng Thất bại.` : 'Lăn trong phần tử qua Chrome của app.';
  }
  switch (s.type) {
    case 'webWait': return s.webGone ? `Phần tử còn sau ${after} → cổng Thất bại.` : `Không thấy sau ${after} → cổng Thất bại.`;
    case 'webClick': return `Không thấy sau ${after} → cổng Thất bại. Phần tử ngoài màn hình thì lăn chuột tới (như người); bị popup che thì chờ tiếp.`;
    case 'webType': return `Click chuột thật vào ô, ô phải nhận focus mới gõ (không thì cổng Thất bại). Không thấy sau ${after} → cổng Thất bại.`;
    case 'webRead': return `Không di chuột. Node sau dùng {{${s.ref}.output.text}}. Không thấy sau ${after} → cổng Thất bại.`;
    case 'webScroll':
      return s.scrollMode === 'until' ? `Lăn bánh xe chuột thật mỗi lần kiểm tra tới khi phần tử vào khung nhìn; quá ${after} → cổng Thất bại.`
        : s.scrollMode === 'in' ? 'Chuột thật tới giữa phần tử (khung có thanh cuộn riêng) rồi lăn bánh xe.'
        : `Đưa phần tử vào giữa khung nhìn. Không thấy sau ${after} → cổng Thất bại.`;
  }
  return '';
}
