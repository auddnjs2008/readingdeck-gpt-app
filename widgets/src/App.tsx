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
import { LoadingIndicator } from "@openai/apps-sdk-ui/components/Indicator";

function App() {
  const [toolOutput, setToolOutput] = useState<ToolOutput | null>(null);

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

      const syncInitialToolOutput = () => {
        //eslint-disable-next-line
        const hostOutput = (window as any).openai?.toolOutput;
        if (!hostOutput) return false;

        handleToolResult({
          structuredContent: hostOutput,
        });
        return true;
      };

      //eslint-disable-next-line
      if (syncInitialToolOutput()) {
        return;
      }

      const pollingId = window.setInterval(() => {
        if (syncInitialToolOutput()) {
          window.clearInterval(pollingId);
        }
      }, 250);

      window.setTimeout(() => {
        window.clearInterval(pollingId);
      }, 4000);
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

  if (toolOutput === null) {
    return (
      <main className="readingdeck-app">
        <div className="readingdeck-shell">
          <div className="readingdeck-loading">
            <LoadingIndicator size={24} />
            <p>ReadingDeck에서 카드를 불러오는 중입니다.</p>
          </div>
        </div>
      </main>
    );
  }

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
