// Cài đặt → Chọn vùng (bước 49): thanh công cụ của overlay (chọn vùng / xem trước) đặt ở cạnh nào. Chỉ hiển thị.
import Segmented from '../Segmented';
import { BarSide, toBarSide } from '../../overlay/toolbarLayout';

const SIDES: { id: BarSide; label: string }[] = [{ id: 'top', label: 'Trên' }, { id: 'bottom', label: 'Dưới' }, { id: 'left', label: 'Trái' }, { id: 'right', label: 'Phải' }];

export default function OverlaySettings({ toolbar, onChange }: { toolbar?: string; onChange: (side: BarSide) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-col">Vị trí thanh công cụ<span className="text-xs text-muted">Thanh nút ở màn hình Chọn vùng / Xem trước. Trái / Phải xếp dọc; màn hình nhỏ thì tự ẩn nhãn cho gọn.</span></span>
      <Segmented value={toBarSide(toolbar)} options={SIDES} onChange={onChange} label="Cạnh đặt thanh công cụ" />
      <span className="text-xs text-muted">Cạnh dưới có thể bị Dock / thanh tác vụ che – nên dùng Trên hoặc hai bên nếu bị khuất. Áp dụng ở lần mở overlay kế tiếp.</span>
    </div>
  );
}
