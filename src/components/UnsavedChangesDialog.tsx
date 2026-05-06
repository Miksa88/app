// UnsavedChangesDialog — shadcn AlertDialog migration (WS-3)
// Spec: design-system/MASTER.md §3.2 (Destructive confirmations)

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

const UnsavedChangesDialog = ({ open, onStay, onLeave }: Props) => {
  const { t } = useLanguage();

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onStay()}>
      <AlertDialogContent className="max-w-[320px] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("unsaved.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("unsaved.message")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:gap-3">
          <AlertDialogCancel
            onClick={onStay}
            className="flex-1 min-h-11 rounded-xl"
          >
            {t("unsaved.stay")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onLeave}
            className="flex-1 min-h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("unsaved.leave")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnsavedChangesDialog;
