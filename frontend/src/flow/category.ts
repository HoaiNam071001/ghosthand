// Nhóm của node (design v3, bước 38): quyết định màu ô icon / đầu thẻ / đầu inspector và nhóm trong bảng thêm node.
// Màu nhóm chỉ để nhận ra loại node – trạng thái (chọn, chạy, lỗi) vẫn dùng accent / ok / danger.
import type { Step, StepType } from '../types';

export type NodeCategory = 'mouse' | 'kb' | 'wait' | 'data' | 'app' | 'flow' | 'web';

// Thứ tự = thứ tự nhóm trong bảng thêm node
export const CATEGORIES: { id: NodeCategory; name: string }[] = [
  { id: 'mouse', name: 'Chuột' },
  { id: 'kb', name: 'Bàn phím' },
  { id: 'wait', name: 'Chờ & ảnh' },
  { id: 'data', name: 'Hệ thống & dữ liệu' },
  { id: 'app', name: 'Ứng dụng' },
  { id: 'flow', name: 'Rẽ nhánh & luồng' },
  { id: 'web', name: 'Web (trình duyệt)' },
];

const BY_TYPE: Record<StepType, NodeCategory> = {
  click: 'mouse', double: 'mouse', hold: 'mouse', drag: 'mouse', scroll: 'mouse', path: 'mouse', clickImage: 'mouse',
  type: 'kb', key: 'kb',
  wait: 'wait', waitImage: 'wait', waitPixel: 'wait', waitScreen: 'wait', ocrRead: 'wait', waitDownload: 'wait', waitUIEvent: 'wait', findAll: 'wait', waitUntil: 'wait', screenshot: 'wait',
  clipboard: 'data', http: 'data', file: 'data', system: 'data', shell: 'data', osShortcut: 'data', sysInfo: 'data', process: 'data', inputSource: 'data', zip: 'data', notify: 'data', askAI: 'data', mcpTool: 'data', power: 'data', display: 'data', setVar: 'data', calc: 'data',
  textMatch: 'data', textSplit: 'data', textClean: 'data', textNumber: 'data',
  open: 'app', window: 'app', app: 'app', browserTab: 'app', browserGo: 'app', browserNorm: 'app', savePdf: 'app', elementRead: 'app', pageText: 'app', readDocument: 'app', readTable: 'app', elementAction: 'app',
  if: 'flow', switch: 'flow', switchScreen: 'flow', counter: 'flow', forEach: 'flow', end: 'flow',
  webWait: 'web', webClick: 'web', webType: 'web', webRead: 'web', webScroll: 'web', webKey: 'web',
};

// Mở trang bằng Chrome của app thuộc nhóm Web (cùng chỗ trong bảng thêm node), mở thường thuộc Ứng dụng.
export const nodeCategory = (s: Pick<Step, 'type' | 'webBrowser'>): NodeCategory =>
  s.type === 'open' && s.webBrowser ? 'web' : BY_TYPE[s.type];

// Nhóm theo tên loại dạng chuỗi (danh sách Mẫu thử từ Go) – loại lạ thì không có nhóm.
export const categoryOfType = (type: string): NodeCategory | undefined => BY_TYPE[type as StepType];

export const categoryName = (c: NodeCategory) => CATEGORIES.find((x) => x.id === c)!.name;
