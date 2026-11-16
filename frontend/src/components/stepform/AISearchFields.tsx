// Tìm bằng AI (bước 31d) cho Chờ ảnh / Click theo ảnh: mô tả phần tử bằng lời, AI vision tìm trong ảnh vùng tìm.
// Dùng nhà cung cấp AI mặc định ở Cài đặt → Hỏi AI.
import { useT } from '../../i18n';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { testFind, useImageState } from '../../imageSteps';
import { openSettings } from '../../settingsNav';
import { Step } from '../../types';
import { errText, Field, hint, useNodeVars, varHint } from './shared';

export default function AISearchFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const { finds, busy, error } = useImageState();
  const find = finds[s.id];
  const empty = !s.findText?.trim();
  return (
    <>
      <Field label={t('ais.desc')} wide group side={varHint} help={t('ais.descHelp')}>
        <VarTextInput value={s.findText ?? ''} onChange={(findText) => updateStep(s.id, { findText })} inputs={script.inputs ?? []} nodeVars={nodeVars}
          placeholder={t('ais.ph')} onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} />
        {empty && <span className={errText}>{t('ais.empty')}</span>}
      </Field>
      <div className="col-span-2 flex flex-col gap-1.5">
        <button onClick={() => testFind(s.id)} disabled={empty || busy === s.id}
          title={t('ais.tryTip')}
          className="h-8 rounded-control border border-line bg-surface text-ink enabled:hover:bg-hover disabled:opacity-50">
          {busy === s.id ? t('ais.asking') : t('el.f.try')}
        </button>
        {find && (
          <span className={`text-xs ${find.found ? 'text-ok' : 'text-warn'}`}>
            {find.found ? <>{t('ais.found', { x: find.x + Math.round(find.w / 2), y: find.y + Math.round(find.h / 2) })} · {find.ms} ms</> : <>{t('ais.notFound')} · {find.ms} ms</>}
          </span>
        )}
        {error && busy === '' && <span className={errText}>{error}</span>}
        <span className={hint}>
          {t('ais.note')}{' '}
          <button className="underline" onClick={() => openSettings('askai')}>{t('ais.open')}</button>
        </span>
      </div>
    </>
  );
}
