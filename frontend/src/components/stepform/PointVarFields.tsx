// Điểm lấy toạ độ từ biến (F5b) – chỉ hiển thị: ô X / Y nhận số / biến cộng trừ px, nút điền nhanh chỗ thấy của node trước.
import { useT } from '../../i18n';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import type { ScriptInput } from '../inputs/model';
import { StepPoint } from '../../types';
import type { CoordSource } from '../../flow/view';
import { hint, selectBox } from './shared';

type Props = {
  point: StepPoint;
  onChange: (p: Partial<StepPoint>) => void;
  relative?: boolean; // B "lệch so với A": ô là độ lệch, không phải toạ độ
  inputs: Pick<ScriptInput, 'key' | 'label'>[];
  nodeVars: { key: string; label: string }[];
  sources: CoordSource[]; // node phía trước có output x, y (flow/view.ts coordSources)
  onCreateInput?: (key: string) => void;
};

export default function PointVarFields({ point: p, onChange, relative = false, inputs, nodeVars, sources, onCreateInput }: Props) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      {(['x', 'y'] as const).map((k) => (
        <div key={k} className="flex items-start gap-2">
          <span className="w-6 flex-none pt-[7px] font-mono text-xs">{relative ? 'Δ' : ''}{k.toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <VarTextInput value={(k === 'x' ? p.xVar : p.yVar) ?? ''} rows={1} compact inputs={inputs} nodeVars={nodeVars} onCreateInput={onCreateInput}
              placeholder={`{{n2.output.${k}}} + 20`} onChange={(v) => onChange(k === 'x' ? { xVar: v } : { yVar: v })} />
          </div>
        </div>
      ))}
      {!relative && (sources.length ? (
        <Select value="" onChange={(base) => onChange({ xVar: `{{${base}.x}}`, yVar: `{{${base}.y}}` })}
          className={selectBox} aria-label={t('pv.fillLabel')} placeholder={t('pv.fill')}
          options={sources.map((s) => ({ value: s.base, label: s.label }))} />
      ) : (
        <span className={hint}>{t('pv.none')}</span>
      ))}
      <span className={hint}>
        {relative ? t('pv.offA') : t('pv.screen')} – {t('pv.numOrVar')} {'{{n2.output.x}} + 20'}.
      </span>
    </div>
  );
}
