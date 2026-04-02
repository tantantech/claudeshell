"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";

interface TerminalLine {
  type: "prompt" | "command" | "output" | "tool" | "ai" | "ai-code" | "blank" | "cost" | "error" | "chat-prompt" | "system";
  content: ReactNode;
  delay: number;
}

// Color helpers
const cyan = (t: string) => <span className="text-[#5fd7ff]">{t}</span>;
const gold = (t: string) => <span className="text-[#ffd580]">{t}</span>;
const dim = (t: string) => <span className="text-white/20">{t}</span>;
const green = (t: string) => <span className="text-[#a8e6cf]">{t}</span>;
const red = (t: string) => <span className="text-[#ff6b6b]">{t}</span>;
const purple = (t: string) => <span className="text-[#c792ea]">{t}</span>;
const blue = (t: string) => <span className="text-[#82aaff]">{t}</span>;

const DEMO_LINES: TerminalLine[] = [
  // 1. Regular command: git status
  { type: "prompt", content: null, delay: 0 },
  { type: "command", content: "git status", delay: 500 },
  {
    type: "output",
    content: (
      <>
        On branch {green("main")}{"\n"}
        Your branch is up to date with {dim("'origin/main'")}{"\n"}
        {"\n"}
        Changes not staged for commit:{"\n"}
        {"  "}{red("modified:")}{"   "}{gold("src/handler.ts")}{"\n"}
        {"  "}{red("modified:")}{"   "}{gold("src/utils.ts")}
      </>
    ),
    delay: 200,
  },
  { type: "blank", content: null, delay: 400 },

  // 2. AI command with model flag
  { type: "prompt", content: null, delay: 100 },
  { type: "command", content: "a --opus refactor handler.ts to use async/await", delay: 1400 },
  {
    type: "tool",
    content: <>{"  "}<span className="text-[#5fd7ff]/30">{"▸"}</span> Reading {gold("src/handler.ts")}</>,
    delay: 400,
  },
  {
    type: "tool",
    content: <>{"  "}<span className="text-[#5fd7ff]/30">{"▸"}</span> Writing {gold("src/handler.ts")}</>,
    delay: 600,
  },
  {
    type: "tool",
    content: <>{"  "}<span className="text-[#5fd7ff]/30">{"▸"}</span> Running {dim("npm test")}</>,
    delay: 500,
  },
  { type: "blank", content: null, delay: 150 },
  {
    type: "ai",
    content: green("Refactored handler.ts — replaced 4 callback patterns with async/await:"),
    delay: 200,
  },
  {
    type: "ai-code",
    content: (
      <>
        {purple("async function")} {blue("handleRequest")}(req: {cyan("Request")}) {"{"}{"\n"}
        {"  "}{purple("const")} data = {purple("await")} {blue("fetchData")}(req.url);{"\n"}
        {"  "}{purple("const")} result = {purple("await")} {blue("transform")}(data);{"\n"}
        {"  "}{purple("return")} {blue("Response")}.json(result);{"\n"}
        {"}"}
      </>
    ),
    delay: 200,
  },
  {
    type: "cost",
    content: (
      <span className="text-white/15">
        {"  "}opus {"·"} 1,247 in {"·"} 389 out {"·"} $0.024 {"·"} 3.2s
      </span>
    ),
    delay: 150,
  },
  { type: "blank", content: null, delay: 500 },

  // 3. Error + explain
  { type: "prompt", content: null, delay: 100 },
  { type: "command", content: "npm run build", delay: 800 },
  {
    type: "error",
    content: (
      <>
        {red("error")} {dim("TS2345:")} Argument of type {`'`}{red("string")}{`'`} is not{"\n"}
        assignable to parameter of type {`'`}{cyan("RequestConfig")}{`'`}{"\n"}
        {"  "}{dim("at src/handler.ts:42:15")}
      </>
    ),
    delay: 300,
  },
  {
    type: "system",
    content: <span className="text-white/30">[exit: 1] Type {`'`}a explain{`'`} to ask AI about the error.</span>,
    delay: 200,
  },
  { type: "blank", content: null, delay: 300 },
  { type: "prompt", content: null, delay: 100 },
  { type: "command", content: "a explain", delay: 600 },
  {
    type: "tool",
    content: <>{"  "}<span className="text-[#5fd7ff]/30">{"▸"}</span> Analyzing error context...</>,
    delay: 400,
  },
  { type: "blank", content: null, delay: 150 },
  {
    type: "ai",
    content: (
      <>
        {green("Type mismatch at")} {gold("src/handler.ts:42")} — passing{" "}
        <span className="text-[#ff6b6b] bg-[#ff6b6b]/10 px-1 rounded text-[12px]">string</span>
        {" "}where it expects{" "}
        <span className="text-[#5fd7ff] bg-[#5fd7ff]/10 px-1 rounded text-[12px]">RequestConfig</span>
      </>
    ),
    delay: 200,
  },
  {
    type: "ai-code",
    content: (
      <>
        {dim("// Fix:")}{"\n"}
        {purple("const")} {blue("config")}: {cyan("RequestConfig")} = {"{"} {green("url")}: {blue("endpoint")} {"}"};
      </>
    ),
    delay: 200,
  },
  {
    type: "cost",
    content: <span className="text-white/15">{"  "}sonnet {"·"} 842 in {"·"} 156 out {"·"} $0.005 {"·"} 1.1s</span>,
    delay: 150,
  },
  { type: "blank", content: null, delay: 500 },

  // 4. Chat mode + theme
  { type: "prompt", content: null, delay: 100 },
  { type: "command", content: "theme", delay: 500 },
  {
    type: "output",
    content: (
      <>
        {"\n"}Available themes:{"\n"}
        {"\n"}
        {"  "}[1] {green("Minimal")} — Clean and simple{"\n"}
        {"  "}[2] {cyan("Classic")} — Box-drawing with cyan accents{"\n"}
        {"  "}[3] {gold("Powerline")} — Orange segments with arrows{"\n"}
        {"  "}[4] {green("Hacker")} — Green-on-black two-line{"\n"}
        {"  "}[5] {purple("Pastel")} — Soft colored sections{"\n"}
        {"\n"}
        Theme set to: {green("powerline")}
      </>
    ),
    delay: 400,
  },
  { type: "blank", content: null, delay: 400 },

  // 5. Enter chat mode
  { type: "prompt", content: null, delay: 100 },
  { type: "command", content: "a", delay: 400 },
  {
    type: "system",
    content: <span className="text-[#00ff41]/50">Entering chat mode — /exit to return to shell</span>,
    delay: 200,
  },
  { type: "blank", content: null, delay: 200 },
  {
    type: "chat-prompt",
    content: null,
    delay: 100,
  },
  { type: "command", content: "write tests for the handler", delay: 1000 },
  {
    type: "tool",
    content: <>{"  "}<span className="text-[#5fd7ff]/30">{"▸"}</span> Reading {gold("src/handler.ts")}</>,
    delay: 300,
  },
  {
    type: "tool",
    content: <>{"  "}<span className="text-[#5fd7ff]/30">{"▸"}</span> Writing {gold("tests/handler.test.ts")}</>,
    delay: 500,
  },
  {
    type: "tool",
    content: <>{"  "}<span className="text-[#5fd7ff]/30">{"▸"}</span> Running {dim("npm test")}</>,
    delay: 400,
  },
  { type: "blank", content: null, delay: 150 },
  {
    type: "ai",
    content: green("Created 6 tests for handler.ts — all passing:"),
    delay: 200,
  },
  {
    type: "ai-code",
    content: (
      <>
        {green("✓")} handleRequest returns JSON response{"\n"}
        {green("✓")} handleRequest validates input schema{"\n"}
        {green("✓")} handleRequest handles network timeout{"\n"}
        {green("✓")} handleRequest rejects invalid config{"\n"}
        {green("✓")} handleRequest logs request duration{"\n"}
        {green("✓")} handleRequest retries on 503
      </>
    ),
    delay: 200,
  },
  {
    type: "cost",
    content: <span className="text-white/15">{"  "}sonnet {"·"} 2,105 in {"·"} 891 out {"·"} $0.018 {"·"} 4.7s</span>,
    delay: 150,
  },
];

