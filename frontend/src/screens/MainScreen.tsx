// Màn soạn kịch bản (bước 63, layout ribbon kiểu Word): thanh tiêu đề (truy cập nhanh + tên kịch bản) → ribbon theo tab → canvas flow
// với inspector nổi / ghim → status bar (thanh zoom). Thư viện, mẫu thử, lịch sử, cài đặt nằm ở trang Tệp (components/backstage).
import { useEffect, useState } from 'react';
import { StatusBar } from '../components/AppChrome';
import { MousePos } from '../../wailsjs/go/app/App';
import { inWails } from '../windowMode';
import { redo, selectStep, undo, useEditor } from '../store';
import { useFlowPrefs } from '../flowPrefs';
import { closeRunForm, deletePreset, loadMemory, savePreset, submitRun, useRunForm } from '../runForm';
import { inputViews, runSections } from '../scriptInputs';
import RunDialog from '../components/inputs/RunDialog';
import { newScript, openScript, save, useFile } from '../scriptFile';
import SaveChangesDialog from '../components/SaveChangesDialog';
import DangerConfirmDialog from '../components/DangerConfirmDialog';
import PermConfirmDialog from '../components/PermConfirmDialog';
import { watchPerms } from '../store/permStore';
import AIRunDialog from '../components/AIRunDialog';
import UserAskDialog from '../components/ask/UserAskDialog';
import MCPAskDialog from '../components/MCPAskDialog';
import { SyncChipHost, SyncConflictHost, useSyncPulled } from '../components/sync/SyncHosts';
import TitleBar from '../components/TitleBar';
import RibbonHost from '../components/ribbon/RibbonHost';
import Backstage from '../components/backstage/Backstage';
import EdgeResize from '../components/shell/EdgeResize';
import ZoomBar from '../components/shell/ZoomBar';
import FlowEditor from '../components/flow/FlowEditor';
import StepForm from '../components/StepForm';
import { requestZoom, sendCanvas, useCanvasZoom } from '../canvasBus';
import { getShell, openSettingsDialog, setRunsDialog, useShell } from '../shellStore';
import SettingsDialog from '../components/settings/SettingsDialog';
import RunsDialog from '../components/library/RunsDialog';
import { STOP_REASON, useEngine } from '../engineStore';
import { useRunLog } from '../runStore';
import { Point } from '../types';

const MOUSE_POLL_MS = 250;
const isMac = navigator.platform.startsWith('Mac');
const modKey = isMac ? '⌘' : 'Ctrl+';
const clock = (ms: number) => new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function MainScreen() {
  useSyncPulled();
  const { script, selected, notice, dirty, path, countdown: editorCountdown, past, future } = useEditor();
  const { draftAt, error: fileError } = useFile();
  const { steps } = script;
  const cur = steps.find((s) => s.id === selected); // undefined khi chưa chọn node nào
  const { detail } = useFlowPrefs(); // chi tiết node: Panel (nổi / ghim) / Modal / Popover (FlowEditor vẽ dưới node)
  const { running, lastError, stopReason, hotkeyError } = useEngine();
  const { summary, live } = useRunLog();
  const zoom = useCanvasZoom();
  const { runsDialog } = useShell();
  const endMessage = !running && live && summary?.status === 'success' ? summary.message : undefined;
  const runForm = useRunForm();
  useEffect(() => {
    loadMemory();
  }, [path, script.name]);

  useEffect(watchPerms, []);

  // Toạ độ chuột thật ở status bar – để đọc nhanh toạ độ khi nhập tay.
  const [mouse, setMouse] = useState<Point | null>(null);
  useEffect(() => {
    if (!inWails) return;
    const id = setInterval(() => MousePos().then(setMouse), MOUSE_POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Cmd/Ctrl + S lưu, + Shift + S lưu thành, + O mở, + N kịch bản mới (cả khi đang gõ trong ô nhập).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(isMac ? e.metaKey : e.ctrlKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 's') save(e.shiftKey);
      else if (k === 'o' && !e.shiftKey) openScript();
      else if (k === 'n' && !e.shiftKey) newScript();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    // h-screen + từng vùng tự cuộn: thanh tiêu đề và status bar luôn nằm trong cửa sổ.
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-ink">
      <TitleBar name={script.name} nameTitle={path ?? 'Chưa lưu thành file'} unsaved={dirty} modKey={modKey}
        unsavedTitle={`Có thay đổi chưa lưu xuống file (${modKey}S) – bản nháp vẫn tự lưu trên máy`}
        canUndo={past.length > 0} canRedo={future.length > 0} onSave={() => save()} onUndo={undo} onRedo={redo} onSettings={openSettingsDialog} />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <RibbonHost />
        {/* relative: inspector nổi (position absolute) nằm trong khung canvas */}
        <div className="relative flex min-h-0 flex-1">
          <FlowEditor />
          {/* chưa chọn node thì ẩn inspector – canvas lấy hết chỗ; Esc / ✕ cũng ẩn */}
          {cur && detail === 'panel' && <StepForm key={cur.id} step={cur} onClose={() => !getShell().backstage && selectStep('')} />}
          {cur && detail === 'modal' && <StepForm key={cur.id} step={cur} mode="modal" onClose={() => selectStep('')} />}
        </div>
        <Backstage />
      </div>

      <StatusBar running={running} mouse={mouse ? `X ${mouse.x} Y ${mouse.y}` : 'X — Y —'}
        end={<ZoomBar zoom={zoom} onZoom={requestZoom} onIn={() => sendCanvas('zoomIn')} onOut={() => sendCanvas('zoomOut')} onFit={() => sendCanvas('fit')} onReset={() => sendCanvas('zoom100')} />}>
        <span>{steps.length} node</span>
        {hotkeyError && <span className="text-danger-text">{hotkeyError}</span>}
        {lastError && <span className="text-danger-text">Lỗi lần chạy trước: {lastError}</span>}
        {endMessage && <span className="text-ok" title="Lời nhắn của node Kết thúc">Xong: {endMessage}</span>}
        {stopReason && <span>{STOP_REASON[stopReason] ?? stopReason}</span>}
        {fileError && <span className="text-danger-text">{fileError}</span>}
        {notice && <span className="text-accent-text">{notice}</span>}
        <SyncChipHost />
        {draftAt && dirty && <span title="Bản nháp lưu trên máy – mở lại app vẫn còn">Bản nháp tự lưu lúc <span className="font-mono">{clock(draftAt)}</span></span>}
      </StatusBar>
      <SaveChangesDialog />
      <DangerConfirmDialog />
      <PermConfirmDialog />
      <AIRunDialog />
      <UserAskDialog />
      <MCPAskDialog />
      <SyncConflictHost />
      {runForm.open && (
        <RunDialog scriptName={script.name} inputs={inputViews(script)} sections={runSections(script)}
          presets={runForm.memory.presets ?? []} initialValues={runForm.memory.last} initialPreset={runForm.memory.lastPreset} initialRemember={!!runForm.memory.autoRun}
          countdown={editorCountdown} error={runForm.error} onClose={closeRunForm} onRun={submitRun}
          onSavePreset={savePreset} onDeletePreset={deletePreset} />
      )}
      <SettingsDialog />
      {runsDialog && <RunsDialog onClose={() => setRunsDialog(false)} />}
      <EdgeResize />
    </div>
  );
}
