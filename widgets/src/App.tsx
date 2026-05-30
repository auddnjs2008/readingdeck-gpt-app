import { useState } from "react";
import "./App.css";
import {
  ReadingDeckCardList,
  ReadingDeckEmptyState,
  ReadingDeckHero,
} from "./components/reading-deck";
import type { ToolOutput } from "./components/reading-deck/types";
import { isToolOutput } from "./components/reading-deck/utils";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";

const EMPTY_OUTPUT: ToolOutput = {
  cards: [],
};

function readToolOutput(): ToolOutput {
  const hostOutput = window.openai?.toolOutput;
  return isToolOutput(hostOutput) ? hostOutput : EMPTY_OUTPUT;
}

function App() {
  const [toolOutput, setToolOutput] = useState<ToolOutput>(() => readToolOutput());
  const [query, setQuery] = useState("");
  const [hasLiveToolOutput, setHasLiveToolOutput] = useState(
    () => isToolOutput(window.openai?.toolOutput),
  );
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const { app } = useApp({
    appInfo: { name: "ReadingDeck Client", version: "1.0" },
    capabilities: {},
    onAppCreated: (app) => {
      const initialContext = app.getHostContext();
      if (initialContext?.theme === "dark" || initialContext?.theme === "light") {
        setTheme(initialContext.theme);
      }

      const initialOutput = readToolOutput();
      setToolOutput(initialOutput);
      setHasLiveToolOutput(isToolOutput(window.openai?.toolOutput));

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

  const queryLabel =
    toolOutput.queryLabel ?? (query.trim() || "No query provided");
  const sourceLabel =
    toolOutput.sourceLabel ??
    (hasLiveToolOutput ? "Live tool output" : "Local preview");

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
