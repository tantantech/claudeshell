"use client";

import {
  Terminal,
  Zap,
  Shield,
  FileCode,
  GitBranch,
  Keyboard,
  ArrowRight,
  Command,
  Layers,
  MessageSquare,
  Palette,
  PipetteIcon,
  Settings,
  DollarSign,
  Cpu,
  Puzzle,
  SquareTerminal,
  Type,
  Paintbrush,
  Users,
  Package,
} from "lucide-react";

const features = [
  {
    icon: Terminal,
    title: "Shell First",
    description:
      "Every command works as expected \u2014 pipes, redirects, globs. Nesh delegates to your system shell.",
    accent: "from-emerald-500/20 to-teal-500/20",
  },
  {
    icon: Zap,
    title: "Instant AI",
    description:
      'Prefix with "a" and Claude reads files, runs commands, writes code \u2014 all streamed in real-time.',
    accent: "from-green-500/20 to-emerald-500/20",
  },
  {
    icon: MessageSquare,
    title: "Chat Mode",
    description:
      'Type "a" alone to enter persistent chat. Multi-turn conversations with full tool access. /exit to return.',
    accent: "from-teal-500/20 to-cyan-500/20",
  },
  {
    icon: Cpu,
    title: "Model Selection",
    description:
      "Choose your model per query: --opus for deep reasoning, --haiku for quick answers, --sonnet by default.",
    accent: "from-cyan-500/20 to-emerald-500/20",
  },
  {
    icon: FileCode,
    title: "Error Auto-Fix",
    description:
      'Failed commands are analyzed instantly. Nesh suggests a fix and "a fix" applies it. Zero copy-paste.',
    accent: "from-emerald-500/20 to-green-500/20",
  },
  {
    icon: PipetteIcon,
    title: "Pipe Mode",
    description:
      "Works as a Unix pipe citizen. Pipe files into Nesh or pipe AI output to other commands.",
    accent: "from-green-500/20 to-teal-500/20",
  },
  {
    icon: Palette,
    title: "5 Prompt Themes",
    description:
      'Type "theme" to switch: Minimal, Classic, Powerline, Hacker, or Pastel. Instant style change.',
    accent: "from-teal-500/20 to-emerald-500/20",
  },
  {
    icon: DollarSign,
    title: "Cost Tracking",
    description:
      "See token usage and cost after every AI response. Per-message and per-session cost breakdowns.",
    accent: "from-emerald-500/20 to-cyan-500/20",
  },
  {
    icon: Shield,
    title: "Agent SDK",
    description:
      "Built on the official Claude Agent SDK. Full tool-use: file read/write, command execution, code editing.",
    accent: "from-cyan-500/20 to-teal-500/20",
  },
  {
    icon: GitBranch,
    title: "Git Aware",
    description:
      "Powerline-style prompt shows branch, directory, and status. Claude understands your repo context.",
    accent: "from-teal-500/20 to-green-500/20",
  },
  {
    icon: Settings,
    title: "Per-Project Config",
    description:
      "Drop a .nesh.json in any project to override model, permissions, and AI prefix. Global + local config.",
    accent: "from-green-500/20 to-emerald-500/20",
  },
  {
    icon: Command,
    title: "Fast Startup",
    description:
      "Agent SDK lazy-loaded on first AI command. Shell is instant \u2014 no waiting for model initialization.",
    accent: "from-emerald-500/20 to-teal-500/20",
  },
  {
    icon: Puzzle,
    title: "Plugin Ecosystem",
    description:
      "277 plugins ported from oh-my-zsh. Enable with one command. Type `gst` instead of `git status`.",
    accent: "from-violet-500/20 to-purple-500/20",
  },
  {
    icon: SquareTerminal,
    title: "Tab Completions",
    description:
      "Context-aware completions for 20+ commands. Press Tab after `git ch` for branch-aware suggestions.",
    accent: "from-purple-500/20 to-violet-500/20",
  },
  {
    icon: Type,
    title: "Auto-Suggestions",
    description:
      "Fish-like ghost text from history. See dim suggestions as you type, accept with right-arrow.",
    accent: "from-violet-500/20 to-indigo-500/20",
  },
  {
    icon: Paintbrush,
    title: "Syntax Highlighting",
    description:
      "Real-time colored input. Commands green, strings yellow, flags cyan. Output-only \u2014 never corrupts your typing.",
    accent: "from-indigo-500/20 to-violet-500/20",
  },
  {
    icon: Users,
    title: "Plugin Profiles",
    description:
      "Pick core, developer, devops, cloud, or ai-engineer. One selection configures dozens of plugins.",
    accent: "from-violet-500/20 to-purple-500/20",
  },
  {
    icon: Package,
    title: "Plugin Manager",
    description:
      "Install from git, enable/disable, hot-reload. `plugin doctor` diagnoses issues. No restart needed.",
    accent: "from-purple-500/20 to-violet-500/20",
  },
];

export function Features() {
  return (
    <section id="features" className="relative z-10 py-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-10">
          <p className="font-mono text-xs tracking-widest text-primary uppercase mb-3">
            Capabilities
          </p>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">
            Everything you need,{" "}
            <span className="text-primary text-glow">nothing you don&apos;t</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            A shell that stays out of your way for normal commands and brings full
            AI power when you need it.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl border border-border bg-card glass p-6 transition-all duration-300 hover:border-primary/20 hover:shadow-[0_0_30px_var(--glow)]"
            >
              {/* Gradient background on hover */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
              />

              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center mb-4 group-hover:border-primary/30 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  {feature.title}
                  <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
