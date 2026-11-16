// Node phím tắt: phím chính (gợi ý tên phím), phím kèm, cách bấm.
import { useEffect, useRef, useState } from 'react';
import type { MsgKey } from '../../i18n/vi';
import { fmtKey, isValidKey, KEY_NAMES, keyLabel } from '../../keys';
import { KeyMode, Modifier, Step } from '../../types';
import { updateStep } from '../../store';
import { hint } from './shared';
import { useT } from '../../i18n';

const isMac = navigator.platform.startsWith('Mac');
const MODIFIERS: { id: Modifier; label: string }[] = [
  { id: 'cmd', label: isMac ? '⌘ Cmd' : '⊞ Win' },
  { id: 'ctrl', label: 'Ctrl' },
  { id: 'alt', label: isMac ? '⌥ Option' : 'Alt' },
  { id: 'shift', label: '⇧ Shift' },
];
const KEY_MODES: { id: KeyMode; label: MsgKey; hint: MsgKey }[] = [
  { id: 'chord', label: 'key.mode.chord', hint: 'key.mode.chordHint' },
  { id: 'sequence', label: 'key.mode.seq', hint: 'key.mode.seqHint' },
];

export function KeyFields({ step: s }: { step: Step }) {
  const t = useT();
  const set = (patch: Partial<Step>) => updateStep(s.id, patch);
  return (
          <>
        <KeysField step={s} onChange={(keys) => set({ keys })} />
        <fieldset className="col-span-2 flex flex-col gap-1.5">
          <legend className="mb-1.5 text-muted">{t('key.with')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {MODIFIERS.map((m) => {
              const on = s.modifiers.includes(m.id);
              return (
                <button key={m.id} aria-pressed={on}
                  onClick={() => set({ modifiers: on ? s.modifiers.filter((x) => x !== m.id) : [...s.modifiers, m.id] })}
                  className={`h-8 rounded-control border px-2.5 text-[13px] ${on ? 'border-accent bg-accent-soft font-semibold text-accent-text' : 'border-line hover:bg-hover'}`}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </fieldset>
        {s.keys.length > 1 && (
          <fieldset className="col-span-2 flex flex-col gap-1.5">
            <legend className="mb-1.5 text-muted">{t('key.how')}</legend>
            <div className="flex flex-col gap-1.5">
              {KEY_MODES.map((m) => (
                <label key={m.id} className={`flex cursor-pointer flex-col rounded-card px-3 py-2 ${s.keyMode === m.id ? 'ring-selected' : 'border border-line'}`}>
                  <span className="flex items-center gap-2 font-semibold">
                    <input type="radio" name="keyMode" checked={s.keyMode === m.id} onChange={() => set({ keyMode: m.id })} className="accent-accent" />
                    {t(m.label)}
                  </span>
                  <span className={hint}>{t(m.hint)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </>
  );
}

// Ô phím chính: nhiều phím cách nhau bằng dấu phẩy / khoảng trắng ("c, t"). Giữ bản nháp khi gõ.
// Gợi ý tên phím tự vẽ (datalist của WebView macOS chữ trắng trên nền trắng, không có mô tả): lọc theo phím đang gõ
// (phần sau dấu phẩy cuối) trong cả tên lẫn mô tả; ↑ ↓ chọn, Enter / Tab điền, Esc đóng.
const parseKeys = (text: string) => text.split(/[\s,]+/).map((k) => k.toLowerCase()).filter(Boolean);

function KeysField({ step: s, onChange }: { step: Step; onChange: (keys: string[]) => void }) {
  const t = useT();
  const KEY_OPTIONS = KEY_NAMES.map((name) => ({ name, label: keyLabel(name) })); // sau khi đổi ngôn ngữ phải tính lại
  const [draft, setDraft] = useState(s.keys.join(', '));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const joined = s.keys.join(',');
  // Chỉ ghi đè bản nháp khi phím bị đổi từ nơi khác (đổi bước, hoàn tác…), không phải do đang gõ.
  useEffect(() => {
    setDraft((d) => (parseKeys(d).join(',') === joined ? d : s.keys.join(', ')));
  }, [joined]); // eslint-disable-line react-hooks/exhaustive-deps
  const bad = s.keys.filter((k) => !isValidKey(k));
  const ok = s.keys.length > 0 && bad.length === 0;

  // Phím đang gõ = phần sau dấu phân cách cuối.
  const start = draft.search(/[^\s,]*$/);
  const typed = draft.slice(start).toLowerCase();
  const matches = typed
    ? KEY_OPTIONS.filter((o) => o.name.includes(typed) || o.label.toLowerCase().includes(typed))
      .sort((x, y) => Number(!x.name.startsWith(typed)) - Number(!y.name.startsWith(typed)))
    : KEY_OPTIONS;
  const shown = open && matches.length > 0;

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active, shown]);

  const edit = (text: string) => {
    setDraft(text);
    onChange(parseKeys(text));
  };
  const choose = (name: string) => {
    edit(draft.slice(0, start) + name);
    setOpen(false);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!shown) {
      if (e.key === 'ArrowDown') setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') setActive((active + 1) % matches.length);
    else if (e.key === 'ArrowUp') setActive((active - 1 + matches.length) % matches.length);
    else if ((e.key === 'Enter' || e.key === 'Tab') && typed) choose(matches[active].name);
    else if (e.key === 'Escape') setOpen(false);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="col-span-2 flex flex-col gap-1.5 text-muted">
      <label htmlFor="key-input">{t('key.key')}</label>
      <div className="relative">
        <input id="key-input" value={draft} placeholder={t('key.placeholder')} autoComplete="off" spellCheck={false}
          role="combobox" aria-expanded={shown} aria-controls="key-options" aria-autocomplete="list"
          onChange={(e) => {
            edit(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onKeyDown={onKeyDown}
          onBlur={() => {
            setOpen(false);
            setDraft(s.keys.join(', '));
          }}
          className={`h-8 w-full rounded-control border bg-field px-2.5 font-mono text-[13px] text-ink outline-none ${ok ? 'border-line focus:ring-focus' : 'border-danger'}`} />
        {shown && (
          <ul id="key-options" ref={listRef} role="listbox" aria-label={t('key.suggest')}
            className="absolute inset-x-0 top-full z-30 mt-1 max-h-[240px] overflow-y-auto rounded-panel border border-line bg-surface p-1 shadow-[0_8px_28px_rgb(0_0_0/.16)]">
            {matches.map((o, i) => (
              <li key={o.name} role="option" aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault(); // giữ focus ô nhập
                  choose(o.name);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5 ${i === active ? 'bg-hover' : ''}`}>
                <span className="min-w-[88px] font-mono text-[13px] text-ink">{o.name}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{o.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <span className={`text-xs ${ok ? '' : 'text-danger-text'}`}>
        {s.keys.length === 0 ? t('key.none')
          : bad.length ? t('key.bad', { list: bad.join(', ') })
          : t('key.will', { combo: fmtKey(s) })}
      </span>
    </div>
  );
}
