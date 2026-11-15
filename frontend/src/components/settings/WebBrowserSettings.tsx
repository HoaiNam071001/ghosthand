// Cài đặt → Trình duyệt (bước 62): node web chạy trên Chrome của app hay Wisp + trạng thái Wisp. Chỉ hiển thị.
import { store, wisp } from '../../../wailsjs/go/models';
import Segmented from '../Segmented';

type Choice = '' | 'chrome' | 'wisp';
const CHOICES: { id: Choice; label: string }[] = [{ id: '', label: 'Tự động' }, { id: 'chrome', label: 'Chrome của app' }, { id: 'wisp', label: 'Wisp' }];

const HINT: Record<Choice, string> = {
  '': 'Wisp đang mở và bật Cổng Ghosthand thì dùng Wisp, không thì Chrome của app.',
  chrome: 'Chrome / Edge / Brave trên máy, profile riêng của Ghosthand – bấm bằng chuột thật (trừ node bật Chạy nền).',
  wisp: 'Luôn dùng Wisp; Wisp chưa mở thì tự mở rồi chờ. Mọi thao tác đi qua cổng của Wisp – không chiếm chuột, không cần đưa cửa sổ lên.',
};

export default function WebBrowserSettings({ web, status, onChange, onRefresh }: {
  web: Partial<store.WebSettings>; status: wisp.State | null; onChange: (patch: Partial<store.WebSettings>) => void; onRefresh: () => void;
}) {
  const choice = (web.browser || '') as Choice;
  return (
    <div className="flex flex-col gap-2">
      <span className="flex flex-col">Trình duyệt cho node web<span className="text-xs text-muted">Node Mở URL (Chrome của app), Chờ / Bấm / Gõ / Đọc / Cuộn phần tử web, Bấm phím web. Kịch bản không phải sửa khi đổi.</span></span>
      <Segmented value={choice} options={CHOICES} onChange={(browser) => onChange({ browser })} label="Trình duyệt cho node web" />
      <span className="text-xs text-muted">{HINT[choice]}</span>
      <div className="mt-3 flex items-center justify-between gap-3 rounded-control border border-line bg-field px-3 py-2">
        <span className="flex flex-col">
          <span>Wisp{status?.version ? ` ${status.version}` : ''}</span>
          <span className={`text-xs ${status?.ready ? 'text-ok' : 'text-muted'}`}>
            {!status ? 'Đang kiểm tra…' : status.ready ? 'Sẵn sàng – đang mở, Cổng Ghosthand bật' : status.problem}
          </span>
        </span>
        <button onClick={onRefresh} className="rounded-control border border-line px-2.5 py-1 hover:bg-hover">Kiểm tra lại</button>
      </div>
    </div>
  );
}
