export type CardType = "insight" | "change" | "action" | "question";

export type CardItem = {
  cardId: number;
  type: CardType;
  thought: string;
  quote: string | null;
  bookTitle: string;
  author: string;
  pageStart: number | null;
  pageEnd: number | null;
  distance: number | null;
  createdAt?: string;
};

export type ToolOutput = {
  cards: CardItem[];
  queryLabel?: string;
  sourceLabel?: string;
  error?: {
    type: string;
    status?: number;
  };
};

export type OpenAIHost = {
  theme?: "light" | "dark";
  toolOutput?: unknown;
};

declare global {
  interface Window {
    openai?: OpenAIHost;
  }
}
