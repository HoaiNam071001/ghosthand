// Nút Thử trang trên thanh tiêu đề (bước 44): mở hộp PageCheckDialog, gọi Go CheckPage (mở trang trên Chrome của app,
// dò captcha). Nhớ URL lần thử trước trong phiên.
import { useT } from '../../i18n';
import { useEffect, useState } from 'react';
import { CheckPage } from '../../../wailsjs/go/app/App';
import { web } from '../../../wailsjs/go/models';
import { errorText } from '../../engineStore';
import { normalizeUrl } from '../../pageCheck';
import { Globe } from '../icons';
import PageCheckDialog from './PageCheckDialog';

// ribbon: nút lớn "Thử trang" trong tab Công cụ (bước 63) thay cho nút icon trên thanh tiêu đề.
export default function PageCheckButton({ ribbon }: { ribbon?: boolean }) {
  const t = useT();
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
      <button onClick={() => setOpen(!open)} aria-label={t('pg.title')} title={t('pg.btnTip')} aria-haspopup="dialog" aria-expanded={open}
        className={ribbon
          ? 'flex h-[66px] min-w-[52px] max-w-[92px] flex-none flex-col items-center gap-1.5 rounded-[7px] px-2 pt-[7px] text-center text-[11.5px] leading-[1.15] hover:bg-hover'
          : 'grid h-9 w-9 place-items-center text-muted hover:bg-hover hover:text-ink'}>
        {ribbon ? <><Globe className="h-6 w-6" /><span>{t('pg.btn')}</span></> : <Globe />}
      </button>
      {open && <PageCheckDialog url={url} onUrl={setUrl} busy={busy} result={result} error={error} onCheck={check} onRecheck={() => run('')} onClose={() => setOpen(false)} />}
    </>
  );
}
