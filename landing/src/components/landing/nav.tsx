"use client";

import { ThemeToggle } from "./theme-toggle";
import { Terminal } from "lucide-react";
import { GithubIcon } from "./github-icon";

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 nav-glass">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:border-primary/40 transition-colors">
            <Terminal className="h-4 w-4 text-primary" />
          </div>
          <span className="font-mono font-bold text-sm tracking-tight">
            ne<span className="text-primary">sh</span>
          </span>
        </a>

        {/* Links */}
        <div className="flex items-center gap-1">
          <a
            href="#features"
            className="hidden sm:flex px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
          >
            Features
          </a>
          <a
            href="#demo"
            className="hidden sm:flex px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
          >
            Demo
          </a>
          <a
            href="#architecture"
            className="hidden sm:flex px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
          >
            Architecture
          </a>
          <div className="w-px h-5 bg-border mx-2" />
          <a
            href="https://github.com/tantantech/nesh"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 w-9 rounded-xl border border-border bg-card glass-subtle flex items-center justify-center transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_12px_var(--glow)]"
            aria-label="View on GitHub"
          >
            <GithubIcon className="h-4 w-4" />
          </a>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
