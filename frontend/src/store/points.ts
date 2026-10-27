// Điểm của node: đặt điểm mới / chọn lại trên overlay (click, F6), dời marker, đổi neo, kéo thả từ điểm trước / tương đối,
// cuộn tại điểm. Node mới tạo từ điểm đi qua nodes.insertNode (nối theo insertAt).
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { STEP_DEFAULTS } from '../flow/defaults';
import { anchorPoint, fmtPoint } from '../anchor';
import { simplifyStroke } from '../overlay/stroke';
import { makeStep, Anchor, Point, Step, STEP_LABEL, StepPoint, StepType } from '../types';
import { inWails, openOverlay, setWindowMode } from '../windowMode';
import { getEditor, setEditor, setNotice } from './editor';
import { boundsOf, centerPoint, endpoints, toRelative, toScreen } from './geometry';
import { clearInsertAt, insertAfterSelected, insertNode, insertTarget, newId, setInsertAt, updateStep } from './nodes';
import { flowTail } from '../flow/edit';
import { updateCond } from './control';
import type { CondAt } from '../flow/cond';

const script = () => getEditor().script;

// Loại node tạo khi đặt điểm trên overlay (bảng thêm node chọn Double click / Giữ chuột).
type PointType = Extract<StepType, 'click' | 'double' | 'hold'>;
let pointType: PointType = 'click';
export const placingType = () => pointType; // gợi ý trên overlay

// Bảng thêm node: node cần vị trí → mở overlay chọn điểm; node mới nối theo insertAt (đặt trước khi mở bảng).
export function addPointStep(type: PointType | 'drag') {
  if (type === 'drag') return openOverlay('drag');
  pointType = type;
  return openOverlay('point');
}

// Cuộn tại điểm (on) hay tại chỗ chuột đang đứng: bật thì đặt điểm giữa vùng / màn hình, chọn lại bằng ⌖ hoặc overlay.
export const setScrollAt = (id: string, on: boolean) => updateStep(id, { points: on ? [centerPoint(script().region)] : [] });

// Đổi neo điểm thứ index của node, giữ nguyên chỗ trên màn hình (lưới chọn neo, nút %).
export function setAnchor(id: string, index: number, ax: Anchor, ay: Anchor) {
  const { steps, region } = script();
  const s = steps.find((x) => x.id === id);
  const p = s?.points[index];
  if (!s || !p) return;
  const q = anchorPoint(toScreen(p, region, s), boundsOf(region, s), ax, ay);
  updateStep(id, { points: s.points.map((x, i) => (i === index ? q : x)) });
}

// Điểm thứ index lấy toạ độ từ biến (on, F5b) hay số + neo. Bật: điền sẵn toạ độ màn hình hiện tại (B "lệch so với A":
// độ lệch) để sửa thành biến; tắt: ô đang là số nguyên thì giữ chỗ đó, không thì giữ điểm cũ.
export function setPointVar(id: string, index: number, on: boolean) {
  const { steps, region } = script();
  const s = steps.find((x) => x.id === id);
  const p = s?.points[index];
  if (!s || !p) return;
  const rel = s.type === 'drag' && index === 1 && s.dragRelative;
  const { xVar: xs = '', yVar: ys = '', ...plain } = p;
  let q: StepPoint = plain;
  if (on) {
    const at = rel ? p : toScreen(p, region, s);
    q = { ...p, xVar: String(at.x), yVar: String(at.y) };
  } else if (/^-?\d+$/.test(xs.trim()) && /^-?\d+$/.test(ys.trim())) {
    const at = { x: Number(xs), y: Number(ys) };
    q = rel ? { ...plain, ...at } : toRelative(at, region, plain, s) ?? plain;
  }
  updateStep(id, { points: s.points.map((x, i) => (i === index ? q : x)) });
}

// ---- Chọn điểm trên overlay ----

// Node đang được chọn lại điểm (nút ⌖ trong form); null = điểm mới sẽ thành node mới.
let pickTarget: string | null = null;
let pickStay = false; // chọn lại xong thì ở lại overlay (chế độ xem riêng một node) thay vì về màn chính
// Overlay đang xem riêng một node: click / F6 không tạo node mới (trừ khi đang chọn lại điểm).
let focusLock = false;
export const setFocusLock = (on: boolean) => {
  focusLock = on;
};
// Overlay đang ở công cụ "Kéo thả A → B": điểm mới đi theo cặp A, B thay vì thành node click.
let dragMode = false;

// Chọn lại điểm ngay trong overlay đang mở (chế độ xem riêng) – không mở lại overlay, xong thì ở lại.
export function startPick(stepId: string) {
  pickTarget = stepId;
  pickStay = true;
  if (getEditor().dragA) setEditor({ dragA: null });
}

