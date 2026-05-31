import type { SearchBookItem } from "./types";

type ReadingDeckSearchResultListProps = {
  books: SearchBookItem[];
};

export function ReadingDeckSearchResultList({
  books,
}: ReadingDeckSearchResultListProps) {
  return (
    <section className="cards-section">
      <div className="list-intro">
        <p className="list-kicker">BOOK SEARCH</p>
        <h2 className="list-title">추가할 책 후보</h2>
        <p className="list-description">
          마음에 드는 책을 고른 뒤 ReadingDeck에 추가해 보세요.
        </p>
      </div>

      {books.map((book, index) => (
        <article
          className="card-entry"
          key={`${book.isbn ?? "search"}-${book.title}-${index}`}
        >
          <div className="card-index">{String(index + 1).padStart(2, "0")}</div>

          <div className="card-surface book-surface">
            <div className="book-list-layout">
              <div className="book-list-cover">
                {book.thumbnail ? (
                  <img
                    src={book.thumbnail}
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
                    {book.publisher ? (
                      <span className="book-stat-chip">{book.publisher}</span>
                    ) : null}
                    {book.isbn ? (
                      <span className="book-stat-chip">검색 결과</span>
                    ) : null}
                  </div>
                </div>

                {book.contents ? (
                  <p className="search-result-summary">{book.contents}</p>
                ) : null}
              </div>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
