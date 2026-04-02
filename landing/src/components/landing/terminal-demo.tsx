"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";

interface TerminalLine {
  type: "prompt" | "command" | "output" | "tool" | "ai" | "ai-code" | "blank";
  content: ReactNode;
  delay: number;
}

// Styled fragments for realistic output
const dir = (name: string) => (
  <span className="text-[#5fd7ff] font-semibold">{name}</span>
);
const file = (name: string) => <span className="text-[#c0c5ce]">{name}</span>;
const dim = (text: string) => <span className="text-white/25">{text}</span>;

const DEMO_LINES: TerminalLine[] = [
  { type: "prompt", content: null, delay: 0 },
  { type: "command", content: "ls -la", delay: 500 },
  {
    type: "output",
    content: (
      <>
        {dim("drwxr-xr-x  12 user staff  384 Mar 28 09:41")} {dir(".")}
        {"\n"}
        {dim("-rw-r--r--   1 user staff 1.2K Mar 28 09:41")} {file("README.md")}
        {"\n"}
        {dim("-rw-r--r--   1 user staff  892 Mar 28 09:40")} {file("package.json")}
        {"\n"}
        {dim("drwxr-xr-x   8 user staff  256 Mar 28 09:41")} {dir("src/")}
        {"\n"}
        {dim("drwxr-xr-x   4 user staff  128 Mar 28 09:30")} {dir("tests/")}
      </>
    ),
    delay: 200,
  },
  { type: "blank", content: null, delay: 400 },
  { type: "prompt", content: null, delay: 100 },
  {
    type: "command",
    content: "a find typescript files over 100 lines",
    delay: 1200,
  },
  {
    type: "tool",
    content: (
      <span className="text-white/20">
        {"  "}
        <span className="text-[#5fd7ff]/40">{"▸"}</span> Reading src/...
      </span>
    ),
    delay: 400,
  },
  {
    type: "tool",
    content: (
      <span className="text-white/20">
        {"  "}
        <span className="text-[#5fd7ff]/40">{"▸"}</span> Running{" "}
        <span className="text-white/30">wc -l src/*.ts</span>
      </span>
    ),
    delay: 600,
  },
  { type: "blank", content: null, delay: 200 },
  {
    type: "ai",
    content: (
      <span className="text-[#a8e6cf]">
        Found <span className="text-white font-semibold">3</span> TypeScript
        files over 100 lines:
      </span>
    ),
    delay: 300,
  },
  {
    type: "ai-code",
    content: (
      <span className="text-[#a8e6cf]/80">
        {"  "}
        <span className="text-[#ffd580]">src/shell.ts</span>
        {"    "}
        <span className="text-white/60">163 lines</span>
        {"\n  "}
        <span className="text-[#ffd580]">src/ai.ts</span>
        {"       "}
        <span className="text-white/60">179 lines</span>
        {"\n  "}
        <span className="text-[#ffd580]">src/config.ts</span>
        {"   "}
        <span className="text-white/60">106 lines</span>
      </span>
    ),
    delay: 200,
  },
  { type: "blank", content: null, delay: 500 },
  { type: "prompt", content: null, delay: 100 },
  { type: "command", content: "a explain the last error", delay: 1000 },
  {
    type: "tool",
    content: (
      <span className="text-white/20">
        {"  "}
        <span className="text-[#5fd7ff]/40">{"▸"}</span> Analyzing error
        context...
      </span>
    ),
    delay: 500,
  },
  { type: "blank", content: null, delay: 200 },
  {
    type: "ai",
    content: (
      <span className="text-[#a8e6cf]">
        The TypeScript compiler found a{" "}
        <span className="text-[#ff6b6b] font-semibold">type mismatch</span> in{" "}
        <span className="text-[#ffd580]">src/handler.ts:42</span>
      </span>
    ),
    delay: 200,
  },
  {
    type: "ai",
    content: (
      <span className="text-[#a8e6cf]/80">
        You&apos;re passing a{" "}
        <span className="text-[#ff6b6b] bg-[#ff6b6b]/10 px-1 rounded">
          string
        </span>{" "}
        where the function expects{" "}
        <span className="text-[#5fd7ff] bg-[#5fd7ff]/10 px-1 rounded">
          RequestConfig
        </span>
      </span>
    ),
    delay: 150,
  },
  { type: "blank", content: null, delay: 100 },
  {
    type: "ai",
    content: <span className="text-[#a8e6cf]/60">Quick fix:</span>,
    delay: 100,
  },
  {
    type: "ai-code",
    content: (
      <span>
        {"  "}
        <span className="text-[#c792ea]">const</span>{" "}
        <span className="text-[#82aaff]">config</span>
        <span className="text-white/40">:</span>{" "}
        <span className="text-[#5fd7ff]">RequestConfig</span>{" "}
        <span className="text-white/40">=</span>{" "}
        <span className="text-white/40">{"{"}</span>{" "}
        <span className="text-[#a8e6cf]">url</span>
        <span className="text-white/40">:</span>{" "}
        <span className="text-[#82aaff]">endpoint</span>{" "}
        <span className="text-white/40">{"}"}</span>
        <span className="text-white/40">;</span>
      </span>
    ),
    delay: 200,
  },
];

type Phase =
  | { kind: "waiting"; lineIndex: number }
  | { kind: "typing"; lineIndex: number; charIndex: number }
  | { kind: "done" };

const Cursor = () => <span className="cursor-blink text-[#00ff41]" />;

// CSS powerline arrow — no nerd font needed
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
    {/* Green segment */}
    <span className="bg-[#00d639] text-[#050a08] px-2.5 text-[12px] font-bold h-full flex items-center">
      claudeshell
    </span>
    <Arrow from="#00d639" to="#3a4a5a" />
    {/* Blue-gray segment */}
    <span className="bg-[#3a4a5a] text-[#8fa4b8] px-2 text-[12px] h-full flex items-center">
      ~/Projects
    </span>
    <Arrow from="#3a4a5a" to="transparent" />
    {/* Git branch */}
    <span className="text-[#5fd7ff]/50 text-[12px] ml-1.5 flex items-center gap-1">
      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
        <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
      </svg>
      main
    </span>
    {/* Prompt char */}
    <span className="text-[#00ff41]/70 ml-2.5 text-[13px]">❯</span>
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

      if (line.type === "prompt") {
        // Show prompt with idle cursor immediately, then wait for command
        const nextLine = DEMO_LINES[lineIndex + 1];
        const promptDelay = nextLine?.delay ?? 500;
        // Add an idle prompt line to rendered output
        setRenderedLines((prev) => [
          ...prev,
          { line, typed: "__idle__" },
        ]);
        timerRef.current = setTimeout(() => {
          // Replace idle prompt with typing prompt
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

  return (
    <div className="relative w-full max-w-[760px] mx-auto">
      {/* Terminal window */}
      <div className="relative rounded-xl overflow-hidden shadow-[0_25px_60px_-12px_rgba(0,0,0,0.5)] dark:shadow-[0_25px_80px_-12px_rgba(0,0,0,0.7)] dark">
        {/* macOS title bar */}
        <div className="flex items-center px-4 py-2.5 bg-[#1c1c1e] border-b border-white/[0.06]">
          {/* Traffic lights */}
          <div className="flex gap-2">
            <div className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.15)]" />
            <div className="h-3 w-3 rounded-full bg-[#febc2e] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.15)]" />
            <div className="h-3 w-3 rounded-full bg-[#28c840] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.15)]" />
          </div>
          {/* Title */}
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <span className="text-[11px] text-white/40 font-mono">
              claudeshell
            </span>
            <span className="text-[10px] text-white/20">—</span>
            <span className="text-[10px] text-white/20 font-mono">
              80×24
            </span>
          </div>
          {/* Balance */}
          <div className="w-[60px]" />
        </div>

        {/* Terminal body */}
        <div
          ref={containerRef}
          className="px-5 py-4 font-mono text-[14px] leading-[1.65] h-[480px] overflow-y-auto bg-[#0a0e12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.008) 1px, transparent 1px)",
            backgroundSize: "100% 23.1px",
          }}
        >
          {renderedLines.map((entry, i) => {
            // Idle prompt (waiting for command)
            if (entry.typed === "__idle__") {
              return (
                <div
                  key={i}
                  className="min-h-[1.5rem] flex items-center gap-2 flex-wrap"
                >
                  <PromptSegment />
                  <Cursor />
                </div>
              );
            }

            // Typing line (prompt + partial command)
            if (entry.typed !== undefined) {
              return (
                <div
                  key={i}
                  className="min-h-[1.5rem] flex items-center gap-2 flex-wrap"
                >
                  <PromptSegment />
                  <span className="text-white/90 font-medium">
                    {entry.typed}
                  </span>
                  {i === renderedLines.length - 1 && isCurrentlyTyping && (
                    <Cursor />
                  )}
                </div>
              );
            }

            // Finished command
            if (entry.line.type === "command") {
              return (
                <div
                  key={i}
                  className="min-h-[1.5rem] flex items-center gap-2 flex-wrap"
                >
                  <PromptSegment />
                  <span className="text-white/90 font-medium">
                    {entry.line.content}
                  </span>
                </div>
              );
            }

            // Blank line
            if (entry.line.type === "blank") {
              return <div key={i} className="h-3" />;
            }

            // Code block (indented AI output)
            if (entry.line.type === "ai-code") {
              return (
                <div
                  key={i}
                  className="min-h-[1.5rem] whitespace-pre rounded bg-white/[0.03] mx-1 px-3 py-1 my-0.5 border-l-2 border-[#00ff41]/20"
                >
                  {entry.line.content}
                </div>
              );
            }

            // Other lines (output, tool, ai)
            return (
              <div key={i} className="min-h-[1.5rem] whitespace-pre-wrap">
                {entry.line.content}
              </div>
            );
          })}

          {/* Final cursor after all lines */}
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
