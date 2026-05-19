import { Search } from "@openai/apps-sdk-ui/components/Icon";

type ReadingDeckHeroProps = {
  count: number;
  query: string;
  sourceLabel: string;
};

export function ReadingDeckHero({
  count,
  query,
  sourceLabel,
}: ReadingDeckHeroProps) {
  return (
    <section className="hero-panel">
      <div className="hero-copy">
        <p className="eyebrow">Reading Deck</p>
        <h1>질문과 가장 가까운 문장들을, 카드처럼 다시 펼칩니다.</h1>
        <p className="hero-body">
          인용문과 생각을 분리해서 보여주고, 어떤 책에서 나온 기록인지 바로
          읽히도록 정리했습니다.
        </p>
      </div>

      <div className="hero-query">
        <div className="query-label">
          <Search className="query-icon" />
          <span>Current question</span>
        </div>
        <p className="query-text">{query}</p>
        <div className="query-stats">
          <div>
            <span className="stat-label">Results</span>
            <strong>{count}</strong>
          </div>
          <div>
            <span className="stat-label">Source</span>
            <strong>{sourceLabel}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
