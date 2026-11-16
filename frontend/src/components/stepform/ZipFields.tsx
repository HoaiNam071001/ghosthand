// Node Nén / giải nén (bước 43 S8): nguồn, đích, mẫu tên file khi nén thư mục.
import { useT } from '../../i18n';
import Segmented from '../Segmented';
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { ZIP_OPS, type ZipOp } from '../../flow/zip';
import { Step } from '../../types';
import { Field, hint, useNodeVars } from './shared';

export default function ZipFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const varProps = { inputs: script.inputs ?? [], nodeVars, rows: 1, compact: true, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
  const extract = s.zipOp === 'extract';
  return (
    <>
      <Field label={t('ap.do')} wide group>
        <Segmented value={s.zipOp ?? ''} full label={t('zf.opLabel')} onChange={(v) => set({ zipOp: (v || undefined) as ZipOp | undefined })} options={ZIP_OPS} />
      </Field>
      <Field label={extract ? t('zf.zipFile') : t('zf.source')} wide group help={t('cl.pngHelp')}>
        <PathInput kind={extract ? 'file' : 'any'} {...varProps} value={s.filePath ?? ''} onChange={(v) => set({ filePath: v || undefined })} placeholder={extract ? '~/Downloads/pack.zip' : '~/Documents/report'} />
      </Field>
      <Field label={extract ? t('zf.extractTo') : t('zf.saveAs')} wide group help={t(extract ? 'zf.extractHelp' : 'zf.saveHelp')}>
        <PathInput kind={extract ? 'folder' : 'save'} {...varProps} value={s.zipTo ?? ''} onChange={(v) => set({ zipTo: v || undefined })} placeholder={extract ? '~/Documents/pack' : '~/Documents/report.zip'} />
      </Field>
      {!extract && (
        <Field label={t('zf.pattern')} wide group help={t('zf.patternHelp')}>
          <VarTextInput {...varProps} value={s.filePattern ?? ''} onChange={(v) => set({ filePattern: v || undefined })} placeholder="*.pdf" />
        </Field>
      )}
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {t(extract ? 'zf.noteExtract' : 'zf.noteZip')}{' '}
        {t('pf.later')} {`{{${s.ref}.output.path}}`}, {`{{${s.ref}.output.count}}`}.
      </span>
    </>
  );
}
