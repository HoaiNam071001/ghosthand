// Node Shortcuts hệ điều hành (bước 43 S2, macOS): tên Shortcut (gõ hoặc chọn từ app Phím tắt) + input chữ + hết giờ.
import { useT } from '../../i18n';
import { useEffect, useState } from 'react';
import { ListShortcuts } from '../../../wailsjs/go/app/App';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { errorText } from '../../engineStore';
import { inWails } from '../../windowMode';
import { Step } from '../../types';
import { Field, hint, NumField, selectBox, useNodeVars } from './shared';

export default function OSShortcutFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (!inWails) return;
    ListShortcuts().then((l) => setNames(l ?? [])).catch((e) => setError(errorText(e)));
  }, []);
  return (
    <>
      <div className="col-span-2 flex flex-col gap-1 rounded-card bg-soft px-3 py-2.5 text-xs text-muted">
        <span className="font-semibold text-ink">{t('os.what')}</span>
        <span>{t('os.desc1')} <b className="text-ink">{t('os.app')}</b> {t('os.desc2')}</span>
        <span>{t('os.how')}</span>
        <span>{t('os.eg1')} <span className="font-mono text-ink">{'{{n1.output.text}}'}</span> {t('os.eg2')} <span className="font-mono text-ink">{`{{${s.ref}.output.text}}`}</span>.</span>
      </div>
      <Field label={t('os.name')} wide group help={t('os.nameHelp')}>
        <VarTextInput {...varProps} rows={1} compact value={s.shortcutName ?? ''} onChange={(v) => updateStep(s.id, { shortcutName: v || undefined })} placeholder={t('os.namePh')} />
        {inWails && !error && names.length === 0 && <span className={hint}>{t('os.none')}</span>}
        {names.length > 0 && (
          <Select value="" onChange={(v) => v && updateStep(s.id, { shortcutName: v })} className={selectBox} aria-label={t('os.pickLabel')}
            options={[{ value: '', label: t('os.pick') }, ...names.map((n) => ({ value: n, label: n }))]} />
        )}
        {error && <span className="text-xs text-danger-text">{error}</span>}
      </Field>
      <Field label={t('os.input')} wide group help={t('os.inputHelp')}>
        <VarTextInput {...varProps} rows={3} value={s.text ?? ''} onChange={(v) => updateStep(s.id, { text: v || undefined })} placeholder="{{n1.output.text}}" />
      </Field>
      <NumField label={t('common.maxWait')} info={t('os.waitInfo')} step={s} field="timeoutMs" unit="ms" min={1} />
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t('pf.later')} {`{{${s.ref}.output.text}}`} {t('os.note')}
      </span>
    </>
  );
}
