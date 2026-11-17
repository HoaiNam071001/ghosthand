// Nối ribbon với store / Go (bước 63): đọc trạng thái kịch bản, chạy, xem → RibbonCtx cho model.ts. Mọi sửa kịch bản đi qua hàm của store.
import { useMemo } from 'react';
import { tr, useT } from '../../i18n';
import { StopScript } from '../../../wailsjs/go/app/App';
import {
  copySelected, duplicateStep, getEditor, groupPicked, insertAfterSelected, pasteClip, redo, removeSteps, selectNodes, setNotice, setStart, startRecording, toggleStep, undo, useEditor,
} from '../../store';
import { useEngine, errorText } from '../../engineStore';
import { setFlowPrefs, useFlowPrefs } from '../../flowPrefs';
import { startRun } from '../../runForm';
import { exportRunBundle, useRunLog } from '../../runStore';
import { inWails, openOverlay } from '../../windowMode';
import { setTheme, useTheme } from '../../theme';
import { openGuide } from '../../guideNav';
import { sendCanvas } from '../../canvasBus';
import { openBackstage, openSettingsDialog, setInspectorPinned, setRunsDialog, setMinimap, useShell } from '../../shellStore';
import { openSettings } from '../../settingsNav';
import { GROUPS } from '../palette/groups';
import { customGroup, useCustomNodes } from '../palette/customGroup';
import { usePlatform } from '../palette/usePlatform';
import { onlyLabel, unsupportedHere } from '../../flow/platform';
import { summarizeRegion } from '../../overlay/regionSummary';
import { useDisplayList } from './useDisplayList';
import type { RibbonActions, RibbonCtx } from './model';
import type { ReactNode } from 'react';

// Các node đang chọn: nhiều node (Shift + bấm) hoặc node đang mở inspector
const targets = () => {
  const { picked, selected } = getEditor();
  return picked.length ? picked : selected ? [selected] : [];
};

export function useRibbonActions(): RibbonActions {
  const { history } = useRunLog();
  const latestRun = history[0]?.id;
  return useMemo<RibbonActions>(() => ({
    paste: pasteClip,
    copy: copySelected,
    cut: () => { copySelected(); removeSteps(targets()); },
    duplicate: () => { const id = getEditor().selected; if (id) duplicateStep(id); },
    undo, redo,
    remove: () => removeSteps(targets()),
    selectAll: () => selectNodes(getEditor().script.steps.map((s) => s.id)),
    group: groupPicked,
    toggleNode: () => { const id = getEditor().selected; if (id) toggleStep(id); },
    setStart: () => { const id = getEditor().selected; if (id) setStart(id); },
    run: (ask) => void startRun(ask),
    stop: () => void StopScript(),
    runFrom: (only) => { const from = getEditor().selected; if (from) void startRun(false, { from, only }); },
    runStep: () => void startRun(false, { step: true }),
    preview: () => void openOverlay('preview'),
    record: () => void startRecording(),
    history: () => setRunsDialog(true),
    bundle: () => {
      if (!latestRun) return setNotice(tr('rib.noRun'));
      exportRunBundle(latestRun).then((p) => p && setNotice(tr('rib.exported', { p }))).catch((e) => setNotice(errorText(e)));
    },
    card: (card) => {
      setFlowPrefs({ card });
      if (card === 'full') setNotice(tr('rib.tall'));
    },
    detail: (detail) => setFlowPrefs({ detail }),
    pin: setInspectorPinned,
    minimap: setMinimap,
    theme: setTheme,
    zoomIn: () => sendCanvas('zoomIn'), zoomOut: () => sendCanvas('zoomOut'), zoom100: () => sendCanvas('zoom100'), fit: () => sendCanvas('fit'),
    layout: () => sendCanvas('layout'), palette: () => sendCanvas('palette'),
    region: () => void openOverlay('region'),
    pickPoint: () => void openOverlay('point'),
    settings: () => openSettingsDialog(),
    mcp: () => openSettings('mcp'),
    guide: () => openGuide(),
  }), [latestRun]);
}

export function useRibbonCtx(slots: { pageCheck?: ReactNode; loop?: ReactNode }, insertQuery = ""): RibbonCtx {
  const { script, selected, picked, past, future } = useEditor();
  const { running } = useEngine();
  const prefs = useFlowPrefs();
  const shell = useShell();
  const theme = useTheme();
  const act = useRibbonActions();
  const t = useT();
  const displays = useDisplayList();
  const { list, reload } = useCustomNodes();
  const { goos, only } = usePlatform();
  const cur = script.steps.find((s) => s.id === selected);
  const mine = customGroup(list, reload);
  // Bấm nút node = như Ctrl+K rồi chọn: node mới nối sau cổng đầu của node đang chọn (không chọn gì thì đứng riêng)
  const insert = (mine ? [...GROUPS, mine] : GROUPS).map((g) => ({
    ...g, items: g.items.map((it) => (it.run ? { ...it, run: () => { insertAfterSelected(); return it.run?.(); } } : it)),
  }));
  return {
    t, running, offline: !inWails, hasInputs: !!script.inputs?.length, hasSteps: script.steps.length > 0,
    selectedRef: cur?.ref, selectedOn: !!cur?.enabled, picked: picked.length,
    canUndo: past.length > 0, canRedo: future.length > 0,
    card: prefs.card, detail: prefs.detail, pinned: shell.inspectorPinned, minimap: shell.minimap, theme,
    region: summarizeRegion(script.region, displays),
    insert,
    platformWarn: (type) => (unsupportedHere(only, type, goos) ? t('rb.warnPlatform', { label: onlyLabel(only, type) }) : onlyLabel(only, type)),
    slots, insertQuery, act,
  };
}
