import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Nexus - Support HUD",
  description: "Agentic Support Heads-Up Display",
};

/**
 * Inline script that runs before first paint to apply the saved theme class.
 * Defaults to "dark" so existing users see no flash.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("nexus-theme")||"dark";var r=t==="system"?window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light":t;if(r==="dark")document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <ThemeProvider>
          <SessionProvider>
            <NuqsAdapter>{children}</NuqsAdapter>
            <Toaster />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
