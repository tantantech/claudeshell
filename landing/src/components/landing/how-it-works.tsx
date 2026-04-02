"use client";

const steps = [
  {
    number: "01",
    title: "You type a command",
    description: "Regular shell commands work exactly as expected. No learning curve.",
    code: "git status",
  },
  {
    number: "02",
    title: "ClaudeShell classifies it",
    description: "Builtin? Shell command? AI request? Routing is instant.",
    code: "classify(input) \u2192 builtin | passthrough | ai",
  },
  {
    number: "03",
    title: 'Prefix "a" for AI',
    description: "Claude reads files, runs commands, and writes code \u2014 streamed live.",
    code: "a refactor src/utils.ts to use async/await",
  },
  {
    number: "04",
    title: "See everything",
    description: "Tool calls are shown in real-time. Full transparency, full control.",
    code: "\u2192 Reading src/utils.ts...\n\u2192 Writing src/utils.ts...",
  },
];

export function HowItWorks() {
  return (
    <section className="relative z-10 py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-10">
          <p className="font-mono text-xs tracking-widest text-primary uppercase mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Four steps.{" "}
            <span className="text-primary text-glow">Zero friction.</span>
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative rounded-2xl border border-border bg-card glass p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-[0_0_30px_var(--glow)]"
            >
              {/* Step number */}
              <span className="font-mono text-5xl font-black text-primary/10 dark:text-primary/8 absolute top-4 right-5 select-none">
                {step.number}
              </span>

              <div className="relative">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {step.description}
                </p>
                <div className="rounded-lg bg-background/60 dark:bg-black/40 border border-border/50 px-4 py-2.5 font-mono text-xs text-primary whitespace-pre-line">
                  {step.code}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
