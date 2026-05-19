import type { ToolOutput } from "./types";

export const previewQuery = "변화에 대한 두려움을 어떻게 다뤼야 할까?";

export const fallbackData: ToolOutput = {
  cards: [
    {
      cardId: 18,
      type: "change",
      thought:
        "변화를 밀어내는 순간에도 사실은 기존의 안정성을 지키려는 의지가 작동하고 있었다. 저항을 없애려 하기보다, 무엇을 지키고 싶은지 먼저 읽어내는 편이 더 정직하다.",
      quote:
        "사람은 새로운 길을 두려워하는 것이 아니라, 익숙한 발판이 사라지는 순간을 두려워한다.",
      bookTitle: "불안의 해석",
      author: "윤혜정",
      pageStart: 128,
      pageEnd: 129,
      distance: 0.18,
    },
    {
      cardId: 44,
      type: "insight",
      thought:
        "두려움이 클수록 결정을 미루기 쉬운데, 실제로는 더 작은 단위의 실험으로 쪼개면 감당 가능성이 올라간다. 감정은 그대로 두고 행동의 단위를 바꾸는 접근이 필요하다.",
      quote: null,
      bookTitle: "작은 실험의 힘",
      author: "김지안",
      pageStart: 73,
      pageEnd: 75,
      distance: 0.24,
    },
  ],
};
