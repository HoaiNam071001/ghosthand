// Công cụ của node web (bước 25d D3) – chỉ hiển thị: trạng thái Chrome của app, Đăng nhập tài khoản (bước 36), Chọn
// phần tử trên trang, Thử tìm.
// Nối store ở WebFields (webSteps.ts).
import { useT } from '../../i18n';

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
  const t = useT();
  return (
    <div className="col-span-2 flex flex-col gap-2 text-[13px]">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className={`h-2 w-2 shrink-0 rounded-full ${p.open ? 'bg-ok' : 'bg-line-strong'}`} />
        <span className="min-w-0 flex-1 truncate" title={p.status}>{p.status}</span>
        {p.loginBusy && <span>{p.loginBusy === 'opening' ? t('wt.opening') : t('wt.reopening')}</span>}
        {p.enabled && !p.loginBusy && !p.login && !p.open && <button onClick={p.onOpen} className="text-ink underline">{t('wt.open')}</button>}
        {p.enabled && !p.loginBusy && !p.login && (
          <button onClick={p.onLogin} className="underline"
            title={t('wt.loginTip')}>
            {t('wt.login')}
          </button>
        )}
        {p.enabled && !p.loginBusy && p.login && (
          <button onClick={p.onFinishLogin} className="text-ink underline" title={t('wt.doneTip')}>{t('wt.done')}</button>
        )}
        {p.enabled && !p.loginBusy && <button onClick={p.onRefresh} className="underline">{t('wt.refresh')}</button>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {p.picking
          ? <button onClick={p.onCancelPick} className={btn} title={t('wt.cancelTip')}>{t('wt.cancel')}</button>
          : <button onClick={p.onPick} disabled={!p.enabled || p.login || !!p.loginBusy} className={btn}
            title={t('wt.pickTip')}>{t('wt.pick')}</button>}
        <button onClick={p.onFind} disabled={!p.enabled || !p.canFind || p.finding || p.picking || p.login || !!p.loginBusy} className={btn}
          title={t('wt.findTip')}>
          {p.finding ? t('el.f.trying') : t('el.f.try')}
        </button>
      </div>
      {p.picking && <span className="text-xs text-accent-text">{t('wt.picking')}</span>}
      {p.result && (
        <span className={`flex flex-col gap-0.5 text-xs ${p.result.ok ? 'text-ok' : 'text-warn'}`}>
          <span>{p.result.text}{' '}
            {p.result.ok && <button onClick={p.onView} className="text-muted underline">{t('el.f.view')}</button>}
          </span>
          {p.result.elText && <span className="truncate text-muted">{t('wt.text')} {p.result.elText}</span>}
        </span>
      )}
      {p.error && <span className="text-xs text-danger-text">{p.error}</span>}
    </div>
  );
}
