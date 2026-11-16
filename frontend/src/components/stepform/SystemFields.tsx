// Node Hệ thống (bước 35 N5): âm lượng loa – đặt mức / tăng / giảm, tắt / bật tiếng.
import { useT } from '../../i18n';
import Select from '../Select';
import NumInput from '../NumInput';
import { updateStep } from '../../store';
import { SYS_OPS, sysHasLevel, type SysOp } from '../../flow/system';
import { Step } from '../../types';
import { Field, selectBox } from './shared';

export function SystemFields({ step: s }: { step: Step }) {
  const t = useT();
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const op = s.sysOp ?? 'volume';
  const level = op === 'volume';
  const v = s.volume ?? 0;
  return (
    <>
      <Field label={t('ap.do')} help={t('sy.help', { ref: s.ref })}>
        <Select value={op as string} onChange={(v) => set({ sysOp: v as SysOp, ...(v === 'volume' && !s.volume ? { volume: 50 } : {}) })} className={selectBox} aria-label={t('ea.op')}
          options={SYS_OPS.map((o) => ({ value: o.id as string, label: o.label }))} />
      </Field>
      {sysHasLevel(op) && (
        <Field label={level ? t('sy.level') : t('sy.step')} wide group help={level ? t('sy.levelHelp') : t('sy.stepHelp')}>
          <div className="flex items-center gap-3">
            <input type="range" min={level ? 0 : 1} max={level ? 100 : 50} value={level ? v : v || 10} aria-label={level ? t('sy.level') : t('sy.step')}
              onChange={(e) => set({ volume: Number(e.target.value) })} className="min-w-0 flex-1 accent-[var(--c-accent)]" />
            <NumInput value={level ? v : v || 10} min={level ? 0 : 1} unit="%" onChange={(n) => set({ volume: Math.min(n, 100) })} className="w-[92px] flex-none" />
          </div>
        </Field>
      )}
    </>
  );
}
