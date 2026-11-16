// Node Phím trên trang web (46 B3): phím như node Phím tắt + tab của Chrome của app – gửi qua trình duyệt, không đụng
// bàn phím thật.
import { useT } from '../../i18n';
import { Step } from '../../types';
import { KeyFields } from './KeyFields';
import { WebTabField } from './WebTabField';
import { hint } from './shared';

export function WebKeyFields({ step: s }: { step: Step }) {
  const t = useT();
  return <>
    <KeyFields step={s} />
    <WebTabField step={s} />
    <span className={`col-span-2 -mt-1 ${hint}`}>
      {t('wk.note')}
    </span>
  </>;
}
