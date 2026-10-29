// Mục "Của tôi" của bảng thêm node (bước 55 M5): mỗi node của tôi = một node Gọi tool MCP điền sẵn server / tool / đối số + tên.
import { useCallback, useEffect, useState } from 'react';
import { ListCustomNodes } from '../../../wailsjs/go/main/App';
import { store } from '../../../wailsjs/go/models';
import type { PaletteGroup } from '../PaletteView';
import { addStep } from '../../store';
import CustomNodeEdit from './CustomNodeEdit';
import { customIcon } from './customIcons';

export function useCustomNodes() {
  const [list, setList] = useState<store.CustomNode[]>([]);
  const reload = useCallback(() => ListCustomNodes().then((l) => setList(l ?? [])).catch(() => setList([])), []);
  useEffect(() => { reload(); }, [reload]);
  return { list, reload };
}

// Node thả vào canvas chỉ là mcpTool + name – mở ở máy khác không cần mẫu này.
export function customGroup(list: store.CustomNode[], reload: () => void): PaletteGroup | null {
  if (list.length === 0) return null;
  return {
    cat: 'data', title: 'Của tôi', items: list.map((n) => ({
      icon: customIcon(n.icon), label: n.name, keywords: `cua toi custom mcp ${n.server} ${n.tool}`,
      info: { desc: `Gọi tool MCP “${n.tool}” của server ${n.server} với đối số đã điền sẵn.`, use: 'Node bạn đã lưu từ một node Gọi tool MCP.' },
      run: () => addStep('mcpTool', { name: n.name, mcpServer: n.server, mcpTool: n.tool, mcpArgs: n.args || undefined }),
      extra: <CustomNodeEdit node={n} onChanged={reload} />,
    })),
  };
}
