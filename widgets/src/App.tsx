import { useState } from "react";
import "./App.css";
import {
  ReadingDeckCardList,
  ReadingDeckEmptyState,
  ReadingDeckHero,
} from "./components/reading-deck";
import { fallbackData, previewQuery } from "./components/reading-deck/data";
import type { ToolOutput } from "./components/reading-deck/types";
import { isToolOutput } from "./components/reading-deck/utils";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";

function App() {
  const [toolOutput, setToolOutput] = useState<ToolOutput>(fallbackData);
  const [query, setQuery] = useState(previewQuery);
  const [hasLiveToolOutput, setHasLiveToolOutput] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const { app } = useApp({
    appInfo: { name: "ReadingDeck Client", version: "1.0" },
    capabilities: {},
    onAppCreated: (app) => {
      const initialContext = app.getHostContext();
      if (initialContext?.theme === "dark" || initialContext?.theme === "light") {
        setTheme(initialContext.theme);
      }

      app.onhostcontextchanged = (ctx) => {
        if (ctx.theme === "dark" || ctx.theme === "light") {
          setTheme(ctx.theme);
        }
      };

      app.ontoolinput = (params) => {
        const input = params.arguments?.input;
        if (typeof input === "string" && input.trim()) {
          setQuery(input.trim());
        }
      };

      app.ontoolresult = (result) => {
        if (isToolOutput(result.structuredContent)) {
          setToolOutput(result.structuredContent);
          setHasLiveToolOutput(true);
        }
      };
    },
  });

  useHostStyles(app, app?.getHostContext() ?? null);

  const queryLabel = query.trim() || "No query provided";
  const sourceLabel = hasLiveToolOutput ? "Live tool output" : "Local preview";

  return (
    <main className={`readingdeck-app theme-${theme}`}>
      <div className="readingdeck-shell">
        <ReadingDeckHero
          count={toolOutput.cards.length}
          query={queryLabel}
          sourceLabel={sourceLabel}
        />

        {toolOutput.cards.length === 0 ? (
          <ReadingDeckEmptyState />
        ) : (
          <ReadingDeckCardList cards={toolOutput.cards} />
        )}
      </div>
    </main>
  );
}

export default App;
