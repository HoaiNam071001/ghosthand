// Dữ liệu mẫu cho màn #demo (bước 27b): có cả loại bước chưa làm logic để xem đủ giao diện.
// KHÔNG dùng trong app thật và không thêm các loại này vào types.ts / model.go – mỗi loại sẽ vào model ở bước làm logic.
import { StepIconName } from '../components/icons';
import { LibraryProps } from '../components/Library';
import DemoSamples from './DemoSamples';
import type { InputView } from '../components/inputs/model';
import type { Preset, RunSection } from '../components/inputs/RunDialog';

export type DemoStep = {
  id: string;
  type: Exclude<StepIconName, 'group'>;
  title: string;
  detail: string;
  delay: string;
  enabled?: boolean;
  chips?: string[];
  breakpoint?: boolean;
};
export type DemoGroup = { id: string; type: 'group'; name: string; repeat: number; children: DemoStep[] };
export type DemoItem = DemoStep | DemoGroup;

// Ví dụ "nhắn tin Facebook" (docs/tasks/phase3/31-mcp-ai.md) + vài bước thể hiện neo góc, chờ pixel, kéo thả.
export const demoItems: DemoItem[] = [
  { id: 'd1', type: 'open', title: 'Mở URL', detail: 'facebook.com/{{profile}} trong Chrome', delay: '1 s', chips: ['1 input'] },
  { id: 'd2', type: 'window', title: 'Cửa sổ', detail: 'Google Chrome', delay: '200 ms' },
  {
    id: 'g1', type: 'group', name: 'Gửi tin', repeat: 3, children: [
      { id: 'd3', type: 'waitImage', title: 'Chờ ảnh: nút Nhắn tin', detail: 'tối đa 10 s, khớp ≥ 90%', delay: '300 ms', chips: ['Hết giờ: thử lại 2 lần'], breakpoint: true },
      { id: 'd4', type: 'clickImage', title: 'Click theo ảnh', detail: 'vị trí tìm thấy ở bước 03', delay: '500 ms', chips: ['1 input'] },
      { id: 'd5', type: 'type', title: 'Gõ chữ', detail: '"xin chào {{M1}} và {{M2}}"', delay: '200 ms ±50', chips: ['2 input'] },
      { id: 'd6', type: 'key', title: 'Phím tắt', detail: 'Enter', delay: '800 ms' },
    ],
  },
  { id: 'd7', type: 'scroll', title: 'Cuộn', detail: 'xuống 5 nấc tại X 760 Y 520', delay: '500 ms' },
  { id: 'd8', type: 'waitPixel', title: 'Chờ màu pixel', detail: 'X 640 Y 300 = #1877F2 ±10', delay: '1 s' },
  { id: 'd9', type: 'click', title: 'Click', detail: 'X −300  Y +300 (neo phải · trên)', delay: '500 ms' },
  { id: 'd10', type: 'drag', title: 'Kéo thả', detail: 'từ điểm trước → lệch ΔX +600 ΔY 0', delay: '1 s', enabled: false },
];

export const demoLibrary: LibraryProps = {
  SamplesPanel: DemoSamples,
  scripts: [
    { name: 'Nhắn tin Facebook', unsaved: true },
    { name: 'Farm nhặt đồ', schedule: '08:00' },
    { name: 'Điền form đăng ký' },
    { name: 'Test kéo thả' },
  ],
  active: 0,
  recent: ['Desktop\\farm-v2.json', 'scripts\\test-drag.json'],
  trials: [
    { path: 'ai\\thu-tim-nut-gui.json', name: 'Thử tìm nút Gửi', lastUsed: Date.now() - 3600_000 },
    { path: 'ai\\thu-dang-nhap.json', name: 'Thử đăng nhập', lastUsed: Date.now() - 5 * 86400_000 },
  ],
  trialDays: 7,
  history: [
    { script: 'Nhắn tin Facebook', when: '14:32', result: 'Xong 3 vòng trong 1 phút 12 giây', ok: true },
    { script: 'Farm nhặt đồ', when: '08:00', result: 'Dừng: hết giờ chờ ảnh ở bước 3', ok: false },
    { script: 'Điền form đăng ký', when: 'hôm qua', result: 'Xong 1 vòng', ok: true },
  ],
  ready: true,
};

// Đánh số thẻ theo thứ tự thực tế (bước trong nhóm đánh số tiếp)
export const demoNumbers = (() => {
  const m = new Map<string, string>();
  let n = 0;
  const walk = (s: DemoStep) => m.set(s.id, String(++n).padStart(2, '0'));
  demoItems.forEach((it) => (it.type === 'group' ? it.children.forEach(walk) : walk(it)));
  return m;
})();

export const findDemoStep = (id: string): DemoStep | undefined => {
  for (const it of demoItems) {
    if (it.type === 'group') {
      const c = it.children.find((s) => s.id === id);
      if (c) return c;
    } else if (it.id === id) return it;
  }
};

// ---- Input của kịch bản (đợt 2 của 27b) ----

export const demoInputs: InputView[] = [
  { key: 'profile', label: 'Trang cá nhân', type: 'text', required: true, prefix: 'facebook.com/', usedBy: [{ n: '01', title: 'Mở URL' }] },
  { key: 'wait_s', label: 'Thời gian chờ nút', type: 'number', default: 10, unit: 's', usedBy: [{ n: '03', title: 'Chờ ảnh' }] },
  { key: 'click_delay', label: 'Chờ sau khi click', type: 'ms', default: 500, unit: 'ms', usedBy: [{ n: '04', title: 'Click theo ảnh' }] },
  { key: 'M1', label: 'Tên người nhận', type: 'text', required: true, hint: 'Tên hiện trong lời chào', usedBy: [{ n: '05', title: 'Gõ chữ' }] },
  { key: 'M2', label: 'Lời nhắn', type: 'multiline', usedBy: [{ n: '05', title: 'Gõ chữ' }] },
];

export const demoRunSections: RunSection[] = [
  { steps: '01', title: 'Mở URL', keys: ['profile'] },
  { steps: '03–04', title: 'Chờ ảnh, click theo ảnh', keys: ['wait_s', 'click_delay'] },
  { steps: '05', title: 'Gõ chữ', keys: ['M1', 'M2'], template: 'xin chào {{M1}} và {{M2}}' },
];

export const demoPresets: Preset[] = [
  { name: 'Gửi cho Lan', values: { profile: 'lan.nguyen.92', click_delay: 1000, M1: 'Lan', M2: 'cuối tuần này đi cà phê không?' } },
  { name: 'Gửi cho Minh', values: { profile: 'minh.tran', M1: 'Minh', M2: 'chúc mừng sinh nhật!' } },
  { name: 'Mặc định', values: {} },
];
