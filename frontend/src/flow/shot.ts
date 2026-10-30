// Node Chụp màn hình (bước 35 N1; vùng dùng chung với Chờ màn hình 42 G1) – nhãn vùng chụp, dòng chi tiết thẻ, node nào có khung chỗ thấy để chụp theo.
// Chạy ở internal/engine/shot.go; HasFoundBox (internal/script/flowcheck.go) cùng công thức hasFoundBox.
import { fmtMs, type Step } from '../types';
import { windowHasBox } from './window';

// '' = vùng của kịch bản (khớp model.ShotAreas)
export type ShotArea = '' | 'screen' | 'rect' | 'node';
export const SHOT_AREAS: { id: ShotArea; label: string }[] = [
  { id: '', label: 'Vùng kịch bản' }, { id: 'screen', label: 'Cả màn' }, { id: 'rect', label: 'Vùng cố định' }, { id: 'node', label: 'Chỗ node thấy' },
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
  return s.shotArea === 'screen' ? (s.display ? `màn ${s.display}` : 'cả màn')
    : s.shotArea === 'rect' ? (s.shotRect ? `vùng ${s.shotRect.w} × ${s.shotRect.h} tại ${s.shotRect.x}, ${s.shotRect.y}` : 'chưa chọn vùng')
    : s.shotArea === 'node' ? `chỗ ${s.imageFrom ? refOf(s.imageFrom) : '(chưa chọn node)'} thấy`
    : 'vùng kịch bản';
}

// Dòng chi tiết thẻ: vùng · tên file · clipboard.
export function fmtShot(s: Step, refOf: (id: string) => string): string {
  const area = shotAreaLabel(s, refOf);
  const name = s.fileName?.trim() ? `${s.fileName.trim().replace(/\.png$/i, '')}.png` : 'tên theo giờ';
  return `${area} → ${name}${s.toClipboard ? ' · chép clipboard' : ''}`;
}

// Node Đọc chữ vùng (bước 28 R1, engine/ocrread.go) – dòng chi tiết thẻ: vùng · tối đa.
export function fmtOcrRead(s: Step, refOf: (id: string) => string): string {
  return `${shotAreaLabel(s, refOf)} · tối đa ${fmtMs(s.timeoutMs ?? 0)}`;
}
