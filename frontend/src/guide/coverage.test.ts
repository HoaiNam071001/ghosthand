import { describe, expect, it } from 'vitest';
import { NODE_INFO } from '../flow/nodeInfo';
import { CHAPTERS, NODE_GUIDES } from './content';
import type { SettingsTab } from '../settingsNav';

// Khai báo đủ khoá bằng Record để thêm tab mới mà quên là tsc báo.
const SETTINGS_TABS: Record<SettingsTab, true> = { storage: true, overlay: true, secrets: true, perms: true, api: true, mcp: true, servers: true, about: true };

describe('Hướng dẫn phủ đủ', () => {
  it('mọi InfoKey có trang trong nodes.json', () => {
    const missing = Object.keys(NODE_INFO).filter((k) => !NODE_GUIDES[k as keyof typeof NODE_INFO]);
    expect(missing).toEqual([]);
  });
  it('mọi tab Cài đặt có chương settings-<tab>', () => {
    const ids = new Set(CHAPTERS.map((c) => c.id));
    const missing = Object.keys(SETTINGS_TABS).filter((t) => !ids.has(`settings-${t}`));
    expect(missing).toEqual([]);
  });
});
