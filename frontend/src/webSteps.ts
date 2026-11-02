// Node web (bước 25d D3) – phía giao diện: trạng thái Chrome của app, Thử tìm (khung trên overlay như ảnh mẫu),
// Chọn phần tử trên trang. Tìm / sinh selector ở Go (webapi.go, internal/web).
import { useSyncExternalStore } from 'react';
import { BrowserStatus, CancelPick, FindElement, FinishWebLogin, OpenAppBrowser, PickElement, StartWebLogin } from '../wailsjs/go/app/App';
import { model } from '../wailsjs/go/models';
import { getEditor, setNotice, updateStep } from './store';
import { errorText } from './engineStore';
import { showFind } from './imageSteps';
import { inWails } from './windowMode';
import { BrowserState, loginUrl, WebFind, webFindText } from './flow/web';

type WebState = {
  status: BrowserState | null; // null = chưa hỏi
  finds: Record<string, WebFind>; // kết quả Thử tìm theo id node
  busy: string; // id node đang thử tìm
  picking: string; // id node đang chờ chọn phần tử trên trang
  error: string;
  login: '' | 'opening' | 'closing'; // Đăng nhập / Xong đang chạy (đóng / mở lại Chrome mất vài giây)
};
let state: WebState = { status: null, finds: {}, busy: '', picking: '', error: '', login: '' };
const listeners = new Set<() => void>();
const set = (p: Partial<WebState>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};
export const useWebState = () => useSyncExternalStore((l) => {
  listeners.add(l);
  return () => listeners.delete(l);
}, () => state);

export async function refreshBrowser() {
  if (inWails) set({ status: await BrowserStatus().catch(() => ({ open: false, tabs: [] })) });
}

export async function openAppBrowser() {
  if (!inWails) return;
  set({ error: '' });
  try {
    await OpenAppBrowser('');
  } catch (e) {
    set({ error: errorText(e) });
  }
  await refreshBrowser();
}

// Đăng nhập tài khoản web (bước 36): mở lại Chrome của app không cổng điều khiển ở trang đang dùng; Xong → mở lại
// chế độ điều khiển ở trang đó.
let loginAt = '';

export async function startWebLogin() {
  if (!inWails) return;
  loginAt = loginUrl(state.status);
  await loginStep('opening', () => StartWebLogin(loginAt));
}

export async function finishWebLogin() {
  if (inWails) await loginStep('closing', () => FinishWebLogin(loginAt));
}

async function loginStep(phase: WebState['login'], call: () => Promise<void>) {
  set({ login: phase, error: '' });
  try {
    await call();
  } catch (e) {
    set({ error: errorText(e) });
  }
  set({ login: '' });
  await refreshBrowser();
}

const stepOf = (id: string) => getEditor().script.steps.find((s) => s.id === id);

export async function testWebFind(stepId: string) {
  if (!inWails) return;
  set({ busy: stepId, error: '' });
  try {
    const r = (await FindElement(model.Script.createFrom(getEditor().script), stepId)) as WebFind;
    set({ finds: { ...state.finds, [stepId]: r }, busy: '' });
    const label = r.found ? (r.covered ? 'thấy · bị che' : 'thấy') + ` · ${r.selector}` : undefined;
    showFind(stepId, r.found ? { found: webFindText(r).ok, score: 100, x: r.x, y: r.y, w: r.w, h: r.h, area: { x: r.x, y: r.y, w: r.w, h: r.h }, ms: r.ms, label } : null);
  } catch (e) {
    set({ busy: '', error: errorText(e) });
  }
  void refreshBrowser();
}

// Chọn phần tử: chờ người dùng bấm trong Chrome của app (Go đưa tab lên trước) → thay ô cách tìm bằng selector đã kiểm.
export async function pickElement(stepId: string) {
  if (!inWails) return;
  const tab = stepOf(stepId)?.tab ?? '';
  set({ picking: stepId, error: '' });
  try {
    const p = await PickElement(tab.includes('{{') ? '' : tab);
    if (stepOf(stepId)) {
      updateStep(stepId, { selectors: p.selectors });
      setNotice(`Đã chọn ${p.text ? `“${p.text.slice(0, 40)}”` : 'phần tử'} – ${p.selectors.length} cách tìm`);
    }
    const { [stepId]: _, ...finds } = state.finds;
    set({ picking: '', finds });
    showFind(stepId, null);
  } catch (e) {
    const msg = errorText(e);
    set({ picking: '', error: /context canceled|đã huỷ/.test(msg) ? '' : msg });
  }
  void refreshBrowser();
}

export function cancelPick() {
  if (inWails) void CancelPick();
}
