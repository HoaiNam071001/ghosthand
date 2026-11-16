// Node Chụp màn hình (bước 35 N1; vùng dùng chung với Chờ màn hình 42 G1) – nhãn vùng chụp, dòng chi tiết thẻ, node nào có khung chỗ thấy để chụp theo.
// Chạy ở internal/engine/shot.go; HasFoundBox (internal/script/flowcheck.go) cùng công thức hasFoundBox.
import { fmtMs, type Step } from '../types';
import { windowHasBox } from './window';
import { tr } from '../i18n/lang';

// '' = vùng của kịch bản (khớp model.ShotAreas)
export type ShotArea = '' | 'screen' | 'rect' | 'node';
export const SHOT_AREAS: { id: ShotArea; label: string }[] = [
  { id: '', get label() { return tr('shot.area.0'); } }, { id: 'screen', get label() { return tr('shot.area.1'); } }, { id: 'rect', get label() { return tr('shot.area.2'); } }, { id: 'node', get label() { return tr('shot.area.3'); } },
];

// Node có khung chỗ thấy trên màn hình (output x, y = tâm, w, h): chờ ảnh / chữ, click theo ảnh tự tìm, Nếu / Switch theo
// màn hình, chờ / click phần tử web không chạy nền (chạy nền trả toạ độ trong trang).
export function hasFoundBox(s: Pick<Step, 'type' | 'imageSource' | 'webGone' | 'webBackground' | 'winOp'>): boolean {
  switch (s.type) {
    case 'waitImage': case 'if': case 'switchScreen': return true;
    case 'clickImage': return s.imageSource === 'search';
    case 'webWait': return !s.webGone && !s.webBackground;
    case 'webClick': return !s.webBackground;
    case 'window': return windowHasBox(s.winOp);
  }
  return false;
}

// Nhãn vùng chụp (dùng chung với Chờ màn hình). refOf: id node → mã (n2).
export function shotAreaLabel(s: Step, refOf: (id: string) => string): string {
  return s.shotArea === 'screen' ? (s.display ? tr('fx.shot.screenN', { n: s.display }) : tr('fx.shot.wholeScreen'))
    : s.shotArea === 'rect' ? (s.shotRect ? tr('fx.shot.rect', { w: s.shotRect.w, h: s.shotRect.h, x: s.shotRect.x, y: s.shotRect.y }) : tr('fx.shot.noRect'))
    : s.shotArea === 'node' ? tr('fx.shot.node', { r: s.imageFrom ? refOf(s.imageFrom) : tr('fx.noNode') })
    : tr('fx.shot.script');
}

// Dòng chi tiết thẻ: vùng · tên file · clipboard.
export function fmtShot(s: Step, refOf: (id: string) => string): string {
  const area = shotAreaLabel(s, refOf);
  const name = s.fileName?.trim() ? `${s.fileName.trim().replace(/\.png$/i, '')}.png` : tr('fx.shot.autoName');
  return `${area} → ${name}${s.toClipboard ? tr('fx.shot.clip') : ''}`;
}

// Node Đọc chữ vùng (bước 28 R1, engine/ocrread.go) – dòng chi tiết thẻ: vùng · tối đa.
export function fmtOcrRead(s: Step, refOf: (id: string) => string): string {
  return tr('fx.shot.max', { a: shotAreaLabel(s, refOf), t: fmtMs(s.timeoutMs ?? 0) });
}
