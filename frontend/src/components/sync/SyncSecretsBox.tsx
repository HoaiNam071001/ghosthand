// Khối "Bí mật" trong Cài đặt → Đồng bộ (bước 54 C7/C8): mặc định tắt; bật phải xác nhận rủi ro và đặt cụm mật khẩu.
// Cụm mật khẩu chỉ cất trong Keychain / Credential Manager của máy; cloud chỉ giữ bản mã – quên cụm mật khẩu = mất bí mật trên cloud.
import { useState } from 'react';
import { tr, useLang } from '../../i18n';
import { MIN_PASSPHRASE, passphraseOk } from '../../sync/text';
import { Switch } from '../Switch';

export type SecretsBoxProps = {
  enabled: boolean;
  onToggle: (on: boolean) => void;
  hasPassphrase: boolean;
  /** Đặt (rotate=false: máy này vào nhóm / lần đầu) hoặc đổi (rotate=true) cụm mật khẩu. Trả lỗi dạng chữ, '' = xong. */
  onSetPassphrase: (pass: string, rotate: boolean) => Promise<string>;
  onClearPassphrase: () => void;
};

const input = 'rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus';

export default function SyncSecretsBox({ enabled, onToggle, hasPassphrase, onSetPassphrase, onClearPassphrase }: SecretsBoxProps) {
  useLang();
  const [pass, setPass] = useState('');
  const [again, setAgain] = useState('');
  const [rotate, setRotate] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const editing = !hasPassphrase || rotate;
  const canSave = passphraseOk(pass) && pass === again && (hasPassphrase || agreed) && !busy;
  const save = async () => {
    setBusy(true);
    const e = await onSetPassphrase(pass, rotate);
    setBusy(false);
    setErr(e);
    if (!e) { setPass(''); setAgain(''); setRotate(false); }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col"><span>{tr('sync.sec.title')}</span><span className="text-xs text-muted">{tr('sync.sec.hint')}</span></div>
        <Switch on={enabled} onChange={onToggle} label={tr('sync.sec.aria')} />
      </div>
      {(enabled || editing) && (
        <div className="flex flex-col gap-2 rounded-control border border-line p-3">
          <span className="text-xs text-muted">
            {tr('sync.sec.descA')}<b>{tr('sync.sec.descB')}</b>{tr('sync.sec.descC')}
            <b className="text-warn">{tr('sync.sec.descD')}</b>{tr('sync.sec.descE')}
          </span>
          {hasPassphrase && !rotate && (
            <div className="flex items-center gap-2">
              <span className="text-ok">{tr('sync.sec.has')}</span>
              <button onClick={() => setRotate(true)} className="ml-auto rounded-control border border-line bg-surface px-2.5 py-1 text-xs hover:bg-hover">{tr('sync.sec.change')}</button>
              <button onClick={onClearPassphrase} className="btn-danger-soft rounded-control px-2.5 py-1 text-xs">{tr('sync.sec.clear')}</button>
            </div>
          )}
          {editing && (
            <form className="flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); if (canSave) void save(); }}>
              <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" autoComplete="new-password" aria-label={tr('sync.sec.passAria')}
                placeholder={rotate ? tr('sync.sec.passNew') : tr('sync.sec.pass', { n: MIN_PASSPHRASE })} className={input} />
              <input value={again} onChange={(e) => setAgain(e.target.value)} type="password" autoComplete="new-password" aria-label={tr('sync.sec.againAria')}
                placeholder={tr('sync.sec.again')} className={input} />
              {again && pass !== again && <span className="text-xs text-danger-text">{tr('sync.sec.mismatch')}</span>}
              {!hasPassphrase && (
                <label className="flex items-start gap-2 text-xs">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
                  <span>{tr('sync.sec.agree')}</span>
                </label>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={!canSave} className="btn-primary rounded-control px-3 py-1.5 disabled:opacity-40">{rotate ? tr('sync.sec.rotate') : tr('sync.sec.savePass')}</button>
                {rotate && <button type="button" onClick={() => { setRotate(false); setPass(''); setAgain(''); setErr(''); }} className="rounded-control border border-line bg-surface px-3 py-1.5 hover:bg-hover">{tr('mcp.cancel')}</button>}
              </div>
              {rotate && <span className="text-xs text-muted">{tr('sync.sec.rotateNote')}</span>}
              {err && <span className="text-xs text-danger-text">{err}</span>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
