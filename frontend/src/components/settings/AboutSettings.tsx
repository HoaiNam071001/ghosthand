// Cài đặt → Giới thiệu: phiên bản đang chạy, kiểm tra bản mới (hỏi GitHub Releases), nút mở trang tải. Chỉ hiển thị –
// AppSettings nối updateStore.
import { update } from '../../../wailsjs/go/models';

export default function AboutSettings({ version, info, busy, error, onCheck, onOpen }: {
  version: string; info: update.Info | null; busy: boolean; error: string; onCheck: () => void; onOpen: (url: string) => void;
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
          <button onClick={() => onOpen(info.url)} className={`${btn} self-start`}>Mở trang tải</button>
        </div>
      )}
      {error && <span className="text-danger-text">{error}</span>}
      <span className="text-xs text-muted">Chỉ báo có bản mới, không tự cài. Cài bản mới bằng cách chép đè lên app cũ trong Applications – quyền đã cấp được giữ (macOS).</span>
    </>
  );
}
