import { useCallback, useEffect, useState } from "react";
import "./App.css";
import {
  ReadingDeckCardList,
  ReadingDeckEmptyState,
} from "./components/reading-deck";
import type { ToolOutput } from "./components/reading-deck/types";
import { isToolOutput } from "./components/reading-deck/utils";
import {
  applyDocumentTheme,
  applyHostStyleVariables,
  useApp,
} from "@modelcontextprotocol/ext-apps/react";

function App() {
  const [toolOutput, setToolOutput] = useState<ToolOutput>({ cards: [] });

  const handleToolResult = useCallback(
    ({ structuredContent }: { structuredContent?: unknown }) => {
      if (isToolOutput(structuredContent)) {
        setToolOutput(structuredContent);
      }
    },
    [],
  );

  const { app } = useApp({
    appInfo: { name: "ReadingDeck Client", version: "1.0" },
    capabilities: {},
    onAppCreated: (app) => {
      app.ontoolinput = (params) => {
        void params;
      };

      app.ontoolresult = handleToolResult;

      //eslint-disable-next-line
      if ((window as any).openai.toolOutput) {
        handleToolResult({
          //eslint-disable-next-line
          structuredContent: (window as any).openai.toolOutput,
        });
      }
    },
  });

  useEffect(() => {
    if (!app) return;
    const ctx = app.getHostContext();
    if (ctx?.theme) {
      applyDocumentTheme(ctx.theme);
    }
    if (ctx?.styles?.variables) {
      applyHostStyleVariables(ctx.styles.variables);
    };
  }, [app]);

  return (
    <main className="readingdeck-app">
      <div className="readingdeck-shell">
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
