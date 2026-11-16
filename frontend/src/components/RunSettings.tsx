// Cài đặt chạy (bước 16): lặp theo số vòng / vô hạn / theo thời gian, đếm ngược trước khi chạy.
// Hiện trong popup của nút "N vòng" trên thanh công cụ. Kèm cách neo điểm mới đặt (bước 29, lưu trong kịch bản).
import NumInput from './NumInput';
import { Switch } from './Switch';
import Segmented from './Segmented';
import { setCountdown, updateScript, useEditor } from '../store';
import { Script } from '../types';
import ScheduleSetting from './ScheduleSetting';
import { HumanScriptField } from './HumanFields';

type Mode = 'loops' | 'infinite' | 'time';
const MODES: { id: Mode; label: string }[] = [
  { id: 'loops', label: 'Số vòng' },
  { id: 'infinite', label: 'Vô hạn' },
  { id: 'time', label: 'Theo thời gian' },
];

// Script chỉ có loops (0 = vô hạn) và maxMinutes (0 = không giới hạn) – suy ra chế độ từ hai số này.
const modeOf = (sc: Script): Mode => (sc.loops > 0 ? 'loops' : sc.maxMinutes > 0 ? 'time' : 'infinite');

// Chữ trên nút: "10 vòng" / "∞ vòng" / "5 phút"
export const loopSummary = (sc: Script) =>
  ({ loops: `${sc.loops} vòng`, infinite: '∞ vòng', time: `${sc.maxMinutes} phút` })[modeOf(sc)];

// Chữ ngắn trên nút Chạy: "×10" / "∞" / "5p"
export const loopBadge = (sc: Script) => ({ loops: `×${sc.loops}`, infinite: "∞", time: `${sc.maxMinutes}p` })[modeOf(sc)];

// Nhớ số vòng / số phút đã nhập để chuyển chế độ qua lại không mất.
let lastLoops = 10;
let lastMinutes = 5;

export default function RunSettings() {
  const { script, countdown } = useEditor();
  const mode = modeOf(script);

  const setMode = (m: Mode) => {
    if (script.loops > 0) lastLoops = script.loops;
    if (script.maxMinutes > 0) lastMinutes = script.maxMinutes;
    updateScript(
      m === 'loops' ? { loops: lastLoops, maxMinutes: 0 }
        : m === 'time' ? { loops: 0, maxMinutes: lastMinutes }
        : { loops: 0, maxMinutes: 0 },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="font-semibold">Lặp kịch bản</span>
      <Segmented value={mode} options={MODES} onChange={setMode} label="Chế độ lặp" full />
      {mode === 'loops' && (
        <label className="flex items-center justify-between text-muted">Số vòng
          <NumInput value={script.loops} min={1} unit="vòng" onChange={(loops) => updateScript({ loops })} className="w-[130px]" />
        </label>
      )}
      {mode === 'time' && (
        <label className="flex items-center justify-between text-muted">Chạy trong
          <NumInput value={script.maxMinutes} min={1} unit="phút" onChange={(maxMinutes) => updateScript({ maxMinutes })} className="w-[130px]" />
        </label>
      )}
      {mode === 'infinite' && <span className="text-[13px] text-muted">Chạy tới khi bấm Dừng / F8</span>}
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <span className="flex flex-col">Neo điểm mới đặt
          <span className="text-xs text-muted">Điểm bám theo cạnh / góc nào khi đổi vùng – sửa riêng từng điểm trong inspector</span>
        </span>
        <Segmented value={script.anchorMode ?? 'nearest'} label="Neo điểm mới đặt" full
          options={[{ id: 'nearest', label: 'Góc gần nhất' }, { id: 'start', label: 'Luôn trên trái' }]}
          onChange={(m) => updateScript({ anchorMode: m === 'start' ? 'start' : undefined })} />
      </div>
      <div className="border-t border-line pt-3">
        <HumanScriptField value={script.human} onChange={(human) => updateScript({ human })} />
      </div>
      <label className="flex items-center justify-between border-t border-line pt-3">
        <span className="flex flex-col">Giữ máy thức khi chạy
          <span className="text-xs text-muted">Máy không ngủ, màn hình không tắt cho tới khi chạy xong</span>
        </span>
        <Switch on={!!script.keepAwake} onChange={(keepAwake) => updateScript({ keepAwake: keepAwake || undefined })} label="Giữ máy thức khi chạy" />
      </label>
      <label className="flex items-center justify-between border-t border-line pt-3">
        Đếm ngược 3 giây trước khi chạy
        <Switch on={countdown} onChange={setCountdown} label="Đếm ngược 3 giây" />
      </label>
      <ScheduleSetting />
    </div>
  );
}

