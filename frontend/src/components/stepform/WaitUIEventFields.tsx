// Node Chờ sự kiện giao diện (bước 43 E2): chọn sự kiện, lọc cửa sổ (app + tiêu đề) hoặc phần tử (selectors).
import { useT } from '../../i18n';
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
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const ev = uiEventOf(s);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }), rows: 1, compact: true } as const;
  // Đổi sang sự kiện phần tử thì gợi ý sẵn một cách tìm để khỏi hiện lỗi trống.
  const pick = (id: UiEvent) => set({ uiEvent: id, ...(id.endsWith('Element') && !s.selectors?.some((l) => l.trim()) ? { selectors: ['role=dialog'] } : {}) });
  return (
    <>
      <Field label={t('wu.what')} wide group help={t('wu.whatHelp')}>
        <Select value={ev.id as string} onChange={(v) => pick(v as UiEvent)} className={selectBox} aria-label={t('wu.event')}
          options={UI_EVENTS.map((o) => ({ value: o.id as string, label: o.label }))} />
      </Field>
      {ev.target === 'window' ? (
        <>
          <Field label={t('ap.app')} wide group help={t('wu.appHelp')}>
            <VarTextInput {...varProps} value={s.winApp ?? ''} onChange={(v) => set({ winApp: v || undefined })} placeholder={t('wu.anyApp')} />
          </Field>
          <Field label={t('wf.title')} wide group help={t('wf.titlePh')}>
            <VarTextInput {...varProps} value={s.winTitle ?? ''} onChange={(v) => set({ winTitle: v || undefined })} placeholder={t('wf.titlePh')} />
          </Field>
          <Field label={t('ap.match')} wide group>
            <Segmented value={s.winMatch ?? ''} full label={t('ap.match')} onChange={(v) => set({ winMatch: v || undefined })} options={WIN_MATCHES} />
          </Field>
        </>
      ) : <ElementQueryFields step={s} />}
      <NumField label={t('common.maxWait')} step={s} field="timeoutMs" unit="ms" min={1} />
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('wu.note', { t: fmtSec(s.timeoutMs) })}
        {ev.target === 'element' && ' ' + t('wu.noteEl')}
      </span>
    </>
  );
}
