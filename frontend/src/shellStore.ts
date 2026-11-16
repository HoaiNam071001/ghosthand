// Trạng thái khung cửa sổ chính (bước 63): tab ribbon + thu gọn, trang Tệp (backstage) đang mở, inspector ghim cạnh phải, minimap.
// Không thuộc kịch bản – không vào hoàn tác / file. Phần nhỏ (tab, thu gọn, ghim, minimap) nhớ trên máy (localStorage).
import { useSyncExternalStore } from 'react';
import type { SettingsTab } from './settingsNav';

export type RibbonTabId = 'home' | 'insert' | 'run' | 'view' | 'tools';
export type BackstagePageId = 'home' | 'samples' | 'runs' | 'embed' | 'settings';

export type ShellState = {
  ribbonTab: RibbonTabId;
  ribbonCollapsed: boolean;
  backstage: BackstagePageId | null; // null = đang ở màn soạn
  settingsTab: SettingsTab;
  settingsFocus: string;
  inspectorPinned: boolean; // true: inspector dính cạnh phải (canvas co lại); false: nổi trên canvas
  minimap: boolean;
};

const KEY = 'shell-prefs';
const TABS: RibbonTabId[] = ['home', 'insert', 'run', 'view', 'tools'];
type Saved = Pick<ShellState, 'ribbonTab' | 'ribbonCollapsed' | 'inspectorPinned' | 'minimap'>;
const DEFAULT: Saved = { ribbonTab: 'home', ribbonCollapsed: false, inspectorPinned: false, minimap: true };

function load(): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Saved>;
    return {
      ribbonTab: TABS.includes(v.ribbonTab as RibbonTabId) ? (v.ribbonTab as RibbonTabId) : DEFAULT.ribbonTab,
      ribbonCollapsed: !!v.ribbonCollapsed,
      inspectorPinned: !!v.inspectorPinned,
      minimap: v.minimap !== false,
    };
  } catch {
    return DEFAULT;
  }
}

let state: ShellState = { ...load(), backstage: null, settingsTab: 'storage', settingsFocus: '' };
const subs = new Set<() => void>();

function set(patch: Partial<ShellState>) {
  state = { ...state, ...patch };
  const { ribbonTab, ribbonCollapsed, inspectorPinned, minimap } = state;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ribbonTab, ribbonCollapsed, inspectorPinned, minimap }));
  } catch { /* máy không cho lưu: vẫn dùng trong phiên này */ }
  subs.forEach((f) => f());
}

export const useShell = () => useSyncExternalStore((f) => (subs.add(f), () => subs.delete(f)), () => state);
export const getShell = () => state;

// Bấm tab: mở lại ribbon nếu đang thu gọn
export const setRibbonTab = (ribbonTab: RibbonTabId) => set({ ribbonTab, ribbonCollapsed: false });
export const toggleRibbon = () => set({ ribbonCollapsed: !state.ribbonCollapsed });
export const openBackstage = (page: BackstagePageId = 'home') => set({ backstage: page });
export const closeBackstage = () => set({ backstage: null });
export const showSettings = (settingsTab: SettingsTab, settingsFocus = '') => set({ backstage: 'settings', settingsTab, settingsFocus });
export const setSettingsTab = (settingsTab: SettingsTab) => set({ settingsTab, settingsFocus: '' });
export const setInspectorPinned = (inspectorPinned: boolean) => set({ inspectorPinned });
export const setMinimap = (minimap: boolean) => set({ minimap });
