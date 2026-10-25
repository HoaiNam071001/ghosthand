// Ô đường dẫn + nút "Chọn…" (bước 50 B1): chọn file có sẵn / thư mục / nơi lưu file mới bằng hộp thoại hệ điều hành,
// vẫn gõ tay hoặc chèn {{biến}} được. Dùng cho mọi ô đường dẫn của node.
import { ComponentProps, useState } from 'react';
import VarTextInput from '../inputs/VarTextInput';
import { PickPath } from '../../../wailsjs/go/main/App';
import { Folder } from '../icons';
import { errorText } from '../../engineStore';
import { errText } from './shared';

// any = nguồn có thể là file hoặc thư mục (nén): hai nút.
export type PathKind = 'file' | 'folder' | 'save' | 'any';

type Props = Omit<ComponentProps<typeof VarTextInput>, 'rows' | 'compact'> & { kind: PathKind; title?: string };

const TITLES: Record<PathKind, string> = { file: 'Chọn file', folder: 'Chọn thư mục', save: 'Chọn nơi lưu', any: 'Chọn file' };
const BTN = 'flex h-[34px] flex-none items-center gap-1.5 rounded-control border border-line px-2.5 text-[13px] text-muted hover:bg-hover hover:text-ink';

export default function PathInput({ kind, title = TITLES[kind], ...input }: Props) {
  const [err, setErr] = useState('');
  const pick = (k: Exclude<PathKind, 'any'>, t: string) => {
    setErr('');
    PickPath(k, t, input.value).then((p) => p && input.onChange(p)).catch((e) => setErr(errorText(e)));
  };
  return (
    <>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1"><VarTextInput {...input} rows={1} compact /></div>
        {kind === 'any' ? <>
          <button type="button" onClick={() => pick('file', 'Chọn file')} className={BTN}><Folder />File…</button>
          <button type="button" onClick={() => pick('folder', 'Chọn thư mục')} className={BTN}><Folder />Thư mục…</button>
        </> : (
          <button type="button" onClick={() => pick(kind, title)} title={title} aria-label={title} className={BTN}><Folder />Chọn…</button>
        )}
      </div>
      {err && <span className={errText}>{err}</span>}
    </>
  );
}
