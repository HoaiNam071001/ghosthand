// Thanh mini khi đang chạy (design v2, artboard MiniBar) – cửa sổ nhỏ always-on-top, 540×96 (window.go)
import { useEffect, useReducer, useState } from 'react';
import { PauseScript, ResumeScript, StepScript, StopScript } from '../../wailsjs/go/main/App';
import { AiLevel } from '../aiLevel';
import { Pause, Play, Stop, StepIcon, StepIconName, StepOver } from '../components/icons';
import { AiChip, AiLevelRow } from '../components/minibar/AiChip';
import { useAiLevel, useCaptureDot } from '../components/minibar/hooks';
import { elapsedNow, fmtElapsed, Progress, useEngine } from '../engineStore';
import { RecordBarView } from '../components/minibar/RecordBar';
import { stopRecording, useRecording, useScript } from '../store';
import { inWails, setWindowMode } from '../windowMode';
import { fmtCountdown } from '../flow/waitUntil';
import { counterText, progressNode } from '../flow/progress';

// Số mẫu khi xem trên trình duyệt (#minibar)
const sample: Progress = {
  loop: 4, loops: 10, step: 3, total: 6, nodeId: '11', ref: 'n11', clicks: 142, elapsedMs: 86_000, paused: false,
  from: { ref: 'n10', port: 'next' }, counter: { ref: 'n10', count: 3, max: 5 },
};
const R = 22;
const CIRC = 2 * Math.PI * R;

// Đang chờ gì (Progress.wait.kind – imagestep.go, nodes.go watch)
const WAIT_LABEL: Record<string, string> = { image: 'đang tìm', text: 'đang tìm chữ', pixel: 'đang chờ màu', web: 'đang tìm phần tử', cond: 'đang xét điều kiện', window: 'đang chờ cửa sổ', app: 'đang chờ app', tab: 'đang chờ tab', screen: 'đang chờ màn hình', download: 'đang chờ file tải', power: 'đếm ngược nguồn máy – bấm Dừng để huỷ', print: 'đang chờ hộp in', save: 'đang chờ hộp lưu file' };
const BREAK_LABEL: Record<string, string> = { breakpoint: 'điểm dừng', step: 'node kế' };

export default function MiniBar() {
  const rec = useRecording();
  return rec ? <RecordBar since={rec.since} /> : <RunBar />;
}

function RecordBar({ since }: { since: number }) {
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);
  return <RecordBarView elapsed={fmtElapsed(Date.now() - since)} onStop={stopRecording} />;
}

function RunBar() {
  const engine = useEngine();
  const { steps } = useScript();
  const p = engine.progress ?? (inWails ? null : sample);
  const running = engine.running || !inWails;
  const paused = !!p?.paused;
  const counting = engine.countdown > 0;

  // Vẽ lại mỗi 0,5 giây để đồng hồ chạy giữa các lần Go báo tiến độ.
  const [, tick] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  const elapsed = inWails ? elapsedNow(engine) : sample.elapsedMs;
  // Đang chờ ảnh / pixel: vòng tiến độ theo thời gian chờ (thời gian tính tiếp giữa 2 lần Go báo).
  const w = p?.wait;
  const waitNow = w ? Math.min(w.elapsedMs + (p!.paused ? 0 : Date.now() - engine.receivedAt), w.timeoutMs) : 0;
  // Vô hạn vòng: vòng tiến độ chỉ theo bước trong vòng hiện tại.
  const progress = w ? waitNow / w.timeoutMs : !p || p.total === 0 ? 0
    : p.loops > 0 ? ((p.loop - 1) * p.total + p.step) / (p.loops * p.total)
    : p.step / p.total;
  const cur = p?.nodeId ? steps.find((s) => s.id === p.nodeId) : undefined;
  const capturing = useCaptureDot();
  const ai = useAiLevel(inWails && running && engine.source === 'ai');

  const stop = () => {
    StopScript();
    setWindowMode('main');
  };

  return (
    <MiniBarView progress={progress} paused={paused} countdown={engine.countdown} icon={cur?.type ?? 'click'}
      title={!running ? 'Chưa chạy'
        : counting ? `Bắt đầu sau ${engine.countdown} giây…`
        : !p ? 'Đang bắt đầu…'
        : `${p.break ? `Dừng trước ${BREAK_LABEL[p.break]} · ` : p.pausedBy === 'touch' && paused ? 'Bạn vừa đụng chuột – đã tạm dừng · ' : paused ? 'Tạm dừng · ' : ''}${progressNode(p, steps)}`}
      lines={[
        ...(p?.counter || p?.retry ? [[p.counter && counterText(p.counter), p.retry && `thử lại ${p.retry} / ${p.retries}`].filter(Boolean).join('   ')] : []),
        ...(w ? [w.kind === 'time' ? `chờ đến giờ – còn ${fmtCountdown(w.timeoutMs - waitNow)}`
          : `${WAIT_LABEL[w.kind] ?? 'đang chờ'} ${(waitNow / 1000).toFixed(1)} / ${w.timeoutMs / 1000} s${w.kind === 'image' || w.kind === 'pixel' ? `   khớp nhất ${w.best}%` : ''}`] : []),
        `vòng ${p?.loop ?? 0} / ${p && p.loops > 0 ? p.loops : '∞'}   ${p?.clicks ?? 0} click   ${fmtElapsed(elapsed)}`,
        ...(engine.preset ? [`bộ giá trị: ${engine.preset}`] : [])]}
      canPause={running && !counting} onPause={() => (paused ? ResumeScript() : PauseScript())} onStop={stop}
      onStep={paused && p?.break ? () => StepScript() : undefined} ai={ai} capturing={capturing} />
  );
}

