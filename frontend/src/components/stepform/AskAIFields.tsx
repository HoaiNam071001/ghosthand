// Node Hỏi AI (bước 31d): câu hỏi, nhà cung cấp, key (chỉ {{secret.…}}), ảnh kèm, dạng trả lời, giá trị dự phòng.
import { useT } from '../../i18n';
import Segmented from '../Segmented';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { ShotAreaField } from './ShotFields';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { AI_FORMATS, AI_IMAGES, NODE_AI_KINDS, isLocalAI, isSecretKey, LOCAL_AI_URL, type AIFormat, type AIImage, type AIKind } from '../../flow/askAI';
import { Step } from '../../types';
import { Field, hint, selectBox, useNodeVars } from './shared';

export default function AskAIFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const local = isLocalAI(s.aiBaseUrl);
  return (
    <>
      <Field label={t('aa.q')} wide group help={t('aa.qHelp')}>
        <VarTextInput {...varProps} rows={4} value={s.prompt ?? ''} onChange={(v) => set({ prompt: v || undefined })} placeholder={t('aa.qPh')} />
      </Field>
      <Field label={t('aa.provider')} wide group help={t('aa.providerHelp')}>
        <Select value={s.aiKind ?? ''} className={selectBox} aria-label={t('aa.providerLabel')} onChange={(v) => set({ aiKind: (v || undefined) as AIKind | undefined })}
          options={NODE_AI_KINDS.map((k) => ({ value: k.id, label: k.label }))} />
      </Field>
      <Field label={t('aa.url')} wide group help={t('aa.urlHelp')}>
        <VarTextInput {...varProps} rows={1} compact value={s.aiBaseUrl ?? ''} onChange={(v) => set({ aiBaseUrl: v || undefined })} placeholder={LOCAL_AI_URL} />
      </Field>
      <Field label="Model" wide group help={t('aa.modelHelp')}>
        <VarTextInput {...varProps} rows={1} compact value={s.aiModel ?? ''} onChange={(v) => set({ aiModel: v || undefined })} placeholder={s.aiKind === 'anthropic' ? 'claude-sonnet-5-5' : s.aiKind === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini'} />
      </Field>
      <Field label="Key" wide group help={local ? t('aa.keyLocal') : t('aa.keyHelp')}>
        <VarTextInput {...varProps} rows={1} compact value={s.aiKey ?? ''} onChange={(v) => set({ aiKey: v || undefined })} placeholder="{{secret.openai_key}}" />
        {!isSecretKey(s.aiKey) && <span className="text-xs text-danger-text">{t('aa.keyBad')}</span>}
      </Field>
      <Field label={t('aa.attach')} wide group>
        <Segmented value={s.aiImage ?? ''} onChange={(v) => set({ aiImage: (v || undefined) as AIImage | undefined })} full
          options={AI_IMAGES} />
      </Field>
      {s.aiImage === 'screen' && <ShotAreaField step={s} label={t('shot.cap')} />}
      {s.aiImage === 'file' && (
        <Field label={t('aa.imgFile')} wide group>
          <PathInput kind="file" {...varProps} value={s.filePath ?? ''} onChange={(v) => set({ filePath: v || undefined })} placeholder="~/Pictures/image.png" />
        </Field>
      )}
      <Field label={t('aa.answer')} wide group help={t('aa.answerHelp')}>
        <Segmented value={s.aiFormat ?? ''} onChange={(v) => set({ aiFormat: (v || undefined) as AIFormat | undefined })} full
          options={AI_FORMATS} />
      </Field>
      <Field label={t('aa.fallback')} wide group help={t('aa.fallbackHelp')}>
        <VarTextInput {...varProps} rows={2} value={s.aiFallback ?? ''} onChange={(v) => set({ aiFallback: v || undefined })} placeholder={t('aa.fallbackPh')} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {local
          ? t('aa.noteLocal')
          : t('aa.noteCloud')}
      </span>
    </>
  );
}
