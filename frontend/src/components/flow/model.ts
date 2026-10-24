// Kiểu dữ liệu hiển thị của canvas flow (bước 20, F4a). Thẻ node / cạnh / nhật ký chỉ nhận các kiểu này qua props –
// màn mẫu #demo-flow tạo từ dữ liệu giả, app thật (F4b) tạo từ Script (model F1).
import type { StepIconName } from '../icons';
import type { NodeCategory } from '../../flow/category';
import { PORT_FAIL, PORT_SUCCESS } from '../../flow/model';

// Màu cổng ra: ok = thành công, fail = thất bại, neutral = nhánh khác (đúng / sai, case, còn lượt…)
export type PortKind = 'ok' | 'fail' | 'neutral';
export type PortView = {
  id: string; // success | fail | true | false | case:<key> | none | next | done
  label: string;
  kind: PortKind;
};

// Trạng thái node trong lần chạy (đang chạy / vừa xem lại nhật ký)
export type RunState = 'running' | 'ok' | 'fail' | 'skipped';

export type FlowNodeView = {
  id: string;
  ref: string; // mã ngắn n1, n2… – dùng trong biến {{n2.output.x}}
  icon: StepIconName;
  cat: NodeCategory; // nhóm node – màu đầu thẻ (flow/category)
  title: string;
  detail: string; // dòng mono dưới tên
  ports: PortView[]; // cổng ra theo thứ tự trên thẻ (trên → dưới)
  enabled?: boolean;
  warn?: string; // cảnh báo kiểm tra (thiếu dữ liệu, không đi tới được…)
  chips?: string[];
  breakpoint?: boolean;
  pinned?: boolean; // output đã ghim (pinStore) – node không chạy, dùng kết quả đã lưu
  run?: RunState;
  visits?: number; // số lần đã đi qua trong lần chạy
};

export type FlowEdgeView = {
  id: string;
  from: string;
  port: string;
  to: string;
  // cạnh qua nhóm thu gọn (flow/groups.ts routeEdges): đầu mút là id nhóm, đi qua cổng out / in của thẻ nhóm
  origFrom?: string;
  fromGroup?: boolean;
  toGroup?: boolean;
};

// Khung nhóm node (bước 39): box theo toạ độ canvas; thu gọn thì box là thẻ đứng thay cả cụm
export type FlowGroupView = {
  id: string;
  name: string;
  collapsed: boolean;
  members: string[];
  color?: string;
  box: { x: number; y: number; w: number; h: number };
};

// Một dòng nhật ký = StepResult của một lần chạy node (model Go ở F1)
export type LogLine = { t: string; level: 'info' | 'warn' | 'error'; msg: string };
export type RunRow = {
  nodeId: string;
  at: string; // giờ bắt đầu, mono
  loop?: number; // vòng thứ mấy của kịch bản
  status: 'success' | 'fail' | 'skipped' | 'cancelled' | 'running';
  port?: string;
  next?: string; // ref node kế (hoặc "dừng" / "kết thúc")
  ms?: number;
  attempts?: number;
  output?: Record<string, unknown>;
  error?: { code: string; message: string; detail?: Record<string, unknown> };
  logs?: LogLine[];
  shot?: string; // ảnh màn hình lúc thất bại (file trong lịch sử chạy)
};

// Cỡ thẻ node (design v3) – cố định để xếp tự động (flow/layout.ts) không cần đo DOM. NodeCard dùng đúng các số này.
export const NODE_W = 168;
export const NODE_HEAD = 32; // đầu thẻ: ô icon + tên + mã node (nền màu nhóm)
export const NODE_DETAIL = 26; // dòng chi tiết mono
export const PORT_ROW = 18; // node nhiều lối ra: mỗi cổng một dòng
export const PORTS_PAD = 6; // đệm dưới vùng cổng

// Node chỉ có Thành công / Thất bại (node hành động, Đặt biến): không có dòng cổng – chỉ 2 chấm trên mép phải.
// Node khác (Nếu, Switch, Đếm): mỗi cổng một dòng có nhãn.
export const portRows = (ports: string[]) => ports.some((p) => p !== PORT_SUCCESS && p !== PORT_FAIL);

export const nodeHeight = (ports: string[]) => 2 + NODE_HEAD + NODE_DETAIL + (portRows(ports) ? ports.length * PORT_ROW + PORTS_PAD : 0);
// Toạ độ y (tính từ mép trên thẻ) của cổng vào và cổng ra thứ i: Thành công ngang đầu thẻ, Thất bại sát đáy.
export const inputY = 1 + NODE_HEAD / 2;
export function portY(ports: string[], i: number): number {
  if (portRows(ports)) return 1 + NODE_HEAD + NODE_DETAIL + i * PORT_ROW + PORT_ROW / 2;
  return ports[i] === PORT_FAIL ? nodeHeight(ports) - 11 : inputY;
}
