import React from "react";

const WhatsAppIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 2.159.684 4.158 1.848 5.794L2.5 21.5l3.826-1.326C7.904 21.285 9.88 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.85 0-3.571-.519-5.038-1.423l-.361-.223-2.26.783.796-2.225-.245-.374A7.95 7.95 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/>
  </svg>
);

interface WhatsAppFloatingButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export const WhatsAppFloatingButton: React.FC<WhatsAppFloatingButtonProps> = ({
  onClick,
  unreadCount = 1
}) => {
  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
      {/* Tooltip Pill */}
      <button
        onClick={onClick}
        className="hidden sm:flex items-center gap-2 bg-[#111b21]/95 text-white border border-emerald-500/40 hover:border-emerald-400 px-3.5 py-2 rounded-full shadow-2xl backdrop-blur-md transition-all hover:scale-105 cursor-pointer group"
      >
        <WhatsAppIcon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-mono font-bold text-emerald-400 group-hover:text-emerald-300">
          WhatsApp
        </span>
        <span className="bg-gold/20 text-gold text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border border-gold/30">
          24/7 LIVE
        </span>
      </button>

      {/* Main Circular Button */}
      <button
        onClick={onClick}
        className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-gold/70 group"
        title="WhatsApp"
      >
        <WhatsAppIcon className="w-7 h-7 text-white group-hover:rotate-12 transition-transform" />

        {/* Pulse Effect Ring */}
        <span className="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping pointer-events-none"></span>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gold text-[#1A1A1A] text-[11px] font-mono font-bold flex items-center justify-center border-2 border-[#0b141a] shadow-md">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
