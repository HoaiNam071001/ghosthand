// Node Đọc phần tử (bước 37 E2b + E4): tìm (phần tử / nhãn bằng OCR) → đọc (chính nó / chữ cạnh nhãn) → lọc (mẫu, số,
// chờ giá trị đổi).
import { useT } from '../../i18n';
import NumInput, { fieldBox } from '../NumInput';
import Segmented from '../Segmented';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { patternError } from '../../flow/element';
import { errText, Field, fmtSec, hint, NumField, SwitchField } from './shared';
import { ElementSearchFields } from './ElementFields';
import { CapturePermission, TextSearchFields } from './ImageFields';


export default function ElementReadFields({ step: s }: { step: Step }) {
  const t = useT();
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const byText = s.findBy === 'text';
  const badPattern = patternError(s.readPattern);
  return (
    <>
      <Field label={t('er.by')} wide group help={t(byText ? 'er.byTextHelp' : 'er.byElHelp')}>
        <Segmented value={byText ? 'text' : 'element'} full label={t('er.by')}
          onChange={(v) => set(v === 'text' ? { findBy: 'text', readNear: s.readNear ?? 'right' } : { findBy: undefined })}
          options={[{ id: 'element', label: t('er.element') }, { id: 'text', label: t('er.text') }]} />
      </Field>
      {byText ? <TextSearchFields step={s} label={t('er.labelText')} placeholder={t('er.labelPh')} /> : <ElementSearchFields step={s} />}
      {byText && (
        <Field label={t('er.in')} wide group help={t('er.inHelp')}>
          <Segmented value={s.searchArea ?? 'region'} onChange={(v) => set({ searchArea: v === 'screen' ? 'screen' : undefined })} full
            options={[{ id: 'region', label: t('er.region') }, { id: 'screen', label: t('er.screen') }]} />
        </Field>
      )}
      <Field label={t('er.read')} wide group help={t('er.readHelp')}>
        <Segmented value={s.readNear ?? 'self'} full label={t('er.read')} onChange={(v) => set({ readNear: v === 'self' ? undefined : v })}
          options={[...(byText ? [] : [{ id: 'self' as const, label: t('er.self') }]), { id: 'right' as const, label: t('er.right') }, { id: 'below' as const, label: t('er.below') }]} />
      </Field>
      {s.readNear && (
        <Field label={t('er.span')} help={t('er.spanHelp')}>
          <NumInput value={s.readSpan || 300} min={20} unit="px" onChange={(n) => set({ readSpan: n === 300 ? undefined : n })} />
        </Field>
      )}
      <Field label={t('er.pattern')} help={t('er.patternHelp')}>
        <input value={s.readPattern ?? ''} onChange={(e) => set({ readPattern: e.target.value || undefined })} placeholder={t('er.patternPh')}
          className={`${fieldBox} w-full font-mono text-[12.5px]`} spellCheck={false} />
        {badPattern && <span className={errText}>{badPattern}</span>}
      </Field>
      <SwitchField label={t('er.number')} help={t('er.numberHelp')}
        on={!!s.readNumber} onChange={(readNumber) => set({ readNumber: readNumber || undefined })} />
      <SwitchField label={t('er.change')} help={t('er.changeHelp')}
        on={!!s.readChange} onChange={(readChange) => set({ readChange: readChange || undefined })} />
      <NumField label={t('common.maxWait')} step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label={t('er.every')}>
        <NumInput value={s.intervalMs ?? 250} min={20} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      {s.readNear && <CapturePermission />}
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('er.note')}{s.readNear ? t('er.noteNear') : t('er.noteSelf')}.
        {t('pf.later')} {`{{${s.ref}.output.text}}`}. {t(s.readChange ? 'er.noChange' : 'er.noRead', { t: fmtSec(s.timeoutMs) })}
      </span>
    </>
  );
}
