import { EmptyMessage } from "@openai/apps-sdk-ui/components/EmptyMessage";
import { BookOpen } from "@openai/apps-sdk-ui/components/Icon";

export function ReadingDeckReauthState() {
  return (
    <section className="empty-panel reauth-panel">
      <EmptyMessage>
        <EmptyMessage.Icon color="warning">
          <BookOpen />
        </EmptyMessage.Icon>
        <EmptyMessage.Title>
          ReadingDeck 연결이 만료되었습니다.
        </EmptyMessage.Title>
        <EmptyMessage.Description>
          ChatGPT 앱 설정에서 ReadingDeck을 다시 인증한 뒤 요청을 다시 실행해 주세요.
        </EmptyMessage.Description>
      </EmptyMessage>
    </section>
  );
}
