// Dòng cảnh báo trong inspector: node cần quyền hệ điều hành mà chưa cấp (bước 48 P4) – nút nhảy sang Cài đặt → Quyền.
import { missingOf, needsOf } from '../../flow/perms';
import { openSettings } from '../../settingsNav';
import { usePerms } from '../../store/permStore';
import type { Step } from '../../types';

export default function PermNotice({ step }: { step: Step }) {
  const { items } = usePerms();
  const lack = missingOf(items, needsOf(step));
  if (!lack.length) return null;
  const names = lack.map((id) => items?.find((it) => it.id === id)?.name ?? id);
  return (
    <div role="alert" className="flex items-start gap-2 rounded-control border border-warn px-2.5 py-2 text-xs">
      <span className="min-w-0 flex-1 text-ink">Node này cần quyền chưa cấp: {names.join(', ')}.</span>
      <button onClick={() => openSettings('perms')} className="flex-none text-accent-text hover:underline">Mở Cài đặt → Quyền</button>
    </div>
  );
}
