import type {
  BookItem,
  CardItem,
  CardType,
  SearchBookItem,
  ToolOutput,
} from "./types";

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
    (typeof card.distance === "number" || card.distance === null) &&
    (typeof card.createdAt === "string" || card.createdAt === undefined)
  );
}

export function isBookItem(value: unknown): value is BookItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const book = value as Partial<BookItem>;

  return (
    typeof book.bookId === "number" &&
    typeof book.title === "string" &&
    typeof book.author === "string" &&
    (typeof book.cardCount === "number" || book.cardCount === undefined) &&
    (typeof book.progressPercent === "number" || book.progressPercent === undefined) &&
    (typeof book.backgroundImage === "string" ||
      book.backgroundImage === null ||
      book.backgroundImage === undefined) &&
    (book.status === "reading" ||
      book.status === "finished" ||
      book.status === "paused" ||
      book.status === undefined)
  );
}

export function isSearchBookItem(value: unknown): value is SearchBookItem {
  if (!value || typeof value !== "object") {
    return false;
  }

  const book = value as Partial<SearchBookItem>;

  return (
    typeof book.title === "string" &&
    typeof book.author === "string" &&
    (typeof book.publisher === "string" || book.publisher === undefined) &&
    (typeof book.isbn === "string" || book.isbn === undefined) &&
    (typeof book.thumbnail === "string" ||
      book.thumbnail === null ||
      book.thumbnail === undefined) &&
    (typeof book.contents === "string" || book.contents === undefined)
  );
}

export function isToolOutput(value: unknown): value is ToolOutput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<ToolOutput>;

  if (
    candidate.cards !== undefined &&
    !Array.isArray(candidate.cards)
  ) {
    return false;
  }

  return (
    (candidate.cards === undefined || candidate.cards.every(isCardItem)) &&
    (candidate.books === undefined ||
      (Array.isArray(candidate.books) && candidate.books.every(isBookItem))) &&
    (candidate.searchResults === undefined ||
      (Array.isArray(candidate.searchResults) &&
        candidate.searchResults.every(isSearchBookItem))) &&
    (typeof candidate.queryLabel === "string" || candidate.queryLabel === undefined) &&
    (typeof candidate.sourceLabel === "string" || candidate.sourceLabel === undefined) &&
    (candidate.error === undefined ||
      (typeof candidate.error === "object" &&
        candidate.error !== null &&
        typeof candidate.error.type === "string" &&
        (typeof candidate.error.status === "number" ||
          candidate.error.status === undefined)))
  );
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
