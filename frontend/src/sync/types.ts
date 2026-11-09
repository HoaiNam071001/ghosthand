// Kiểu dữ liệu đồng bộ cloud (bước 54 C8) – khớp app.SyncStatus / app.SyncConflictAsk bên Go. Thuần: không Wails, test import được.
export type SyncSummary = { pushed: number; pulled: number; deleted: number; kept?: string[]; pulls?: string[] };
export type SyncStatus = {
  hasClient: boolean;
  loggedIn: boolean;
  running: boolean;
  lastAt?: string;
  lastError?: string;
  summary: SyncSummary;
  conflicts?: string[];
  missing?: string[];
  held?: string[];
  hasPassphrase: boolean;
  device: string;
  backend?: string; // "" | gdrive | mcp
};
export type SyncConflict = {
  id: string;
  path: string;
  name: string;
  kind: 'script' | 'settings' | 'secrets';
  device: string;
  backend?: string; // "" | gdrive | mcp
  remoteTime: string;
  localTime: string;
  localDeleted: boolean;
  remoteDeleted: boolean;
  canKeepBoth: boolean;
};
export type SyncAnswer = 'local' | 'remote' | 'both' | 'skip';

export const EMPTY_STATUS: SyncStatus = { hasClient: false, loggedIn: false, running: false, summary: { pushed: 0, pulled: 0, deleted: 0 }, hasPassphrase: false, device: '' };

// Nơi đồng bộ (54 C9): Google Drive hoặc MCP server do người dùng khai – ánh xạ Get / Put / Delete sang tool của server.
export type SyncBackend = 'gdrive' | 'mcp';
export type McpMap = { server: string; root: string; readTool: string; writeTool: string; deleteTool: string; mkdirTool: string; pathArg: string; contentArg: string };
export const EMPTY_MCP_MAP: McpMap = { server: '', root: '', readTool: '', writeTool: '', deleteTool: '', mkdirTool: '', pathArg: 'path', contentArg: 'content' };
export type McpPreset = { id: string; name: string; desc: string; mapping: McpMap };
export type McpServerOpt = { id: string; name: string; enabled: boolean };
