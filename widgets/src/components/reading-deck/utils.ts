import type { CardItem, CardType, ToolOutput } from "./types";

export const cardTypeMeta: Record<
  CardType,
  {
    label: string;
    color: "success" | "warning" | "info" | "danger";
  }
> = {
  insight: { label: "Insight", color: "success" },
  change: { label: "Change", color: "warning" },
  action: { label: "Action", color: "info" },
  question: { label: "Question", color: "danger" },
};

export function isCardType(value: unknown): value is CardType {
  return (
    value === "insight" ||
    value === "change" ||
    value === "action" ||
    value === "question"
  );
}

export function isCardItem(value: unknown): value is CardItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const card = value as Partial<CardItem>;

  return (
    typeof card.cardId === "number" &&
    isCardType(card.type) &&
    typeof card.thought === "string" &&
    (typeof card.quote === "string" || card.quote === null) &&
    typeof card.bookTitle === "string" &&
    typeof card.author === "string" &&
    (typeof card.pageStart === "number" || card.pageStart === null) &&
    (typeof card.pageEnd === "number" || card.pageEnd === null) &&
    typeof card.distance === "number"
  );
}

export function isToolOutput(value: unknown): value is ToolOutput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ToolOutput>;

  if (!Array.isArray(candidate.cards)) {
    return false;
  }

  return candidate.cards.every(isCardItem);
}

export function formatPageRange(card: CardItem) {
  if (card.pageStart == null) {
    return "Page unknown";
  }

  if (card.pageEnd != null && card.pageEnd !== card.pageStart) {
    return `p.${card.pageStart}-${card.pageEnd}`;
  }

  return `p.${card.pageStart}`;
}

export function formatMatchScore(distance: number) {
  const normalized = Math.max(0, Math.min(1, 1 - distance));
  return `${Math.round(normalized * 100)}% match`;
}
