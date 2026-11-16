// Cài đặt chạy (bước 16): lặp theo số vòng / vô hạn / theo thời gian, đếm ngược trước khi chạy.
// Hiện trong popup của nút "N vòng" trên thanh công cụ. Kèm cách neo điểm mới đặt (bước 29, lưu trong kịch bản).
import { tr, useT } from '../i18n';
import NumInput from './NumInput';
import { Switch } from './Switch';
import Segmented from './Segmented';
import { setCountdown, updateScript, useEditor } from '../store';
import { Script } from '../types';
import ScheduleSetting from './ScheduleSetting';
import { HumanScriptField } from './HumanFields';

type Mode = 'loops' | 'infinite' | 'time';
const modes = (): { id: Mode; label: string }[] => [
  { id: 'loops', label: tr('rs.loops') },
  { id: 'infinite', label: tr('rs.infinite') },
  { id: 'time', label: tr('rs.time') },
];

// Script chỉ có loops (0 = vô hạn) và maxMinutes (0 = không giới hạn) – suy ra chế độ từ hai số này.
const modeOf = (sc: Script): Mode => (sc.loops > 0 ? 'loops' : sc.maxMinutes > 0 ? 'time' : 'infinite');

// Chữ trên nút: "10 vòng" / "∞ vòng" / "5 phút"
export const loopSummary = (sc: Script) =>
  ({ loops: tr('rs.nLoops', { n: sc.loops }), infinite: tr('rs.infLoops'), time: tr('rs.nMin', { n: sc.maxMinutes }) })[modeOf(sc)];

// Chữ ngắn trên nút Chạy: "×10" / "∞" / "5p"
export const loopBadge = (sc: Script) => ({ loops: `×${sc.loops}`, infinite: "∞", time: `${sc.maxMinutes}p` })[modeOf(sc)];

// Nhớ số vòng / số phút đã nhập để chuyển chế độ qua lại không mất.
let lastLoops = 10;
let lastMinutes = 5;

export default function RunSettings() {
  const t = useT();
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
      <span className="font-semibold">{t('rs.repeat')}</span>
      <Segmented value={mode} options={modes()} onChange={setMode} label={t('rs.mode')} full />
      {mode === 'loops' && (
        <label className="flex items-center justify-between text-muted">{t('rs.loops')}
          <NumInput value={script.loops} min={1} unit={t('rs.loopUnit')} onChange={(loops) => updateScript({ loops })} className="w-[130px]" />
        </label>
      )}
      {mode === 'time' && (
        <label className="flex items-center justify-between text-muted">{t('rs.runFor')}
          <NumInput value={script.maxMinutes} min={1} unit={t('rs.minUnit')} onChange={(maxMinutes) => updateScript({ maxMinutes })} className="w-[130px]" />
        </label>
      )}
      {mode === 'infinite' && <span className="text-[13px] text-muted">{t('rs.untilStop')}</span>}
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <span className="flex flex-col">{t('rs.anchor')}
          <span className="text-xs text-muted">{t('rs.anchorHelp')}</span>
        </span>
        <Segmented value={script.anchorMode ?? 'nearest'} label={t('rs.anchor')} full
          options={[{ id: 'nearest', label: t('rs.nearest') }, { id: 'start', label: t('rs.topLeft') }]}
          onChange={(m) => updateScript({ anchorMode: m === 'start' ? 'start' : undefined })} />
      </div>
      <div className="border-t border-line pt-3">
        <HumanScriptField value={script.human} onChange={(human) => updateScript({ human })} />
      </div>
      <label className="flex items-center justify-between border-t border-line pt-3">
        <span className="flex flex-col">{t('rs.awake')}
          <span className="text-xs text-muted">{t('rs.awakeHelp')}</span>
        </span>
        <Switch on={!!script.keepAwake} onChange={(keepAwake) => updateScript({ keepAwake: keepAwake || undefined })} label={t('rs.awake')} />
      </label>
      <label className="flex items-center justify-between border-t border-line pt-3">
        {t('rs.countdown')}
        <Switch on={countdown} onChange={setCountdown} label={t('rs.countdown3')} />
      </label>
      <ScheduleSetting />
    </div>
  );
}

