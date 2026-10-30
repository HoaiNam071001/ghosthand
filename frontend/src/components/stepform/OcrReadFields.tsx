// Node Đọc chữ vùng (bước 28 R1): vùng (như Chụp màn hình), thời gian chờ có chữ.
import NumInput from '../NumInput';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { Field, fmtSec, hint, NumField } from './shared';
import { ShotAreaField } from './ShotFields';

export function OcrReadFields({ step: s }: { step: Step }) {
  return (
    <>
      <ShotAreaField step={s} label="Vùng đọc" />
      <NumField label="Chờ tối đa" info={`Vùng chưa có chữ nào sau ${fmtSec(s.timeoutMs)} → cổng Thất bại`} step={s} field="timeoutMs" unit="ms" min={1} />
      <Field label="Đọc lại mỗi">
        <NumInput value={s.intervalMs ?? 300} min={50} unit="ms" onChange={(intervalMs) => updateStep(s.id, { intervalMs })} />
      </Field>
      <span className={`col-span-2 -mt-1 ${hint}`}>
        Vùng càng nhỏ đọc càng nhanh, ít lẫn chữ của app khác – chọn <b>Chỗ node thấy</b> rồi trỏ tới node Cửa sổ để vùng đi theo cửa sổ. Node sau dùng {`{{${s.ref}.output.text}}`} (Switch có phân biệt dấu).
      </span>
    </>
  );
}
