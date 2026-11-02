// Dữ liệu giả cho #demo-data / #demo-runtree (bước 60): kịch bản mẫu "Bảng giá – chọn món rẻ" (internal/samples) + hai lần
// chạy giả có input đã thay biến + lượt lặp – một lần thành công, một lần OCR đọc nhầm ở lượt 3 rồi Chờ chữ hết giờ.
import sample from '../../../internal/samples/scripts/bang-gia.json';
import { makeStep, type Edge, type Script, type Step, type StepResult } from '../types';
import { STEP_DEFAULTS } from '../flow/defaults';

type Raw = { script: { steps: Partial<Step>[]; edges: Omit<Edge, 'id'>[] } };

// Mẫu JSON gọn: node chưa có id / ref (Go Expand gán s1… / n1… theo thứ tự)
export function demoDataScript(): Script {
  const raw = sample as unknown as Raw;
  const steps = raw.script.steps.map((s, i) => makeStep({ ...STEP_DEFAULTS[s.type!], ...s, id: `s${i + 1}`, ref: `n${i + 1}`, type: s.type! } as Step));
  return {
    version: 4, name: 'Bảng giá – chọn món rẻ', region: null, loops: 1, maxMinutes: 0, steps, start: 's1',
    edges: raw.script.edges.map((e, i) => ({ ...e, id: `e${i}` })),
  };
}

const ITEMS = [
  { name: 'TÁO', price: 15000, x: 212, y: 318 }, { name: 'NHO', price: 45000, x: 412, y: 318 }, { name: 'CAM', price: 20000, x: 612, y: 318 },
  { name: 'XOÀI', price: 18000, x: 212, y: 498 }, { name: 'SẦU RIÊNG', price: 120000, x: 412, y: 498 }, { name: 'CHUỐI', price: 12000, x: 612, y: 498 },
];
const vnd = (n: number) => n.toLocaleString('vi-VN').replace(/,/g, '.');

export function demoRun(fail: boolean, base = Date.UTC(2026, 10, 2, 7, 32, 5)): StepResult[] {
  let t = 0;
  const out: StepResult[] = [];
  const add = (n: number, ms: number, r: Partial<StepResult>) => {
    out.push({ nodeId: `s${n}`, ref: `n${n}`, status: 'success', port: 'success', attempts: 1, loop: 1, startedAt: new Date(base + t).toISOString(), durationMs: ms, ...r });
    t += ms;
  };
  add(1, 210, { output: { window: 'Bảng giá – Chrome' }, logs: [{ atMs: 0, level: 'info', msg: 'Mở bằng trình duyệt mặc định' }] });
  add(2, 1240, { output: { waitedMs: 1240 } });
  const items = ITEMS.map((it, i) => ({ text: fail && i === 2 ? 'THÊM 2O.OOO đ' : `THÊM ${vnd(it.price)} đ`, x: it.x, y: it.y, name: it.name, price: it.price }));
  add(3, 640, { output: { items: items.map(({ text, x, y }) => ({ text, x, y })), count: 6 } });
  items.forEach((it, i) => {
    const iter = { nodeId: 's4', index: i + 1 };
    add(4, 2, { port: 'item', iter, input: { value: '[6 mục]' }, output: { item: { text: it.text, x: it.x, y: it.y }, index: i + 1, count: 6 } });
    if (fail && i === 2) {
      add(5, 3, { status: 'fail', port: 'fail', iter, input: { value: it.text }, error: { code: 'invalid_input', message: `Không thấy số trong “${it.text}”` } });
      return;
    }
    add(5, 3, { iter, input: { value: it.text }, output: { value: it.price, text: it.text } });
    const cheap = it.price <= 30000;
    add(6, 1, { iter, input: { value: `${it.price} <= 30000` }, output: { value: cheap } });
    add(7, 1, { port: cheap ? 'true' : 'false', iter, input: { 'cond.left': String(cheap) } });
    if (cheap) add(8, 640, { iter, input: { 'points[0].xVar': String(it.x), 'points[0].yVar': String(it.y) }, output: { x: it.x, y: it.y } });
  });
  add(4, 1, { port: 'done', output: { count: 6 } });
  if (fail) {
    add(9, 5000, { status: 'fail', port: 'fail', shot: '', error: { code: 'timeout', message: 'Không thấy “ĐÃ CHỌN: 4 MÓN” sau 5 s – gần nhất đọc được “ĐÃ CHỌN: 3 MÓN”' } });
  } else {
    add(9, 420, { output: { text: 'ĐÃ CHỌN: 4 MÓN', x: 640, y: 86 } });
    add(10, 0, { port: '', input: { message: 'Đã chọn các món ≤ 30.000 đ trong 6 món' }, output: { status: 'success' } });
  }
  return out;
}
