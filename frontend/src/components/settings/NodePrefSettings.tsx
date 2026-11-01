// Ưu tiên node khi AI soạn (bước 44): ảnh / chữ (mặc định) hay trình duyệt app (thử trang trước, không captcha thì dùng
// node web). AI cũng đổi được qua MCP (set_node_preference). Chỉ hiển thị; McpSettings lưu.
import { store } from '../../../wailsjs/go/models';
import { NODE_PREFS, NodePref, nodePref } from '../../aiLevel';
import Segmented from '../Segmented';

const HINT: Record<NodePref, string> = {
  vision: 'AI tìm chữ / ảnh trên màn hình – chạy với mọi trang, kể cả trang đã đăng nhập trên trình duyệt thường',
  web: 'Trang web: AI mở thử trên Chrome của app trước, không có captcha thì dùng node web (chính xác nhất) – trang cần đăng nhập: bấm Đăng nhập ở node web trước',
};

export default function NodePrefSettings({ mcp, onChange }: { mcp: store.MCPSettings; onChange: (patch: Partial<store.MCPSettings>) => void }) {
  const pref = nodePref(mcp);
  return (
    <div className="flex flex-col gap-1.5">
      <span>AI ưu tiên node</span>
      <Segmented value={pref} options={NODE_PREFS} onChange={(p) => onChange({ nodePref: p })} label="Ưu tiên node của AI" full />
      <span className="text-xs text-muted">{HINT[pref]}</span>
    </div>
  );
}
