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
};
export type SyncConflict = {
  id: string;
  path: string;
  name: string;
  kind: 'script' | 'settings' | 'secrets';
  device: string;
  remoteTime: string;
  localTime: string;
  localDeleted: boolean;
  remoteDeleted: boolean;
  canKeepBoth: boolean;
};
export type SyncAnswer = 'local' | 'remote' | 'both' | 'skip';

export const EMPTY_STATUS: SyncStatus = { hasClient: false, loggedIn: false, running: false, summary: { pushed: 0, pulled: 0, deleted: 0 }, hasPassphrase: false, device: '' };
