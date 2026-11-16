// Cài đặt – chạy từ ngoài app (bước 22): dòng lệnh (luôn bật) + API local cho chương trình khác (bật / tắt, cổng, token).
import { store } from '../../../wailsjs/go/models';
import { tr, useLang } from '../../i18n';
import NumInput from '../NumInput';
import { Switch } from '../Switch';
import { CopyButton, SettingCode } from './parts';

export default function ApiSettings({ api, onChange }: { api: store.APISettings; onChange: (patch: Partial<store.APISettings>) => void }) {
  useLang();
  return (
    <>
      <span className="font-semibold">{tr('api.title')}</span>
      <div className="flex flex-col gap-1 text-muted">
        {tr('api.cli')}
        <SettingCode>{tr('api.cliExample')}</SettingCode>
      </div>
      <label className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="flex flex-col">{tr('api.enable')}
          <span className="text-xs text-muted">{tr('api.enableHint')}</span>
        </span>
        <Switch on={api.enabled} onChange={(enabled) => onChange({ enabled })} label={tr('api.switch')} />
      </label>
      {api.enabled && (
        <>
          <label className="flex items-center justify-between text-muted">{tr('api.port')}
            <NumInput value={api.port} min={1024} onChange={(port) => onChange({ port })} className="w-[110px]" />
          </label>
          <div className="flex flex-col gap-1 text-muted">{tr('api.token')}
            <div className="flex gap-1.5">
              <code className="min-w-0 flex-1 truncate rounded-control bg-field px-2 py-1.5 font-mono text-xs text-ink">{api.token}</code>
              <CopyButton text={api.token ?? ''} label={tr('api.copyToken')} />
            </div>
            <button onClick={() => onChange({ token: '' })} className="self-start text-accent-text hover:underline">{tr('api.newToken')}</button>
          </div>
          <span className="text-xs text-muted">POST /run {'{'}"path": "…json", "preset": "…"{'}'} · POST /stop · GET /status · GET /events (SSE) · /mcp (AI)</span>
        </>
      )}
    </>
  );
}
