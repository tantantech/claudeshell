"use client";

import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Terminal } from "lucide-react";
import { GithubIcon } from "./github-icon";
import { cn } from "@/lib/utils";

export function CTA() {
  return (
    <section className="relative z-10 py-16 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        {/* Glow */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-primary/6 dark:bg-primary/3 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8">
            <Terminal className="h-8 w-8 text-primary" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Ready to{" "}
            <span className="text-primary text-glow">upgrade</span>
            {" "}your terminal?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
            One install command. Set your API key. Start using AI in your shell.
          </p>

          {/* Install block */}
          <div className="inline-flex items-center gap-3 h-14 px-6 rounded-2xl border border-border bg-card glass terminal-glow font-mono text-base mb-8">
            <span className="text-primary">$</span>
            <span className="text-foreground">npm install -g nesh</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://github.com/tantantech/nesh"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 px-8 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              <GithubIcon className="h-4 w-4 mr-2" />
              Star on GitHub
              <ArrowRight className="h-4 w-4 ml-2" />
            </a>
            <a
              href="https://www.npmjs.com/package/nesh"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-12 px-8 rounded-xl font-semibold border-border bg-card glass-subtle hover:border-primary/30"
              )}
            >
              View on npm
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
