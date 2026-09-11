import React, { useState } from "react";
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  Sparkles,
  Paperclip,
  CheckCheck,
  Clock,
  Search,
  User,
  ShieldCheck,
  FileText
} from "lucide-react";

export interface ThreadMessage {
  id: string;
  sender: "client" | "staff" | "system";
  channel: "WhatsApp" | "Client Portal" | "SMS" | "Email Quote";
  senderName: string;
  text: string;
  timestamp: string;
  attachments?: string[];
}

export interface ConversationThread {
  id: string;
  clientName: string;
  projectTitle: string;
  lastMessage: string;
  unread: boolean;
  channel: "WhatsApp" | "Client Portal" | "SMS" | "Email Quote";
  updatedAt: string;
  messages: ThreadMessage[];
}

/**
 * Phase 5 Gate 0 purge.
 *
 * This seed previously contained two fabricated conversation threads for
 * invented clients ("Alexander Wright", "Lady Sarah Spencer") with
 * fabricated project names, a fabricated auto-dispatched estimate
 * reference, and fabricated named staff ("David Vance (3D Templater)").
 * None of it was ever a real client or a real conversation. The inbox
 * layout, thread list, and reply form are genuinely reusable, so they are
 * kept; the seed is emptied so the inbox starts honestly empty until real
 * conversations arrive.
 */
const INITIAL_THREADS: ConversationThread[] = [];

export default function UnifiedCustomerInbox() {
  const [threads, setThreads] = useState<ConversationThread[]>(INITIAL_THREADS);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const activeThread = threads.find((t) => t.id === activeThreadId) || null;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThread) return;

    const newMsg: ThreadMessage = {
      id: "m-" + Date.now(),
      sender: "staff",
      channel: activeThread.channel,
      senderName: "SMC Pro Staff",
      text: replyText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setThreads((prev) =>
      prev.map((th) =>
        th.id === activeThread.id
          ? {
              ...th,
              lastMessage: newMsg.text,
              updatedAt: "Just now",
              messages: [...th.messages, newMsg]
            }
          : th
      )
    );
    setReplyText("");
  };

  return (
    <div className="space-y-6 animate-fade-in text-neutral-100">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-gold uppercase font-bold tracking-widest bg-gold/10 px-2 py-0.5 rounded border border-gold/30">
              SMC PRO UNIFIED COMMUNICATIONS
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              OMNICHANNEL INBOX
            </span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Unified Client Communication Hub
          </h2>
          <p className="text-xs text-neutral-400 font-sans max-w-2xl">
            Single unified inbox aggregating WhatsApp messages, SMS alerts, Client Portal updates, and Email quotes in one thread.
          </p>
        </div>
      </div>

      {/* Main Inbox Interface */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl h-[600px]">
        
        {/* Left 1 Column: Threads List */}
        <div className="md:col-span-1 border-r border-neutral-800 flex flex-col h-full bg-neutral-950/60">
          <div className="p-4 border-b border-neutral-800 space-y-2">
            <span className="text-[10px] font-mono text-neutral-400 uppercase font-bold">Active Conversations</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-800/60 custom-scrollbar">
            {threads.length === 0 && (
              <div className="p-6 text-center text-xs text-neutral-500 font-mono">
                No conversations yet.
              </div>
            )}
            {threads.map((th) => (
              <div
                key={th.id}
                onClick={() => setActiveThreadId(th.id)}
                className={`p-4 cursor-pointer transition-all space-y-1 ${
                  activeThreadId === th.id
                    ? "bg-neutral-900 border-l-4 border-gold text-white"
                    : "hover:bg-neutral-900/60 text-neutral-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-sm text-white">{th.clientName}</span>
                  <span className="text-[10px] font-mono text-neutral-400">{th.updatedAt}</span>
                </div>
                <div className="text-xs text-gold font-mono">{th.projectTitle}</div>
                <p className="text-xs text-neutral-400 truncate">{th.lastMessage}</p>
                <div className="pt-1 flex items-center justify-between text-[10px] font-mono">
                  <span className="bg-neutral-800 px-2 py-0.5 rounded text-neutral-300">{th.channel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Columns: Chat Thread */}
        <div className="md:col-span-2 flex flex-col h-full bg-neutral-900">
          {activeThread ? (
            <>
              {/* Thread Top Header */}
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
                <div>
                  <h3 className="font-serif font-bold text-lg text-white">{activeThread.clientName}</h3>
                  <p className="text-xs font-mono text-gold">{activeThread.projectTitle} • via {activeThread.channel}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                {activeThread.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === "staff"
                        ? "items-end"
                        : msg.sender === "system"
                        ? "items-center"
                        : "items-start"
                    }`}
                  >
                    {msg.sender === "system" ? (
                      <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-center text-xs font-mono text-gold max-w-md my-1">
                        ⚡ {msg.text}
                      </div>
                    ) : (
                      <div
                        className={`max-w-md p-3.5 rounded-2xl space-y-1 text-xs font-sans ${
                          msg.sender === "staff"
                            ? "bg-gold text-neutral-950 rounded-br-xs font-medium shadow-md"
                            : "bg-neutral-800 text-white rounded-bl-xs border border-neutral-700"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono opacity-80 gap-3 border-b border-black/10 pb-1">
                          <span>{msg.senderName}</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p className="leading-snug">{msg.text}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Input Bar */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-neutral-800 flex items-center gap-2 bg-neutral-950/60">
                <input
                  type="text"
                  placeholder={`Reply to ${activeThread.clientName} via ${activeThread.channel}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-gold font-sans"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-xs text-neutral-500 font-mono p-6">
              Select a conversation to view messages, or wait for a new one to arrive.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
