// Chọn icon cho node của tôi – chỉ hiển thị.
import { StepIcon, StepIconName } from '../icons';
import { CUSTOM_ICONS } from './customIcons';

export default function IconPicker({ value, onChange }: { value: StepIconName; onChange: (n: StepIconName) => void }) {
  return (
    <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Icon">
      {CUSTOM_ICONS.map((n) => (
        <button key={n} type="button" role="radio" aria-checked={n === value} aria-label={n} onClick={() => onChange(n)}
          className={`grid h-8 w-8 place-items-center rounded-control ${n === value ? 'ring-selected bg-accent-soft text-accent-text' : 'border border-line text-muted hover:bg-hover'}`}>
          <StepIcon type={n} />
        </button>
      ))}
    </div>
  );
}
