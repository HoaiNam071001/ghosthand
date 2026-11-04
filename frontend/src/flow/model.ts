// Flow (bước 20) – phần dùng chung với Go (flow.go): cổng ra theo loại node, thứ tự hiển thị node.
// flowOrder phải cùng công thức với internal/model/flow.go – test chung dữ liệu testdata/flow_order.json (gốc repo).
import type { Edge, Step } from '../types';

export const PORT_SUCCESS = 'success';
export const PORT_FAIL = 'fail';
export const CASE_PREFIX = 'case:';

// Node cần để biết cổng ra: loại + case (switch).
export type PortShape = Pick<Step, 'type' | 'cases' | 'appOp'>;

// Cổng ra hợp lệ theo thứ tự trên thẻ (trên → dưới) – cùng công thức portsOf (flow.go).
export function portsOf(s: PortShape): string[] {
  const cases = (last: string) => [...(s.cases ?? []).map((c) => CASE_PREFIX + c.key), last];
  switch (s.type) {
    case 'if': return ['true', 'false'];
    case 'switch': return cases('default');
    case 'switchScreen': return cases('none');
    case 'counter': return ['next', 'done'];
    case 'forEach': return ['item', 'done'];
    case 'end': return [];
    case 'askUser': return ['approve', 'deny', 'timeout'];
    case 'setVar': case 'calc': case 'textSplit': case 'textClean': return [PORT_SUCCESS];
    case 'app': if (!s.appOp) return ['yes', 'no'];
    default: return [PORT_SUCCESS, PORT_FAIL];
  }
}

// Node có "chỗ thấy" cho Click theo ảnh (findsImage – flowcheck.go): chờ ảnh / chữ, click theo ảnh tự tìm,
// Nếu / Switch theo màn hình (chỗ thấy của điều kiện đúng đầu tiên).
export const findsImage = (s: Pick<Step, 'type' | 'imageSource'>) =>
  s.type === 'waitImage' || (s.type === 'clickImage' && s.imageSource === 'search') || s.type === 'if' || s.type === 'switchScreen';

export const edgeOut = (edges: Edge[], from: string, port: string) => edges.find((e) => e.from === from && e.port === port)?.to ?? '';

// Các node theo thứ tự hiển thị (xem trước, danh sách trong form Chạy).
export const orderedSteps = <S extends Pick<Step, 'id' | 'type' | 'cases' | 'appOp'>>(sc: { steps: S[]; start: string; edges: Edge[] }): S[] => {
  const byId = new Map(sc.steps.map((s) => [s.id, s]));
  return flowOrder(sc).map((id) => byId.get(id)!);
};

// Thứ tự hiển thị: duyệt sâu từ start, mỗi node đi các cổng theo thứ tự portsOf (nhánh success trước), node đã gặp bỏ qua;
// node không đi tới được xếp cuối theo thứ tự trong mảng.
// Đồ thị tối thiểu để duyệt: node chỉ cần id + loại (cổng ra theo loại).
export type FlowShape = { start: string; steps: Pick<Step, 'id' | 'type' | 'cases' | 'appOp'>[]; edges: Edge[] };

export function flowOrder(sc: FlowShape): string[] {
  const byId = new Map(sc.steps.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const order: string[] = [];
  const stack = byId.has(sc.start) ? [sc.start] : [];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    const ports = portsOf(byId.get(id)!);
    for (let i = ports.length - 1; i >= 0; i--) { // đẩy ngược để cổng đầu được lấy ra trước
      const to = edgeOut(sc.edges, id, ports[i]);
      if (to && !seen.has(to) && byId.has(to)) stack.push(to);
    }
  }
  for (const s of sc.steps) if (!seen.has(s.id)) order.push(s.id);
  return order;
}
