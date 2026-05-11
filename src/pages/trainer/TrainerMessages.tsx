// ============================================================================
// TrainerMessages — real Supabase messages + Realtime
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, IOS_SPRING, TAP_SCALE } from "@/lib/motion";
import { Send, Paperclip, MessageCircle, Users, Search, Sparkles } from "lucide-react";
import { SavedRepliesSheet } from "@/components/trainer/SavedRepliesSheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ICON_SIZE } from "@/lib/design-tokens";
import { NavBackButton } from "@/components/ui/nav-back-button";
import { NavSearchBar } from "@/components/ui/nav-search-bar";
import { PageTitle } from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import {
  listTrainerConversations,
  type ConversationSummary,
} from "@/services/messageService";
import { useMessages } from "@/hooks/useMessages";

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const TrainerMessages = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { clientId: trainerId } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<ConversationSummary | null>(null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [showSavedReplies, setShowSavedReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, send } = useMessages(
    activeChat?.clientId ?? null,
    trainerId,
    "trainer",
  );

  const refresh = async () => {
    if (!trainerId) return;
    try {
      const list = await listTrainerConversations(trainerId);
      setConversations(list);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!trainerId) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainerId]);

  // Re-fetch list when active chat closes (recompute unread counts)
  useEffect(() => {
    if (activeChat === null && trainerId) void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Lock body scroll while chat overlay is open
  useEffect(() => {
    if (activeChat) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [activeChat]);

  const handleSend = async () => {
    if (!input.trim() || !activeChat) return;
    const body = input.trim();
    setInput("");
    try {
      await send(body);
    } catch {
      setInput(body);
    }
  };

  const filtered = conversations.filter((c) => {
    const fullName = [c.clientFirstName, c.clientLastName].filter(Boolean).join(" ").trim();
    return fullName.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background-secondary pb-32">
        <PageTitle title={t("trainerMsg.title")} />
        <div className="flex flex-col items-center pt-16">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (conversations.length === 0 || conversations.every(c => c.lastMessage === null)) {
    return (
      <div className="min-h-screen bg-background-secondary pb-32">
        <PageTitle title={t("trainerMsg.title")} />
        <motion.div {...fadeUp(0.08)} className="px-5 pt-12 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <MessageCircle size={32} className="text-primary" aria-hidden="true" />
          </div>
          <h2 className="text-title-2 font-bold text-foreground mb-2">{t("trainerMsg.emptyTitle")}</h2>
          <p className="text-body text-muted-foreground max-w-xs mb-6">{t("trainerMsg.emptyBody")}</p>
          <Button onClick={() => navigate("/trainer/clients")} variant="cta" size="xl">
            <Users size={18} className="mr-2" />
            {t("trainerMsg.viewClients")}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background-secondary pb-32">
        <PageTitle title={t("trainerMsg.title")} />

        <div className="px-5">
          <motion.div {...fadeUp(0.05)} className="mb-4">
            <NavSearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("trainerMsg.searchConversations")}
            />
          </motion.div>

          <motion.div {...fadeUp(0.12)} className="space-y-2">
            {filtered.map((convo) => {
              const fullName =
                [convo.clientFirstName, convo.clientLastName].filter(Boolean).join(" ").trim() ||
                "Client";
              return (
                <motion.button
                  key={convo.clientId}
                  whileTap={{ scale: TAP_SCALE.secondary }}
                  onClick={() => setActiveChat(convo)}
                  className="w-full bg-card rounded-2xl p-4 card-shadow flex items-center gap-4 text-left"
                >
                  <div className="relative">
                    <UserAvatar
                      name={fullName}
                      imageUrl={convo.clientAvatarUrl ?? undefined}
                      size="md"
                    />
                    {convo.unreadCount > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive rounded-full flex items-center justify-center ring-2 ring-card">
                        <span className="text-destructive-foreground text-caption-2 font-bold">
                          {convo.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-body ${convo.unreadCount > 0 ? "font-bold" : "font-semibold"} text-foreground`}>
                        {fullName}
                      </p>
                      <span
                        className={`text-caption-1 ${
                          convo.unreadCount > 0
                            ? "text-primary font-semibold"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {relativeTime(convo.lastMessageAt)}
                      </span>
                    </div>
                    <p
                      className={`text-footnote truncate mt-0.5 ${
                        convo.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {convo.lastMessageRole === "trainer" && convo.lastMessage ? "Vi: " : ""}
                      {convo.lastMessage ?? "—"}
                    </p>
                  </div>
                </motion.button>
              );
            })}
            {filtered.length === 0 && search && (
              <div className="flex flex-col items-center py-8">
                <Search size={28} className="text-muted-foreground/40 mb-2" />
                <p className="text-body text-muted-foreground">{t("trainerMsg.searchConversations")}…</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {activeChat && (
          <motion.div
            data-trainer-chat-active="true"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={IOS_SPRING.medium}
            className="fixed inset-0 z-modal flex flex-col bg-background-secondary"
          >
            <div className="px-5 pt-12 pb-3 bg-card/95 backdrop-blur-xl border-b border-border/50 shrink-0">
              <div className="flex items-center gap-3">
                <NavBackButton onClick={() => setActiveChat(null)} />
                <UserAvatar
                  name={
                    [activeChat.clientFirstName, activeChat.clientLastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || "Client"
                  }
                  imageUrl={activeChat.clientAvatarUrl ?? undefined}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-headline text-foreground truncate">
                    {[activeChat.clientFirstName, activeChat.clientLastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || "Client"}
                  </p>
                  <p className="text-caption-2 text-muted-foreground truncate">
                    {activeChat.unreadCount > 0
                      ? `${activeChat.unreadCount} ${t("trainerMsg.unread")}`
                      : t("trainerMsg.online")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 px-5 py-4 space-y-3 overflow-y-auto">
              {messages.map((msg, i) => {
                const isTrainer = msg.senderRole === "trainer";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.02 + i * 0.02 }}
                    className={`flex ${isTrainer ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 ${
                        isTrainer
                          ? "gradient-primary text-primary-foreground rounded-2xl rounded-br-md"
                          : "bg-card text-foreground card-shadow rounded-2xl rounded-bl-md"
                      }`}
                    >
                      <p className="text-body whitespace-pre-wrap break-words">{msg.body}</p>
                      <p
                        className={`text-caption-2 mt-1 ${
                          isTrainer ? "text-primary-foreground/60" : "text-muted-foreground/60"
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
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="shrink-0 px-5 py-3 pb-8 border-t border-border/50 bg-card/95 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <button className="text-muted-foreground p-2 min-w-11 min-h-11 flex items-center justify-center">
                  <Paperclip size={20} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowSavedReplies(true)}
                  className="text-muted-foreground p-2 min-w-11 min-h-11 flex items-center justify-center"
                  aria-label={t("trainerMsg.savedRepliesAria")}
                >
                  <Sparkles size={20} aria-hidden="true" />
                </button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder={t("trainerMsg.typeMessage")}
                  className="flex-1 bg-muted/50 rounded-full card-shadow-none shadow-none"
                />
                <Button
                  onClick={() => void handleSend()}
                  disabled={!input.trim()}
                  variant="cta"
                  size="icon-round"
                  aria-label={t("trainerMsg.send")}
                >
                  <Send size={ICON_SIZE.sm} className="text-primary-foreground" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <SavedRepliesSheet
        open={showSavedReplies}
        onOpenChange={setShowSavedReplies}
        onPick={(text) => setInput(text)}
      />
    </>
  );
};

export default TrainerMessages;
