// Dòng Hẹn giờ trong Cài đặt chạy (bước 22) – nối scheduleStore: hẹn giờ của file đang mở, hộp thoại đặt / sửa / bỏ.
// Kịch bản chưa lưu thành file thì không hẹn được (hẹn giờ khoá theo đường dẫn file).
import { useState } from 'react';
import { WindowMinimise } from '../../wailsjs/runtime/runtime';
import { GetInputMemory } from '../../wailsjs/go/app/App';
import { useEditor } from '../store';
import { errorText } from '../engineStore';
import { removeSchedule, saveSchedule, scheduleOf, useSchedules } from '../scheduleStore';
import ScheduleDialog, { Schedule, ScheduleRow } from './ScheduleDialog';

export default function ScheduleSetting() {
  const { path } = useEditor();
  const value = scheduleOf(useSchedules(), path);
  const [open, setOpen] = useState(false);
  const [presets, setPresets] = useState<string[]>([]);
  const [error, setError] = useState('');

  const edit = async () => {
    if (!path) return;
    const mem = await GetInputMemory(path).catch(() => null);
    setPresets(mem?.presets?.map((p) => p.name) ?? []);
    setError('');
    setOpen(true);
  };
  const save = async (s: Schedule) => {
    try {
      await saveSchedule(path!, s);
      setOpen(false);
      if (s.minimize) WindowMinimise();
    } catch (e) {
      setError(errorText(e));
    }
  };
  const remove = async () => {
    await removeSchedule(path!).catch((e) => setError(errorText(e)));
    setOpen(false);
  };

  return (
    <>
      <ScheduleRow value={value} onEdit={edit} disabledHint={path ? undefined : 'Lưu kịch bản thành file trước rồi mới hẹn giờ'} />
      {open && <ScheduleDialog value={value} presets={presets} onSave={save} onRemove={remove} onClose={() => setOpen(false)} error={error} />}
    </>
  );
}
