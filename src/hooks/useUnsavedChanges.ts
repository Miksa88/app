import { useState, useCallback } from "react";

export function useUnsavedChanges() {
  const [hasChanges, setHasChanges] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const guardNavigation = useCallback((action: () => void) => {
    if (hasChanges) {
      setPendingAction(() => action);
      setShowDialog(true);
    } else {
      action();
    }
  }, [hasChanges]);

  const confirmLeave = useCallback(() => {
    setShowDialog(false);
    setHasChanges(false);
    pendingAction?.();
    setPendingAction(null);
  }, [pendingAction]);

  const cancelLeave = useCallback(() => {
    setShowDialog(false);
    setPendingAction(null);
  }, []);

  return { hasChanges, markChanged, setHasChanges, guardNavigation, showDialog, confirmLeave, cancelLeave };
}
