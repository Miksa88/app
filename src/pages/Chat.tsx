import { useState, useEffect } from "react";
import { NavBackButton } from "@/components/ui/nav-back-button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, Paperclip, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import trainerAvatar from "@/assets/trainer-avatar.jpg";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useHaptic } from "@/hooks/useHaptic";
import { MOTION_DURATION } from "@/lib/motion";

interface ChatMessage {
  id: number;
  sender: "trainer" | "user";
  text: string;
  time: string;
}

// TODO: zameniti pravom messages tabelom u Supabase (IT-26 chat backend)
const INITIAL_MESSAGES: ChatMessage[] = [];

const Chat = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const haptic = useHaptic();

  const handleSend = () => {
    if (input.trim().length === 0) return;
    haptic("light");
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [...prev, {
      id: prev.length + 1,
      sender: "user",
      text: input.trim(),
      time,
    }]);
    setInput("");
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
          <UserAvatar imageUrl={trainerAvatar} alt="Ivana" size="sm" />
          <div>
            <h1 className="text-headline text-foreground">Ivana <span aria-hidden="true">💜</span></h1>
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
          messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.sender === "user"
                    ? "gradient-primary text-primary-foreground"
                    : "bg-card text-foreground card-shadow"
                }`}
              >
                <p className="text-body">{msg.text}</p>
                <p className={`text-caption-2 mt-1 ${msg.sender === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {msg.time}
                </p>
              </div>
            </motion.div>
          ))
        )}
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
            placeholder={t("chat.typeMessage")}
            aria-label={t("chat.typeMessage")}
            className="flex-1 bg-muted text-foreground placeholder:text-muted-foreground rounded-full px-4 py-3 text-body focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="button"
            aria-label={t("chat.sendMessage")}
            disabled={input.trim().length === 0}
            onClick={handleSend}
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
