// use-toast — sonner compat shim (WS-3 Toast unifikacija)
// Spec: design-system/MASTER.md §2.4 (Toast — sonner winner)
//
// Postojeći call-sites koriste `toast({ title, description, variant })` API.
// Ovaj shim mapira na sonner bez breaking change-a, tako da svi pozivi rade
// preko jednog rendering sistema (Sonner Toaster u App.tsx).
//
// Novi kod — direktno `import { toast } from "sonner"` i `toast.success(...)`.

import { toast as sonnerToast } from "sonner";

type Variant = "default" | "destructive";

export interface ToastOptions {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: Variant;
  duration?: number;
  action?: React.ReactNode;
}

/** Kompat wrapper — prima stari `{ title, description, variant }` format. */
function toast(opts: ToastOptions) {
  const title = typeof opts.title === "string" ? opts.title : String(opts.title ?? "");
  const description =
    typeof opts.description === "string" ? opts.description : (opts.description as string | undefined);
  const duration = opts.duration ?? (opts.variant === "destructive" ? 5000 : 3000);

  if (opts.variant === "destructive") {
    return sonnerToast.error(title, { description, duration });
  }
  return sonnerToast.success(title, { description, duration });
}

function dismiss(toastId?: string | number) {
  sonnerToast.dismiss(toastId);
}

function useToast() {
  return {
    toast,
    dismiss,
    toasts: [] as never[],
  };
}

export { useToast, toast };
