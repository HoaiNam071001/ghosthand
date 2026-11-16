// Chọn trình duyệt + tab cần làm – dùng chung node Tab trình duyệt và Đi tới URL (bước 43 B1 / B2): tab node Mở đã mở
// (tabFrom) hoặc tab có tiêu đề / URL chứa chuỗi (tab + tabMatch).
import { useT } from '../../i18n';
import Segmented from '../Segmented';
import Select from '../Select';
import VarTextInput from '../inputs/VarTextInput';
import { updateStep, useScript } from '../../store';
import { addInput } from '../../scriptInputs';
import { BROWSERS, type BrowserName } from '../../flow/browserTab';
import { nodeTitle } from '../../flow/view';
import { WIN_MATCHES } from '../../flow/window';
import { Step } from '../../types';
import { errText, Field, selectBox, useNodeVars } from './shared';

// Ô nhận biến của inspector trình duyệt (URL, tab).
export function useTabVarProps(s: Step) {
  const script = useScript();
  const nodeVars = useNodeVars(s.id);
  return { inputs: script.inputs ?? [], nodeVars, rows: 1, compact: true, onCreateInput: (key: string) => addInput({ key, label: key, type: 'text' }) };
}

export function BrowserField({ step: s }: { step: Step }) {
  const t = useT();
  return (
    <Field label={t('tt.browser')} wide group help={t('tt.browserHelp')}>
      <Select value={s.browser ?? ''} onChange={(v) => updateStep(s.id, { browser: (v || undefined) as BrowserName | undefined })} className={selectBox} aria-label={t('tt.browser')}
        options={BROWSERS.map((b) => ({ value: b.id, label: b.label }))} />
    </Field>
  );
}

// fromOK: thao tác làm được với tab node Mở; placeholder / need: ô Tab trống nghĩa là gì, có bắt buộc không.
export function TabTargetFields({ step: s, fromOK, placeholder, need }: { step: Step; fromOK: boolean; placeholder: string; need: boolean }) {
  const t = useT();
  const { steps } = useScript();
  const varProps = useTabVarProps(s);
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const opens = steps.filter((x) => x.type === 'open' && !x.webBrowser);
  const canFrom = fromOK && (opens.length > 0 || !!s.tabFrom);
  const from = canFrom ? opens.find((x) => x.id === s.tabFrom) : undefined;
  return (
    <>
      {canFrom && (
        <Field label={t('tt.fromOpen')} wide group help={t('tt.fromOpenHelp')}>
          <Select value={from?.id ?? ''} onChange={(v) => set({ tabFrom: v || undefined })} className={selectBox} aria-label={t('tt.fromOpenLabel')}
            options={[{ value: '', label: t('tt.byTitle') }, ...opens.map((x) => ({ value: x.id, label: `${x.ref} · ${nodeTitle(x)}` }))]} />
          {s.tabFrom && !from && <span className={errText}>{t('tab.w.gone')}</span>}
        </Field>
      )}
      {!from && (
        <>
          <Field label="Tab" wide group help={t('tt.tabHelp')}>
            <VarTextInput {...varProps} value={s.tab ?? ''} onChange={(v) => set({ tab: v || undefined })} placeholder={placeholder} />
            {need && !s.tab?.trim() && <span className={errText}>{t('tt.needTab')}</span>}
          </Field>
          {!!s.tab?.trim() && (
            <Field label={t('ap.match')} wide group>
              <Segmented value={s.tabMatch ?? ''} full label={t('ap.match')} onChange={(v) => set({ tabMatch: v || undefined })} options={WIN_MATCHES} />
            </Field>
          )}
        </>
      )}
    </>
  );
}
