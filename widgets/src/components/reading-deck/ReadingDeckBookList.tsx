import type { BookItem } from "./types";

function formatCardCount(cardCount?: number) {
  if (typeof cardCount !== "number") return null;
  return `카드 ${cardCount}개`;
}

function formatProgress(progressPercent?: number) {
  if (typeof progressPercent !== "number") return null;
  return `${progressPercent}% 읽음`;
}

function formatStatus(status?: BookItem["status"]) {
  if (!status) return null;

  switch (status) {
    case "reading":
      return "읽는 중";
    case "finished":
      return "완독";
    case "paused":
      return "잠시 멈춤";
    default:
      return status;
  }
}

type ReadingDeckBookListProps = {
  books: BookItem[];
};

export function ReadingDeckBookList({ books }: ReadingDeckBookListProps) {
  return (
    <section className="cards-section">
      <div className="list-intro">
        <p className="list-kicker">MY LIBRARY</p>
        <h2 className="list-title">내 서재의 책</h2>
        <p className="list-description">
          책을 고르면 해당 책에 남긴 카드 기록을 이어서 살펴볼 수 있습니다.
        </p>
      </div>

      {books.map((book, index) => (
        <article className="card-entry" key={book.bookId}>
          <div className="card-index">{String(index + 1).padStart(2, "0")}</div>

          <div className="card-surface book-surface">
            <div className="book-list-layout">
              <div className="book-list-cover">
                {book.backgroundImage ? (
                  <img
                    src={book.backgroundImage}
                    alt={`${book.title} cover`}
                    className="book-cover-image"
                  />
                ) : (
                  <div className="book-cover-fallback" aria-hidden="true">
                    <span>{book.title.slice(0, 1)}</span>
                  </div>
                )}
              </div>

              <div className="book-list-content">
                <div className="book-list-header">
                  <div className="book-list-main">
                    <h3 className="book-list-title">{book.title}</h3>
                    <p className="book-list-author">{book.author}</p>
                  </div>

                  <div className="book-list-stats">
                    {formatCardCount(book.cardCount) ? (
                      <span className="book-stat-chip">
                        {formatCardCount(book.cardCount)}
                      </span>
                    ) : null}
                    {formatProgress(book.progressPercent) ? (
                      <span className="book-stat-chip">
                        {formatProgress(book.progressPercent)}
                      </span>
                    ) : null}
                    {formatStatus(book.status) ? (
                      <span className="book-stat-chip">
                        {formatStatus(book.status)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
