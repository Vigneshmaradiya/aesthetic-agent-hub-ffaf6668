import { Suspense } from "react";
import { HudShell } from "@/components/layout/HudShell";

export default function HomePage() {
  return (
    <Suspense>
      <HudShell />
    </Suspense>
  );
}
