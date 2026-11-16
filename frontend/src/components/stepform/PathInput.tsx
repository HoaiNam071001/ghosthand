// Ô đường dẫn + nút "Chọn…" (bước 50 B1): chọn file có sẵn / thư mục / nơi lưu file mới bằng hộp thoại hệ điều hành,
// vẫn gõ tay hoặc chèn {{biến}} được. Dùng cho mọi ô đường dẫn của node.
import { ComponentProps, useState } from 'react';
import VarTextInput from '../inputs/VarTextInput';
import { PickPath } from '../../../wailsjs/go/app/App';
import { Folder } from '../icons';
import { errorText } from '../../engineStore';
import { errText } from './shared';
import { useT } from '../../i18n';
import type { MsgKey } from '../../i18n/vi';

// any = nguồn có thể là file hoặc thư mục (nén): hai nút.
export type PathKind = 'file' | 'folder' | 'save' | 'any';

type Props = Omit<ComponentProps<typeof VarTextInput>, 'rows' | 'compact'> & { kind: PathKind; title?: string };

const TITLES: Record<PathKind, MsgKey> = { file: 'pi.file', folder: 'pi.folder', save: 'pi.save', any: 'pi.file' };
const BTN = 'flex h-[34px] flex-none items-center gap-1.5 rounded-control border border-line px-2.5 text-[13px] text-muted hover:bg-hover hover:text-ink';

export default function PathInput({ kind, title, ...input }: Props) {
  const t = useT();
  title ??= t(TITLES[kind]);
  const [err, setErr] = useState('');
  const pick = (k: Exclude<PathKind, 'any'>, heading: string) => {
    setErr('');
    PickPath(k, heading, input.value).then((p) => p && input.onChange(p)).catch((e) => setErr(errorText(e)));
  };
  return (
    <>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1"><VarTextInput {...input} rows={1} compact /></div>
        {kind === 'any' ? <>
          <button type="button" onClick={() => pick('file', t('pi.file'))} className={BTN}><Folder />{t('pi.fileBtn')}</button>
          <button type="button" onClick={() => pick('folder', t('pi.folder'))} className={BTN}><Folder />{t('pi.folderBtn')}</button>
        </> : (
          <button type="button" onClick={() => pick(kind, title)} title={title} aria-label={title} className={BTN}><Folder />{t('pf.pick')}</button>
        )}
      </div>
      {err && <span className={errText}>{err}</span>}
    </>
  );
}
