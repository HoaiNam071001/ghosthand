// Node mở URL / app và node gõ chữ – ô chữ nhận {{biến}}.
import Segmented from '../Segmented';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { Step, TypeMode } from '../../types';
import type { MsgKey } from '../../i18n/vi';
import { webBasicNote } from '../../flow/web';
import { useT } from '../../i18n';
import { errText, Field, hint, selectBox, useNodeVars, varHint } from './shared';

// Trình duyệt gợi ý cho bước Mở (Windows: open.go đổi sang tên lệnh chrome / msedge / firefox)
const APP_BROWSER = '__app'; // giá trị ô chọn cho Step.webBrowser (bước 25d) – không phải tên app
const BROWSERS = ['Google Chrome', 'Microsoft Edge', 'Firefox', ...(navigator.platform.startsWith('Mac') ? ['Safari'] : [])];

export function OpenFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  return (
          <>
        <Field label={t('tf.url')} wide group side={varHint}
          help={t('tf.urlHelp')}>
          <VarTextInput value={s.target ?? ''} onChange={(target) => set({ target })} inputs={script.inputs ?? []} nodeVars={nodeVars} rows={2}
            placeholder={t('tf.urlPh')} onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} />
        </Field>
        <Field label={t('tf.openWith')} group help={s.webBrowser
          ? t('tf.helpAppChrome') + ' ' + webBasicNote()
          : t('tf.helpDefault')}>
          <Select value={s.webBrowser ? APP_BROWSER : s.app ?? ''} className={selectBox} aria-label={t('tf.openWith')}
            onChange={(v) => set(v === APP_BROWSER ? { webBrowser: true } : { webBrowser: undefined, app: v })}
            options={[{ value: '', label: t('tf.defaultBrowser') }, { value: APP_BROWSER, label: t('tf.appChrome') },
              ...[...BROWSERS, ...(s.app && !BROWSERS.includes(s.app) ? [s.app] : [])].map((b) => ({ value: b, label: b }))]} />
        </Field>
      </>
  );
}

export function TypeFields({ step: s }: { step: Step }) {
  const t = useT();
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  return (
    <>
      <Field label={t('tf.typeContent')} wide group side={varHint}
        help={t('tf.typeHelp')}>
        <VarTextInput value={s.text} onChange={(text) => set({ text })} inputs={script.inputs ?? []} nodeVars={nodeVars}
          onCreateInput={(key) => addInput({ key, label: key, type: 'text' })} />
        {s.text ? <span className={hint}>{t('tf.chars', { n: [...s.text].length })}</span> : <span className={errText}>{t('tf.noContent')}</span>}
      </Field>
      <TypeModeField step={s} />
    </>
  );
}

const TYPE_MODE_HELP: Record<TypeMode, MsgKey> = { '': 'tf.mode.autoHelp', keys: 'tf.mode.keysHelp', paste: 'tf.mode.pasteHelp' };

// Cách nhập chữ của node Gõ chữ / Gõ vào ô web (model.TypeModes).
export function TypeModeField({ step: s }: { step: Step }) {
  const t = useT();
  const mode = s.typeMode ?? '';
  return (
    <Field label={t('tf.mode')} wide group help={t(TYPE_MODE_HELP[mode])}>
      <Segmented value={mode} onChange={(v) => updateStep(s.id, { typeMode: (v || undefined) as TypeMode | undefined })} full label={t('tf.mode')}
        options={[{ id: '', label: t('tf.mode.auto') }, { id: 'keys', label: t('tf.mode.keys') }, { id: 'paste', label: t('tf.mode.paste') }]} />
    </Field>
  );
}
