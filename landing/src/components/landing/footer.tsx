"use client";

import { Terminal } from "lucide-react";
import { GithubIcon } from "./github-icon";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/50 glass-subtle">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center">
              <Terminal className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-mono font-bold text-sm">
              ne<span className="text-primary">sh</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a
              href="https://github.com/tantantech/nesh"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <GithubIcon className="h-3.5 w-3.5" />
              GitHub
            </a>
            <Separator orientation="vertical" className="h-4" />
            <a
              href="https://www.npmjs.com/package/nesh"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              npm
            </a>
            <Separator orientation="vertical" className="h-4" />
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Anthropic
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground/60 font-mono">
            ISC License &middot; 2025
          </p>
        </div>
      </div>
    </footer>
  );
}
