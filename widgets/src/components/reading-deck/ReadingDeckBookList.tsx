import type { BookItem } from "./types";

type ReadingDeckBookListProps = {
  books: BookItem[];
};

export function ReadingDeckBookList({ books }: ReadingDeckBookListProps) {
  return (
    <section className="cards-section">
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
                    {typeof book.cardCount === "number" ? (
                      <span className="book-stat-chip">{book.cardCount} cards</span>
                    ) : null}
                    {typeof book.progressPercent === "number" ? (
                      <span className="book-stat-chip">{book.progressPercent}% read</span>
                    ) : null}
                    {book.status ? (
                      <span className="book-stat-chip">{book.status}</span>
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
