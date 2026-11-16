import { useEffect } from 'react';
import { useT } from '../../i18n';
import InputsPanel from '../inputs/InputsPanel';
import { useScript } from '../../store';
import { addInput, inputViews, moveInput, removeInput, updateInput } from '../../scriptInputs';
import { loadMemory, stopAutoRun, useRunForm } from '../../runForm';

// Tab Input: input của cả kịch bản (không riêng bước đang chọn).
export default function InputsTab() {
  const t = useT();
  const script = useScript();
  const { memory } = useRunForm();
  useEffect(() => {
    loadMemory();
  }, [script.name]);
  return (
    <InputsPanel inputs={inputViews(script)} onUpdate={updateInput} onRemove={removeInput} onMove={moveInput}
      onAdd={() => addInput({ label: t('it.new') })}
      footer={memory.autoRun && !!script.inputs?.length && (
        <div className="flex items-center gap-2 rounded-lg bg-soft px-3 py-2 text-xs text-muted">
          <span className="flex-1">{t('it.auto')}</span>
          <button onClick={stopAutoRun} className="font-semibold text-accent-text">{t('it.ask')}</button>
        </div>
      )} />
  );
}
