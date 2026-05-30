import { useEffect, useState } from "react";
import type { ToolOutput } from "./types";
import { isToolOutput } from "./utils";

const EMPTY_OUTPUT: ToolOutput = {
  cards: [],
};

function readToolOutput(): ToolOutput {
  const hostOutput = window.openai?.toolOutput;
  return isToolOutput(hostOutput) ? hostOutput : EMPTY_OUTPUT;
}

export function useReadingDeckData() {
  const [toolOutput, setToolOutput] = useState<ToolOutput>(() => readToolOutput());
  const [theme, setTheme] = useState<"light" | "dark">(
    window.openai?.theme === "dark" ? "dark" : "light",
  );

  useEffect(() => {
    let attempts = 0;

    const syncFromHost = () => {
      setTheme(window.openai?.theme === "dark" ? "dark" : "light");
      setToolOutput(readToolOutput());
    };

    syncFromHost();

    const intervalId = window.setInterval(() => {
      attempts += 1;
      syncFromHost();

      if (attempts >= 20 && window.openai?.toolOutput) {
        window.clearInterval(intervalId);
      }
    }, 250);

    return () => window.clearInterval(intervalId);
  }, []);

  return {
    theme,
    toolOutput,
    hasLiveToolOutput: Boolean(window.openai?.toolOutput),
  };
}
