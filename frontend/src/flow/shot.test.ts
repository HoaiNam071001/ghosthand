import { describe, expect, it } from 'vitest';
import { fmtOcrRead, fmtShot, hasFoundBox } from './shot';
import { makeStep } from '../types';

const shot = (p: Parameters<typeof makeStep>[0] extends infer T ? Partial<T> : never) => makeStep({ id: 's9', type: 'screenshot', ...p });

describe('shot', () => {
  it('hasFoundBox – khớp HasFoundBox (flowcheck.go)', () => {
    expect(hasFoundBox({ type: 'waitImage' })).toBe(true);
    expect(hasFoundBox({ type: 'clickImage', imageSource: 'search' })).toBe(true);
    expect(hasFoundBox({ type: 'clickImage', imageSource: 'node' })).toBe(false);
    expect(hasFoundBox({ type: 'webWait' })).toBe(true);
    expect(hasFoundBox({ type: 'webWait', webGone: true })).toBe(false);
    expect(hasFoundBox({ type: 'webClick', webBackground: true })).toBe(false);
    expect(hasFoundBox({ type: 'webRead' })).toBe(false);
    expect(hasFoundBox({ type: 'click' })).toBe(false);
  });
  it('fmtShot', () => {
    const ref = (id: string) => (id === 's1' ? 'n1' : '?');
    expect(fmtShot(shot({}), ref)).toBe('vùng kịch bản → tên theo giờ');
    expect(fmtShot(shot({ shotArea: 'screen', display: 2, fileName: 'a.PNG', toClipboard: true }), ref)).toBe('màn 2 → a.png · chép clipboard');
    expect(fmtShot(shot({ shotArea: 'node', imageFrom: 's1', fileName: 'don-{{ma}}' }), ref)).toBe('chỗ n1 thấy → don-{{ma}}.png');
    expect(fmtShot(shot({ shotArea: 'rect', shotRect: { x: 10, y: 20, w: 300, h: 200 } }), ref)).toBe('vùng 300 × 200 tại 10, 20 → tên theo giờ');
    expect(fmtShot(shot({ shotArea: 'rect' }), ref)).toBe('chưa chọn vùng → tên theo giờ');
  });
  it('fmtOcrRead', () => {
    const ref = (id: string) => (id === 's1' ? 'n1' : '?');
    expect(fmtOcrRead(makeStep({ id: 's9', type: 'ocrRead', shotArea: 'node', imageFrom: 's1', timeoutMs: 5000 }), ref)).toBe('chỗ n1 thấy · tối đa 5 s');
  });
});
