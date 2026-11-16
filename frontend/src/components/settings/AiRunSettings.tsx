// Công tắc AI – mức chạy (bước 31b): chỉ soạn / hỏi trước khi chạy / tự chạy + trần phút mỗi lượt + tự chạy tiếp sau
// khi người dùng đụng chuột (57 B4: touchResumeS 0 = mặc định, < 0 = tắt) + tự dọn kịch bản AI thử (61 M5: trialDays
// cùng quy ước) + gửi ảnh cho AI (56 C3: noImages). Chỉ hiển thị;
// McpSettings lưu. Tắt hẳn = công tắc MCP.
import { store } from '../../../wailsjs/go/models';
import { RunMode, runMode } from '../../aiLevel';
import { tr, useLang } from '../../i18n';
import NumInput from '../NumInput';
import Segmented from '../Segmented';
import { Switch } from '../Switch';

const AI_MAX_MINUTES = 300; // 5 giờ – khớp store.AIMaxMinutes
const TOUCH_RESUME_S = 5; // khớp store.TouchResumeDefault
const TRIAL_DAYS = 7; // khớp store.TrialDaysDefault

const modes = (): { id: RunMode; label: string }[] => [
  { id: 'edit', label: tr('ai.edit') },
  { id: 'ask', label: tr('ai.ask') },
  { id: 'auto', label: tr('ai.auto') },
];

const hint = (m: RunMode) => tr(`ai.hint.${m}`);

export default function AiRunSettings({ mcp, onChange }: { mcp: store.MCPSettings; onChange: (patch: Partial<store.MCPSettings>) => void }) {
  useLang();
  const mode = runMode(mcp);
  return (
    <div className="flex flex-col gap-1.5">
      <span>{tr('ai.title')}</span>
      <Segmented value={mode} options={modes()} onChange={(run) => onChange({ run })} label={tr('ai.modeAria')} full />
      <span className="text-xs text-muted">{hint(mode)}</span>
      <label className="flex items-center justify-between gap-3 text-muted">{tr('ai.dot')}
        <Switch on={!mcp.hideCaptureDot} onChange={(on) => onChange({ hideCaptureDot: !on })} label={tr('ai.dotAria')} />
      </label>
      <label className="flex items-center justify-between gap-3 text-muted">{tr('ai.images')}
        <Switch on={!mcp.noImages} onChange={(on) => onChange({ noImages: !on })} label={tr('ai.imagesAria')} />
      </label>
      {mode !== 'edit' && (
        <>
          <label className="flex items-center justify-between gap-3 text-muted">{tr('ai.maxRun')}
            <NumInput value={mcp.maxMinutes || AI_MAX_MINUTES} min={1} unit={tr('ai.min')} className="w-24" onChange={(maxMinutes) => onChange({ maxMinutes })} />
          </label>
          <label className="flex items-center justify-between gap-3 text-muted">{tr('ai.touch')}
            <Switch on={(mcp.touchResumeS ?? 0) >= 0} onChange={(on) => onChange({ touchResumeS: on ? 0 : -1 })} label={tr('ai.touchAria')} />
          </label>
          {(mcp.touchResumeS ?? 0) >= 0 && (
            <label className="flex items-center justify-between gap-3 text-muted">{tr('ai.touchIdle')}
              <NumInput value={mcp.touchResumeS || TOUCH_RESUME_S} min={1} unit={tr('ai.sec')} className="w-24" onChange={(touchResumeS) => onChange({ touchResumeS })} />
            </label>
          )}
        </>
      )}
      <label className="flex items-center justify-between gap-3 text-muted">{tr('ai.trial')}
        <Switch on={(mcp.trialDays ?? 0) >= 0} onChange={(on) => onChange({ trialDays: on ? 0 : -1 })} label={tr('ai.trialAria')} />
      </label>
      {(mcp.trialDays ?? 0) >= 0 && (
        <label className="flex items-center justify-between gap-3 text-muted">{tr('ai.trialAfter')}
          <NumInput value={mcp.trialDays || TRIAL_DAYS} min={1} unit={tr('ai.days')} className="w-24" onChange={(trialDays) => onChange({ trialDays })} />
        </label>
      )}
    </div>
  );
}
