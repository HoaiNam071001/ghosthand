// Phần dùng chung của inspector node: hàng trường (nhãn trái, ô phải), ô số có menu ⋯, nút chọn lại điểm, tab, hằng style.
import { ReactNode, useMemo, useState } from 'react';
import NumInput, { fieldBox } from '../NumInput';
import { Target } from '../icons';
import { KeyChip } from '../inputs/PinButton';
import { FieldMenu, FieldMenuItem, MENU_ICON } from '../FieldMenu';
import { defaultOf } from '../../flow/defaults';
import VarTextInput from '../inputs/VarTextInput';
import { pickPointFor, setNumVarExpr, setNumVarOn, updateStep, useScript, useSecretNames } from '../../store';
import { addInput, compatibleInputs, pinField, pinnedInput, pinToInput, setPinnedValue, unpinField } from '../../scriptInputs';
import { MouseButton, numVarOf, NumVarField, ScrollDirection, Step, StepPoint } from '../../types';
import Segmented from '../Segmented';
import { Switch } from '../Switch';
import { nodeVarOptions } from '../../flow/view';
import { getLang } from '../../i18n/lang';
import { tr, useT } from '../../i18n';

export const selectBox = `${fieldBox} w-full text-ink`;
export const hint = 'text-xs text-muted';
export const errText = 'text-xs text-danger-text'; // báo thiếu / sai ngay dưới ô (lỗi vẫn hiện chữ, không giấu vào ⓘ)
// Chữ phụ bên phải nhãn ô chữ nhận biến
function VarHint() {
  const t = useT();
  return <span className="text-xs text-muted">{t('sf.varHint.pre')}<span className="font-mono">{'{{'}</span>{t('sf.varHint.post')}</span>;
}
export const varHint = <VarHint />;
// Ô chọn hướng cuộn (node Cuộn, Cuộn trang web).
export const directionOptions = (): { id: ScrollDirection; label: string }[] => [{ id: 'up', label: tr('sf.dir.up') }, { id: 'down', label: tr('sf.dir.down') }, { id: 'left', label: tr('sf.dir.left') }, { id: 'right', label: tr('sf.dir.right') }];
export const fmtSec = (ms?: number) => `${((ms ?? 0) / 1000).toLocaleString(getLang() === 'vi' ? 'vi-VN' : 'en-US', { maximumFractionDigits: 1 })} s`;
// Biến kết quả các node khác ({{n2.output.x}}) cho ô chữ của node id
export function useNodeVars(id: string) {
  const { steps, start, edges } = useScript();
  const secrets = useSecretNames();
  return useMemo(() => [...nodeVarOptions({ steps, start, edges }, id), ...secrets.map((n) => ({ key: `secret.${n}`, label: tr('sf.secretVar', { n }) }))], [steps, start, edges, id, secrets]);
}

// Sửa một điểm của node (giữ các trường khác của điểm)
export type SetPoint = (i: number, p: Partial<StepPoint>) => void;

export function PickButton({ step: s, title }: { step: Step; title?: string }) {
  const t = useT();
  title ??= t('sf.repick');
  return (
    <button aria-label={title} title={title} onClick={() => pickPointFor(s.id)}
      className="grid h-[34px] w-[34px] flex-none place-items-center rounded-control border border-line text-muted hover:bg-hover hover:text-ink"><Target /></button>
  );
}


// Hàng trường design v3 (FieldKit): nhãn 120 px bên trái (design 112 – nới để nhãn có ⓘ không gãy dòng), ô bên phải. wide: nhãn ở trên, ô rộng hết hàng (ô chữ dài,
// cặp X / Y, danh sách). group: bên trong là nhóm nút (Segmented) – dùng <div>, vì <label> bọc nút thì bấm chữ nhãn
// sẽ bấm luôn nút đầu. extra: chip dưới nhãn (key input đã ghim). help: giải thích trong ⓘ cạnh nhãn (thay dòng chữ dưới ô).
export function Field({ label, children, wide = false, group = false, extra, help, side }: {
  label: ReactNode; children: ReactNode; wide?: boolean; group?: boolean; extra?: ReactNode; help?: string;
  side?: ReactNode; // chỉ khi wide: nội dung bên phải dòng nhãn (nút nhỏ, chữ phụ)
}) {
  const Tag = group || help ? 'div' : 'label';
  const name = <span className="inline-flex max-w-full items-center gap-1">{label}{help && <InfoTip text={help} />}</span>;
  if (wide) {
    return (
      <Tag className="col-span-2 flex flex-col gap-1.5">
        <span className="flex min-w-0 items-center gap-2 text-muted"><span className="min-w-0 flex-1">{name}</span>{side}</span>
        {extra}{children}
      </Tag>
    );
  }
  return (
    <Tag className="col-span-2 grid grid-cols-[120px_minmax(0,1fr)] items-center gap-2.5">
      <span className="flex min-w-0 flex-col items-start gap-[3px] text-muted">{name}{extra}</span>
      {children}
    </Tag>
  );
}

// Hàng công tắc: nhãn trái, công tắc phải (thay "công tắc + câu dài").
export function SwitchField({ label, on, onChange, help }: { label: string; on: boolean; onChange: (on: boolean) => void; help?: string }) {
  return <Field label={label} group help={help}><Switch on={on} onChange={onChange} label={label} /></Field>;
}

