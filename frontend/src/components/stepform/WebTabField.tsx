// Ô Tab của node web + Phím trên trang web: chọn tab Chrome của app theo URL / tiêu đề / id tab; nhận {{biến}}.
import { useT } from '../../i18n';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { Step } from '../../types';
import { Field, useNodeVars } from './shared';

export function WebTabField({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  return (
    <Field label="Tab" wide group help={t('wtf.help')}>
      <VarTextInput value={s.tab ?? ''} onChange={(tab) => updateStep(s.id, { tab: tab || undefined })} inputs={script.inputs ?? []} nodeVars={nodeVars}
        onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} rows={1} compact placeholder={t('bt.phCur')} />
    </Field>
  );
}
