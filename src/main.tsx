import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerAllSubscribers } from "@/services/subscribers";
import { initSentry } from "@/lib/sentry";
import { initNative } from "@/lib/native";
import { registerServiceWorker } from "@/lib/webPush";
import { applyTenantTheme } from "@/tenant.config";

// White-label (Faza 3.1): tenant brend boje + document.title pre prvog rendera
applyTenantTheme();

// Sentry init — mora pre bilo kakvog render-a da uhvati crash-eve rano
initSentry();

// Capacitor native layer (status bar, splash, keyboard) — no-op u pretraživaču
initNative();

// Bootstrap EventBus subscribers PRE nego sto bilo koja komponenta moze da
// emit-uje events (Spec 03 Sekcija 5.2). Idempotentno ako se HMR rerun-uje.
registerAllSubscribers();

// Web Push service worker — pasivno (nema permission request ovde, samo register)
void registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
