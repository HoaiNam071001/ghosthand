// Màn soạn kịch bản (design v3, artboard Main): thanh tiêu đề, thanh công cụ, thư viện | canvas flow | inspector, status bar
import { useEffect, useState } from 'react';
import { StatusBar, Toolbar } from '../components/AppChrome';
import { RUN_ICON, RunMenuItem } from '../components/RunMenu';
import { MousePos, StopScript } from '../../wailsjs/go/main/App';
import { inWails, openOverlay } from '../windowMode';
import { useEditor } from '../store';
import { closeRunForm, deletePreset, loadMemory, savePreset, startRun, submitRun, useRunForm } from '../runForm';
import { inputViews, runSections } from '../scriptInputs';
import RunDialog from '../components/inputs/RunDialog';
import { newScript, openScript, save, useFile } from '../scriptFile';
import SaveChangesDialog from '../components/SaveChangesDialog';
import DangerConfirmDialog from '../components/DangerConfirmDialog';
import PermConfirmDialog from '../components/PermConfirmDialog';
import { watchPerms } from '../store/permStore';
import AIRunDialog from '../components/AIRunDialog';
import TitleBar from '../components/TitleBar';
import Library from '../components/Library';
import FlowEditor from '../components/flow/FlowEditor';
import StepForm from '../components/StepForm';
import RunSettings, { loopSummary } from '../components/RunSettings';
import { STOP_REASON, useEngine } from '../engineStore';
import { useRunLog } from '../runStore';
import { Point } from '../types';

const MOUSE_POLL_MS = 250;
const isMac = navigator.platform.startsWith('Mac');
const modKey = isMac ? '⌘' : 'Ctrl+';
const clock = (ms: number) => new Date(ms).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export default function MainScreen() {
  const { script, selected, notice, dirty, path, countdown: editorCountdown } = useEditor();
  const { draftAt, error: fileError } = useFile();
  const { steps } = script;
  const cur = steps.find((s) => s.id === selected); // undefined khi chưa chọn node nào
  const { running, lastError, stopReason, hotkeyError } = useEngine();
  const { summary, live } = useRunLog();
  const endMessage = !running && live && summary?.status === 'success' ? summary.message : undefined;
  const runForm = useRunForm();
  const autoRun = !!script.inputs?.length && !!runForm.memory.autoRun;
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
    // h-screen + từng cột tự cuộn: thanh tiêu đề và status bar luôn nằm trong cửa sổ.
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-ink">
      <TitleBar />

      <Toolbar name={script.name} nameTitle={path ?? 'Chưa lưu thành file'} unsaved={dirty}
        unsavedTitle={`Có thay đổi chưa lưu xuống file (${modKey}S) – bản nháp vẫn tự lưu trên máy`}
        loop={loopSummary(script)} loopPanel={<RunSettings />}
        running={running} onRun={(e) => (running ? StopScript() : startRun(e.shiftKey))}
        runDisabled={!inWails}
        runTitle={!inWails ? 'Chỉ chạy được trong app'
          : autoRun ? 'Chạy luôn với giá trị lần trước – Shift + bấm để sửa input' : undefined}
        runItems={runItems(cur?.ref, !inWails || running, !!script.inputs?.length, cur && ((only) => startRun(false, { from: cur.id, only })))}
        onPreview={() => openOverlay('preview')} />

      <div className="flex min-h-0 flex-1 border-t border-line">
        <Library />
        <FlowEditor />
        {/* chưa chọn node thì ẩn inspector – canvas lấy hết chiều ngang */}
        {cur && <StepForm key={cur.id} step={cur} />}
      </div>

      <StatusBar running={running} mouse={mouse ? `X ${mouse.x} Y ${mouse.y}` : 'X — Y —'}>
        {hotkeyError && <span className="text-danger-text">{hotkeyError}</span>}
        {lastError && <span className="text-danger-text">Lỗi lần chạy trước: {lastError}</span>}
        {endMessage && <span className="text-ok" title="Lời nhắn của node Kết thúc">Xong: {endMessage}</span>}
        {stopReason && <span>{STOP_REASON[stopReason] ?? stopReason}</span>}
        {fileError && <span className="text-danger-text">{fileError}</span>}
        {notice && <span className="text-accent-text">{notice}</span>}
        {draftAt && dirty && <span title="Bản nháp lưu trên máy – mở lại app vẫn còn">Bản nháp tự lưu lúc <span className="font-mono">{clock(draftAt)}</span></span>}
      </StatusBar>
      <SaveChangesDialog />
      <DangerConfirmDialog />
      <PermConfirmDialog />
      <AIRunDialog />
      {runForm.open && (
        <RunDialog scriptName={script.name} inputs={inputViews(script)} sections={runSections(script)}
          presets={runForm.memory.presets ?? []} initialValues={runForm.memory.last} initialPreset={runForm.memory.lastPreset} initialRemember={!!runForm.memory.autoRun}
          countdown={editorCountdown} error={runForm.error} onClose={closeRunForm} onRun={submitRun}
          onSavePreset={savePreset} onDeletePreset={deletePreset} />
      )}
    </div>
  );
}

// Menu ▾ cạnh nút Chạy. off: không chạy được lúc này (trình duyệt / đang chạy); onFrom: có node đang chọn (only: chỉ riêng node đó).
function runItems(ref: string | undefined, off: boolean, hasInputs: boolean, onFrom?: (only: boolean) => void): RunMenuItem[] {
  return [
    { label: ref ? `Chạy từ ${ref}` : 'Chạy từ node đang chọn', icon: RUN_ICON.from, disabled: off || !onFrom, onClick: () => onFrom?.(false),
      title: ref ? `Chạy một vòng bắt đầu từ ${ref} – các node trước đó không chạy` : 'Chọn một node để chạy từ đó' },
    { label: ref ? `Chạy riêng ${ref}` : 'Chạy riêng node đang chọn', icon: RUN_ICON.only, disabled: off || !onFrom, onClick: () => onFrom?.(true),
      title: ref ? `Chạy đúng ${ref} một lần rồi dừng – biến của node trước trống` : 'Chọn một node để chạy riêng' },
    { label: 'Chạy từng node', icon: RUN_ICON.step, hotkey: 'F10', disabled: off, onClick: () => startRun(false, { step: true }),
      title: 'Dừng trước mỗi node, bấm Tiếp / F10 để chạy node kế' },
    { label: 'Xem trước trên màn hình', icon: RUN_ICON.preview, onClick: () => openOverlay('preview'),
      title: 'Xem đường đi các node bằng con trỏ giả, không click thật' },
    { label: 'Ghi thao tác', icon: RUN_ICON.record, hotkey: 'F9', danger: true, disabled: true, title: 'Ghi macro – sắp có (bước 24)' },
    { label: 'Sửa input trước khi chạy', minor: true, disabled: off || !hasInputs, onClick: () => startRun(true),
      title: hasInputs ? 'Mở form input rồi mới chạy – cũng mở được bằng Shift + bấm Chạy' : 'Kịch bản chưa có input' },
  ];
}
