// Cài đặt → Giới thiệu: phiên bản đang chạy, kiểm tra bản mới (hỏi GitHub Releases), nút mở trang tải. Chỉ hiển thị –
// AppSettings nối updateStore.
import { update } from '../../../wailsjs/go/models';

const PHASE: Record<string, string> = { install: 'Đang cài…', restart: 'Xong – đang mở lại app…' };

// Dòng tiến độ lúc Cập nhật ngay: tải (% / MB) → cài → mở lại.
function progressText(p: { phase: string; done: number; total: number }) {
  if (p.phase !== 'download') return PHASE[p.phase] ?? '';
  const mb = (n: number) => (n / 1048576).toFixed(1);
  return p.total > 0 ? `Đang tải… ${Math.round((p.done / p.total) * 100)} % (${mb(p.done)} / ${mb(p.total)} MB)` : 'Đang tải…';
}

export default function AboutSettings({ version, info, busy, error, progress, onCheck, onOpen, onInstall }: {
  version: string; info: update.Info | null; busy: boolean; error: string; progress: { phase: string; done: number; total: number } | null;
  onCheck: () => void; onOpen: (url: string) => void; onInstall: () => void;
}) {
  const btn = 'h-7 rounded-control border border-line px-2.5 text-xs hover:bg-hover disabled:opacity-50';
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span>Ghosthand <span className="font-mono text-xs text-muted">{version && version !== 'dev' ? `v${version}` : 'bản tự build'}</span></span>
        <button onClick={onCheck} disabled={busy} className={btn}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra bản mới'}</button>
      </div>
      {info && !info.newer && <span className="text-xs text-ok">✓ {version === 'dev' ? `Bản mới nhất trên GitHub là v${info.latest}` : 'Đang dùng bản mới nhất'}</span>}
      {info?.newer && (
        <div className="flex flex-col gap-1.5 rounded-control bg-soft p-2.5">
          <span className="font-semibold text-accent-text">Có bản mới v{info.latest}</span>
          {info.notes && <span className="whitespace-pre-line text-xs text-muted">{info.notes}</span>}
          {progress ? <span className="text-xs text-accent-text">{progressText(progress)}</span> : (
            <span className="flex gap-1.5">
              {version !== 'dev' && <button onClick={onInstall} className="btn-primary h-7 rounded-control px-3 text-xs text-on-accent">Cập nhật ngay</button>}
              <button onClick={() => onOpen(info.url)} className={btn}>Mở trang tải</button>
            </span>
          )}
        </div>
      )}
      {error && <span className="text-danger-text">{error}</span>}
      <span className="text-xs text-muted">Cập nhật ngay tải bản mới (kiểm tra mã sha256), cài đè và mở lại app; quyền đã cấp được giữ (macOS). Không làm khi đang chạy kịch bản hoặc kịch bản chưa lưu.</span>
    </>
  );
}
