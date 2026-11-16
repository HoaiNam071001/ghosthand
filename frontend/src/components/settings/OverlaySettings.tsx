// Cài đặt → Màn hình: thanh công cụ của overlay (chọn vùng / xem trước) đặt ở cạnh nào (bước 49) + viền quanh màn
// hình lúc app đang điều khiển máy (58 D5 – runborder). Chỉ hiển thị.
import { tr } from '../../i18n/lang';
import { store } from '../../../wailsjs/go/models';
import Segmented from '../Segmented';
import { BarSide, toBarSide } from '../../overlay/toolbarLayout';

const SIDES = (): { id: BarSide; label: string }[] => [{ id: 'top', label: tr('ovl.top') }, { id: 'bottom', label: tr('ovl.bottom') }, { id: 'left', label: tr('ovl.left') }, { id: 'right', label: tr('ovl.right') }];

type Border = 'off' | 'thin' | 'medium';
const BORDERS = (): { id: Border; label: string }[] => [{ id: 'off', label: tr('ovl.off') }, { id: 'thin', label: tr('ovl.thin') }, { id: 'medium', label: tr('ovl.medium') }];

export default function OverlaySettings({ overlay, onChange }: { overlay: Partial<store.OverlaySettings>; onChange: (patch: Partial<store.OverlaySettings>) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-col">{tr('ovl.toolbar')}<span className="text-xs text-muted">{tr('ovl.toolbar.hint')}</span></span>
      <Segmented value={toBarSide(overlay.toolbar)} options={SIDES()} onChange={(toolbar) => onChange({ toolbar })} label={tr('ovl.toolbarAria')} />
      <span className="text-xs text-muted">{tr('ovl.bottomNote')}</span>
      <span className="mt-3 flex flex-col">{tr('ovl.border')}<span className="text-xs text-muted">{tr('ovl.border.hint')}</span></span>
      <Segmented value={(overlay.border || 'thin') as Border} options={BORDERS()} onChange={(border) => onChange({ border })} label={tr('ovl.border')} />
    </div>
  );
}
