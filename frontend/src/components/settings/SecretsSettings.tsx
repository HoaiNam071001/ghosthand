// Cài đặt – Bí mật (bước 43 S10): tên → giá trị trong Keychain / Credential Manager. Giá trị chỉ đi một chiều (ghi vào kho),
// giao diện không đọc lại được; kịch bản dùng {{secret.<tên>}}.
import { useEffect, useState } from 'react';
import { DeleteSecret, ListSecrets, SetSecret } from '../../../wailsjs/go/app/App';
import { errorText } from '../../engineStore';
import { refreshSecretNames } from '../../store';
import { CopyButton, SettingCode } from './parts';

const NAME_RE = /^[A-Za-z][A-Za-z0-9_]*$/;
const MIN_LEN = 4; // khớp secrets.MinLen

export default function SecretsSettings({ onError }: { onError: (msg: string) => void }) {
  const [names, setNames] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const refresh = () => ListSecrets().then((n) => { setNames(n ?? []); return refreshSecretNames(); }).catch((e) => onError(errorText(e)));
  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nameOk = NAME_RE.test(name);
  const canSave = nameOk && value.length >= MIN_LEN;
  const save = () => SetSecret(name, value)
    .then(() => { setName(''); setValue(''); onError(''); return refresh(); })
    .catch((e) => onError(errorText(e)));
  const remove = (n: string) => DeleteSecret(n).then(() => { onError(''); return refresh(); }).catch((e) => onError(errorText(e)));

  const input = 'rounded-control border border-line bg-field px-2 py-1.5 text-ink outline-none focus:ring-focus';
  return (
    <>
      <span className="font-semibold">Bí mật</span>
      <span className="text-xs text-muted">
        Mật khẩu, token… lưu trong Keychain (macOS) / Credential Manager (Windows). Dùng trong ô chữ của node bằng <code className="font-mono">{'{{secret.tên}}'}</code>;
        giá trị không vào file kịch bản, lịch sử chạy hay nhật ký (hiện ••••) và AI chỉ thấy tên.
      </span>
      {names.length === 0
        ? <span className="text-muted">Chưa có bí mật nào.</span>
        : <ul className="flex flex-col gap-1.5">
          {names.map((n) => (
            <li key={n} className="flex items-center gap-1.5">
              <SettingCode>{`{{secret.${n}}}`}</SettingCode>
              <CopyButton text={`{{secret.${n}}}`} label={`Chép {{secret.${n}}}`} />
              <button onClick={() => remove(n)} aria-label={`Xoá bí mật ${n}`} className="btn-danger-soft flex-none rounded-control px-2 py-1.5 text-xs">Xoá</button>
            </li>
          ))}
        </ul>}
      <form className="flex flex-col gap-1.5 border-t border-line pt-3" onSubmit={(e) => { e.preventDefault(); if (canSave) save(); }}>
        <span className="text-muted">Thêm hoặc đổi giá trị</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="tên (vd mat_khau_email)" aria-label="Tên bí mật" className={input} autoComplete="off" spellCheck={false} />
        {name && !nameOk && <span className="text-xs text-danger-text">Chữ cái đầu, sau đó chữ / số / gạch dưới.</span>}
        <input value={value} onChange={(e) => setValue(e.target.value)} type="password" placeholder={`giá trị (từ ${MIN_LEN} ký tự)`} aria-label="Giá trị bí mật" className={input} autoComplete="new-password" />
        <button type="submit" disabled={!canSave} className="btn-primary self-start rounded-control px-3 py-1.5 disabled:opacity-40">Lưu</button>
        {names.includes(name) && <span className="text-xs text-muted">Tên này đã có – lưu sẽ ghi đè giá trị cũ.</span>}
      </form>
    </>
  );
}
