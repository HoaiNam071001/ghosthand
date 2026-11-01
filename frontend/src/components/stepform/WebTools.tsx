// Công cụ của node web (bước 25d D3) – chỉ hiển thị: trạng thái Chrome của app, Đăng nhập tài khoản (bước 36), Chọn
// phần tử trên trang, Thử tìm.
// Nối store ở WebFields (webSteps.ts).
const btn = 'h-8 rounded-control border border-line bg-surface px-3 text-ink enabled:hover:bg-hover disabled:opacity-50';

export interface WebToolsProps {
  status: string;
  open: boolean;
  login: boolean; // Chrome của app đang mở để đăng nhập (không điều khiển được)
  loginBusy: '' | 'opening' | 'closing';
  enabled: boolean; // có Go (không phải trình duyệt / #demo)
  picking: boolean;
  finding: boolean;
  canFind: boolean; // đã nhập cách tìm hợp lệ
  result: { ok: boolean; text: string; elText?: string } | null;
  error: string;
  onOpen: () => void;
  onRefresh: () => void;
  onLogin: () => void;
  onFinishLogin: () => void;
  onPick: () => void;
  onCancelPick: () => void;
  onFind: () => void;
  onView: () => void;
}

export function WebTools(p: WebToolsProps) {
  return (
    <div className="col-span-2 flex flex-col gap-2 text-[13px]">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className={`h-2 w-2 shrink-0 rounded-full ${p.open ? 'bg-ok' : 'bg-line-strong'}`} />
        <span className="min-w-0 flex-1 truncate" title={p.status}>{p.status}</span>
        {p.loginBusy && <span>{p.loginBusy === 'opening' ? 'Đang mở để đăng nhập…' : 'Đang mở lại…'}</span>}
        {p.enabled && !p.loginBusy && !p.login && !p.open && <button onClick={p.onOpen} className="text-ink underline">Mở</button>}
        {p.enabled && !p.loginBusy && !p.login && (
          <button onClick={p.onLogin} className="underline"
            title="Mở Chrome của app như Chrome thường (không chế độ điều khiển) để đăng nhập Gmail, Facebook… – trang không nghi ngờ; xong bấm Xong, phiên đăng nhập được giữ">
            Đăng nhập
          </button>
        )}
        {p.enabled && !p.loginBusy && p.login && (
          <button onClick={p.onFinishLogin} className="text-ink underline" title="Đóng Chrome đăng nhập (lưu phiên) rồi mở lại chế độ điều khiển">Xong</button>
        )}
        {p.enabled && !p.loginBusy && <button onClick={p.onRefresh} className="underline">Làm mới</button>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {p.picking
          ? <button onClick={p.onCancelPick} className={btn} title="Hoặc bấm Esc trong trang">Huỷ chọn</button>
          : <button onClick={p.onPick} disabled={!p.enabled || p.login || !!p.loginBusy} className={btn}
            title="Đưa Chrome của app lên trước – bấm vào phần tử cần tìm, app tự điền cách tìm">Chọn phần tử trên trang</button>}
        <button onClick={p.onFind} disabled={!p.enabled || !p.canFind || p.finding || p.picking || p.login || !!p.loginBusy} className={btn}
          title="Tìm một lần trên tab hiện tại (lần đầu chuột đi vào trang để đo toạ độ)">
          {p.finding ? 'Đang tìm…' : 'Thử tìm'}
        </button>
      </div>
      {p.picking && <span className="text-xs text-accent-text">Bấm vào phần tử trong Chrome của app (Esc để huỷ)…</span>}
      {p.result && (
        <span className={`flex flex-col gap-0.5 text-xs ${p.result.ok ? 'text-ok' : 'text-warn'}`}>
          <span>{p.result.text}{' '}
            {p.result.ok && <button onClick={p.onView} className="text-muted underline">xem trên màn hình</button>}
          </span>
          {p.result.elText && <span className="truncate text-muted">Chữ: {p.result.elText}</span>}
        </span>
      )}
      {p.error && <span className="text-xs text-danger-text">{p.error}</span>}
    </div>
  );
}
