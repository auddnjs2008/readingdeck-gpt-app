import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import type { ToolOutput } from "./types";
import { cardTypeMeta, formatMatchScore, formatPageRange } from "./utils";

type ReadingDeckCardListProps = {
  cards: ToolOutput["cards"];
};

export function ReadingDeckCardList({ cards }: ReadingDeckCardListProps) {
  return (
    <section className="cards-section">
      {cards.map((card, index) => {
        const meta = cardTypeMeta[card.type];

        return (
          <article className="card-entry" key={card.cardId}>
            <div className="card-index">{String(index + 1).padStart(2, "0")}</div>

            <div className="card-surface">
              <div className="card-header">
                <div className="card-meta">
                  <Badge color={meta.color} variant="soft" pill>
                    {meta.label}
                  </Badge>
                  {card.distance != null ? (
                    <span className="match-chip">
                      {formatMatchScore(card.distance)}
                    </span>
                  ) : null}
                </div>
                <div className="book-meta">
                  <span>{card.bookTitle}</span>
                  <span className="meta-divider" />
                  <span>{card.author}</span>
                  <span className="meta-divider" />
                  <span>{formatPageRange(card)}</span>
                </div>
              </div>

              {card.quote ? (
                <blockquote className="quote-block">
                  <p>{card.quote}</p>
                </blockquote>
              ) : null}

              <div className="thought-block">
                <p className="thought-label">Thought</p>
                <p className="thought-text">{card.thought}</p>
              </div>
            </div>
          </article>
        );
      })}
    </section>
  );
}
