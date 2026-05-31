import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { BookOpen } from "@openai/apps-sdk-ui/components/Icon";

type ReadingDeckErrorStateProps = {
  message?: string;
};

export function ReadingDeckErrorState({
  message = "ReadingDeck에서 요청을 처리하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
}: ReadingDeckErrorStateProps) {
  return (
    <section className="empty-panel">
      <EmptyMessage>
        <EmptyMessage.Icon color="warning">
          <BookOpen />
        </EmptyMessage.Icon>
        <EmptyMessage.Title>
          ReadingDeck 결과를 불러오지 못했습니다.
        </EmptyMessage.Title>
        <EmptyMessage.Description>{message}</EmptyMessage.Description>
      </EmptyMessage>
    </section>
  );
}
