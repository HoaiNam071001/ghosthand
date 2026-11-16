// Cài đặt → Đồng bộ (bước 54 C8): chỉ hiển thị, hành động qua props – app thật (settings/SyncSettings) và màn mẫu #demo-sync dùng chung.
import { ReactNode } from 'react';
import { tr, useLang } from '../../i18n';
import { clockText, summaryText, syncTone, TONE_CLASS } from '../../sync/text';
import type { SyncStatus } from '../../sync/types';
import Select from '../Select';
import { Switch } from '../Switch';
import SyncRemoteBox, { RemoteBoxProps } from './SyncRemoteBox';
import SyncSecretsBox, { SecretsBoxProps } from './SyncSecretsBox';

export type SyncCfg = { scripts: boolean; settings: boolean; secrets: boolean; onOpen: boolean; onSave: boolean; intervalMin: number; device: string };


const INTERVALS = [0, 5, 15, 30, 60, 240, 1440];
const intervalLabel = (m: number) => (m === 0 ? tr('sync.int.off') : m < 60 ? tr('sync.int.min', { n: m }) : m === 60 ? tr('sync.int.hour') : tr('sync.int.hours', { n: m / 60 }));

export type SyncPanelProps = {
  status: SyncStatus;
  cfg: SyncCfg;
  busy: boolean; // đang chờ đăng nhập
  error: string;
  onLogin: () => void;
  onLogout: () => void;
  onNow: () => void;
  onCfg: (patch: Partial<SyncCfg>) => void;
  secrets: Omit<SecretsBoxProps, 'enabled' | 'onToggle'>;
  remote: RemoteBoxProps;
};

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-1 flex-col"><span>{label}</span>{hint && <span className="text-xs text-muted">{hint}</span>}</div>
      {children}
    </div>
  );
}

export default function SyncPanel({ status, cfg, busy, error, onLogin, onLogout, onNow, onCfg, secrets, remote }: SyncPanelProps) {
  useLang();
  const mcp = status.backend === 'mcp';
  const pending = remote.backend !== (mcp ? 'mcp' : 'gdrive'); // đang soạn nơi khác, chưa lưu
  const tone = syncTone(status);
  const sum = summaryText(status.summary);
  const intervals = INTERVALS.includes(cfg.intervalMin) ? INTERVALS : [...INTERVALS, cfg.intervalMin].sort((a, b) => a - b);
  return (
    <>
      <span className="font-semibold">{tr('sync.title')}</span>
      <span className="text-xs text-muted">
        {tr('sync.descA')}<b>Ghosthand</b>{tr('sync.descB')}<b>{tr('sync.descC')}</b>{tr('sync.descD')}
      </span>

      <SyncRemoteBox {...remote} />

      {pending && <span className="text-xs text-muted">{tr('sync.pendingA')}<b>{tr('sync.pendingB')}</b>{tr('sync.pendingC')}</span>}
      {!pending && <div className="flex flex-col gap-2 rounded-control border border-line bg-soft p-3">
        {!status.hasClient && !mcp
          ? <span className="text-muted">{tr('sync.noClient')}</span>
          : !status.loggedIn
            ? mcp
              ? <span className="text-muted">{tr('sync.pickMcp')}</span>
              : <Row label="Google Drive" hint={tr('sync.gdHint')}>
                <button onClick={onLogin} disabled={busy} className="btn-primary flex-none rounded-control px-3 py-1.5 disabled:opacity-50">{busy ? tr('sync.waiting') : tr('sync.login')}</button>
              </Row>
            : <>
              <div className={`flex items-center gap-2 ${TONE_CLASS[tone.tone]}`}>
                <span className={`h-[7px] w-[7px] flex-none rounded-full bg-current ${tone.tone === 'busy' ? 'animate-pulse' : ''}`} />
                <span className="font-semibold">{tone.text}</span>
                <span className="ml-auto flex gap-2">
                  <button onClick={onNow} disabled={status.running} className="btn-primary rounded-control px-3 py-1.5 disabled:opacity-50">{tr('sync.now')}</button>
                  {!mcp && <button onClick={onLogout} className="rounded-control border border-line bg-surface px-3 py-1.5 hover:bg-hover">{tr('sync.logout')}</button>}
                </span>
              </div>
              {sum && <span className="text-xs text-muted">{tr('sync.last', { sum })}</span>}
              {status.lastError && <span className="text-xs text-danger-text">{status.lastError}</span>}
              {!!status.missing?.length && (
                <span className="text-xs text-warn">{tr('sync.missingFiles')}<span className="font-mono">{status.missing.join(' · ')}</span></span>
              )}
              {!!status.held?.length && <span className="text-xs text-muted">{tr('sync.held')}</span>}
            </>}
      </div>}
      {error && <span className="text-xs text-danger-text">{error}</span>}

      {status.loggedIn && !pending && (
        <>
          <span className="text-muted">{tr('sync.what')}</span>
          <Row label={tr('sync.scripts')} hint={tr('sync.scriptsHint')}><Switch on={cfg.scripts} onChange={(v) => onCfg({ scripts: v })} label={tr('sync.scriptsAria')} /></Row>
          <Row label={tr('sync.settings')} hint={tr('sync.settingsHint')}><Switch on={cfg.settings} onChange={(v) => onCfg({ settings: v })} label={tr('sync.settingsAria')} /></Row>
          <SyncSecretsBox enabled={cfg.secrets} onToggle={(v) => onCfg({ secrets: v })} {...secrets} />

          <span className="mt-1 text-muted">{tr('sync.when')}</span>
          <Row label={tr('sync.onOpen')}><Switch on={cfg.onOpen} onChange={(v) => onCfg({ onOpen: v })} label={tr('sync.onOpenAria')} /></Row>
          <Row label={tr('sync.onSave')} hint={tr('sync.onSaveHint')}><Switch on={cfg.onSave} onChange={(v) => onCfg({ onSave: v })} label={tr('sync.onSaveAria')} /></Row>
          <Row label={tr('sync.every')}>
            <Select value={String(cfg.intervalMin)} className="w-36 rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus" aria-label={tr('sync.everyAria')}
              onChange={(v) => onCfg({ intervalMin: Number(v) })} options={intervals.map((m) => ({ value: String(m), label: intervalLabel(m) }))} />
          </Row>
          <Row label={tr('sync.device')} hint={tr('sync.deviceHint', { dev: status.device })}>
            <input value={cfg.device} onChange={(e) => onCfg({ device: e.target.value })} maxLength={40} aria-label={tr('sync.deviceAria')}
              placeholder={status.device} className="w-40 rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus" />
          </Row>
          <span className="text-xs text-muted">{tr('sync.lastAtA', { at: clockText(status.lastAt) })}<b>{tr('sync.lastAtB')}</b>.</span>
        </>
      )}
    </>
  );
}
