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
          아직 표시할 기록이 없습니다.
        </EmptyMessage.Title>
        <EmptyMessage.Description>
          책 제목을 먼저 찾아보거나, 질문을 더 구체적으로 적어보세요.
        </EmptyMessage.Description>
      </EmptyMessage>
    </section>
  );
}
