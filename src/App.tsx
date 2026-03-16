import { ThemeProvider } from "./components/providers/ThemeProvider";
import { HudShell } from "./components/layout/HudShell";
import { Toaster } from "sonner";

export default function App() {
  return (
    <ThemeProvider>
      <HudShell />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgb(26, 26, 30)",
            border: "1px solid rgb(42, 42, 46)",
            color: "rgb(232, 232, 236)",
            fontSize: "13px",
          },
        }}
      />
    </ThemeProvider>
  );
}
