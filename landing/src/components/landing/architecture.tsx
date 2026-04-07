"use client";

const modules = [
  { name: "cli.ts", desc: "Entry point", color: "bg-primary/20 border-primary/30" },
  { name: "shell.ts", desc: "REPL loop", color: "bg-primary/15 border-primary/25" },
  { name: "classify.ts", desc: "Input routing", color: "bg-primary/15 border-primary/25" },
  { name: "builtins.ts", desc: "cd, export, exit", color: "bg-emerald-500/15 border-emerald-500/25" },
  { name: "passthrough.ts", desc: "bash -c spawn", color: "bg-teal-500/15 border-teal-500/25" },
  { name: "ai.ts", desc: "Agent SDK", color: "bg-cyan-500/15 border-cyan-500/25" },
  { name: "chat.ts", desc: "Chat mode", color: "bg-cyan-500/15 border-cyan-500/25" },
  { name: "renderer.ts", desc: "Markdown output", color: "bg-cyan-500/15 border-cyan-500/25" },
  { name: "config.ts", desc: "Settings", color: "bg-emerald-500/10 border-emerald-500/20" },
  { name: "context.ts", desc: "Project detection", color: "bg-emerald-500/10 border-emerald-500/20" },
  { name: "cost.ts", desc: "Token tracking", color: "bg-emerald-500/10 border-emerald-500/20" },
  { name: "session.ts", desc: "Session state", color: "bg-teal-500/15 border-teal-500/25" },
  { name: "prompt.ts", desc: "Powerline prompt", color: "bg-emerald-500/10 border-emerald-500/20" },
  { name: "templates.ts", desc: "Prompt themes", color: "bg-teal-500/10 border-teal-500/20" },
  { name: "history.ts", desc: "Command history", color: "bg-emerald-500/10 border-emerald-500/20" },
  { name: "pipe.ts", desc: "Pipe mode", color: "bg-teal-500/10 border-teal-500/20" },
  { name: "interactive.ts", desc: "Interactive cmds", color: "bg-teal-500/10 border-teal-500/20" },
  { name: "types.ts", desc: "Type definitions", color: "bg-teal-500/10 border-teal-500/20" },
  { name: "alias.ts", desc: "Alias expansion", color: "bg-violet-500/15 border-violet-500/25" },
  { name: "plugins/", desc: "Plugin engine", color: "bg-violet-500/15 border-violet-500/25" },
  { name: "completions/", desc: "Tab completion", color: "bg-violet-500/15 border-violet-500/25" },
  { name: "suggestions/", desc: "Auto-suggest", color: "bg-violet-500/15 border-violet-500/25" },
  { name: "highlighting/", desc: "Syntax color", color: "bg-violet-500/15 border-violet-500/25" },
  { name: "migration/", desc: "OMZ migration", color: "bg-violet-500/15 border-violet-500/25" },
  { name: "plugin-manager.ts", desc: "Plugin CLI", color: "bg-violet-500/15 border-violet-500/25" },
  { name: "segment-registry.ts", desc: "Prompt segments", color: "bg-violet-500/15 border-violet-500/25" },
];

export function Architecture() {
  return (
    <section id="architecture" className="relative z-10 py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-10">
          <p className="font-mono text-xs tracking-widest text-primary uppercase mb-3">
            Architecture
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Clean, auditable,{" "}
            <span className="text-primary text-glow">minimal</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            40+ modules. 5000+ lines. Plugin-powered architecture.
          </p>
        </div>

        {/* Architecture diagram */}
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl border border-border bg-card glass p-8 scanlines">
            {/* ASCII-art flow */}
            <pre className="font-mono text-xs sm:text-sm text-muted-foreground leading-loose overflow-x-auto">
              <code>{`  cli.ts \u2500\u2500\u25b8 shell.ts \u2500\u2500\u25b8 alias.ts \u2500\u2500\u25b8 classify.ts \u2500\u252c\u2500\u25b8 builtins.ts
                \u2502                                  \u251c\u2500\u25b8 passthrough.ts
                \u2502                                  \u2514\u2500\u25b8 ai.ts \u2192 renderer.ts
                \u251c\u2500\u25b8 plugins/loader.ts \u2500\u2500\u25b8 plugins/registry.ts
                \u251c\u2500\u25b8 completions/engine.ts
                \u251c\u2500\u25b8 suggestions/index.ts
                \u2514\u2500\u25b8 highlighting/renderer.ts`}</code>
            </pre>

            {/* Module grid */}
            <div className="mt-8 pt-8 border-t border-border/50">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {modules.map((mod) => (
                  <div
                    key={mod.name}
                    className={`rounded-lg border ${mod.color} px-3 py-2 text-xs font-mono transition-all duration-200 hover:scale-[1.03]`}
                  >
                    <span className="text-foreground font-semibold">{mod.name}</span>
                    <span className="text-muted-foreground ml-1.5">{mod.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tech stack badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-12">
          {[
            "Node.js 24+",
            "TypeScript 6",
            "Claude Agent SDK",
            "ESM",
            "Vitest",
            "tsdown",
          ].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 rounded-lg border border-border bg-card glass-subtle text-xs font-mono text-muted-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
