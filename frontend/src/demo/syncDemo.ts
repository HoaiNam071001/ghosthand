// Dữ liệu giả cho màn #demo-sync (bước 54 C8) – không cần Go.
import type { SyncCfg } from '../components/sync/SyncPanel';
import { EMPTY_MCP_MAP } from '../sync/types';
import type { SyncConflict, SyncStatus } from '../sync/types';

const now = new Date();
const ago = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();

const BASE: SyncStatus = { hasClient: true, loggedIn: true, running: false, summary: { pushed: 2, pulled: 1, deleted: 0 }, lastAt: ago(3), hasPassphrase: false, device: 'MACBOOK-CUA-BAN' };

/** ?state= out | noclient | ok | busy | error | conflict | warn */
export function demoStatus(state: string): SyncStatus {
  switch (state) {
    case 'noclient': return { ...BASE, hasClient: false, loggedIn: false };
    case 'out': return { ...BASE, loggedIn: false, lastAt: undefined };
    case 'busy': return { ...BASE, running: true };
    case 'error': return { ...BASE, lastError: 'không tải được scripts/dang-nhap.json: mất kết nối mạng' };
    case 'conflict': return { ...BASE, conflicts: ['dang-nhap', 'Cài đặt'] };
    case 'warn': return { ...BASE, missing: ['bao-cao: D:\du-lieu\khach.csv'], held: ['scripts/bao-cao.json'] };
    default: return { ...BASE, hasPassphrase: state === 'secrets' };
  }
}

export const DEMO_CFG: SyncCfg = { scripts: true, settings: true, secrets: false, onOpen: true, onSave: false, intervalMin: 15, device: '' };

export const DEMO_CONFLICT: SyncConflict = {
  id: '1', path: 'scripts/dang-nhap.json', name: 'dang-nhap', kind: 'script', device: 'PC-VAN-PHONG',
  remoteTime: ago(25), localTime: ago(8), localDeleted: false, remoteDeleted: false, canKeepBoth: true,
};

// Nơi đồng bộ MCP (54 C9): ?backend=mcp
export const DEMO_SERVERS = [{ id: 'fs', name: 'Filesystem', enabled: true }, { id: 'gh', name: 'GitHub', enabled: false }];
export const DEMO_PRESETS = [{
  id: 'filesystem', name: 'Filesystem (thư mục trên máy / ổ đồng bộ)',
  desc: 'Server Filesystem chính thức. Trỏ Thư mục gốc vào thư mục Google Drive / OneDrive / Dropbox đã cài trên máy. Server này không có tool xoá: file đã xoá còn nằm lại nhưng Ghosthand không dùng.',
  mapping: { ...EMPTY_MCP_MAP, readTool: 'read_text_file', writeTool: 'write_file', mkdirTool: 'create_directory' },
}];
