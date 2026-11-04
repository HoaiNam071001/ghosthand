// Màn chính đang mở lúc kịch bản hỏi (không thu về thanh mini) – thẻ hỏi giữa màn trên nền mờ (56 D1).
import { answerAsk, useUserAsk } from '../../userAsk';
import { AskCard } from './AskCard';

export default function UserAskDialog() {
  const ask = useUserAsk();
  if (!ask || location.hash) return null; // thanh mini tự hiện thẻ
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 px-4 pt-[14vh]">
      <div className="shadow-[0_16px_48px_rgb(0_0_0/.22)]"><AskCard key={ask.id} {...ask} onAnswer={answerAsk} /></div>
    </div>
  );
}
