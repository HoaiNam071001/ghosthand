// Cài đặt → Màn hình: thanh công cụ của overlay (chọn vùng / xem trước) đặt ở cạnh nào (bước 49) + viền quanh màn
// hình lúc app đang điều khiển máy (58 D5 – runborder). Chỉ hiển thị.
import { store } from '../../../wailsjs/go/models';
import Segmented from '../Segmented';
import { BarSide, toBarSide } from '../../overlay/toolbarLayout';

const SIDES: { id: BarSide; label: string }[] = [{ id: 'top', label: 'Trên' }, { id: 'bottom', label: 'Dưới' }, { id: 'left', label: 'Trái' }, { id: 'right', label: 'Phải' }];

type Border = 'off' | 'thin' | 'medium';
const BORDERS: { id: Border; label: string }[] = [{ id: 'off', label: 'Tắt' }, { id: 'thin', label: 'Mảnh' }, { id: 'medium', label: 'Vừa' }];

export default function OverlaySettings({ overlay, onChange }: { overlay: Partial<store.OverlaySettings>; onChange: (patch: Partial<store.OverlaySettings>) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-col">Vị trí thanh công cụ<span className="text-xs text-muted">Thanh nút ở màn hình Chọn vùng / Xem trước. Trái / Phải xếp dọc; màn hình nhỏ thì tự ẩn nhãn cho gọn.</span></span>
      <Segmented value={toBarSide(overlay.toolbar)} options={SIDES} onChange={(toolbar) => onChange({ toolbar })} label="Cạnh đặt thanh công cụ" />
      <span className="text-xs text-muted">Cạnh dưới có thể bị Dock / thanh tác vụ che – nên dùng Trên hoặc hai bên nếu bị khuất. Áp dụng ở lần mở overlay kế tiếp.</span>
      <span className="mt-3 flex flex-col">Viền khi đang chạy<span className="text-xs text-muted">Viền quanh mép màn hình lúc app điều khiển máy: xanh nhấp nháy = đang thao tác (đừng chạm chuột), xanh mờ = đang chờ, vàng = tạm dừng. Không lọt vào ảnh chụp / tìm ảnh.</span></span>
      <Segmented value={(overlay.border || 'thin') as Border} options={BORDERS} onChange={(border) => onChange({ border })} label="Viền khi đang chạy" />
    </div>
  );
}
