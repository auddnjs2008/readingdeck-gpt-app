import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { BookOpen } from "@openai/apps-sdk-ui/components/Icon";

export function ReadingDeckEmptyState() {
  return (
    <section className="empty-panel">
      <EmptyMessage>
        <EmptyMessage.Icon color="warning">
          <BookOpen />
        </EmptyMessage.Icon>
        <EmptyMessage.Title>
          관련 카드를 아직 찾지 못했습니다.
        </EmptyMessage.Title>
        <EmptyMessage.Description>
          질문을 더 구체적으로 바꾸거나 책 제목, 감정, 상황을 함께 넣어보세요.
        </EmptyMessage.Description>
      </EmptyMessage>
    </section>
  );
}