type Phase =
  | { kind: "waiting"; lineIndex: number }
  | { kind: "typing"; lineIndex: number; charIndex: number }
  | { kind: "done" };

const Cursor = () => <span className="cursor-blink text-[#00ff41]" />;

// CSS powerline arrow
const Arrow = ({ from, to }: { from: string; to: string }) => (
  <span
    className="inline-block w-0 h-0 border-y-[10px] border-l-[8px] align-middle"
    style={{
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
      borderLeftColor: from,
      backgroundColor: to,
    }}
  />
);

const PromptSegment = () => (
  <span className="flex items-center shrink-0 select-none h-[20px]">
    <span className="bg-[#00d639] text-[#050a08] px-2.5 text-[12px] font-bold h-full flex items-center">
      claudeshell
    </span>
    <Arrow from="#00d639" to="#3a4a5a" />
    <span className="bg-[#3a4a5a] text-[#8fa4b8] px-2 text-[12px] h-full flex items-center">
      ~/Projects
    </span>
    <Arrow from="#3a4a5a" to="transparent" />
    <span className="text-[#5fd7ff]/50 text-[12px] ml-1.5 flex items-center gap-1">
      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
        <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
      </svg>
      main
    </span>
    <span className="text-[#00ff41]/70 ml-2.5 text-[13px]">❯</span>
  </span>
);

