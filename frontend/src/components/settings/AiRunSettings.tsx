// Công tắc AI – mức chạy (bước 31b): chỉ soạn / hỏi trước khi chạy / tự chạy + trần phút mỗi lượt. Chỉ hiển thị;
// McpSettings lưu. Tắt hẳn = công tắc MCP.
import { store } from '../../../wailsjs/go/models';
import { RunMode, runMode } from '../../aiLevel';
import NumInput from '../NumInput';
import Segmented from '../Segmented';
import { Switch } from '../Switch';

const AI_MAX_MINUTES = 10; // khớp store.AIMaxMinutes

const MODES: { id: RunMode; label: string }[] = [
  { id: 'edit', label: 'Chỉ soạn' },
  { id: 'ask', label: 'Hỏi trước khi chạy' },
  { id: 'auto', label: 'Tự chạy' },
];

const HINT: Record<RunMode, string> = {
  edit: 'AI tạo / sửa kịch bản, bạn tự bấm Chạy',
  ask: 'Mỗi kịch bản AI muốn chạy đều hỏi bạn trước (có “cho phép đến khi đóng app”)',
  auto: 'AI chạy, xem lỗi, sửa và chạy lại không cần hỏi. F8 / chuột chạm góc màn hình vẫn dừng được; thao tác nguy hiểm vẫn hỏi',
};

export default function AiRunSettings({ mcp, onChange }: { mcp: store.MCPSettings; onChange: (patch: Partial<store.MCPSettings>) => void }) {
  const mode = runMode(mcp);
  return (
    <div className="flex flex-col gap-1.5">
      <span>AI được chạy kịch bản</span>
      <Segmented value={mode} options={MODES} onChange={(run) => onChange({ run })} label="Mức chạy của AI" full />
      <span className="text-xs text-muted">{HINT[mode]}</span>
      <label className="flex items-center justify-between gap-3 text-muted">Chấm đỏ trên thanh mini khi AI chụp / đọc màn hình
        <Switch on={!mcp.hideCaptureDot} onChange={(on) => onChange({ hideCaptureDot: !on })} label="Chấm đỏ khi AI chụp màn hình" />
      </label>
      {mode !== 'edit' && (
        <label className="flex items-center justify-between gap-3 text-muted">Tối đa mỗi lượt AI chạy
          <NumInput value={mcp.maxMinutes || AI_MAX_MINUTES} min={1} unit="phút" className="w-24" onChange={(maxMinutes) => onChange({ maxMinutes })} />
        </label>
      )}
    </div>
  );
}
