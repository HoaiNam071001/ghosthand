// Node Chờ sự kiện giao diện (bước 43 E2, internal/engine/waituievent.go) – nhãn sự kiện, dòng chi tiết thẻ.
import { fmtMs, type Step } from '../types';
import { firstSelector } from './element';
import { tr } from '../i18n/lang';

// Khớp model.UIEvents ('' = newWindow). window: lọc theo cửa sổ (winApp / winTitle); element: theo selectors.
export type UiEvent = 'newWindow' | 'focus' | 'newElement' | 'valueChange';
export const UI_EVENTS: { id: UiEvent; label: string; target: 'window' | 'element' }[] = [
  { id: 'newWindow', get label() { return tr('uie.0'); }, target: 'window' },
  { id: 'focus', get label() { return tr('uie.1'); }, target: 'window' },
  { id: 'newElement', get label() { return tr('uie.2'); }, target: 'element' },
  { id: 'valueChange', get label() { return tr('uie.3'); }, target: 'element' },
];

export function uiEventOf(s: Step): (typeof UI_EVENTS)[number] {
  return UI_EVENTS.find((e) => e.id === (s.uiEvent || 'newWindow')) ?? UI_EVENTS[0];
}

// Dòng chi tiết: cửa sổ mới Notes · “Lưu thành” · tối đa 10 s  |  phần tử mới “role=dialog” · Safari · tối đa 10 s
export function fmtWaitUIEvent(s: Step): string {
  const ev = uiEventOf(s);
  const wait = tr('el.max', { t: fmtMs(s.timeoutMs ?? 0) });
  if (ev.target === 'element') {
    return `${ev.id === 'newElement' ? tr('uie.d.newEl') : tr('uie.d.valChange')} ${firstSelector(s.selectors)} · ${s.elementApp?.trim() || tr('el.topApp')} · ${wait}`;
  }
  const what = [s.winApp?.trim(), s.winTitle?.trim() && `“${s.winTitle.trim()}”`].filter(Boolean).join(' · ') || tr('uie.d.allWin');
  return `${ev.id === 'newWindow' ? tr('uie.d.newWin') : tr('uie.d.switchTo')} ${what} · ${wait}`;
}