export function pickPointFor(stepId: string) {
  pickTarget = stepId;
  pickStay = false;
  const step = script().steps.find((s) => s.id === stepId);
  return openOverlay(step?.type === 'drag' ? 'drag' : 'point');
}

// Vẽ đường (bước 50 E1): mở overlay, người dùng kéo một nét liền → các điểm của node Vẽ đường (placeStroke).
export function drawPathFor(stepId: string) {
  pickTarget = stepId;
  pickStay = false;
  return openOverlay('stroke');
}

export const pickingStep = () => pickTarget;
export const pickingPoint = () => pickFn !== null; // đang lấy điểm cho pickScreenPoint

// Chọn điểm cho điều kiện màu (node Nếu / case Switch theo màn hình) – xong về màn chính.
let pickCond: { id: string; at: CondAt } | null = null;
export function pickCondPoint(stepId: string, at: CondAt) {
  pickCond = { id: stepId, at };
  pickTarget = null;
  return openOverlay('point');
}

// Lấy một điểm màn hình trên overlay rồi giao cho cb (vd Chọn phần tử trên màn – 37 E3); xong về màn chính.
let pickFn: ((screen: Point) => void) | null = null;
export function pickScreenPoint(cb: (screen: Point) => void) {
  pickFn = cb;
  pickTarget = null;
  return openOverlay('point');
}

// Gọi khi đổi công cụ / đóng overlay; luôn bỏ điểm A đang chờ.
export const setDragMode = (on: boolean) => {
  dragMode = on;
  if (getEditor().dragA) setEditor({ dragA: null });
};

// Esc trên overlay: huỷ điểm A đang chờ. Trả false nếu không có gì để huỷ.
export const cancelDragA = () => {
  if (!getEditor().dragA) return false;
  setEditor({ dragA: null, notice: 'Đã huỷ điểm A' });
  return true;
};

export const cancelPick = () => {
  pickTarget = null;
  pickCond = null;
  pickFn = null;
  pickStay = false;
  pointType = 'click';
  clearInsertAt();
  setDragMode(false);
};

// Đặt một điểm (toạ độ màn hình thật) từ click trên overlay hoặc F6:
// đang chọn lại → sửa điểm của node đó rồi về màn chính; không thì thêm node click mới.
export function placePoint(screen: Point): boolean {
  const { script: sc, dragA } = getEditor();
  if (pickFn) { // toạ độ màn hình thật – không cần nằm trong vùng của kịch bản
    const fn = pickFn;
    pickFn = null;
    setWindowMode('main');
    fn(screen);
    return true;
  }
  if (focusLock && !pickTarget) {
    setNotice('Đang xem riêng một node – bấm “Chọn lại trên màn hình” để đặt điểm, hoặc “Xem tất cả”');
    return false;
  }
  const rel = toRelative(screen, sc.region);
  if (!rel) {
    setNotice(`Điểm X ${screen.x} Y ${screen.y} nằm ngoài vùng – chọn trong vùng hoặc đổi về toàn màn hình`);
    return false;
  }
  if (pickCond) {
    const { id, at } = pickCond;
    pickCond = null;
    updateCond(id, at, (c) => ({ ...c, points: [rel] }));
    setEditor({ selected: id, notice: `Đã đặt điểm cho điều kiện màu: ${fmtPoint(rel)}` });
    setWindowMode('main');
    return true;
  }
  const target = pickTarget && sc.steps.find((s) => s.id === pickTarget);
  // Kéo thả cần 2 điểm – trừ khi node đang chọn lại bắt đầu "từ điểm trước đó" (chỉ cần B).
  const wantsPair = target ? target.type === 'drag' && !target.dragFromPrev : dragMode;
  if (wantsPair && !dragA) {
    setEditor({ dragA: screen, notice: `Điểm A: ${fmtPoint(rel)} – chọn điểm B (Esc để huỷ)` });
    return true;
  }
  const a = wantsPair ? dragA! : null;
  if (a) setEditor({ dragA: null });

  if (target) {
    pickTarget = null;
    if (a) movePoint(target.id, 0, a);
    movePoint(target.id, target.type === 'drag' ? 1 : 0, screen);
    if (pickStay) pickStay = false;
    else setWindowMode('main');
    return true;
  }
  // Mở overlay không từ cổng nào (nút Chọn vùng, thêm khi chưa chọn node): node đầu nối vào cuối flow, các điểm sau
  // nối tiếp nhau (insertNode dời insertAt sang node vừa thêm) – đặt nhiều điểm thành chuỗi đúng thứ tự.
  if (!insertTarget()) setInsertAt(flowTail(sc));
  if (a) {
    const relA = toRelative(a, sc.region)!;
    const step = makeStep({ id: newId(), type: 'drag', ...STEP_DEFAULTS.drag, points: [relA, rel] });
    insertNode(step, (ref) => `Đã thêm ${ref}: kéo A ${fmtPoint(relA)} → B ${fmtPoint(rel)}`);
    return true;
  }
  const step = makeStep({ id: newId(), type: pointType, ...STEP_DEFAULTS[pointType], points: [rel] });
  insertNode(step, (ref) => `Đã thêm ${ref}: ${STEP_LABEL[pointType].toLowerCase()} ${fmtPoint(rel)}`);
  return true;
}

