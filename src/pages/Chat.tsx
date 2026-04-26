import { useEffect, useRef, useState } from "react";
import { NavBackButton } from "@/components/ui/nav-back-button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, Paperclip, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import trainerAvatar from "@/assets/trainer-avatar.jpg";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useHaptic } from "@/hooks/useHaptic";
import { MOTION_DURATION } from "@/lib/motion";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/hooks/useMessages";
import { findTrainerForClient } from "@/services/messageService";

const Chat = () => {
  const [input, setInput] = useState("");
  const [trainerId, setTrainerId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { clientId } = useAuth();
  const haptic = useHaptic();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch trainer ID once on mount
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const id = await findTrainerForClient();
      if (!cancelled) setTrainerId(id);
    })();
    return () => { cancelled = true; };
  }, []);

  const { messages, send } = useMessages(clientId, trainerId, "client");

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async () => {
    if (input.trim().length === 0 || !trainerId) return;
    haptic("light");
    const body = input.trim();
    setInput("");
    try {
      await send(body);
    } catch {
      // Restore input on failure
      setInput(body);
    }
  };

  // Lock body scroll while chat is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: MOTION_DURATION.base }}
      className="fixed inset-0 z-modal flex flex-col bg-background-secondary"
    >
      {/* Header */}
      <div className="px-5 pt-12 pb-3 bg-card border-b border-border frosted-glass shrink-0">
        <div className="flex items-center gap-3">
          <NavBackButton onClick={() => navigate("/home")} />
          <UserAvatar imageUrl={trainerAvatar} alt="Trainer" size="sm" />
          <div>
            <h1 className="text-headline text-foreground">Trainer <span aria-hidden="true">💜</span></h1>
            <p className="text-caption-1 text-muted-foreground">{t("chat.repliesWithin")}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        role="log"
        aria-live="polite"
        aria-label={t("chat.messages")}
        className="flex-1 min-h-0 px-5 py-4 space-y-3 overflow-y-auto hide-scrollbar"
      >
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="h-full flex flex-col items-center justify-center text-center px-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-title-3 font-bold text-foreground mb-2">{t("chat.emptyTitle")}</h2>
            <p className="text-body text-muted-foreground max-w-xs">{t("chat.emptyBody")}</p>
          </motion.div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderRole === "client";
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.02 + i * 0.02 }}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    isMe
                      ? "gradient-primary text-primary-foreground"
                      : "bg-card text-foreground card-shadow"
                  }`}
                >
                  <p className="text-body whitespace-pre-wrap break-words">{msg.body}</p>
                  <p
                    className={`text-caption-2 mt-1 ${
                      isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-5 py-3 pb-8 border-t border-border bg-card frosted-glass">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t("chat.attachFile")}
            className="text-muted-foreground p-2 min-w-11 min-h-11 flex items-center justify-center"
          >
            <Paperclip size={20} aria-hidden="true" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder={t("chat.typeMessage")}
            aria-label={t("chat.typeMessage")}
            className="flex-1 bg-muted text-foreground placeholder:text-muted-foreground rounded-full px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            aria-label={t("chat.sendMessage")}
            disabled={input.trim().length === 0 || !trainerId}
            onClick={() => void handleSend()}
            className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center min-w-11 min-h-11 disabled:opacity-50 disabled:cursor-not-allowed focus-ring-default"
          >
            <Send size={16} className="text-primary-foreground" aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Chat;
