"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      toastOptions={{
        className: "!bg-nexus-surface !border-nexus-border !text-nexus-text",
        descriptionClassName: "!text-nexus-text-muted",
      }}
      richColors
    />
  );
}
