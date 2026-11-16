// Hẹn giờ + thông báo (bước 22 – nối Go ở ScheduleSetting / scheduleStore): chạy lúc HH:mm một lần / hằng ngày / các ngày trong tuần, với bộ giá
// trị input đã chọn; thông báo Telegram / Discord / webhook khi xong hoặc lỗi. Mở từ popup "N vòng" (ScheduleRow).
import { tr, useT } from '../i18n';
import Select from './Select';
import { useState } from 'react';
import type { model } from '../../wailsjs/go/models';
import Segmented from './Segmented';
import { Switch } from './Switch';
import { fieldBox } from './NumInput';

// Khớp model.Schedule (internal/model/schedule.go) – Go là nguồn chuẩn.
export type Schedule = model.Schedule;

export const dayLabels = () => [tr('sd.d1'), tr('sd.d2'), tr('sd.d3'), tr('sd.d4'), tr('sd.d5'), tr('sd.d6'), tr('sd.d7')];
export const scheduleSummary = (s: Schedule | null) =>
  !s ? tr('sd.none')
    : `${s.time} · ${s.repeat === 'once' ? tr('sd.once') : s.repeat === 'daily' ? tr('sd.daily') : s.days.map((d) => dayLabels()[d - 1]).join(', ')}`;

// Dòng trong popup cài đặt chạy
export function ScheduleRow({ value, onEdit, disabledHint }: { value: Schedule | null; onEdit?: () => void; disabledHint?: string }) {
  const t = useT();
  return (
    <div className="flex items-center justify-between border-t border-line pt-3">
      <span className="flex flex-col">
        {t('sd.title')}
        <span className="font-mono text-xs text-muted">{scheduleSummary(value)}</span>
      </span>
      <button onClick={onEdit} disabled={!!disabledHint} title={disabledHint}
        className="h-8 rounded-control border border-line px-2.5 text-[13px] enabled:hover:bg-hover disabled:opacity-50">
        {value ? t('sd.edit') : t('sd.set')}
      </button>
    </div>
  );
}

const notifyHint = (n: string) => (n === 'telegram' ? tr('sd.hTelegram') : n === 'discord' ? tr('sd.hDiscord') : n === 'webhook' ? tr('sd.hWebhook') : '');

export default function ScheduleDialog({ value, presets, onSave, onRemove, onClose, error }: {
  value: Schedule | null; presets: string[]; onSave: (s: Schedule) => void; onRemove?: () => void; onClose: () => void;
  error?: string; // lỗi lưu (Go kiểm tra lại giờ, ngày, đích thông báo)
}) {
  const t = useT();
  const [s, setS] = useState<Schedule>(value ?? {
    path: '', time: '08:00', repeat: 'daily', days: [1, 2, 3, 4, 5], preset: presets[0] ?? '', minimize: true,
    notify: 'none', notifyTarget: '', notifyOn: 'both', screenshot: true,
  });
  const set = (p: Partial<Schedule>) => setS({ ...s, ...p });
  const box = `${fieldBox} text-ink outline-none`;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/25 px-4 pt-[8vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={t('sd.title')} className="flex w-[440px] max-w-full flex-col overflow-hidden rounded-panel border border-line bg-surface text-ink shadow-[0_16px_48px_rgb(0_0_0/.22)]">
        <div className="flex flex-col gap-4 p-[18px]">
          <div>
            <div className="text-base font-semibold">{t('sd.title')}</div>
            <div className="text-[13px] text-muted">{t('sd.note')}</div>
          </div>
          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1.5 text-muted">{t('sd.at')}
              <input type="time" value={s.time} onChange={(e) => set({ time: e.target.value })} className={`${box} w-[110px] font-mono`} />
            </label>
            <div className="flex flex-1 flex-col gap-1.5 text-muted">{t('sd.repeat')}
              <Segmented value={s.repeat} onChange={(repeat) => set({ repeat })} full
                options={[{ id: 'once', label: t('sd.onceCap') }, { id: 'daily', label: t('sd.dailyCap') }, { id: 'weekdays', label: t('sd.pickDays') }]} />
            </div>
          </div>
          {s.repeat === 'weekdays' && (
            <div className="flex gap-1">
              {dayLabels().map((d, i) => {
                const on = s.days.includes(i + 1);
                return (
                  <button key={d} aria-pressed={on} onClick={() => set({ days: on ? s.days.filter((x) => x !== i + 1) : [...s.days, i + 1].sort() })}
                    className={`h-8 flex-1 rounded-control border text-[13px] ${on ? 'border-accent bg-accent-soft font-semibold text-accent-text' : 'border-line hover:bg-hover'}`}>{d}</button>
                );
              })}
            </div>
          )}
          {presets.length > 0 && (
            <label className="flex flex-col gap-1.5 text-muted">{t('sd.preset')}
              <Select value={s.preset} onChange={(preset) => set({ preset })} className={`${box} flex items-center`} aria-label={t('rd2.preset')}
                options={presets.map((p) => ({ value: p, label: p }))} />
            </label>
          )}
          <label className="flex items-center justify-between">{t('sd.minimize')}<Switch on={s.minimize} onChange={(minimize) => set({ minimize })} label={t('sd.minimizeShort')} /></label>

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <span className="font-semibold">{t('sd.notify')}</span>
            <Segmented value={s.notify} onChange={(notify) => set({ notify })} full
              options={[{ id: 'none', label: t('sd.no') }, { id: 'telegram', label: 'Telegram' }, { id: 'discord', label: 'Discord' }, { id: 'webhook', label: 'Webhook' }]} />
            {s.notify !== 'none' && (
              <>
                <input value={s.notifyTarget} onChange={(e) => set({ notifyTarget: e.target.value })} placeholder={notifyHint(s.notify)} className={`${box} font-mono text-[13px]`} />
                <div className="flex items-center gap-2 text-muted">{t('sd.sendOn')}
                  <Segmented value={s.notifyOn} onChange={(notifyOn) => set({ notifyOn })}
                    options={[{ id: 'done', label: t('sd.done') }, { id: 'error', label: t('sd.error') }, { id: 'both', label: t('sd.both') }]} />
                </div>
                <label className="flex items-center justify-between">{t('sd.shot')}<Switch on={s.screenshot} onChange={(screenshot) => set({ screenshot })} label={t('sd.shotShort')} /></label>
              </>
            )}
          {error && <span className="text-[13px] text-danger-text">{error}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-line bg-chrome px-[18px] py-3">
          {value && onRemove && <button onClick={onRemove} className="h-9 rounded-control px-3 text-danger-text hover:bg-danger-soft">{t('sd.remove')}</button>}
          <button onClick={onClose} className="ml-auto h-9 rounded-control border border-line bg-surface px-3.5 hover:bg-hover">{t('msc.cancel')}</button>
          <button onClick={() => onSave(s)} disabled={s.repeat === 'weekdays' && s.days.length === 0}
            className="btn-primary h-9 rounded-control px-4 font-semibold disabled:opacity-50">{t('sd.save')}</button>
        </div>
      </div>
    </div>
  );
}
