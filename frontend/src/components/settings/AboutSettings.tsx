// Cài đặt → Giới thiệu: phiên bản đang chạy, kiểm tra bản mới (hỏi GitHub Releases), nút mở trang tải. Chỉ hiển thị –
// AppSettings nối updateStore.
import { tr } from '../../i18n/lang';
import { update } from '../../../wailsjs/go/models';
import { useLang } from '../../i18n';

const PHASE = (): Record<string, string> => ({ install: tr('about.installing'), restart: tr('about.restarting') });

// Dòng tiến độ lúc Cập nhật ngay: tải (% / MB) → cài → mở lại.
function progressText(p: { phase: string; done: number; total: number }) {
  if (p.phase !== 'download') return PHASE()[p.phase] ?? '';
  const mb = (n: number) => (n / 1048576).toFixed(1);
  return p.total > 0 ? tr('about.downloadingPct', { pct: Math.round((p.done / p.total) * 100), done: mb(p.done), total: mb(p.total) }) : tr('about.downloading');
}

export default function AboutSettings({ version, info, busy, error, progress, onCheck, onOpen, onInstall }: {
  version: string; info: update.Info | null; busy: boolean; error: string; progress: { phase: string; done: number; total: number } | null;
  onCheck: () => void; onOpen: (url: string) => void; onInstall: () => void;
}) {
  useLang();
  const btn = 'h-7 rounded-control border border-line px-2.5 text-xs hover:bg-hover disabled:opacity-50';
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span>Ghosthand <span className="font-mono text-xs text-muted">{version && version !== 'dev' ? `v${version}` : tr('about.selfBuild')}</span></span>
        <button onClick={onCheck} disabled={busy} className={btn}>{busy ? tr('about.checking') : tr('about.check')}</button>
      </div>
      {info && !info.newer && <span className="text-xs text-ok">✓ {version === 'dev' ? tr('about.latestDev', { v: info.latest }) : tr('about.upToDate')}</span>}
      {info?.newer && (
        <div className="flex flex-col gap-1.5 rounded-control bg-soft p-2.5">
          <span className="font-semibold text-accent-text">{tr('about.newVersion', { v: info.latest })}</span>
          {info.notes && <span className="whitespace-pre-line text-xs text-muted">{info.notes}</span>}
          {progress ? <span className="text-xs text-accent-text">{progressText(progress)}</span> : (
            <span className="flex gap-1.5">
              {version !== 'dev' && <button onClick={onInstall} className="btn-primary h-7 rounded-control px-3 text-xs text-on-accent">{tr('about.update')}</button>}
              <button onClick={() => onOpen(info.url)} className={btn}>{tr('about.downloadPage')}</button>
            </span>
          )}
        </div>
      )}
      {error && <span className="text-danger-text">{error}</span>}
      <span className="text-xs text-muted">{tr('about.note')}</span>
    </>
  );
}
