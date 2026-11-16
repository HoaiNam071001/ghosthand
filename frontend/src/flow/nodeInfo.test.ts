import { describe, expect, it } from 'vitest';
import { infoKey, NODE_INFO } from './nodeInfo';
import { STEP_LABEL, type StepType } from '../types';

describe('nodeInfo', () => {
  it('mọi loại node đều có mô tả + dùng khi nào', () => {
    for (const t of Object.keys(STEP_LABEL) as StepType[]) {
      expect(NODE_INFO[t]?.desc, t).toBeTruthy();
      expect(NODE_INFO[t]?.use, t).toBeTruthy();
    }
    for (const [k, v] of Object.entries(NODE_INFO)) {
      expect(v.desc.endsWith('.'), k).toBe(true);
      expect(v.desc.length + v.use.length, k).toBeLessThan(200); // vừa khung dưới bảng thêm node
    }
  });
  it('biến thể theo cách tìm / trình duyệt', () => {
    expect(infoKey({ type: 'waitImage', findBy: 'text' })).toBe('waitText');
    expect(infoKey({ type: 'waitImage' })).toBe('waitImage');
    expect(infoKey({ type: 'clickImage', findBy: 'text', imageSource: 'search' })).toBe('clickText');
    expect(infoKey({ type: 'clickImage', findBy: 'text' })).toBe('clickImage'); // ảnh từ node trước
    expect(infoKey({ type: 'waitImage', findBy: 'element' })).toBe('waitElement');
    expect(infoKey({ type: 'clickImage', findBy: 'element', imageSource: 'search' })).toBe('clickElement');
    expect(infoKey({ type: 'open', webBrowser: true })).toBe('openWeb');
    expect(infoKey({ type: 'if' })).toBe('if');
  });
});

describe('nodeInfo.en', () => {
  it('bản tiếng Anh đủ key, có chữ', async () => {
    const { NODE_INFO_EN } = await import('./nodeInfo.en');
    expect(Object.keys(NODE_INFO_EN).sort()).toEqual(Object.keys(NODE_INFO).sort());
    for (const [k, v] of Object.entries(NODE_INFO_EN)) expect(v.desc && v.use, k).toBeTruthy();
  });
});
