// Công tắc "Đánh dấu ghi / xoá" (46 C1): node đánh dấu phải được người dùng đồng ý trước lần chạy đầu – cả khi AI / hẹn giờ / CLI chạy.
import { useT } from '../../i18n';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { SwitchField } from './shared';

export default function ConfirmField({ step: s }: { step: Step }) {
  const t = useT();
  return (
    <SwitchField label={t('cf.label')} on={!!s.confirm} onChange={(v) => updateStep(s.id, { confirm: v || undefined })}
      help={t('cf.help')} />
  );
}
