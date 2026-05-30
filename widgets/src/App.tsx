import { useEffect, useState } from "react";
import "./App.css";
import {
  ReadingDeckCardList,
  ReadingDeckEmptyState,
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

function readTheme(): "light" | "dark" {
  const hostTheme = window.openai?.theme;
  return hostTheme === "dark" ? "dark" : "light";
}

function App() {
  const [toolOutput, setToolOutput] = useState<ToolOutput>(() => readToolOutput());
  const [theme, setTheme] = useState<"light" | "dark">(() => readTheme());

  useEffect(() => {
    const syncTheme = () => {
      setTheme(readTheme());
    };

    syncTheme();

    const pollingId = window.setInterval(syncTheme, 400);
    const timeoutId = window.setTimeout(() => {
      window.clearInterval(pollingId);
    }, 4000);

    return () => {
      window.clearInterval(pollingId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  const { app } = useApp({
    appInfo: { name: "ReadingDeck Client", version: "1.0" },
    capabilities: {},
    onAppCreated: (app) => {
      const initialContext = app.getHostContext();
      if (initialContext?.theme === "dark" || initialContext?.theme === "light") {
        setTheme(initialContext.theme);
      } else {
        setTheme(readTheme());
      }

      const initialOutput = readToolOutput();
      setToolOutput(initialOutput);

      app.onhostcontextchanged = (ctx) => {
        if (ctx.theme === "dark" || ctx.theme === "light") {
          setTheme(ctx.theme);
        } else {
          setTheme(readTheme());
        }
      };

      app.ontoolinput = (params) => {
        void params;
      };

      app.ontoolresult = (result) => {
        if (isToolOutput(result.structuredContent)) {
          setToolOutput(result.structuredContent);
        }
      };
    },
  });

  useHostStyles(app, app?.getHostContext() ?? null);

  return (
    <main className={`readingdeck-app theme-${theme}`}>
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
