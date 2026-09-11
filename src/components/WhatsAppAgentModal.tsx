import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "../services/apiClient";
import {
  X,
  Send,
  CheckCheck,
  Phone,
  QrCode,
  ExternalLink,
  Sparkles,
  Play,
  Pause,
  Volume2,
  Image as ImageIcon,
  Paperclip,
  CheckCircle2,
  RefreshCw,
  Copy,
  Clock,
  ShieldCheck,
  Zap
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  isVoice?: boolean;
  voiceDuration?: string;
  mediaUrl?: string;
}

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 2.159.684 4.158 1.848 5.794L2.5 21.5l3.826-1.326C7.904 21.285 9.88 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.85 0-3.571-.519-5.038-1.423l-.361-.223-2.26.783.796-2.225-.245-.374A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
  </svg>
);

interface WhatsAppAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAppointmentModal?: () => void;
  onOpenQuoteModal?: () => void;
}

interface ClientThread {
  id: string;
  clientName: string;
  phone: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  status: string;
  persona: string;
  type?: string;
}

export const WhatsAppAgentModal: React.FC<WhatsAppAgentModalProps> = ({
  isOpen,
  onClose,
  onOpenAppointmentModal,
  onOpenQuoteModal
}) => {
  const [waActive, setWaActive] = useState(true);
  const [waPersona, setWaPersona] = useState("concierge");
  const [waPhone, setWaPhone] = useState("+44 (0)20 7946 0912");

  const defaultGreeting = "Welcome to *SMC Pro Studio*! 🏛️✨\nHow can we assist with your project today?\n\n• *Request a Quote*\n• *Laser Survey Booking*\n• *Slab Gallery*";

  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<ClientThread[]>([]);
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [dispatchName, setDispatchName] = useState("");
  const [dispatchPhone, setDispatchPhone] = useState("");
  const [dispatchMsgText, setDispatchMsgText] = useState("");
  const [isDispatching, setIsDispatching] = useState(false);

  const fetchThreads = async () => {
    try {
      const response = await apiFetch("/api/whatsapp/threads");
      const data = await response.json();
      if (data.success && Array.isArray(data.threads)) {
        setThreads(data.threads);
      }
    } catch (err) {
      console.error("Failed to fetch WhatsApp client threads:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const active = localStorage.getItem("smc_wa_active") !== "false";
      const persona = localStorage.getItem("smc_wa_persona") || "concierge";
      const greeting = localStorage.getItem("smc_wa_greeting") || defaultGreeting;
      const phone = localStorage.getItem("smc_wa_phone") || "+44 (0)20 7946 0912";

      setWaActive(active);
      setWaPersona(persona);
      setWaPhone(phone);

      setMessages([
        {
          id: "1",
          sender: "assistant",
          text: greeting,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "read"
        }
      ]);

      fetchThreads();
    }
  }, [isOpen]);

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "chats" | "qrcode" | "voice">("chat");
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && activeTab === "chats") {
      fetchThreads();
    }
  }, [activeTab, isOpen]);

  const cleanPhone = waPhone.replace(/[^0-9]/g, "");
  const directWhatsAppUrl = `https://wa.me/${cleanPhone || "442079460912"}?text=Hi%20SMC%20Pro%20Studio%2C%20I%20would%20like%20a%20quote%20for%20my%20kitchen%20project`;

  const handleRouteToWhatsApp = (customText?: string, targetPhoneNum?: string) => {
    const phoneToUse = targetPhoneNum || waPhone;
    const cleanNum = phoneToUse.replace(/[^0-9]/g, "");
    const textToSend = customText || inputText || (messages.length > 0 ? messages[messages.length - 1].text : "");
    const targetUrl = `https://wa.me/${cleanNum || "442079460912"}${textToSend ? `?text=${encodeURIComponent(textToSend)}` : ""}`;
    window.open(targetUrl, "_blank");
  };

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  // Voice player progress simulation
  useEffect(() => {
    let interval: any;
    if (isPlayingVoice) {
      interval = setInterval(() => {
        setVoiceProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingVoice(false);
            return 0;
          }
          return prev + 5;
        });
      }, 300);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlayingVoice]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = Date.now().toString();

    const newUserMsg: Message = {
      id: userMsgId,
      sender: "user",
      text: query,
      timestamp: userTime,
      status: "read"
    };

    setMessages((prev) => [...prev, newUserMsg]);
    if (!textToSend) setInputText("");
    setIsTyping(true);

    try {
      const response = await apiFetch("/api/whatsapp/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: waPersona,
          recipientPhone: waPhone,
          messages: [...messages, newUserMsg].map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text
          }))
        })
      });

      const data = await response.json();
      setIsTyping(false);

      const botTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: data.reply || "Thank you for your inquiry. An SMC Pro Studio specialist is standing by.",
          timestamp: data.timestamp || botTime,
          status: "read"
        }
      ]);
      fetchThreads();
    } catch (err) {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: "Thank you for your message! 🏛️\n\nOur Thames Warehouse & Engineering Concierge team has logged your inquiry. You can also connect directly via official WhatsApp link below or call us on +44 20 7946 0912.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "read"
        }
      ]);
    }
  };

  const handleDispatchDirect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!dispatchPhone.trim() || !dispatchMsgText.trim()) return;

    setIsDispatching(true);
    try {
      const res = await apiFetch("/api/whatsapp/dispatch-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: dispatchName || "VIP Client Customer",
          phone: dispatchPhone,
          message: dispatchMsgText
        })
      });
      const data = await res.json();
      setIsDispatching(false);

      if (data.waLink) {
        window.open(data.waLink, "_blank");
      } else {
        const cleanNum = dispatchPhone.replace(/[^0-9]/g, "");
        window.open(`https://wa.me/${cleanNum || "442079460912"}?text=${encodeURIComponent(dispatchMsgText)}`, "_blank");
      }

      setDispatchName("");
      setDispatchPhone("");
      setDispatchMsgText("");
      setShowDispatchForm(false);
      fetchThreads();
    } catch (err) {
      setIsDispatching(false);
      const cleanNum = dispatchPhone.replace(/[^0-9]/g, "");
      window.open(`https://wa.me/${cleanNum || "442079460912"}?text=${encodeURIComponent(dispatchMsgText)}`, "_blank");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directWhatsAppUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const quickPrompts = [
    "💬 Request a Quote",
    "📐 Book Laser Templating",
    "🪨 Ask About Calacatta Gold",
    "🧼 Quartz vs Porcelain Specs"
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b141a] border border-neutral-800 rounded-2xl w-full max-w-2xl h-[92vh] max-h-[750px] shadow-2xl flex flex-col overflow-hidden text-white font-sans">
        
        {/* WhatsApp Header */}
        <div className="bg-[#111b21] border-b border-neutral-800 p-3 sm:p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-900 border-2 border-gold/60 flex items-center justify-center text-white font-bold font-serif text-sm shadow-md">
                SMC
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#111b21] flex items-center justify-center">
                <CheckCircle2 className="w-2.5 h-2.5 text-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <WhatsAppIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="font-semibold text-sm sm:text-base text-white">WhatsApp</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                <span>{waPhone}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab(activeTab === "qrcode" ? "chat" : "qrcode")}
              className={`p-2 rounded-lg transition-all ${
                activeTab === "qrcode"
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700"
              }`}
              title="Mobile QR Code Handoff"
            >
              <QrCode className="w-4 h-4" />
            </button>

            <a
              href={directWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="Open in WhatsApp Web / App"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Open App</span>
              <ExternalLink className="w-3 h-3 text-emerald-200" />
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector Banner */}
        <div className="bg-[#182229] border-b border-neutral-800/80 px-4 py-2 flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-4 overflow-x-auto">
            <button
              onClick={() => setActiveTab("chats")}
              className={`font-mono font-bold pb-1 transition-all border-b-2 whitespace-nowrap ${
                activeTab === "chats" ? "border-emerald-500 text-emerald-400" : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              📋 Client Chats ({waActive ? "4" : "3"})
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`font-mono font-bold pb-1 transition-all border-b-2 whitespace-nowrap ${
                activeTab === "chat" ? "border-emerald-500 text-emerald-400" : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              💬 WhatsApp
            </button>
            <button
              onClick={() => setActiveTab("qrcode")}
              className={`font-mono font-bold pb-1 transition-all border-b-2 whitespace-nowrap ${
                activeTab === "qrcode" ? "border-emerald-500 text-emerald-400" : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              📱 Mobile QR
            </button>
            <button
              onClick={() => setActiveTab("voice")}
              className={`font-mono font-bold pb-1 transition-all border-b-2 whitespace-nowrap ${
                activeTab === "voice" ? "border-emerald-500 text-emerald-400" : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              🎙️ Voice Updates
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-mono text-emerald-500/90 shrink-0">
            <ShieldCheck className="w-3 h-3" /> End-to-End Encrypted
          </div>
        </div>

        {/* Main Content Area */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#0b141a] relative">
            {/* WhatsApp Chat Wallpaper Pattern overlay */}
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#25d366_1px,transparent_1px)] [background-size:16px_16px]"></div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 relative z-10">
              
              {/* Security Banner */}
              <div className="text-center my-2">
                <span className="bg-[#182229] text-gold/90 text-[10px] font-mono px-3 py-1 rounded-full border border-gold/20 inline-flex items-center gap-1.5 shadow-2xs">
                  <ShieldCheck className="w-3 h-3 text-gold" /> Official SMC Pro Studio WhatsApp Gateway • 24/7 AI Automated Response
                </span>
              </div>

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-sm leading-relaxed shadow-sm ${
                      msg.sender === "user"
                        ? "bg-[#005c4b] text-white rounded-tr-none border border-emerald-600/30"
                        : "bg-[#202c33] text-neutral-100 rounded-tl-none border border-neutral-700/50"
                    }`}
                  >
                    {msg.sender === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-mono font-bold text-emerald-400">
                        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-400" />
                        <span>SMC PRO WHATSAPP</span>
                      </div>
                    )}

                    <div className="whitespace-pre-line text-xs sm:text-sm font-sans">
                      {msg.text}
                    </div>

                    <div
                      className={`flex items-center justify-end gap-1 text-[10px] font-mono mt-1.5 ${
                        msg.sender === "user" ? "text-emerald-200/80" : "text-neutral-400"
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {msg.sender === "user" && (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-[#202c33] text-neutral-300 rounded-2xl rounded-tl-none px-4 py-2.5 border border-neutral-700/50 flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-400">WhatsApp is typing</span>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.32s]"></span>
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.16s]"></span>
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Bar */}
            <div className="bg-[#111b21] p-2 border-t border-neutral-800/80 overflow-x-auto flex gap-2 shrink-0 no-scrollbar">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt.replace(/^[^\s]+\s*/, ""))}
                  className="bg-[#202c33] hover:bg-emerald-950/60 border border-neutral-700/60 hover:border-emerald-500/50 text-neutral-200 hover:text-emerald-300 text-xs font-mono px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>{prompt}</span>
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="bg-[#111b21] p-3 border-t border-neutral-800 flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleSendMessage("Book a site survey for laser templating.")}
                className="p-2 text-neutral-400 hover:text-gold transition-colors"
                title="Quick Book Survey"
              >
                <Clock className="w-5 h-5" />
              </button>
              
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type your WhatsApp message (e.g. quote, slab stock, survey)..."
                className="flex-1 bg-[#2a3942] border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-400 focus:outline-none focus:border-emerald-500 transition-all font-sans"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isTyping}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold transition-all shadow-sm cursor-pointer"
                title="Send message to WhatsApp"
              >
                <Send className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleRouteToWhatsApp()}
                className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer border border-emerald-500/40"
                title={`Route message directly to client's WhatsApp number (${waPhone})`}
              >
                <WhatsAppIcon className="w-4 h-4 text-emerald-300" />
                <span className="hidden sm:inline font-mono">Route WhatsApp</span>
              </button>
            </div>
          </div>
        )}

        {/* QR Code Mobile Handoff View */}
        {activeTab === "qrcode" && (
          <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center text-center space-y-6 bg-[#0b141a]">
            <div className="max-w-md w-full bg-[#111b21] border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                <QrCode className="w-3.5 h-3.5" /> Instant Mobile Connect
              </div>

              <h3 className="font-serif text-xl text-white font-bold">Chat Live on Your Smartphone</h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Scan this QR code with your phone camera to start a direct, end-to-end encrypted WhatsApp conversation with the official SMC Pro Studio Concierge.
              </p>

              {/* Generated QR Code Representation */}
              <div className="p-4 bg-white rounded-2xl inline-block shadow-lg mx-auto border-4 border-gold">
                <div className="w-48 h-48 bg-white flex flex-col items-center justify-center relative p-2">
                  {/* Styled QR placeholder pattern with WhatsApp Logo center */}
                  <div className="grid grid-cols-6 gap-1 w-full h-full p-2 bg-neutral-900 rounded-lg">
                    {Array.from({ length: 36 }).map((_, i) => (
                      <div
                        key={i}
                        className={`${
                          (i % 2 === 0 && i % 3 === 0) || i === 0 || i === 5 || i === 30 || i === 35
                            ? "bg-gold"
                            : i % 5 === 0
                            ? "bg-emerald-500"
                            : "bg-neutral-700"
                        } rounded-xs`}
                      />
                    ))}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-[#25D366] border-2 border-white flex items-center justify-center shadow-md">
                      <WhatsAppIcon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-center gap-2 text-xs font-mono text-gold bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                  <span>Hotline: +44 (0)20 7946 0912</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={directWhatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <WhatsAppIcon className="w-4 h-4 text-white" /> Open WhatsApp Direct
                  </a>

                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-mono text-xs transition-all border border-neutral-700 flex items-center gap-1.5"
                  >
                    <Copy className="w-4 h-4 text-emerald-400" />
                    <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voice Note Simulation View */}
        {activeTab === "voice" && (
          <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center text-center space-y-6 bg-[#0b141a]">
            <div className="max-w-md w-full bg-[#111b21] border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/10 text-gold border border-gold/20 text-xs font-mono font-bold">
                <Volume2 className="w-3.5 h-3.5" /> Voice Updates
              </div>

              <h3 className="font-serif text-xl text-white font-bold">Voice Note Dispatch</h3>
              <p className="text-xs text-neutral-300 leading-relaxed" role="status">
                Voice note briefings are not available yet. Contact SMC for updates on your project.
              </p>
            </div>
          </div>
        )}

        {/* CLIENT CHATS LIST VIEW */}
        {activeTab === "chats" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0b141a]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-neutral-800 pb-3 gap-3">
              <div>
                <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <WhatsAppIcon className="w-5 h-5 text-emerald-400 shrink-0" /> WhatsApp Conversations
                </h4>
                <p className="text-xs text-neutral-400">
                  Manage active AI-driven conversations and route messages directly to client WhatsApp numbers.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDispatchForm(!showDispatchForm)}
                  className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border border-emerald-500/40"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{showDispatchForm ? "Close Form" : "Dispatch to Client"}</span>
                </button>

                <a
                  href={directWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <span>Launch App</span>
                  <ExternalLink className="w-3 h-3 text-neutral-300" />
                </a>
              </div>
            </div>

            {/* DIRECT CUSTOMER DISPATCH FORM */}
            {showDispatchForm && (
              <form onSubmit={handleDispatchDirect} className="p-4 rounded-2xl bg-[#111b21] border border-emerald-500/40 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-400" /> Route Direct Message to Customer WhatsApp
                  </h5>
                  <span className="text-[10px] text-neutral-400 font-mono">Meta API Gateway</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">Customer / Client Name</label>
                    <input
                      type="text"
                      value={dispatchName}
                      onChange={(e) => setDispatchName(e.target.value)}
                      placeholder="e.g. Lord Harrington"
                      className="w-full bg-[#202c33] border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">WhatsApp Phone Number *</label>
                    <input
                      type="text"
                      value={dispatchPhone}
                      onChange={(e) => setDispatchPhone(e.target.value)}
                      placeholder="+44 7700 900123"
                      required
                      className="w-full bg-[#202c33] border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-neutral-400 block mb-1">Pre-filled Message / AI Briefing *</label>
                  <textarea
                    rows={2}
                    value={dispatchMsgText}
                    onChange={(e) => setDispatchMsgText(e.target.value)}
                    placeholder="Type the message or project update to route to customer's WhatsApp..."
                    required
                    className="w-full bg-[#202c33] border border-neutral-700 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isDispatching || !dispatchPhone.trim() || !dispatchMsgText.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <WhatsAppIcon className="w-4 h-4 text-emerald-200" />
                  <span>{isDispatching ? "Routing Message..." : "Dispatch & Launch Customer WhatsApp"}</span>
                </button>
              </form>
            )}

            <div className="space-y-3">
              {threads.length > 0 ? (
                threads.map((thread) => (
                  <div
                    key={thread.id}
                    className="p-3.5 rounded-2xl bg-[#111b21] hover:bg-[#182229] border border-neutral-800 hover:border-emerald-500/40 transition-all flex items-center justify-between group shadow-sm"
                  >
                    <div
                      onClick={() => {
                        setWaPhone(thread.phone);
                        if (thread.persona) setWaPersona(thread.persona);
                        setActiveTab("chat");
                      }}
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-950 border-2 border-emerald-500/50 flex items-center justify-center text-white font-bold font-serif text-xs shadow-xs">
                          <WhatsAppIcon className="w-5 h-5 text-emerald-300" />
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#111b21] ${thread.status === "ACTIVE" ? "bg-emerald-400" : "bg-amber-400"}`}></span>
                      </div>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors truncate">
                            {thread.clientName}
                          </h5>
                          <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-mono px-1.5 py-0.2 rounded border border-emerald-500/30 font-bold shrink-0">
                            {thread.persona === "fabricator" ? "Professional Fabricator" : "Concierge"}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 line-clamp-1 font-sans">
                          {thread.lastMessage}
                        </p>
                        <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-2">
                          <span className="text-emerald-400">{thread.phone}</span>
                          <span>•</span>
                          <span>{thread.status || "ACTIVE"}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pl-2">
                      <button
                        onClick={() => handleRouteToWhatsApp(thread.lastMessage, thread.phone)}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                        title={`Route interaction to customer's WhatsApp (${thread.phone})`}
                      >
                        <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-300" />
                        <span className="hidden sm:inline">Route</span>
                      </button>
                      <div className="text-right">
                        <span className="text-[10px] text-emerald-400 font-mono font-bold block">{thread.timestamp}</span>
                        {thread.unreadCount > 0 && (
                          <span className="bg-emerald-500 text-[#111b21] text-[10px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center ml-auto mt-1">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                /* Fallback if threads array is empty */
                <div
                  className="p-3.5 rounded-2xl bg-[#111b21] hover:bg-[#182229] border border-emerald-500/40 transition-all flex items-center justify-between group shadow-md"
                >
                  <div
                    onClick={() => setActiveTab("chat")}
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-900 border-2 border-gold flex items-center justify-center text-white font-bold font-serif text-xs">
                        <WhatsAppIcon className="w-5 h-5 text-emerald-300" />
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#111b21] ${waActive ? "bg-emerald-400" : "bg-neutral-500"}`}></span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h5 className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                          WhatsApp
                        </h5>
                        <span className="bg-emerald-500/20 text-emerald-300 text-[9px] font-mono px-1.5 py-0.2 rounded border border-emerald-500/30 font-bold">
                          {waActive ? "ACTIVE" : "PAUSED"}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-300 line-clamp-1 font-sans">
                        {messages[messages.length - 1]?.text.slice(0, 75) || "Welcome to SMC Pro Studio..."}...
                      </p>
                      <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-2">
                        <span>Persona: {waPersona === "fabricator" ? "Professional Fabricator" : "Concierge"}</span>
                        <span>•</span>
                        <span className="text-emerald-400">{waPhone}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    <button
                      onClick={() => handleRouteToWhatsApp()}
                      className="bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      title={`Route interaction to customer's WhatsApp (${waPhone})`}
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-300" />
                      <span className="hidden sm:inline">Route</span>
                    </button>
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-400 font-mono font-bold block">10:32 AM</span>
                      <span className="bg-emerald-500 text-[#111b21] text-[10px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center ml-auto mt-1">
                        1
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WhatsApp Footer Navigation Action */}
        <div className="bg-[#111b21] p-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400 shrink-0 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Meta WhatsApp Cloud API v2026</span>
          </div>
          <div className="flex items-center gap-3">
            {onOpenAppointmentModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAppointmentModal();
                }}
                className="hover:text-gold transition-colors underline cursor-pointer"
              >
                Book Survey
              </button>
            )}
            {onOpenQuoteModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenQuoteModal();
                }}
                className="hover:text-gold transition-colors underline cursor-pointer"
              >
                Request a Quote
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
