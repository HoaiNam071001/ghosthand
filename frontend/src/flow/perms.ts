// Quyền hệ điều hành (macOS) mà node cần – cùng công thức với internal/perm/needs.go (NeedsOf), test chung testdata/perms.json.
import type { Cond, Script, Step } from '../types';

// Khớp perm.ID; thứ tự = thứ tự hiện ở tab Quyền.
export type PermId = 'accessibility' | 'screenRecording' | 'autoChrome' | 'autoFinder' | 'autoSystemEvents' | 'notifications';
const ORDER: PermId[] = ['accessibility', 'screenRecording', 'autoChrome', 'autoFinder', 'autoSystemEvents', 'notifications'];

const INPUT_TYPES = new Set(['click', 'double', 'hold', 'drag', 'type', 'key', 'scroll', 'path', 'webClick', 'webType', 'webScroll',
  'elementAction', 'pageText', 'readTable', 'readDocument', 'waitUIEvent']);

function addCond(n: Set<PermId>, c?: Cond) {
  if (!c) return;
  if (c.kind === 'image' || c.kind === 'text' || c.kind === 'pixel') n.add('screenRecording');
  if (c.kind === 'element') n.add('accessibility');
  c.conds?.forEach((x) => addCond(n, x));
}

// Tìm ảnh / chữ cần chụp màn hình; tìm phần tử đọc cây accessibility.
const addFind = (n: Set<PermId>, findBy?: string) => n.add(findBy === 'element' ? 'accessibility' : 'screenRecording');

// Chỉ tính Chrome cho Automation trình duyệt; Edge / Brave / Cốc Cốc xin quyền riêng lúc chạy.
const addChrome = (n: Set<PermId>, s: Step) => {
  if (!s.browser || s.browser === 'chrome') n.add('autoChrome');
};

function addStep(n: Set<PermId>, s: Step) {
  if (INPUT_TYPES.has(s.type)) n.add('accessibility');
  switch (s.type) {
    case 'waitImage': case 'findAll': addFind(n, s.findBy); break;
    case 'clickImage':
      n.add('accessibility');
      if (s.imageSource !== 'node') addFind(n, s.findBy);
      break;
    case 'elementRead':
      n.add('accessibility');
      if (s.findBy === 'text' || s.readNear) n.add('screenRecording');
      break;
    case 'waitPixel': case 'waitScreen': case 'screenshot': case 'ocrRead': n.add('screenRecording'); break;
    case 'if': case 'switchScreen': addCond(n, s.cond); s.cases?.forEach((c) => addCond(n, c.cond)); break;
    case 'browserTab': case 'browserGo': addChrome(n, s); break;
    case 'browserNorm': n.add('accessibility'); n.add('autoSystemEvents'); addChrome(n, s); break;
    case 'savePdf': n.add('accessibility'); addChrome(n, s); break;
    case 'file': if (s.fileOp === 'trash' || s.fileOp === 'emptyTrash') n.add('autoFinder'); break;
    case 'display': if (s.displayOp === 'theme') n.add('autoSystemEvents'); break;
    case 'power':
      if (s.powerOp === 'lock') { n.add('accessibility'); n.add('autoSystemEvents'); }
      if (s.powerOp === 'shutdown' || s.powerOp === 'restart') n.add('autoSystemEvents');
      break;
    case 'inputSource': if (s.inputOp === 'toggleIME') n.add('accessibility'); break;
    case 'notify': n.add('notifications'); break;
    case 'askAI': if (s.aiImage === 'screen') n.add('screenRecording'); break;
  }
}

const sorted = (n: Set<PermId>) => ORDER.filter((id) => n.has(id));

export function needsOf(s: Step): PermId[] {
  const n = new Set<PermId>();
  addStep(n, s);
  return sorted(n);
}

// Quyền cần cho mọi node đang bật của kịch bản.
export function needs(sc: Pick<Script, 'steps'>): PermId[] {
  const n = new Set<PermId>();
  sc.steps.filter((s) => s.enabled).forEach((s) => addStep(n, s));
  return sorted(n);
}

// Quyền trong ids mà hệ điều hành báo chưa cấp (`denied`; `unknown` / tự kiểm tra không tính – chưa chắc thiếu).
export function missingOf(items: { id: string; state: string }[] | null, ids: PermId[]): PermId[] {
  return ids.filter((id) => items?.some((it) => it.id === id && it.state === 'denied'));
}
