import { useCallback, useEffect, useState } from "react";
import "./App.css";
import {
  ReadingDeckBookList,
  ReadingDeckCardList,
  ReadingDeckEmptyState,
  ReadingDeckErrorState,
  ReadingDeckSearchResultList,
} from "./components/reading-deck";
import type {
  BookItem,
  CardItem,
  SearchBookItem,
} from "./components/reading-deck/types";
import { isToolOutput } from "./components/reading-deck/utils";
import {
  applyDocumentTheme,
  applyHostStyleVariables,
  useApp,
} from "@modelcontextprotocol/ext-apps/react";
import { LoadingIndicator } from "@openai/apps-sdk-ui/components/Indicator";

type View =
  | "loading"
  | "cards"
  | "books"
  | "search-results"
  | "empty"
  | "error";

function App() {
  const [view, setView] = useState<View>("loading");
  const [cards, setCards] = useState<CardItem[]>([]);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [searchResults, setSearchResults] = useState<SearchBookItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToolResult = useCallback(
    ({ structuredContent }: { structuredContent?: unknown }) => {
      if (isToolOutput(structuredContent)) {
        if (structuredContent.error) {
          setCards([]);
          setBooks([]);
          setSearchResults([]);
          setErrorMessage(
            structuredContent.error.status
              ? `요청을 처리하지 못했습니다. (status: ${structuredContent.error.status})`
              : "요청을 처리하지 못했습니다.",
          );
          setView("error");
          return;
        }

        if (Array.isArray(structuredContent.searchResults)) {
          setSearchResults(structuredContent.searchResults);
          setCards([]);
          setBooks([]);
          setErrorMessage(null);
          setView(
            structuredContent.searchResults.length > 0
              ? "search-results"
              : "empty",
          );
          return;
        }

        if (Array.isArray(structuredContent.books)) {
          setBooks(structuredContent.books);
          setCards([]);
          setSearchResults([]);
          setErrorMessage(null);
          setView(structuredContent.books.length > 0 ? "books" : "empty");
          return;
        }

        if (Array.isArray(structuredContent.cards)) {
          setCards(structuredContent.cards);
          setBooks([]);
          setSearchResults([]);
          setErrorMessage(null);
          setView(structuredContent.cards.length > 0 ? "cards" : "empty");
          return;
        }
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
      }, 15000);
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

  if (view === "loading") {
    return (
      <main className="readingdeck-app">
        <div className="readingdeck-shell">
          <div className="readingdeck-loading">
            <LoadingIndicator size={24} />
            <p>ReadingDeck에서 결과를 불러오는 중입니다.</p>
          </div>
        </div>
      </main>
    );
  }

  if (view === "error") {
    return (
      <main className="readingdeck-app">
        <div className="readingdeck-shell">
          <ReadingDeckErrorState message={errorMessage ?? undefined} />
        </div>
      </main>
    );
  }

  return (
    <main className="readingdeck-app">
      <div className="readingdeck-shell">
        {view === "books" ? (
          <ReadingDeckBookList books={books} />
        ) : view === "search-results" ? (
          <ReadingDeckSearchResultList books={searchResults} />
        ) : view === "cards" ? (
          <ReadingDeckCardList cards={cards} />
        ) : (
          <ReadingDeckEmptyState />
        )}
      </div>
    </main>
  );
}

export default App;
