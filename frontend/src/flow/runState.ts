// Tiêu đề thanh mini theo việc lần chạy đang làm (58 D4 – cùng cách chia với session.ActivityOf ở Go): người ngồi máy
// đọc là biết đang thao tác (đừng chạm chuột), đang chờ gì + còn bao lâu, hay đang tạm dừng vì sao. Hàm thuần.
import type { Progress } from '../engineStore';
import { tr } from '../i18n/lang';
import type { MsgKey } from '../i18n/vi';
import { fmtCountdown } from './waitUntil';

const BREAK_LABEL: Record<string, MsgKey> = { breakpoint: 'rst.bp', step: 'rst.nextNode' };

// Thứ đang chờ theo Progress.wait.kind (engine waitLoop / pollUntil).
const WAIT_WHAT: Record<string, MsgKey> = {
  image: 'rst.w.image', text: 'rst.w.text', pixel: 'rst.w.pixel', web: 'rst.w.web', element: 'rst.w.element', cond: 'rst.w.cond', window: 'rst.w.window', app: 'rst.w.app',
  tab: 'rst.w.tab', screen: 'rst.w.screen', download: 'rst.w.download', print: 'rst.w.print', save: 'rst.w.save', ai: 'rst.w.ai',
};

const secs = (ms: number) => Math.max(0, Math.ceil(ms / 1000));

// waitedMs: thời gian đã chờ tính tới lúc vẽ (Go báo tiến độ thưa – thanh mini tự cộng thêm).
export function runTitle(p: Progress, waitedMs: number, now: number): string {
  if (p.break) return tr('rst.stopBefore', { what: tr(BREAK_LABEL[p.break]) });
  if (p.paused && p.pausedBy === 'touch') {
    return p.resumeAt ? tr('rst.touchResume', { s: secs(p.resumeAt - now) }) : tr('rst.touch');
  }
  if (p.paused) return tr('rst.paused');
  const w = p.wait;
  if (!w) return tr('rst.busy');
  const left = w.timeoutMs - waitedMs;
  if (w.kind === 'delay') return tr('rst.delay', { s: secs(left) });
  if (w.kind === 'time') return tr('rst.time', { t: fmtCountdown(left) });
  if (w.kind === 'ask') return `${tr('rst.ask')}${w.timeoutMs > 0 ? tr('rst.askLeft', { s: secs(left) }) : ''}`; // Hỏi người dùng – 0 = chờ mãi
  if (w.kind === 'power') return tr('rst.power', { s: secs(left) });
  const head = [tr('rst.waiting'), WAIT_WHAT[w.kind] && tr(WAIT_WHAT[w.kind]), w.what && `"${w.what}"`].filter(Boolean).join(' ');
  return tr('rst.left', { head, s: secs(left) });
}
