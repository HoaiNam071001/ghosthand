// Cài đặt – Bí mật (bước 43 S10): tên → giá trị trong Keychain / Credential Manager. Giá trị chỉ đi một chiều (ghi vào kho),
// giao diện không đọc lại được; kịch bản dùng {{secret.<tên>}}.
import { useEffect, useState } from 'react';
import { DeleteSecret, ListSecrets, SetSecret } from '../../../wailsjs/go/app/App';
import { errorText } from '../../engineStore';
import { tr, useLang } from '../../i18n';
import { refreshSecretNames } from '../../store';
import { CopyButton, SettingCode } from './parts';

const NAME_RE = /^[A-Za-z][A-Za-z0-9_]*$/;
const MIN_LEN = 4; // khớp secrets.MinLen

export default function SecretsSettings({ onError }: { onError: (msg: string) => void }) {
  useLang();
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
      <span className="font-semibold">{tr('sec.title')}</span>
      <span className="text-xs text-muted">
        {tr('sec.desc1')}<code className="font-mono">{tr('sec.nameTpl')}</code>{tr('sec.desc2')}
      </span>
      {names.length === 0
        ? <span className="text-muted">{tr('sec.none')}</span>
        : <ul className="flex flex-col gap-1.5">
          {names.map((n) => (
            <li key={n} className="flex items-center gap-1.5">
              <SettingCode>{`{{secret.${n}}}`}</SettingCode>
              <CopyButton text={`{{secret.${n}}}`} label={tr('sec.copy', { n })} />
              <button onClick={() => remove(n)} aria-label={tr('sec.delAria', { n })} className="btn-danger-soft flex-none rounded-control px-2 py-1.5 text-xs">{tr('sec.del')}</button>
            </li>
          ))}
        </ul>}
      <form className="flex flex-col gap-1.5 border-t border-line pt-3" onSubmit={(e) => { e.preventDefault(); if (canSave) save(); }}>
        <span className="text-muted">{tr('sec.addOrChange')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('sec.namePh')} aria-label={tr('sec.nameAria')} className={input} autoComplete="off" spellCheck={false} />
        {name && !nameOk && <span className="text-xs text-danger-text">{tr('sec.nameBad')}</span>}
        <input value={value} onChange={(e) => setValue(e.target.value)} type="password" placeholder={tr('sec.valuePh', { n: MIN_LEN })} aria-label={tr('sec.valueAria')} className={input} autoComplete="new-password" />
        <button type="submit" disabled={!canSave} className="btn-primary self-start rounded-control px-3 py-1.5 disabled:opacity-40">{tr('sec.save')}</button>
        {names.includes(name) && <span className="text-xs text-muted">{tr('sec.exists')}</span>}
      </form>
    </>
  );
}
