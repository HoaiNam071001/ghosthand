// Node Clipboard (bước 35 N2): đọc chữ / ghi chữ / ghi ảnh PNG từ file – ô chữ nhận {{biến}}.
import Segmented from '../Segmented';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { CLIP_OPS, type ClipOp } from '../../flow/clipboard';
import { Step } from '../../types';
import { errText, Field, useNodeVars } from './shared';
import { useT } from '../../i18n';

export function ClipFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const op = s.clipOp ?? '';
  const varProps = { inputs: script.inputs ?? [], nodeVars, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  // node Chụp màn hình gần nhất – gợi ý điền sẵn đường dẫn ảnh của nó
  const shot = script.steps.find((x) => x.type === 'screenshot' && x.id !== s.id);
  return (
    <>
      <Field label={t('ap.do')} wide group help={op === 'write' ? t('cl.helpWrite')
        : op === 'image' ? t('cl.helpImage')
        : t('cl.helpRead', { ref: s.ref })}>
        <Segmented value={op} options={CLIP_OPS} onChange={(clipOp: ClipOp) => set({ clipOp: clipOp || undefined })} full label={t('cl.opLabel')} />
      </Field>
      {op === 'write' && (
        <Field label={t('cl.content')} wide group>
          <VarTextInput {...varProps} value={s.text} onChange={(text) => set({ text })} placeholder={t('cl.contentPh')} />
        </Field>
      )}
      {op === 'image' && (
        <Field label={t('cl.png')} wide group help={t('cl.pngHelp')}>
          <PathInput kind="file" {...varProps} value={s.filePath ?? ''} onChange={(v) => set({ filePath: v || undefined })}
            placeholder={shot ? `{{${shot.ref}.output.path}}` : '~/Pictures/image.png'} />
          {!s.filePath?.trim() && (
            <span className={errText}>{t('cl.noFile')}
              {shot && <> · <button className="text-accent-text underline" onClick={() => set({ filePath: `{{${shot.ref}.output.path}}` })}>{t('cl.useShot', { ref: shot.ref })}</button></>}
            </span>
          )}
        </Field>
      )}
    </>
  );
}
