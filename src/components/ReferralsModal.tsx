import React, { useState } from "react";
import { X, Award, Gift, Copy, Check, Share2, Sparkles, UserPlus } from "lucide-react";

interface ReferralsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReferralsModal({ isOpen, onClose }: ReferralsModalProps) {
  const [copied, setCopied] = useState(false);
  const referralCode = "SMC-VIP-8821";
  const referralLink = "https://smcpro.com/refer?code=SMC-VIP-8821";

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative animate-scale-up">
        
        {/* Header */}
        <div className="bg-[#1A1A1A] text-white p-6 flex justify-between items-center border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold/20 border border-gold flex items-center justify-center text-gold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-white">Trade Referral & Rewards</h3>
              <p className="text-[10px] font-mono text-gold uppercase tracking-widest">SMC Partner Cashback Program</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Reward Headline */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 p-5 rounded-2xl text-center space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-gold text-[#1A1A1A] uppercase tracking-wider">
              <Sparkles className="w-3 h-3" /> Partner Cashback Reward
            </span>
            <h4 className="font-serif text-2xl font-bold text-neutral-900">
              Earn £250 Credit per Referred Project
            </h4>
            <p className="text-xs text-neutral-600 max-w-sm mx-auto leading-relaxed">
              Refer architects, interior designers, or homeowners to Simo Marble & Construction. They get 5% off their first order, and you receive £250 cash or account credit upon deposit payment.
            </p>
          </div>

          {/* User Referral Link / Code */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider block font-sans">
              Your Exclusive Partner Referral Link:
            </label>
            <div className="flex items-center gap-2 bg-neutral-50 p-2 border border-neutral-300 rounded-xl">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="w-full bg-transparent text-xs font-mono font-bold text-neutral-800 border-none focus:outline-none px-2"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="bg-[#1A1A1A] hover:bg-gold text-white hover:text-[#1A1A1A] px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
          </div>

          {/* Referral Stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
              <span className="text-[10px] font-mono text-neutral-400 uppercase block">Total Referrals</span>
              <span className="font-serif text-xl font-bold text-neutral-900">3</span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
              <span className="text-[10px] font-mono text-neutral-400 uppercase block">Completed Jobs</span>
              <span className="font-serif text-xl font-bold text-emerald-600">2</span>
            </div>
            <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200">
              <span className="text-[10px] font-mono text-neutral-400 uppercase block">Rewards Earned</span>
              <span className="font-serif text-xl font-bold text-gold">£500</span>
            </div>
          </div>

          {/* How It Works Steps */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider block font-sans">
              How Referral Rewards Work:
            </span>
            <div className="grid grid-cols-3 gap-2 text-[10px] text-neutral-600 font-sans">
              <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100 space-y-1">
                <span className="font-bold text-neutral-900 font-mono block">1. Share Link</span>
                <p>Send your link or code to clients or trade colleagues.</p>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100 space-y-1">
                <span className="font-bold text-neutral-900 font-mono block">2. Quote & Deposit</span>
                <p>They receive an instant quote with 5% partner discount.</p>
              </div>
              <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-100 space-y-1">
                <span className="font-bold text-neutral-900 font-mono block">3. £250 Paid</span>
                <p>£250 cashback is transferred directly to your bank account.</p>
              </div>
            </div>
          </div>

          {/* Close */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="bg-[#1A1A1A] hover:bg-gold text-white text-xs font-mono font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition-colors"
            >
              Close Rewards
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
