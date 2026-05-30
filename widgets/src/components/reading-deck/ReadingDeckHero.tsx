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
