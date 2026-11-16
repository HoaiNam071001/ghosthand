// Chữ gợi ý một dòng trên overlay theo công cụ / trạng thái đang làm.
import { tr } from '../i18n/lang';
import type { OverlayTool } from '../windowMode';
import { STEP_LABEL, Step, StepType } from '../types';

export type HintState = {
  focusStep: Step | null; // xem riêng một node
  repicking: boolean; // đang "Chọn lại trên màn hình" khi xem riêng
  dragA: boolean; // kéo thả: đã có A, chờ B
  tool: OverlayTool;
  captured: boolean; // khoanh ảnh: đã có khung, chờ Dùng ảnh này
  captureRef: string | null; // mã node sẽ nhận ảnh mẫu, null = tạo node Chờ ảnh mới
  captureRect?: boolean; // khoanh vùng cho node Chụp màn hình, không phải ảnh mẫu
  selected: number; // số điểm đang chọn (Chọn nhiều)
  picking: boolean; // đang chọn lại điểm của node có sẵn
  pickingElement?: boolean; // Chọn phần tử trên màn (37 E3): click lấy phần tử dưới chuột
  placing: StepType; // loại node sẽ thêm khi đặt điểm
  modKey: string; // ⌘ / Ctrl
};

export function overlayHint(h: HintState): string {
  if (h.pickingElement) return tr('oh.pickEl');
  const f = h.focusStep;
  if (f) {
    if (!h.repicking) return tr('oh.dragMarker');
    if (f.type === 'drag' && !f.dragFromPrev) return h.dragA ? tr('oh.clickB') : tr('oh.clickA');
    return tr('oh.repoint');
  }
  switch (h.tool) {
    case 'preview':
      return tr('oh.fake');
    case 'region':
      return tr('oh.region');
    case 'stroke':
      return tr('oh.stroke');
    case 'capture':
      if (h.captureRect) return h.captured ? tr('oh.useRegion') : tr('oh.dragRegion', { ref: h.captureRef ?? '' });
      return h.captured ? tr('oh.useImage')
        : tr('oh.dragImage') + (h.captureRef ? ` (${h.captureRef})` : ` – ${tr('oh.newWait')}`);
    case 'select':
      return h.selected
        ? tr('oh.selected', { n: h.selected, k: h.modKey })
        : tr('oh.selectHint', { k: h.modKey });
    case 'drag':
      return h.dragA ? tr('oh.clickBEsc') : tr('oh.clickA2') + (h.picking ? ` ${tr('oh.again')}` : '');
  }
  return h.picking ? tr('oh.clickRepoint') : tr('oh.add', { what: STEP_LABEL[h.placing].toLowerCase() });
}
