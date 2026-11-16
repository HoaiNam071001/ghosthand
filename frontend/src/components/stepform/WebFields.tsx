// Node web (bước 25d): tìm phần tử bằng HTML qua Chrome của app. Mỗi dòng một cách tìm, dòng đầu ưu tiên.
// Trạng thái Chrome của app, Chọn phần tử trên trang, Thử tìm – D3 (WebTools); trường riêng từng loại – WebActionFields.
import { tr, useT } from '../../i18n';
import { useEffect } from 'react';
import NumInput from '../NumInput';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { browserStatusText, parseSelector, selectorLines, webBasicNote, webFindText } from '../../flow/web';
import { cancelPick, finishWebLogin, openAppBrowser, pickElement, refreshBrowser, startWebLogin, testWebFind, useWebState } from '../../webSteps';
import { inWails, openOverlay } from '../../windowMode';
import { WebTools } from './WebTools';
import { WebScopeField } from './WebScopeField';
import { WebTabField } from './WebTabField';
import { SelectorsField, WebClickFields, webHintText, WebModeField, WebReadFields, WebScrollFields, WebTypeFields, WebWaitFields } from './WebActionFields';
import { Field, fmtSec, hint, NumField } from './shared';

// Nhãn ô cách tìm theo loại / cách cuộn.
const selectorsLabel = (s: Step) =>
  s.type === 'webType' ? tr('wf2.findInput')
    : s.type === 'webScroll' && s.scrollMode === 'in' ? tr('wf2.findFrame')
    : s.type === 'webScroll' && s.scrollMode === 'until' ? tr('wf2.rollUntil')
    : tr('el.f.how');

export function WebFields({ step: s }: { step: Step }) {
  const t = useT();
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const lines = selectorLines(s.selectors);
  const web = useWebState();
  useEffect(() => { void refreshBrowser(); }, [s.id]);
  const find = web.finds[s.id];
  return (
    <>
      <WebTools status={inWails ? browserStatusText(web.status) : t('wf2.appOnly')} open={!!web.status?.open}
        login={!!web.status?.login} loginBusy={web.login} onLogin={startWebLogin} onFinishLogin={finishWebLogin} enabled={inWails} picking={web.picking === s.id} finding={web.busy === s.id} canFind={lines.length > 0 && lines.every(parseSelector)}
        result={find ? { ...webFindText(find, s.tab, s.type === 'webRead'), elText: find.found ? find.text : undefined } : null}
        error={web.busy === '' && web.picking === '' ? web.error : ''}
        onOpen={openAppBrowser} onRefresh={refreshBrowser} onPick={() => pickElement(s.id)} onCancelPick={cancelPick}
        onFind={() => testWebFind(s.id)} onView={() => openOverlay('point', s.id)} />
      {s.type === 'webWait' && <WebWaitFields step={s} />}
      {s.type === 'webScroll' && <WebScrollFields step={s} />}
      <SelectorsField step={s} label={selectorsLabel(s)} value={s.selectors} onChange={(selectors) => set({ selectors })}
        placeholder={t('wf2.ph')} emptyText={t('el.f.empty')}
        help={t('wf2.help') + ' ' + webBasicNote()} />
      <WebTabField step={s} />
      <WebScopeField step={s} />
      {s.type === 'webClick' && <WebClickFields step={s} />}
      {s.type === 'webType' && <WebTypeFields step={s} />}
      {s.type === 'webRead' && <WebReadFields step={s} />}
      <WebModeField step={s} />
      <NumField label={t('common.maxWait')} step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label={t('er.every')}>
        <NumInput value={s.intervalMs ?? 200} min={20} unit="ms" onChange={(intervalMs) => set({ intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {webHintText(s, fmtSec(s.timeoutMs))}
        {s.type !== 'webRead' && !(s.type === 'webWait' && s.webGone) && !s.webBackground && ' ' + t('wf2.measure')}
      </span>
    </>
  );
}
