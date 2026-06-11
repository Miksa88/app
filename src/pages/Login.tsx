import { useState } from "react";
import { ICON_SIZE } from "@/lib/design-tokens";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import GradientButton from "@/components/GradientButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PhoneHeroMockup from "@/components/login/PhoneHeroMockup";
import { Eye, EyeOff, X, Mail } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHaptic } from "@/hooks/useHaptic";
import { MOTION_DURATION, MOTION_EASE, staggerContainer, staggerItem, TAP_SCALE, shouldReduceMotion } from "@/lib/motion";
import { signInWithPassword } from "@/services/authService";
import { getProfileRole } from "@/services/profileService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [showSignIn, setShowSignIn] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const haptic = useHaptic();

  // iOS drawer enter/exit — tween sa Apple UIKit krivom (cubic-bezier(0.32,0.72,0,1)),
  // ≤300ms, uz prefers-reduced-motion fallback (instant, bez slide-a).
  const reduceMotion = shouldReduceMotion();
  const sheetTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: MOTION_DURATION.base, ease: MOTION_EASE.iosDefault };
  // Swap social ↔ email forma unutar sheet-a — brz cross-fade
  const sheetSwapTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: MOTION_DURATION.fast, ease: MOTION_EASE.iosDefault };

  // Route posle uspešnog login-a — po profile.role iz Supabase-a (ne po email stringu)
  const routeByRole = async (userId: string) => {
    // Greška se guta (role=null → /home) — isto ponašanje kao raniji
    // direktni supabase poziv koji je ignorisao error.
    const role = await getProfileRole(userId).catch(() => null);
    navigate(role === "trainer" ? "/trainer" : "/home");
  };

  const validateEmail = (val: string): string | undefined => {
    if (!val.trim()) return t("login.errorEmailRequired");
    if (!EMAIL_REGEX.test(val.trim())) return t("login.errorEmailInvalid");
    return undefined;
  };

  const validatePassword = (val: string): string | undefined => {
    if (!val) return t("login.errorPasswordRequired");
    if (val.length < 6) return t("login.errorPasswordShort");
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    if (emailErr || passwordErr) {
      setErrors({ email: emailErr, password: passwordErr });
      haptic("warning");
      return;
    }
    setErrors({});
    setIsLoading(true);

    let userId: string;
    try {
      userId = await signInWithPassword(email.trim(), password);
    } catch (err) {
      setIsLoading(false);
      haptic("warning");
      const msg = err instanceof Error && err.message ? err.message : null;
      toast.error(msg || t("login.errorInvalidCredentials") || "Pogrešan email ili password");
      return;
    }

    setIsLoading(false);
    haptic("success");
    await routeByRole(userId);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-5 pb-safe-cta pt-header-safe relative">
      {/* Language switcher */}
      <div className="w-full flex justify-end mb-2">
        <LanguageSwitcher />
      </div>

      {/* Top section: Phone mockup + tagline */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm flex flex-col items-center flex-1 justify-center"
      >
        {/* Hero mockup — čist DOM (theme-synced mini Home ekran), bez slike */}
        <motion.div variants={staggerItem} className="mb-6">
          <PhoneHeroMockup />
        </motion.div>

        <motion.h1
          variants={staggerItem}
          className="text-title-1 font-bold text-foreground text-center leading-tight tracking-tight mb-0"
        >
          {t("login.tagline")}
        </motion.h1>
      </motion.div>

      {/* Bottom section: CTA buttons */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: MOTION_DURATION.slow, delay: 0.3 }}
        className="w-full max-w-sm space-y-3 mb-8 mt-10"
      >
        <GradientButton
          onClick={() => navigate("/onboarding")}
          className="w-full"
          size="lg"
        >
          {t("login.getStarted") || "Get Started"}
        </GradientButton>

        <p className="text-center text-subhead text-muted-foreground">
          {t("login.alreadyHaveAccount") || "Already have an account?"}{" "}
          <motion.button
            whileTap={{ scale: TAP_SCALE.secondary }}
            onClick={() => setShowSignIn(true)}
            className="text-primary font-semibold min-h-11 px-2"
          >
            {t("login.signInLink") || "Sign In"}
          </motion.button>
        </p>
      </motion.div>

      {/* Bottom sheet overlay */}
      <AnimatePresence>
        {showSignIn && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: MOTION_DURATION.base }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => { setShowSignIn(false); setShowEmailForm(false); }}
            />

            {/* Bottom sheet — sidran uz dno VIEWPORTA (inset-x-0 bottom-0 + dvh cap),
                tako da su svi CTA vidljivi na 375×812 bez skrola van sheet-a.
                dvh umesto vh: iOS Safari toolbar ne sme da gurne sadržaj ispod fold-a. */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t("login.signInTitle") || "Sign In"}
              initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
              transition={sheetTransition}
              className="fixed inset-x-0 bottom-0 z-sheet bg-card rounded-t-3xl px-6 pt-6 pb-safe-cta shadow-elevated max-h-[85dvh] overflow-y-auto overscroll-contain"
            >
              {/* Handle bar */}
              <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-5" />

              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-title-2 font-bold text-foreground">
                  {t("login.signInTitle") || "Sign In"}
                </h2>
                <motion.button
                  whileTap={{ scale: TAP_SCALE.icon }}
                  onClick={() => { setShowSignIn(false); setShowEmailForm(false); }}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                  aria-label={t("common.close")}
                >
                  <X size={16} className="text-muted-foreground" />
                </motion.button>
              </div>

              <AnimatePresence mode="wait">
                {!showEmailForm ? (
                  <motion.div
                    key="social"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={sheetSwapTransition}
                    className="space-y-3"
                  >
                    {/* Apple button - original black like Apple's guidelines */}
                    <motion.button
                      whileTap={{ scale: TAP_SCALE.primary }}
                      onClick={() => toast.info(t("login.oauthComingSoon") || "OAuth uskoro — za sada koristi email")}
                      className="w-full flex items-center justify-center gap-3 bg-foreground text-background font-semibold py-4 rounded-[14px] text-body"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 21.99C7.79 22.03 6.8 20.68 5.96 19.47C4.25 16.99 2.97 12.5 4.7 9.44C5.56 7.93 7.13 6.97 8.82 6.95C10.1 6.93 11.32 7.82 12.11 7.82C12.89 7.82 14.37 6.74 15.92 6.91C16.57 6.94 18.39 7.18 19.56 8.9C19.47 8.96 17.39 10.16 17.41 12.72C17.44 15.82 20.06 16.82 20.09 16.83C20.07 16.89 19.67 18.29 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                      </svg>
                      {t("login.continueApple")}
                    </motion.button>

                    {/* Google button */}
                    <motion.button
                      whileTap={{ scale: TAP_SCALE.primary }}
                      onClick={() => toast.info(t("login.oauthComingSoon") || "OAuth uskoro — za sada koristi email")}
                      className="w-full flex items-center justify-center gap-3 bg-background border border-border font-medium py-4 rounded-[14px] text-body text-foreground"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      {t("login.continueGoogle")}
                    </motion.button>

                    {/* Email button */}
                    <motion.button
                      whileTap={{ scale: TAP_SCALE.primary }}
                      onClick={() => setShowEmailForm(true)}
                      className="w-full flex items-center justify-center gap-3 bg-background border border-border font-medium py-4 rounded-[14px] text-body text-foreground"
                    >
                      <Mail size={20} />
                      {t("login.continueEmail") || "Continue with email"}
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.form
                    key="email-form"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
                    transition={sheetSwapTransition}
                    onSubmit={handleSubmit}
                    className="space-y-4"
                  >
                    <div>
                      <div className={`bg-background rounded-[10px] border overflow-hidden ${errors.email || errors.password ? "border-destructive" : "border-border"}`}>
                        <label htmlFor="login-email" className="sr-only">{t("login.email")}</label>
                        <input
                          id="login-email"
                          type="email"
                          inputMode="email"
                          placeholder={t("login.email")}
                          aria-label={t("login.email")}
                          aria-invalid={Boolean(errors.email)}
                          aria-describedby={errors.email ? "login-email-error" : undefined}
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                          }}
                          onBlur={(e) => setErrors((prev) => ({ ...prev, email: validateEmail(e.target.value) }))}
                          autoComplete="email"
                          autoCapitalize="none"
                          className="w-full bg-transparent text-foreground placeholder:text-muted-foreground px-4 py-4 text-body focus-ring-default min-h-11"
                        />
                        <div className="separator-ios ml-4" />
                        <div className="relative">
                          <label htmlFor="login-password" className="sr-only">{t("login.password")}</label>
                          <input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder={t("login.password")}
                            aria-label={t("login.password")}
                            aria-invalid={Boolean(errors.password)}
                            aria-describedby={errors.password ? "login-password-error" : undefined}
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                            }}
                            onBlur={(e) => setErrors((prev) => ({ ...prev, password: validatePassword(e.target.value) }))}
                            autoComplete="current-password"
                            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground px-4 py-4 pr-12 text-body focus-ring-default min-h-11"
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
                      </div>
                      {errors.email && (
                        <p id="login-email-error" role="alert" className="text-caption-1 text-destructive mt-2 px-1">
                          {errors.email}
                        </p>
                      )}
                      {errors.password && (
                        <p id="login-password-error" role="alert" className="text-caption-1 text-destructive mt-2 px-1">
                          {errors.password}
                        </p>
                      )}
                    </div>

                    <GradientButton type="submit" className="w-full" size="lg" loading={isLoading}>
                      {isLoading ? t("common.loading") : (t("login.signIn") || "Sign In")}
                    </GradientButton>

                    <motion.button
                      whileTap={{ scale: TAP_SCALE.secondary }}
                      type="button"
                      onClick={() => setShowEmailForm(false)}
                      className="w-full text-center text-subhead text-muted-foreground py-2 min-h-11"
                    >
                      ← {t("login.back") || "Back"}
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Terms */}
              <p className="text-caption-1 text-muted-foreground text-center mt-6">
                {t("login.termsNotice") || "By continuing you agree to our"}{" "}
                <span className="text-foreground font-medium underline">{t("login.terms") || "Terms"}</span>
                {" "}{t("login.and") || "and"}{" "}
                <span className="text-foreground font-medium underline">{t("login.privacy") || "Privacy Policy"}</span>
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;
