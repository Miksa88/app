import { useState } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail } from "lucide-react";
import { toast } from "sonner";
import GradientButton from "@/components/GradientButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { PrivacyBadge } from "@/components/ui/privacy-badge";
import { signInWithPassword, signUpConfirmed } from "@/services/authService";
import { checkPwnedPassword } from "@/utils/auth/pwnedPasswordCheck";

interface SignUpSheetProps {
  onComplete: (method: string, email?: string) => void;
  onBack: () => void;
}

const SignUpSheet = ({ onComplete }: SignUpSheetProps) => {
  const { t } = useLanguage();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // Basic validation
    if (!email.trim() || !password || !confirmPassword) {
      toast.error(t("signup.errorMissingFields") || "Popuni sva polja");
      return;
    }
    if (password.length < 8) {
      toast.error(t("signup.passwordShort") || "Password mora imati bar 8 karaktera");
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("signup.passwordMismatch") || "Lozinke se ne poklapaju");
      return;
    }

    setSubmitting(true);

    // HIBP proverera (P2-INFRA-1) — block ako je password u poznatim curenjima.
    // Fail-open: ako HIBP nedostupan, propustamo (network ne sme da blokira signup).
    try {
      const hibp = await checkPwnedPassword(password);
      if (hibp.pwned) {
        setSubmitting(false);
        toast.error(t("signup.passwordPwned"));
        return;
      }
    } catch {
      // fail-open per design
    }

    // 1. Server-side signup koji preskace Supabase email confirmation flow.
    //    Stari put (auth.signUp + auto-confirm-signup EF) je slao confirmation
    //    mail i posle ~4 signup-a hitao "email rate limit exceeded". Nova EF
    //    `signup-confirmed` koristi auth.admin.createUser({email_confirm:true})
    //    — nikakav mail se ne salje, nema rate limit-a, instant ready.
    const signupErrMsg = await signUpConfirmed(email.trim(), password);

    if (signupErrMsg) {
      setSubmitting(false);
      toast.error(signupErrMsg);
      return;
    }

    // 2. Sign in — sada bi trebalo da radi odmah (user je email_confirmed=true)
    try {
      await signInWithPassword(email.trim(), password);
    } catch (signInErr) {
      setSubmitting(false);
      toast.error(signInErr instanceof Error ? signInErr.message : String(signInErr));
      return;
    }

    setSubmitting(false);

    // Session je aktivna; AuthContext.onAuthStateChange will populate clientId.
    onComplete("email", email);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top section with checkmark */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, ...IOS_SPRING.bouncy }}
          className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-6 shadow-fab"
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-title-1 font-bold text-foreground text-center mb-2"
        >
          {t("signup.planReady")}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-body text-muted-foreground text-center max-w-[280px]"
        >
          {t("signup.createAccount")}
        </motion.p>
      </div>

      {/* Bottom sheet always visible */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, ...IOS_SPRING.medium }}
        className="bg-card rounded-t-3xl px-6 pt-6 pb-10 shadow-elevated"
      >
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />

        <AnimatePresence mode="wait">
          {!showEmailForm ? (
            <motion.div
              key="social"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Apple button */}
              <motion.button
                whileTap={{ scale: TAP_SCALE.primary }}
                onClick={() => onComplete("apple")}
                className="w-full flex items-center justify-center gap-3 bg-foreground text-background font-semibold py-4 rounded-[14px] text-body ios-row-h"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.99 2.97 12.5 4.7 9.44C5.56 7.93 7.13 6.97 8.82 6.95C10.1 6.93 11.32 7.82 12.11 7.82C12.89 7.82 14.37 6.74 15.92 6.91C16.57 6.94 18.39 7.18 19.56 8.9C19.47 8.96 17.39 10.16 17.41 12.72C17.44 15.82 20.06 16.82 20.09 16.83C20.07 16.89 19.67 18.29 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                </svg>
                {t("signup.continueApple")}
              </motion.button>

              {/* Google button */}
              <motion.button
                whileTap={{ scale: TAP_SCALE.primary }}
                onClick={() => onComplete("google")}
                className="w-full flex items-center justify-center gap-3 bg-background border border-border font-medium py-4 rounded-[14px] text-body text-foreground ios-row-h"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t("signup.continueGoogle")}
              </motion.button>

              {/* Email link */}
              <motion.button
                whileTap={{ scale: TAP_SCALE.primary }}
                onClick={() => setShowEmailForm(true)}
                className="w-full flex items-center justify-center gap-3 bg-background border border-border font-medium py-4 rounded-[14px] text-body text-foreground ios-row-h"
              >
                <Mail size={20} />
                {t("signup.continueEmail")}
              </motion.button>

              {/* Privacy badge — WS-8 G3 */}
              <PrivacyBadge className="mt-2" />
            </motion.div>
          ) : (
            <motion.form
              key="email-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailSubmit}
              className="space-y-4"
            >
              <div className="bg-background rounded-[10px] border border-border overflow-hidden">
                <label htmlFor="signup-email" className="sr-only">{t("signup.emailPlaceholder")}</label>
                <input
                  id="signup-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  placeholder={t("signup.emailPlaceholder")}
                  aria-label={t("signup.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground px-4 py-4 text-body focus:outline-none min-h-11"
                />
                <div className="h-px bg-border ml-4" />
                <div className="relative">
                  <label htmlFor="signup-password" className="sr-only">{t("signup.passwordPlaceholder")}</label>
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder={t("signup.passwordPlaceholder")}
                    aria-label={t("signup.passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground px-4 py-4 pr-12 text-body focus:outline-none min-h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                    aria-pressed={showPassword}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground min-w-11 min-h-11 flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff size={ICON_SIZE.md} aria-hidden="true" /> : <Eye size={ICON_SIZE.md} aria-hidden="true" />}
                  </button>
                </div>
                <div className="h-px bg-border ml-4" />
                <label htmlFor="signup-confirm" className="sr-only">{t("signup.confirmPassword")}</label>
                <input
                  id="signup-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t("signup.confirmPassword")}
                  aria-label={t("signup.confirmPassword")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground px-4 py-4 text-body focus:outline-none min-h-11"
                />
              </div>

              <GradientButton type="submit" className="w-full" size="lg" loading={submitting} disabled={submitting}>
                {submitting ? (t("common.loading") || "Kreiram...") : t("signup.createAccountBtn")}
              </GradientButton>

              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="w-full text-center text-subhead text-muted-foreground py-2 min-h-11"
              >
                ← {t("signup.back")}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Terms */}
        <p className="text-caption-1 text-muted-foreground text-center mt-6">
          {t("login.termsNotice")}{" "}
          <span className="text-foreground font-medium underline">{t("login.terms")}</span>
          {" "}{t("login.and")}{" "}
          <span className="text-foreground font-medium underline">{t("login.privacy")}</span>
        </p>
      </motion.div>
    </div>
  );
};

export default SignUpSheet;