// Nét vẽ (toạ độ màn hình thật) → rút gọn thành điểm của node đang vẽ; thành hình thì chuyển lại về "các điểm". Trả false = ở lại overlay vẽ lại.
export function placeStroke(screen: Point[]): boolean {
  const sc = script();
  const target = pickTarget && sc.steps.find((s) => s.id === pickTarget);
  if (!target) return false;
  const points = simplifyStroke(screen).map((p) => toRelative(p, sc.region));
  if (points.length < 2) {
    setNotice('Nét vẽ quá ngắn – kéo dài hơn rồi thả chuột');
    return false;
  }
  if (points.some((p) => !p)) {
    setNotice('Nét vẽ đi ra ngoài vùng – vẽ trong vùng hoặc đổi về toàn màn hình');
    return false;
  }
  pickTarget = null;
  updateStep(target.id, { points: points as StepPoint[], shape: undefined, shapeW: undefined, shapeH: undefined });
  setEditor({ selected: target.id, notice: `Đã vẽ ${points.length} điểm cho ${target.ref}` });
  setWindowMode('main');
  return true;
}

// Dời điểm thứ index của node id tới toạ độ màn hình screen (kéo marker, chọn lại điểm). Ngoài vùng → báo và giữ nguyên.
export function movePoint(id: string, index: number, screen: Point): boolean {
  const sc = script();
  const step = sc.steps.find((s) => s.id === id);
  if (!step) return false;
  const rel = toRelative(screen, sc.region, step.points[index], step);
  if (!rel) {
    setNotice(`Điểm X ${screen.x} Y ${screen.y} nằm ngoài vùng – giữ vị trí cũ`);
    return false;
  }
  const label = step.type === 'drag' ? `${step.ref}${index === 0 ? 'A' : 'B'}` : step.ref;
  let value = rel;
  // Điểm B lưu dạng lệch so với điểm bắt đầu: đổi toạ độ màn hình sang (dx, dy).
  if (step.type === 'drag' && index === 1 && step.dragRelative) {
    const start = endpoints(sc, sc.region).get(id)?.start;
    if (!start) {
      setNotice(`${step.ref}: chưa xác định được điểm bắt đầu – giữ vị trí cũ`);
      return false;
    }
    value = { x: screen.x - start.x, y: screen.y - start.y };
  }
  updateStep(id, { points: step.points.map((p, i) => (i === index ? value : p)) });
  setEditor({ selected: id, notice: `Đã đặt điểm ${label}: ${fmtPoint(value)}` });
  return true;
}

// ---- Kéo thả: từ điểm trước / điểm cuối tương đối ----

// Bật/tắt "từ điểm trước": giữ nguyên chỗ trên màn hình – tắt thì A lấy đúng điểm trước đó.
export function setDragFromPrev(id: string, on: boolean) {
  const sc = script();
  const s = sc.steps.find((x) => x.id === id);
  if (!s || s.type !== 'drag') return;
  const ends = endpoints(sc, sc.region).get(id);
  const patch: Partial<Step> = { dragFromPrev: on };
  if (!on && ends?.start) patch.points = [toRelative(ends.start, sc.region, s.points[0]) ?? s.points[0], s.points[1]];
  updateStep(id, patch);
}

// Bật/tắt "điểm cuối tương đối": đổi points[1] giữa toạ độ và độ lệch, giữ nguyên chỗ trên màn hình.
export function setDragRelative(id: string, on: boolean) {
  const sc = script();
  const s = sc.steps.find((x) => x.id === id);
  if (!s || s.type !== 'drag' || s.dragRelative === on) return;
  const ends = endpoints(sc, sc.region).get(id);
  let b = s.points[1];
  if (ends?.start && ends.end) {
    b = on
      ? { x: ends.end.x - ends.start.x, y: ends.end.y - ends.start.y }
      : toRelative(ends.end, sc.region, undefined, s) ?? anchorPoint(ends.end, boundsOf(sc.region, s), undefined, undefined);
  }
  updateStep(id, { dragRelative: on, points: [s.points[0], b] });
}

// F6 (Go nghe phím toàn cục) gửi vị trí chuột hiện tại. Không mở qua bảng thêm node → nối sau node đang chọn.
if (inWails) {
  EventsOn('hotkey:f6', (p: Point) => {
    if (!pickTarget && !focusLock && !getEditor().dragA) insertAfterSelected();
    placePoint(p);
  });
}
