import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/landing/theme-provider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nesh \u2014 AI-Native Terminal Shell",
  description:
    "Type commands as usual. Prefix with 'a' to invoke Claude. Full filesystem & terminal access via the Agent SDK.",
  keywords: [
    "CLI",
    "terminal",
    "shell",
    "AI",
    "Claude",
    "Agent SDK",
    "TypeScript",
  ],
  openGraph: {
    title: "Nesh \u2014 AI-Native Terminal Shell",
    description:
      "Your terminal, supercharged with AI. Built on the Claude Agent SDK.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
