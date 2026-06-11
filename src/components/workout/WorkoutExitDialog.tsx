// ============================================================================
// WorkoutExitDialog — potvrda izlaska iz treninga (Task 1.2)
// ============================================================================

import { useLanguage } from "@/contexts/LanguageContext";
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

interface WorkoutExitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeave: () => void;
}

const WorkoutExitDialog = ({ open, onOpenChange, onLeave }: WorkoutExitDialogProps) => {
  const { t } = useLanguage();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{t("workout.leaveTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("workout.leaveDesc")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 sm:gap-3">
          <AlertDialogCancel
            onClick={() => onOpenChange(false)}
            className="flex-1 min-h-11 rounded-[14px]"
          >
            {t("workout.stay")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onLeave}
            className="flex-1 min-h-11 rounded-[14px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("workout.leave")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default WorkoutExitDialog;
