// Node Lưu trang ra PDF (bước 43 B7): file đích, trình duyệt, tab cần in, thời gian chờ.
import VarTextInput from '../inputs/VarTextInput';
import PathInput from './PathInput';
import { updateStep } from '../../store';
import { Step } from '../../types';
import { errText, Field, fmtSec, hint, NumField } from './shared';
import { BrowserField, TabTargetFields, useTabVarProps } from './TabTargetFields';
import { MAC_ONLY } from './BrowserTabFields';

export function SavePdfFields({ step: s }: { step: Step }) {
  const varProps = useTabVarProps(s);
  const path = s.filePath ?? '';
  const bad = !path.trim() ? 'Chưa nhập nơi lưu file PDF' : !path.includes('{{') && !/\.pdf$/i.test(path.trim()) ? 'File lưu phải có đuôi .pdf' : '';
  return (
    <>
      <Field label="Lưu vào file" wide group help="Đuôi .pdf, thư mục phải có sẵn; ~ là thư mục người dùng. File cùng tên bị ghi đè.">
        <PathInput kind="save" {...varProps} value={path} onChange={(v) => updateStep(s.id, { filePath: v || undefined })} placeholder="~/Documents/bao-cao.pdf" />
        {bad && <span className={errText}>{bad}</span>}
      </Field>
      <BrowserField step={s} />
      <TabTargetFields step={s} fromOK need={false} placeholder="trống = tab đang hiện" />
      <NumField label="Chờ tối đa" info="Mỗi bước (hộp in, hộp lưu, ghi file) chờ tối đa – quá giờ đi cổng Thất bại" step={s} field="timeoutMs" unit="ms" min={0} />
      <span className={`col-span-2 -mt-1 ${hint}`}>Đưa tab lên trước, bấm Cmd+P rồi Lưu. Đích trong hộp in phải là <b>Lưu dưới dạng PDF</b> (chọn tay một lần, Chrome nhớ); quá {fmtSec(s.timeoutMs)} mỗi bước → Thất bại. {MAC_ONLY}</span>
    </>
  );
}