// ⓘ nhỏ cạnh nhãn: rê / focus hiện giải thích (design v3 – thay dòng chữ dài dưới ô). Tooltip fixed theo ⓘ – inspector
// cuộn (overflow) sẽ cắt nếu absolute; canh trái phải để không tràn cửa sổ.
export function InfoTip({ text }: { text: string }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const show = (e: { currentTarget: HTMLElement }) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ left: Math.min(Math.max(r.left - 24, 8), window.innerWidth - 238), top: r.bottom + 6 });
  };
  return (
    <span tabIndex={0} aria-label={text} onMouseEnter={show} onFocus={show} onMouseLeave={() => setPos(null)} onBlur={() => setPos(null)}
      className={`inline-grid flex-none cursor-help place-items-center outline-none ${pos ? 'text-accent-text' : 'text-faint'}`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
      {pos && (
        <span role="tooltip" style={pos} className="pointer-events-none fixed z-50 w-[230px] rounded-[8px] bg-ink px-2.5 py-2 text-xs leading-snug font-normal text-bg shadow-[0_8px_24px_rgb(0_0_0/.18)]">{text}</span>
      )}
    </span>
  );
}

// Ô số trong inspector (design v3 FieldKit). Nút ⋯ trong ô: dùng biến (F5c – ô thành biểu thức, vd {{n2.output.count}} + 1),
// đặt làm input khi chạy (bước 21b – ghim: viền nét đứt, chip key dưới nhãn, sửa số = sửa mặc định của input; dùng chung
// input cùng kiểu đã có), về mặc định của loại node (flow/defaults). stepper: số nguyên nhỏ có − / +.
export function NumField({ label, step: s, field, unit, prefix, min = 0, stepper = false, help, info }: {
  label: string; step: Step; field: NumVarField; unit?: string; prefix?: string; min?: number; stepper?: boolean;
  help?: string; // "Ô này dùng để làm gì" cuối menu ⋯
  info?: string; // ⓘ cạnh nhãn
}) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const inp = pinnedInput(script, s.id, field);
  const others = compatibleInputs(script, field).filter((i) => i !== inp);
  const expr = numVarOf(s, field);
  const def = defaultOf(s.type, field);
  const value = s[field] ?? min;
  const items: FieldMenuItem[] = expr !== undefined ? [] : [
    ...(inp ? [] : [{ label: t('sf.num.useVar'), icon: MENU_ICON.variable, sub: t('sf.num.useVarSub'), onClick: () => setNumVarOn(s.id, field, true) }]),
    inp
      ? { label: t('sf.num.unpin', { key: inp.key }), icon: MENU_ICON.pin, sub: t('sf.num.unpinSub'), onClick: () => unpinField(s.id, field) }
      : { label: t('sf.num.pin'), icon: MENU_ICON.pin, sub: t('sf.num.pinSub'), onClick: () => pinField(s.id, field) },
    ...(inp ? [] : others.map((o) => ({ label: o.key, sub: t('sf.num.shareInput', { label: o.label }), mono: true, onClick: () => pinToInput(s.id, field, o.key) }))),
    ...(def !== undefined && def !== value && !inp ? [{ label: t('sf.num.reset', { v: `${def}${unit ? ` ${unit}` : ''}` }), icon: MENU_ICON.reset, onClick: () => updateStep(s.id, { [field]: def }) }] : []),
  ];
  return (
    <Field label={label} group help={info} extra={inp && <KeyChip k={inp.key} />}>
      {expr !== undefined ? (
        <span className="flex min-w-0 items-center gap-1">
          <span className="min-w-0 flex-1">
            <VarTextInput value={expr} rows={1} compact inputs={script.inputs ?? []} nodeVars={nodeVars} placeholder="{{n2.output.count}}"
              onCreateInput={(key) => addInput({ key, label: key, type: 'number' })} onChange={(v) => setNumVarExpr(s.id, field, v)} />
          </span>
          <button type="button" onClick={() => setNumVarOn(s.id, field, false)} aria-label={t('sf.num.dropVar')} title={t('sf.num.dropVarTip')}
            className="grid h-6 w-6 flex-none place-items-center rounded-[5px] text-muted hover:bg-hover hover:text-ink">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.4" /></svg>
          </button>
        </span>
      ) : (
        <NumInput value={value} min={min} unit={unit} prefix={prefix} pinned={!!inp} tag={inp ? t('sf.num.default') : undefined} stepper={stepper}
          menu={<FieldMenu items={items} help={help} />}
          onChange={(v) => (inp ? setPinnedValue(s.id, field, v) : updateStep(s.id, { [field]: v }))} />
      )}
    </Field>
  );
}

export function TabBtn({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: ReactNode }) {
  return (
    <button role="tab" aria-selected={active} onClick={onClick} title={title}
      className={`relative flex h-[34px] items-center gap-1.5 px-0.5 ${active ? 'font-semibold' : 'text-muted hover:text-ink'}`}>
      {children}
      {active && <span className="absolute inset-x-[15%] -bottom-px h-[3px] rounded-sm bg-accent" />}
    </button>
  );
}

// Nút chuột của node bấm (click, click theo ảnh, click phần tử web).
export function ButtonField({ step: s }: { step: Step }) {
  const t = useT();
  return (
    <Field label={t('sf.btn')} group>
      <Segmented value={s.button} onChange={(button: MouseButton) => updateStep(s.id, { button })} full label={t('sf.btn')}
        options={[{ id: 'left', label: t('sf.btn.left') }, { id: 'right', label: t('sf.btn.right') }, { id: 'center', label: t('sf.btn.center') }]} />
    </Field>
  );
}