// Phần hiển thị (dùng chung với #demo-minibar). progress: 0..1 – vòng tiến độ (đang chờ ảnh: theo thời gian chờ);
// lines: 1–2 dòng mono (vòng / click / thời gian; "đang tìm x / y s   thử lại a / b"…).
// onStep: đang dừng vì debug – hiện nút chạy node kế (F10); nút Tiếp tục chạy tới điểm dừng sau.
// capturing: AI vừa chụp / đọc màn hình – chấm đỏ cạnh tiêu đề.
// ai: lượt do AI chạy – chip mức AI cạnh tiêu đề, bấm thì hàng chọn mức thay cho các dòng chữ.
export function MiniBarView({ title, lines, icon, progress, paused, countdown, canPause, onPause, onStop, onStep, ai, aiOpen = false, capturing = false }: {
  title: string; lines: string[]; icon: StepIconName; progress: number; paused: boolean; countdown: number;
  canPause: boolean; onPause: () => void; onStop: () => void; onStep?: () => void;
  ai?: { level: AiLevel; onLevel: (l: AiLevel) => void }; aiOpen?: boolean; capturing?: boolean;
}) {
  const counting = countdown > 0;
  const [open, setOpen] = useState(aiOpen);
  return (
    <div className="drag flex h-[96px] w-[540px] items-center gap-3.5 overflow-hidden rounded-hud border border-line bg-surface pr-3.5 pl-4 text-ink">
      <div className="relative h-[50px] w-[50px] flex-none">
        <svg width="50" height="50" viewBox="0 0 50 50" aria-hidden>
          <defs>
            <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--c-accent)" /><stop offset="1" stopColor="var(--c-accent)" stopOpacity=".35" />
            </linearGradient>
          </defs>
          <circle cx="25" cy="25" r={R} fill="none" stroke="var(--c-soft)" strokeWidth="3.5" />
          <circle cx="25" cy="25" r={R} fill="none" stroke="url(#ring)" strokeWidth="3.5" strokeLinecap="round"
            strokeDasharray={`${(progress * CIRC).toFixed(1)} ${CIRC.toFixed(1)}`} transform="rotate(-90 25 25)" />
        </svg>
        <span className={`absolute inset-2.5 grid place-items-center rounded-full ${paused || counting ? 'bg-soft text-muted' : 'bg-accent-soft text-accent-text'}`}>
          {counting ? <span className="font-mono text-[13px] font-semibold">{countdown}</span>
            : paused ? <Pause className="h-3.5 w-3.5" />
            : <StepIcon type={icon} className="h-[15px] w-[15px]" />}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold">{title}</span>
          {capturing && <span className="h-2 w-2 flex-none animate-pulse rounded-full bg-danger" role="status" aria-label="AI vừa chụp màn hình" title="AI vừa chụp / đọc màn hình" />}
          {ai && <AiChip level={ai.level} open={open} onToggle={() => setOpen(!open)} />}
        </div>
        {ai && open ? <AiLevelRow level={ai.level} onLevel={(l) => { ai.onLevel(l); setOpen(false); }} />
          : lines.map((l) => <span key={l} className="whitespace-pre font-mono text-xs text-muted">{l}</span>)}
      </div>
      {onStep && (
        <button aria-label="Chạy node kế rồi dừng" title="Chạy node kế rồi dừng (F10)" onClick={onStep}
          className="grid h-11 w-11 place-items-center rounded-[9px] border border-line bg-surface hover:bg-hover"><StepOver /></button>
      )}
      <button aria-label={paused ? 'Tiếp tục' : 'Tạm dừng'} title={onStep ? 'Chạy tiếp tới điểm dừng sau' : undefined} disabled={!canPause} onClick={onPause}
        className="grid h-11 w-11 place-items-center rounded-[9px] border border-line bg-surface hover:bg-hover disabled:opacity-40">
        {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
      </button>
      <button onClick={onStop} className="btn-danger-soft flex h-11 items-center gap-2 rounded-[9px] px-3.5 font-semibold">
        <Stop className="h-2.5 w-2.5" />Dừng <span className="font-mono text-[11px] font-normal opacity-75">F8</span>
      </button>
    </div>
  );
}
