"use client";

import { Badge } from "@/components/ui/badge";
import { Terminal, ArrowRight, Copy, Check } from "lucide-react";
import { GithubIcon } from "./github-icon";
import { useState } from "react";

export function Hero() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText("npm install -g nesh");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-4 sm:px-6 pt-24 pb-12">
      {/* Ambient glow — very subtle */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative flex flex-col items-center gap-6 max-w-3xl text-center">
        {/* Version badge */}
        <Badge
          variant="secondary"
          className="px-3.5 py-1 font-mono text-[11px] border border-primary/15 bg-primary/5 text-primary/80 gap-2 rounded-full"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
          v3.0 &mdash; Oh-My-Nesh
        </Badge>

        {/* Main heading */}
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter leading-[0.92]">
          <span className="block text-foreground">Your terminal,</span>
          <span className="block text-primary/90 mt-1">supercharged</span>
          <span className="block text-foreground mt-1">with AI.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-lg leading-relaxed">
          Type commands as usual. Prefix with{" "}
          <code className="px-1.5 py-0.5 rounded bg-primary/8 text-primary/90 font-mono text-sm font-semibold border border-primary/10">
            a
          </code>{" "}
          to invoke Claude with full filesystem and terminal access.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-2">
          {/* Install command */}
          <button
            onClick={handleCopy}
            className="group relative flex items-center gap-2.5 h-11 px-4 rounded-lg border border-border bg-card/80 backdrop-blur-sm font-mono text-sm transition-all duration-300 hover:border-primary/20 hover:shadow-[0_0_20px_var(--glow)] cursor-pointer w-full sm:w-auto"
          >
            <Terminal className="h-3.5 w-3.5 text-primary/60 shrink-0" />
            <span className="text-muted-foreground/60">$</span>
            <span className="text-foreground/90">npm install -g nesh</span>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-1" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 ml-1 group-hover:text-primary/60 transition-colors" />
            )}
          </button>

          <a
            href="https://github.com/tantantech/nesh"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg border border-primary/20 bg-primary/8 text-primary font-medium text-sm transition-all duration-300 hover:bg-primary/15 hover:border-primary/30 hover:shadow-[0_0_20px_var(--glow)]"
          >
            <GithubIcon className="h-4 w-4" />
            View on GitHub
            <ArrowRight className="h-3.5 w-3.5 opacity-60" />
          </a>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 pt-6 text-sm text-muted-foreground/60">
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-foreground/80">40+</span>
            <span>modules</span>
          </div>
          <div className="w-px h-3.5 bg-border/50" />
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-foreground/80">5000+</span>
            <span>lines</span>
          </div>
          <div className="w-px h-3.5 bg-border/50" />
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-foreground/80">628</span>
            <span>tests</span>
          </div>
        </div>
      </div>
    </section>
  );
}
