// Danh sách MCP server đã cấu hình (kèm tool đã tải) cho inspector node Gọi tool MCP.
import { useCallback, useEffect, useState } from 'react';
import { ListMCPServers } from '../../../wailsjs/go/main/App';
import { main } from '../../../wailsjs/go/models';

export function useMCPServers() {
  const [servers, setServers] = useState<main.MCPServerView[]>([]);
  const reload = useCallback(() => ListMCPServers().then((l) => setServers(l ?? [])).catch(() => setServers([])), []);
  useEffect(() => { reload(); }, [reload]);
  return { servers, reload };
}
