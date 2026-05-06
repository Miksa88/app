import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerAllSubscribers } from "@/services/subscribers";
import { initSentry } from "@/lib/sentry";
import { initNative } from "@/lib/native";

// Sentry init — mora pre bilo kakvog render-a da uhvati crash-eve rano
initSentry();

// Capacitor native layer (status bar, splash, keyboard) — no-op u pretraživaču
initNative();

// Bootstrap EventBus subscribers PRE nego sto bilo koja komponenta moze da
// emit-uje events (Spec 03 Sekcija 5.2). Idempotentno ako se HMR rerun-uje.
registerAllSubscribers();

createRoot(document.getElementById("root")!).render(<App />);
