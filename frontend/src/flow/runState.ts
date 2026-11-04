// Tiêu đề thanh mini theo việc lần chạy đang làm (58 D4 – cùng cách chia với session.ActivityOf ở Go): người ngồi máy
// đọc là biết đang thao tác (đừng chạm chuột), đang chờ gì + còn bao lâu, hay đang tạm dừng vì sao. Hàm thuần.
import type { Progress } from '../engineStore';
import { fmtCountdown } from './waitUntil';

const BREAK_LABEL: Record<string, string> = { breakpoint: 'điểm dừng', step: 'node kế' };

// Thứ đang chờ theo Progress.wait.kind (engine waitLoop / pollUntil).
const WAIT_WHAT: Record<string, string> = {
  image: 'ảnh', text: 'chữ', pixel: 'màu', web: 'phần tử web', element: 'phần tử', cond: 'điều kiện', window: 'cửa sổ', app: 'app',
  tab: 'tab', screen: 'màn hình', download: 'file tải xong', print: 'hộp in', save: 'hộp lưu file', ai: 'AI tìm',
};

const secs = (ms: number) => Math.max(0, Math.ceil(ms / 1000));

// waitedMs: thời gian đã chờ tính tới lúc vẽ (Go báo tiến độ thưa – thanh mini tự cộng thêm).
export function runTitle(p: Progress, waitedMs: number, now: number): string {
  if (p.break) return `Dừng trước ${BREAK_LABEL[p.break]}`;
  if (p.paused && p.pausedBy === 'touch') {
    return p.resumeAt ? `Bạn vừa đụng chuột · tự chạy tiếp sau ${secs(p.resumeAt - now)} s` : 'Bạn vừa đụng chuột – bấm ▶ để chạy tiếp';
  }
  if (p.paused) return 'Tạm dừng';
  const w = p.wait;
  if (!w) return 'Đang thao tác – đừng chạm chuột';
  const left = w.timeoutMs - waitedMs;
  if (w.kind === 'delay') return `Đang nghỉ giữa các bước · còn ${secs(left)} s`;
  if (w.kind === 'time') return `Chờ đến giờ · còn ${fmtCountdown(left)}`;
  if (w.kind === 'ask') return `Đang chờ bạn trả lời${w.timeoutMs > 0 ? ` · còn ${secs(left)} s` : ''}`; // Hỏi người dùng – 0 = chờ mãi
  if (w.kind === 'power') return `Sắp tắt / khởi động lại máy sau ${secs(left)} s – Dừng để huỷ`;
  const head = ['Đang chờ', WAIT_WHAT[w.kind], w.what && `"${w.what}"`].filter(Boolean).join(' ');
  return `${head} · còn ${secs(left)} s`;
}
