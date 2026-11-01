// Node web (bước 25d): tìm phần tử bằng HTML qua Chrome của app. Mỗi dòng một cách tìm, dòng đầu ưu tiên.
// Trạng thái Chrome của app, Chọn phần tử trên trang, Thử tìm – D3 (WebTools); trường riêng từng loại – WebActionFields.
import { useEffect } from 'react';
import NumInput from '../NumInput';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { browserStatusText, parseSelector, selectorLines, WEB_BASIC_NOTE, webFindText } from '../../flow/web';
import { cancelPick, finishWebLogin, openAppBrowser, pickElement, refreshBrowser, startWebLogin, testWebFind, useWebState } from '../../webSteps';
import { inWails, openOverlay } from '../../windowMode';
import { WebTools } from './WebTools';
import { WebScopeField } from './WebScopeField';
import { WebTabField } from './WebTabField';
import { SelectorsField, WebClickFields, webHintText, WebModeField, WebReadFields, WebScrollFields, WebTypeFields, WebWaitFields } from './WebActionFields';
import { Field, fmtSec, hint, NumField } from './shared';

// Nhãn ô cách tìm theo loại / cách cuộn.
const selectorsLabel = (s: Step) =>
  s.type === 'webType' ? 'Cách tìm ô nhập'
    : s.type === 'webScroll' && s.scrollMode === 'in' ? 'Cách tìm khung cần lăn'
    : s.type === 'webScroll' && s.scrollMode === 'until' ? 'Lăn tới khi thấy phần tử'
    : 'Cách tìm phần tử';

export function WebFields({ step: s }: { step: Step }) {
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  const lines = selectorLines(s.selectors);
  const web = useWebState();
  useEffect(() => { void refreshBrowser(); }, [s.id]);
  const find = web.finds[s.id];
  return (
    <>
      <WebTools status={inWails ? browserStatusText(web.status) : 'Chrome của app: chỉ dùng được trong app'} open={!!web.status?.open}
        login={!!web.status?.login} loginBusy={web.login} onLogin={startWebLogin} onFinishLogin={finishWebLogin} enabled={inWails} picking={web.picking === s.id} finding={web.busy === s.id} canFind={lines.length > 0 && lines.every(parseSelector)}
        result={find ? { ...webFindText(find, s.tab, s.type === 'webRead'), elText: find.found ? find.text : undefined } : null}
        error={web.busy === '' && web.picking === '' ? web.error : ''}
        onOpen={openAppBrowser} onRefresh={refreshBrowser} onPick={() => pickElement(s.id)} onCancelPick={cancelPick}
        onFind={() => testWebFind(s.id)} onView={() => openOverlay('point', s.id)} />
      {s.type === 'webWait' && <WebWaitFields step={s} />}
      {s.type === 'webScroll' && <WebScrollFields step={s} />}
      <SelectorsField step={s} label={selectorsLabel(s)} value={s.selectors} onChange={(selectors) => set({ selectors })}
        placeholder={'text=Xem lịch sử\naria=Lịch sử\ncss=#history'} emptyText="Chưa nhập cách tìm – chạy sẽ báo lỗi"
        help={'text= chữ trên trang (chứa, không phân biệt hoa thường; text="Gửi" = đúng cả chuỗi), aria= nhãn aria-label, role=button[name="Gửi"] vai trò + tên, label=Ngày sinh ô nhập của nhãn, css=, xpath=. Ưu tiên chữ / aria / role – tránh class tự sinh kiểu x1n2onr6. ' + WEB_BASIC_NOTE} />
      <WebTabField step={s} />
      <WebScopeField step={s} />
      {s.type === 'webClick' && <WebClickFields step={s} />}
      {s.type === 'webType' && <WebTypeFields step={s} />}
      {s.type === 'webRead' && <WebReadFields step={s} />}
      <WebModeField step={s} />
      <NumField label="Chờ tối đa" step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label="Kiểm tra mỗi">
        <NumInput value={s.intervalMs ?? 200} min={20} unit="ms" onChange={(intervalMs) => set({ intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        {webHintText(s, fmtSec(s.timeoutMs))}
        {s.type !== 'webRead' && !(s.type === 'webWait' && s.webGone) && !s.webBackground && ' Lần đầu chuột đi vào trang vài điểm để đo toạ độ.'}
      </span>
    </>
  );
}