const ChatPrompt = () => (
  <span className="flex items-center shrink-0 select-none">
    <span className="text-[#c792ea] text-[13px]">chat</span>
    <span className="text-white/20 mx-1.5">{"›"}</span>
  </span>
);

export function TerminalDemo() {
  const [renderedLines, setRenderedLines] = useState<
    Array<{ line: TerminalLine; typed?: string }>
  >([]);
  const [phase, setPhase] = useState<Phase>({ kind: "waiting", lineIndex: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();

    if (phase.kind === "done") {
      timerRef.current = setTimeout(() => {
        setRenderedLines([]);
        setPhase({ kind: "waiting", lineIndex: 0 });
      }, 5000);
      return clearTimer;
    }

    if (phase.kind === "waiting") {
      const { lineIndex } = phase;
      if (lineIndex >= DEMO_LINES.length) {
        setPhase({ kind: "done" });
        return;
      }
      const line = DEMO_LINES[lineIndex];

      // Prompts: show idle cursor, then transition to typing
      if (line.type === "prompt" || line.type === "chat-prompt") {
        const nextLine = DEMO_LINES[lineIndex + 1];
        const promptDelay = nextLine?.delay ?? 500;
        setRenderedLines((prev) => [...prev, { line, typed: "__idle__" }]);
        timerRef.current = setTimeout(() => {
          setRenderedLines((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              line: DEMO_LINES[lineIndex + 1] ?? line,
              typed: "",
            };
            return next;
          });
          setPhase({ kind: "typing", lineIndex: lineIndex + 1, charIndex: 0 });
        }, promptDelay);
        return clearTimer;
      }

      timerRef.current = setTimeout(() => {
        if (line.type === "command") {
          setRenderedLines((prev) => [...prev, { line, typed: "" }]);
          setPhase({ kind: "typing", lineIndex, charIndex: 0 });
        } else {
          setRenderedLines((prev) => [...prev, { line }]);
          setPhase({ kind: "waiting", lineIndex: lineIndex + 1 });
        }
      }, line.delay);
      return clearTimer;
    }

    if (phase.kind === "typing") {
      const { lineIndex, charIndex } = phase;
      const cmd =
        typeof DEMO_LINES[lineIndex].content === "string"
          ? (DEMO_LINES[lineIndex].content as string)
          : "";

      if (charIndex < cmd.length) {
        timerRef.current = setTimeout(() => {
          setRenderedLines((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              ...next[next.length - 1],
              typed: cmd.slice(0, charIndex + 1),
            };
            return next;
          });
          setPhase({ kind: "typing", lineIndex, charIndex: charIndex + 1 });
        }, 28 + Math.random() * 42);
        return clearTimer;
      }

      timerRef.current = setTimeout(() => {
        setRenderedLines((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            line: DEMO_LINES[lineIndex],
            typed: undefined,
          };
          return next;
        });
        setPhase({ kind: "waiting", lineIndex: lineIndex + 1 });
      }, 200);
      return clearTimer;
    }

    return clearTimer;
  }, [phase, clearTimer]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [renderedLines]);

  const isCurrentlyTyping = phase.kind === "typing";

  // Determine which prompt to render based on context
  const getPromptForLine = (entry: { line: TerminalLine }) => {
    // Find the nearest preceding prompt type
    const idx = renderedLines.indexOf(entry);
    for (let j = idx; j >= 0; j--) {
      if (renderedLines[j].line.type === "chat-prompt") return <ChatPrompt />;
      if (renderedLines[j].line.type === "prompt") return <PromptSegment />;
    }
    return <PromptSegment />;
  };

  return (
    <div className="relative w-full max-w-[760px] mx-auto">
      <div className="relative rounded-xl overflow-hidden shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_80px_-12px_rgba(0,0,0,0.7)] dark">
        {/* macOS title bar */}
        <div className="flex items-center px-4 py-2.5 bg-[#1c1c1e] border-b border-white/[0.06]">
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.15)]" />
            <div className="h-3 w-3 rounded-full bg-[#febc2e] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.15)]" />
            <div className="h-3 w-3 rounded-full bg-[#28c840] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.15)]" />
          </div>
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <span className="text-[11px] text-white/40 font-mono">claudeshell</span>
            <span className="text-[10px] text-white/20">—</span>
            <span className="text-[10px] text-white/20 font-mono">80×24</span>
          </div>
          <div className="w-[60px]" />
        </div>

        {/* Terminal body */}
        <div
          ref={containerRef}
          className="px-5 py-4 font-mono text-[14px] leading-[1.65] h-[480px] overflow-y-auto bg-[#0a0e12] scrollbar-thin"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.006) 1px, transparent 1px)",
            backgroundSize: "100% 23.1px",
          }}
        >
          {renderedLines.map((entry, i) => {
            // Idle prompt (blinking cursor)
            if (entry.typed === "__idle__") {
              const isChat = entry.line.type === "chat-prompt";
              return (
                <div key={i} className="min-h-[1.5rem] flex items-center gap-2 flex-wrap">
                  {isChat ? <ChatPrompt /> : <PromptSegment />}
                  <Cursor />
                </div>
              );
            }

            // Typing line
            if (entry.typed !== undefined) {
              return (
                <div key={i} className="min-h-[1.5rem] flex items-center gap-2 flex-wrap">
                  {getPromptForLine(entry)}
                  <span className="text-white/90 font-medium">{entry.typed}</span>
                  {i === renderedLines.length - 1 && isCurrentlyTyping && <Cursor />}
                </div>
              );
            }

            // Finished command
            if (entry.line.type === "command") {
              return (
                <div key={i} className="min-h-[1.5rem] flex items-center gap-2 flex-wrap">
                  {getPromptForLine(entry)}
                  <span className="text-white/90 font-medium">{entry.line.content}</span>
                </div>
              );
            }

            // Blank
            if (entry.line.type === "blank") {
              return <div key={i} className="h-2" />;
            }

            // Code block
            if (entry.line.type === "ai-code") {
              return (
                <div key={i} className="whitespace-pre rounded bg-white/[0.03] mx-1 px-3 py-1.5 my-1 border-l-2 border-[#00ff41]/20 text-[13px]">
                  {entry.line.content}
                </div>
              );
            }

            // Cost footer
            if (entry.line.type === "cost") {
              return (
                <div key={i} className="min-h-[1.2rem] text-[11px]">
                  {entry.line.content}
                </div>
              );
            }

            // Error output
            if (entry.line.type === "error") {
              return (
                <div key={i} className="whitespace-pre-wrap text-[#ff6b6b]/80 text-[13px]">
                  {entry.line.content}
                </div>
              );
            }

            // System message
            if (entry.line.type === "system") {
              return (
                <div key={i} className="min-h-[1.5rem] text-[13px]">
                  {entry.line.content}
                </div>
              );
            }

            // Tool calls
            if (entry.line.type === "tool") {
              return (
                <div key={i} className="min-h-[1.3rem] text-white/20 text-[13px]">
                  {entry.line.content}
                </div>
              );
            }

            // AI text
            return (
              <div key={i} className="min-h-[1.5rem] whitespace-pre-wrap">
                {entry.line.content}
              </div>
            );
          })}

          {/* Final cursor */}
          {phase.kind === "done" && (
            <div className="min-h-[1.5rem] flex items-center gap-2 mt-1">
              <PromptSegment />
              <Cursor />
            </div>
          )}
        </div>
      </div>

      {/* Ambient reflection */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-[#00ff41]/4 blur-3xl rounded-full pointer-events-none" />
    </div>
  );
}
