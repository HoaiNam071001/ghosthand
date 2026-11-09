// Khối "Bí mật" trong Cài đặt → Đồng bộ (bước 54 C7/C8): mặc định tắt; bật phải xác nhận rủi ro và đặt cụm mật khẩu.
// Cụm mật khẩu chỉ cất trong Keychain / Credential Manager của máy; cloud chỉ giữ bản mã – quên cụm mật khẩu = mất bí mật trên cloud.
import { useState } from 'react';
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
        <div className="flex min-w-0 flex-1 flex-col"><span>Bí mật</span><span className="text-xs text-muted">Mật khẩu, token trong tab Bí mật. Tắt mặc định.</span></div>
        <Switch on={enabled} onChange={onToggle} label="Đồng bộ bí mật" />
      </div>
      {(enabled || editing) && (
        <div className="flex flex-col gap-2 rounded-control border border-line p-3">
          <span className="text-xs text-muted">
            Bí mật được <b>mã hoá trên máy này</b> bằng cụm mật khẩu riêng rồi mới lên Drive; Google và app không đọc được. Máy mới nhập đúng cụm mật khẩu này để lấy về.
            <b className="text-warn"> Quên cụm mật khẩu = mất bí mật trên cloud</b> (không khôi phục được; bí mật trên các máy vẫn còn).
          </span>
          {hasPassphrase && !rotate && (
            <div className="flex items-center gap-2">
              <span className="text-ok">Đã có cụm mật khẩu trên máy này</span>
              <button onClick={() => setRotate(true)} className="ml-auto rounded-control border border-line bg-surface px-2.5 py-1 text-xs hover:bg-hover">Đổi cụm mật khẩu</button>
              <button onClick={onClearPassphrase} className="btn-danger-soft rounded-control px-2.5 py-1 text-xs">Xoá khỏi máy này</button>
            </div>
          )}
          {editing && (
            <form className="flex flex-col gap-1.5" onSubmit={(e) => { e.preventDefault(); if (canSave) void save(); }}>
              <input value={pass} onChange={(e) => setPass(e.target.value)} type="password" autoComplete="new-password" aria-label="Cụm mật khẩu đồng bộ"
                placeholder={rotate ? 'Cụm mật khẩu mới' : `Cụm mật khẩu (từ ${MIN_PASSPHRASE} ký tự)`} className={input} />
              <input value={again} onChange={(e) => setAgain(e.target.value)} type="password" autoComplete="new-password" aria-label="Nhập lại cụm mật khẩu"
                placeholder="Nhập lại" className={input} />
              {again && pass !== again && <span className="text-xs text-danger-text">Hai lần nhập chưa giống nhau.</span>}
              {!hasPassphrase && (
                <label className="flex items-start gap-2 text-xs">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
                  <span>Tôi hiểu: bí mật lên cloud ở dạng bản mã, và quên cụm mật khẩu thì không lấy lại được bản trên cloud.</span>
                </label>
              )}
              <div className="flex gap-2">
                <button type="submit" disabled={!canSave} className="btn-primary rounded-control px-3 py-1.5 disabled:opacity-40">{rotate ? 'Đổi và mã hoá lại' : 'Lưu cụm mật khẩu'}</button>
                {rotate && <button type="button" onClick={() => { setRotate(false); setPass(''); setAgain(''); setErr(''); }} className="rounded-control border border-line bg-surface px-3 py-1.5 hover:bg-hover">Huỷ</button>}
              </div>
              {rotate && <span className="text-xs text-muted">Các máy khác sẽ phải nhập cụm mật khẩu mới ở lần đồng bộ sau.</span>}
              {err && <span className="text-xs text-danger-text">{err}</span>}
            </form>
          )}
        </div>
      )}
    </div>
  );
}
