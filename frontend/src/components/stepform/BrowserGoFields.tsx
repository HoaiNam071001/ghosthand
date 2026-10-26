// Node Đi tới URL (bước 43 B2): URL, trình duyệt, tab cần đổi trang, thời gian chờ tải.
import VarTextInput from '../inputs/VarTextInput';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { errText, Field, fmtSec, hint, NumField } from './shared';
import { BrowserField, TabTargetFields, useTabVarProps } from './TabTargetFields';
import { TAB_PLATFORM } from './BrowserTabFields';

export function BrowserGoFields({ step: s }: { step: Step }) {
  const varProps = useTabVarProps(s);
  const url = s.url ?? '';
  return (
    <>
      <Field label="URL" wide group help="Tên miền tự thêm https://. Giá trị biến chèn vào URL được mã hoá (dấu cách, tiếng Việt).">
        <VarTextInput {...varProps} value={url} onChange={(v) => updateStep(s.id, { url: v || undefined })} placeholder="https://" />
        {!url.trim() && <span className={errText}>Chưa nhập URL</span>}
      </Field>
      <BrowserField step={s} />
      <TabTargetFields step={s} fromOK need={false} placeholder="trống = tab đang hiện" />
      <NumField label="Chờ tối đa" info="Chờ tìm tab và chờ trang tải xong, mỗi việc tối đa – quá giờ đi cổng Thất bại" step={s} field="timeoutMs" unit="ms" min={0} />
      <span className={`col-span-2 -mt-1 ${hint}`}>Đổi trang ngay trong tab (không mở tab mới); chờ tới khi trang tải xong, quá {fmtSec(s.timeoutMs)} → Thất bại. {TAB_PLATFORM}</span>
    </>
  );
}
