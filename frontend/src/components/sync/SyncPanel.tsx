// Cài đặt → Đồng bộ (bước 54 C8): chỉ hiển thị, hành động qua props – app thật (settings/SyncSettings) và màn mẫu #demo-sync dùng chung.
import { ReactNode } from 'react';
import { clockText, summaryText, syncTone, TONE_CLASS } from '../../sync/text';
import type { SyncStatus } from '../../sync/types';
import Select from '../Select';
import { Switch } from '../Switch';
import SyncRemoteBox, { RemoteBoxProps } from './SyncRemoteBox';
import SyncSecretsBox, { SecretsBoxProps } from './SyncSecretsBox';

export type SyncCfg = { scripts: boolean; settings: boolean; secrets: boolean; onOpen: boolean; onSave: boolean; intervalMin: number; device: string };


const INTERVALS = [0, 5, 15, 30, 60, 240, 1440];
const intervalLabel = (m: number) => (m === 0 ? 'Tắt' : m < 60 ? `Mỗi ${m} phút` : m === 60 ? 'Mỗi giờ' : `Mỗi ${m / 60} giờ`);

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
  const mcp = status.backend === 'mcp';
  const pending = remote.backend !== (mcp ? 'mcp' : 'gdrive'); // đang soạn nơi khác, chưa lưu
  const tone = syncTone(status);
  const sum = summaryText(status.summary);
  const intervals = INTERVALS.includes(cfg.intervalMin) ? INTERVALS : [...INTERVALS, cfg.intervalMin].sort((a, b) => a - b);
  return (
    <>
      <span className="font-semibold">Đồng bộ</span>
      <span className="text-xs text-muted">
        Giữ kịch bản, ảnh mẫu, cài đặt (và bí mật, nếu bạn bật) giống nhau giữa các máy qua Google Drive (app chỉ thấy thư mục <b>Ghosthand</b> nó tạo) hoặc một MCP server bạn chọn.
        Hai máy cùng sửa một thứ thì app <b>hỏi bạn</b>, không bao giờ tự ghi đè.
      </span>

      <SyncRemoteBox {...remote} />

      {pending && <span className="text-xs text-muted">Chưa lưu: bấm <b>Lưu và kiểm tra</b> để chuyển nơi đồng bộ.</span>}
      {!pending && <div className="flex flex-col gap-2 rounded-control border border-line bg-soft p-3">
        {!status.hasClient && !mcp
          ? <span className="text-muted">Bản app này chưa kèm khoá đăng nhập Google nên chưa dùng được đồng bộ.</span>
          : !status.loggedIn
            ? mcp
              ? <span className="text-muted">Chọn MCP server đang bật và lưu để bắt đầu đồng bộ.</span>
              : <Row label="Google Drive" hint="Mở trình duyệt để đăng nhập; app không thấy mật khẩu Google của bạn.">
                <button onClick={onLogin} disabled={busy} className="btn-primary flex-none rounded-control px-3 py-1.5 disabled:opacity-50">{busy ? 'Đang chờ đăng nhập…' : 'Đăng nhập Google'}</button>
              </Row>
            : <>
              <div className={`flex items-center gap-2 ${TONE_CLASS[tone.tone]}`}>
                <span className={`h-[7px] w-[7px] flex-none rounded-full bg-current ${tone.tone === 'busy' ? 'animate-pulse' : ''}`} />
                <span className="font-semibold">{tone.text}</span>
                <span className="ml-auto flex gap-2">
                  <button onClick={onNow} disabled={status.running} className="btn-primary rounded-control px-3 py-1.5 disabled:opacity-50">Đồng bộ ngay</button>
                  {!mcp && <button onClick={onLogout} className="rounded-control border border-line bg-surface px-3 py-1.5 hover:bg-hover">Đăng xuất</button>}
                </span>
              </div>
              {sum && <span className="text-xs text-muted">Lượt gần nhất: {sum}</span>}
              {status.lastError && <span className="text-xs text-danger-text">{status.lastError}</span>}
              {!!status.missing?.length && (
                <span className="text-xs text-warn">Tệp đi kèm không đọc được (chưa đẩy được): <span className="font-mono">{status.missing.join(' · ')}</span></span>
              )}
              {!!status.held?.length && <span className="text-xs text-muted">Kịch bản đang soạn dở được giữ nguyên; lưu rồi đồng bộ lại để nhận bản mới.</span>}
            </>}
      </div>}
      {error && <span className="text-xs text-danger-text">{error}</span>}

      {status.loggedIn && !pending && (
        <>
          <span className="text-muted">Đồng bộ những gì</span>
          <Row label="Kịch bản" hint="Kèm ảnh mẫu và tệp đi kèm (CSV, ảnh…)"><Switch on={cfg.scripts} onChange={(v) => onCfg({ scripts: v })} label="Đồng bộ kịch bản" /></Row>
          <Row label="Cài đặt" hint="Giao diện, viền chạy, nhà cung cấp AI… Không gồm thư mục lưu, cổng API, quyền của AI."><Switch on={cfg.settings} onChange={(v) => onCfg({ settings: v })} label="Đồng bộ cài đặt" /></Row>
          <SyncSecretsBox enabled={cfg.secrets} onToggle={(v) => onCfg({ secrets: v })} {...secrets} />

          <span className="mt-1 text-muted">Khi nào tự đồng bộ</span>
          <Row label="Khi mở app"><Switch on={cfg.onOpen} onChange={(v) => onCfg({ onOpen: v })} label="Đồng bộ khi mở app" /></Row>
          <Row label="Sau khi lưu kịch bản" hint="Đợi vài giây sau lần lưu cuối"><Switch on={cfg.onSave} onChange={(v) => onCfg({ onSave: v })} label="Đồng bộ sau khi lưu" /></Row>
          <Row label="Theo chu kỳ">
            <Select value={String(cfg.intervalMin)} className="w-36 rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus" aria-label="Chu kỳ tự đồng bộ"
              onChange={(v) => onCfg({ intervalMin: Number(v) })} options={intervals.map((m) => ({ value: String(m), label: intervalLabel(m) }))} />
          </Row>
          <Row label="Tên máy này" hint={`Hiện cho máy khác thấy khi có xung đột. Trống = ${status.device}`}>
            <input value={cfg.device} onChange={(e) => onCfg({ device: e.target.value })} maxLength={40} aria-label="Tên máy"
              placeholder={status.device} className="w-40 rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus" />
          </Row>
          <span className="text-xs text-muted">Lần cuối đồng bộ: {clockText(status.lastAt)}. Tự đồng bộ không bật hộp hỏi – gặp xung đột nó dừng ở đó và chờ bạn bấm <b>Đồng bộ ngay</b>.</span>
        </>
      )}
    </>
  );
}
