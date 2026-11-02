// Nút Thử trang trên thanh tiêu đề (bước 44): mở hộp PageCheckDialog, gọi Go CheckPage (mở trang trên Chrome của app,
// dò captcha). Nhớ URL lần thử trước trong phiên.
import { useEffect, useState } from 'react';
import { CheckPage } from '../../../wailsjs/go/app/App';
import { web } from '../../../wailsjs/go/models';
import { errorText } from '../../engineStore';
import { normalizeUrl } from '../../pageCheck';
import { Globe } from '../icons';
import PageCheckDialog from './PageCheckDialog';

export default function PageCheckButton() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<web.PageCheck | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // u rỗng = Dò lại tab đang mở (không tải lại) – cho trang tải lâu
  const run = (u: string) => {
    setBusy(true);
    setError('');
    setResult(null);
    CheckPage(u).then(setResult).catch((e) => setError(errorText(e))).finally(() => setBusy(false));
  };
  const check = () => {
    const u = normalizeUrl(url);
    if (u) run(u);
  };

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label="Thử trang trên Chrome của app" title="Thử trang trên Chrome của app" aria-haspopup="dialog" aria-expanded={open}
        className="grid h-9 w-9 place-items-center text-muted hover:bg-hover hover:text-ink"><Globe /></button>
      {open && <PageCheckDialog url={url} onUrl={setUrl} busy={busy} result={result} error={error} onCheck={check} onRecheck={() => run('')} onClose={() => setOpen(false)} />}
    </>
  );
}
