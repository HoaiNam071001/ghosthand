// Node Thao tác phần tử (bước 43 E1, internal/engine/elementaction.go) – nhãn thao tác, dòng chi tiết thẻ.
import { fmtMs, type Step } from '../types';
import { firstSelector } from './element';
import { tr } from '../i18n/lang';

// Khớp model.ElementActs ('' = press)
export type ElementAct = 'press' | 'setValue' | 'check' | 'uncheck' | 'expand' | 'collapse' | 'select' | 'scroll';
export const ELEMENT_ACTS: { id: ElementAct; label: string; verb: string }[] = [
  { id: 'press', get label() { return tr('eact.0.l'); }, get verb() { return tr('eact.0.v'); } }, { id: 'setValue', get label() { return tr('eact.1.l'); }, get verb() { return tr('eact.1.v'); } },
  { id: 'check', get label() { return tr('eact.2.l'); }, get verb() { return tr('eact.2.v'); } }, { id: 'uncheck', get label() { return tr('eact.3.l'); }, get verb() { return tr('eact.3.v'); } },
  { id: 'expand', get label() { return tr('eact.4.l'); }, get verb() { return tr('eact.4.v'); } }, { id: 'collapse', get label() { return tr('eact.5.l'); }, get verb() { return tr('eact.5.v'); } },
  { id: 'select', get label() { return tr('eact.6.l'); }, get verb() { return tr('eact.6.v'); } }, { id: 'scroll', get label() { return tr('eact.7.l'); }, get verb() { return tr('eact.7.v'); } },
];

// Dòng chi tiết: bấm “role=button[name=Gửi]” · Safari · tối đa 10 s
export function fmtElementAction(s: Step): string {
  const verb = ELEMENT_ACTS.find((a) => a.id === (s.elementAct || 'press'))?.verb ?? tr('eact.0.v');
  const value = s.elementAct === 'setValue' ? ` = “${s.text ?? ''}”` : '';
  return `${verb} ${firstSelector(s.selectors)}${value} · ${s.elementApp?.trim() || tr('el.topApp')} · ${tr('el.max', { t: fmtMs(s.timeoutMs ?? 0) })}`;
}
