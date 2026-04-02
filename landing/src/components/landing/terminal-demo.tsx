"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface TerminalLine {
  type: "prompt" | "command" | "output" | "tool" | "ai" | "blank";
  text: string;
  delay: number;
}

const DEMO_LINES: TerminalLine[] = [
  { type: "prompt", text: "claudeshell", delay: 0 },
  { type: "command", text: "ls", delay: 600 },
  { type: "output", text: "README.md  package.json  src/  tests/", delay: 300 },
  { type: "blank", text: "", delay: 300 },
  { type: "prompt", text: "claudeshell", delay: 100 },
  { type: "command", text: "a find typescript files over 100 lines", delay: 1200 },
  { type: "tool", text: "  \u2192 Reading src/...", delay: 400 },
  { type: "tool", text: "  \u2192 Running wc -l src/*.ts...", delay: 600 },
  { type: "blank", text: "", delay: 200 },
  { type: "ai", text: "Found 3 TypeScript files over 100 lines:", delay: 300 },
  { type: "ai", text: "  src/shell.ts    163 lines", delay: 150 },
  { type: "ai", text: "  src/ai.ts       179 lines", delay: 150 },
  { type: "ai", text: "  src/config.ts   106 lines", delay: 150 },
  { type: "blank", text: "", delay: 600 },
  { type: "prompt", text: "claudeshell", delay: 100 },
  { type: "command", text: "a explain the last error", delay: 1000 },
  { type: "tool", text: "  \u2192 Analyzing error context...", delay: 500 },
  { type: "blank", text: "", delay: 200 },
  { type: "ai", text: "The TypeScript compiler found a type mismatch in", delay: 200 },
  { type: "ai", text: "src/handler.ts:42 \u2014 passing `string` where it", delay: 150 },
  { type: "ai", text: "expects `RequestConfig`. Quick fix:", delay: 150 },
  { type: "ai", text: "  const config: RequestConfig = { url: endpoint };", delay: 200 },
];

// State machine phases
type Phase =
  | { kind: "waiting"; lineIndex: number }
  | { kind: "typing"; lineIndex: number; charIndex: number }
  | { kind: "advancing"; lineIndex: number }
  | { kind: "done" };

const Cursor = () => <span className="cursor-blink text-primary" />;

const Prompt = () => (
  <span className="flex items-center gap-0 shrink-0">
    <span className="bg-primary/90 text-primary-foreground px-2 py-0.5 text-[11px] font-bold rounded-l">
      claudeshell
    </span>
    <span className="bg-foreground/8 dark:bg-white/8 text-foreground/60 px-1.5 py-0.5 text-[11px]">
      ~/Projects
    </span>
    <span className="bg-foreground/5 dark:bg-white/5 text-foreground/40 px-1.5 py-0.5 text-[11px] rounded-r">
      main
    </span>
    <span className="text-primary/70 ml-2 text-xs">&gt;</span>
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

  // Main state machine
  useEffect(() => {
    clearTimer();

    if (phase.kind === "done") {
      timerRef.current = setTimeout(() => {
        setRenderedLines([]);
        setPhase({ kind: "waiting", lineIndex: 0 });
      }, 4000);
      return clearTimer;
    }

    if (phase.kind === "waiting") {
      const { lineIndex } = phase;
      if (lineIndex >= DEMO_LINES.length) {
        setPhase({ kind: "done" });
        return;
      }
      const line = DEMO_LINES[lineIndex];
      timerRef.current = setTimeout(() => {
        if (line.type === "command") {
          // Add the prompt line first, then start typing
          setRenderedLines((prev) => [
            ...prev,
            { line: DEMO_LINES[lineIndex - 1] ?? line, typed: "" },
          ]);
          setPhase({ kind: "typing", lineIndex, charIndex: 0 });
        } else if (line.type === "prompt") {
          // Don't render prompt yet — it gets rendered when the command starts typing
          setPhase({ kind: "waiting", lineIndex: lineIndex + 1 });
        } else {
          // Render non-prompt, non-command lines immediately
          setRenderedLines((prev) => [...prev, { line }]);
          setPhase({ kind: "waiting", lineIndex: lineIndex + 1 });
        }
      }, line.delay);
      return clearTimer;
    }

    if (phase.kind === "typing") {
      const { lineIndex, charIndex } = phase;
      const cmd = DEMO_LINES[lineIndex].text;

      if (charIndex < cmd.length) {
        timerRef.current = setTimeout(() => {
          setRenderedLines((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, typed: cmd.slice(0, charIndex + 1) };
            return next;
          });
          setPhase({ kind: "typing", lineIndex, charIndex: charIndex + 1 });
        }, 30 + Math.random() * 40);
        return clearTimer;
      }

      // Typing done — finalize the line and advance
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

  // Auto-scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [renderedLines]);

  const getLineClasses = (line: TerminalLine) => {
    switch (line.type) {
      case "command":
        return "text-white/90 font-medium";
      case "output":
        return "text-white/50";
      case "tool":
        return "text-primary/50 text-[13px]";
      case "ai":
        return "text-primary/90";
      case "blank":
        return "";
      default:
        return "text-white/70";
    }
  };

  const isCurrentlyTyping = phase.kind === "typing";

  return (
    <div className="relative w-full max-w-[640px] mx-auto">
      <div className="relative rounded-xl border border-white/[0.06] bg-[#0c1210] dark:bg-[#050a08] overflow-hidden shadow-2xl shadow-black/30 dark:shadow-black/50">
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.04] bg-white/[0.02]">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <span className="flex-1 text-center text-[11px] text-white/30 font-mono">
            claudeshell
          </span>
          <div className="w-[52px]" />
        </div>

        {/* Terminal body */}
        <div
          ref={containerRef}
          className="p-4 font-mono text-[13px] leading-[1.7] min-h-[180px] overflow-hidden"
        >
          {renderedLines.map((entry, i) => {
            // This is a prompt+typing line
            if (entry.typed !== undefined) {
              return (
                <div key={i} className="min-h-[1.5rem] flex items-center gap-2">
                  <Prompt />
                  <span className="text-white/90 font-medium">
                    {entry.typed}
                  </span>
                  {i === renderedLines.length - 1 && isCurrentlyTyping && (
                    <Cursor />
                  )}
                </div>
              );
            }

            // Finalized command line (after typing is done)
            if (entry.line.type === "command") {
              return (
                <div key={i} className="min-h-[1.5rem] flex items-center gap-2">
                  <Prompt />
                  <span className="text-white/90 font-medium">
                    {entry.line.text}
                  </span>
                </div>
              );
            }

            // All other lines
            return (
              <div
                key={i}
                className={`${getLineClasses(entry.line)} min-h-[1.5rem]`}
              >
                {entry.line.text}
              </div>
            );
          })}

          {/* Idle cursor on new prompt — only when NOT typing and NOT done */}
          {phase.kind === "waiting" &&
            phase.lineIndex < DEMO_LINES.length &&
            DEMO_LINES[phase.lineIndex]?.type === "prompt" && (
              <div className="min-h-[1.5rem] flex items-center gap-2">
                <Prompt />
                <Cursor />
              </div>
            )}

          {/* Show cursor after all lines rendered, waiting to restart */}
          {phase.kind === "done" && (
            <div className="min-h-[1.5rem] flex items-center gap-2 mt-1">
              <Prompt />
              <Cursor />
            </div>
          )}
        </div>
      </div>

      {/* Subtle reflection */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-2/3 h-10 bg-primary/6 blur-3xl rounded-full" />
    </div>
  );
}
