import React, { useState } from "react";
import {
  Sparkles,
  Gift,
  ShieldCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  Lock,
  Award,
  Zap,
  ChevronRight,
  ArrowLeft,
  Gem,
  Coins,
  Flame,
  Calendar,
  Layers,
  ShoppingBag,
  History,
  Check,
  ArrowRight,
  Mountain,
  Eye,
  Headphones,
  CreditCard,
  Send,
  Star,
  Compass,
  X,
  Share2,
  Users
} from "lucide-react";

interface DailyTreasureVaultProps {
  onNavigate?: (tab: string) => void;
}

export default function DailyTreasureVault({ onNavigate }: DailyTreasureVaultProps) {
  // Member Points State initialized to 750,000 as per Elite Rewards spec
  const [userPoints, setUserPoints] = useState(750000);
  const [currentStreak, setCurrentStreak] = useState(5);
  const [claimedDays, setClaimedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [isClaiming, setIsClaiming] = useState(false);
  const [activeTab, setActiveTab] = useState<"rewards" | "daily-chests" | "benefits" | "history">("rewards");

  // Modals state
  const [selectedRewardModal, setSelectedRewardModal] = useState<any | null>(null);
  const [showQuarryVisitModal, setShowQuarryVisitModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [quarryLocation, setQuarryLocation] = useState("");
  const [visitDate, setVisitDate] = useState("");

  // Streak calendar rewards
  const streakRewards = [
    { day: 1, title: "+2,500 Trade Pts", points: 2500, desc: "Daily Attendance Bonus", icon: Coins },
    { day: 2, title: "+5,000 Trade Pts", points: 5000, desc: "Streak Accelerator", icon: Coins },
    { day: 3, title: "Edge Sample Box", points: 0, desc: "Free Mitered Spec Box", icon: Layers },
    { day: 4, title: "+7,500 Trade Pts", points: 7500, desc: "Mid-Week Vault Boost", icon: Coins },
    { day: 5, title: "15% CNC Discount", points: 0, desc: "Valid on next Waterfall Island", icon: Zap },
    { day: 6, title: "+12,000 Trade Pts", points: 12000, desc: "Weekend VIP Multiplier", icon: Coins },
    { day: 7, title: "Gold Mystery Chest", points: 25000, desc: "£2,500 Slab Credit + VIP Status", icon: Gem }
  ];

  // Rewards Marketplace Items from HTML Spec
  const marketplaceRewards = [
    {
      id: "rm-1",
      title: "Complimentary CNC Detailing",
      category: "FABRICATION",
      pts: 50000,
      badge: "ELITE EXCLUSIVE",
      desc: "Expert edge profiling & precision water-jet cutout for any marble or porcelain slab in your vault.",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAbXFmTktKqpdeNHt2DGRD0ndIyZsqCLFzI6IaFG2nx7r6s13mM5vUg9hiU5R8Q5v6BAinVeh3kOE44AInrsfVWGbPrDcBj-nTmY2FvjmERGcmx9SMl0WaWHSe9hcuNajOVmBCCC39IwuwMfR8u3Bmj55Yv_rPcauVJlXkQ-eb04VbfPaT0wapC4HHKETq_k6BDr5vwUkciCYC7JiXlVQMdvb6ht1kAWeSd-5O7NHHFvhBhQe3SvM98_jw64Q2anqjx8aBTJRU9R0A"
    },
    {
      id: "rm-2",
      title: "White Glove Protection Kit",
      category: "MAINTENANCE",
      pts: 15000,
      badge: "CLIENT HANDOVER",
      desc: "Proprietary stone sealant, microfiber polishing cloths, and gold-trimmed maintenance brushes for client presentation.",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDy_ynIUEd2gzEl7Z6O3_68lnEuNa_tS9JSF7tRCc6VOwIZn36Wog25_PlGXwwmtJ6cdAUiSK9PobuX-qQ5EIX9dQEg9m85Ibsj-dbxEoo9Ft188rK8El1frO36f3rWJ3t71Ip3yYq6gnNowxgD8BYEMTdwerNLZIJ4TRn-BvF4CKSFisoVs9kXwYuOcCXKjH_BRn8kx_O4CaddjYqZoRNUKJLGtOmeaPyr8mJURH5b-yGlhxOAiu1NX8MKEzyZYdrVNEGCj91sE4U"
    },
    {
      id: "rm-3",
      title: "Milan Design Week VIP Pass",
      category: "CURATED EXPERIENCE",
      pts: 120000,
      badge: "LIMITED SPOT",
      desc: "VIP entry to the Salone del Mobile, private stone galas, and 5-star hotel accommodation in Milan, Italy.",
      image: "https://lh3.googleusercontent.com/aida-public/AB6AXuByO19DjecCEDhpvMtsGsIzsoHLM7CjlFpPh9QxFZEGGZbwzDYI--kRyI9GAEBpFChFlFHtWpYwnAy8ENRQB4NjWRv6Oe3EdxbT_Joj0DqB00zDeNgAjE4gPVcVUxdLapswdSgDVRDKwbSMFl56w6Vgni-3xK_zG-JGobG5Xk-gDNi0NLTdcmUaWUD0eQx0ICHWpF51qI0HFe14SaUY--OJIcnONyu4e8nRYlhij66QE6JawGgC0jSDPaKhW6qtgENPHVnfIvYRXDg"
    },
    {
      id: "rm-4",
      title: "£1,500 Direct Slab Credit",
      category: "MATERIAL DISCOUNT",
      pts: 150000,
      badge: "BEST VALUE",
      desc: "Direct invoice credit applied towards any Calacatta Marble or Statuario Extra slab booking.",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"
    }
  ];

  // Points history from HTML Spec
  const [pointsHistory, setPointsHistory] = useState([
    { id: "ph-1", date: "MAY 24, 2026", title: "Mayfair Project Completion", subtext: "Bonus for high-volume slab utilization", pts: "+5,000", isPositive: true },
    { id: "ph-2", date: "MAY 18, 2026", title: "CNC Detailing Redemption", subtext: "Redeemed for Belgravia Residence", pts: "-50,000", isPositive: false },
    { id: "ph-3", date: "MAY 05, 2026", title: "Quarterly Tier Bonus", subtext: "Platinum Retainment Reward", pts: "+25,000", isPositive: true },
    { id: "ph-4", date: "APR 12, 2026", title: "Client Referral (Kensington)", subtext: "Alexander V. Qualified Slab Reservation", pts: "+2,500", isPositive: true }
  ]);

  const handleClaimToday = () => {
    if (claimedDays.includes(6)) return;
    setIsClaiming(true);
    setTimeout(() => {
      setIsClaiming(false);
      setClaimedDays(prev => [...prev, 6]);
      setUserPoints(prev => prev + 12000);
      setCurrentStreak(6);
      setPointsHistory(prev => [
        { id: `ph-${Date.now()}`, date: "JUST NOW", title: "Day 6 Vault Claimed (+12,000 Pts)", subtext: "Daily Attendance Streak Bonus", pts: "+12,000", isPositive: true },
        ...prev
      ]);
    }, 1200);
  };

  const handleConfirmRedeem = (item: any) => {
    if (userPoints < item.pts) {
      alert(`You need ${(item.pts - userPoints).toLocaleString()} more trade points to redeem ${item.title}.`);
      return;
    }

    setUserPoints(prev => prev - item.pts);
    setPointsHistory(prev => [
      {
        id: `ph-${Date.now()}`,
        date: "JUST NOW",
        title: `${item.title} Redeemed`,
        subtext: "Elite Rewards Marketplace",
        pts: `-${item.pts.toLocaleString()}`,
        isPositive: false
      },
      ...prev
    ]);

    setSelectedRewardModal(null);
    alert(`Congratulations! You have successfully redeemed "${item.title}". Your trade concierge will contact you with voucher details.`);
  };

  const handleQuarryVisitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowQuarryVisitModal(false);
    alert(`Private Quarry Visit requested for ${quarryLocation} on ${visitDate}! Our Italian Stone Concierge will confirm travel details with Arthur P. Harrison within 24 hours.`);
  };

  return (
    <div className="space-y-10 animate-fade-in text-white pb-16 max-w-7xl mx-auto">
      {/* SECTION 1: HEADER & BACK NAV */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {onNavigate && (
              <button
                onClick={() => onNavigate("dashboard")}
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-gold text-neutral-300 hover:text-gold transition-all cursor-pointer flex items-center justify-center"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="font-mono text-[10px] uppercase tracking-widest text-gold bg-gold/10 px-3 py-1 rounded-full border border-gold/30 flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3 h-3 text-gold animate-pulse" /> SMC PRO ELITE REWARDS HUB
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-5xl font-medium tracking-tight text-white">
            Elite Rewards Hub
          </h1>
          <p className="text-xs md:text-sm text-neutral-400 max-w-2xl mt-1 font-sans leading-relaxed">
            Exclusivity refined. Manage your tier status and redeem curated experiences designed for the industry's pinnacle.
          </p>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap gap-2 bg-neutral-900 p-1.5 rounded-xl border border-neutral-800">
          <button
            onClick={() => setActiveTab("rewards")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "rewards"
                ? "bg-gold text-neutral-950 shadow-md"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Rewards Store
          </button>

          <button
            onClick={() => setActiveTab("daily-chests")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "daily-chests"
                ? "bg-gold text-neutral-950 shadow-md"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Gift className="w-3.5 h-3.5" /> Daily Chests
          </button>

          <button
            onClick={() => setActiveTab("benefits")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "benefits"
                ? "bg-gold text-neutral-950 shadow-md"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Award className="w-3.5 h-3.5" /> Platinum Perks
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-gold text-neutral-950 shadow-md"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <History className="w-3.5 h-3.5" /> Points Log
          </button>

          {onNavigate && (
            <button
              onClick={() => onNavigate("referral-command")}
              className="px-4 py-2 rounded-lg text-xs font-mono font-bold uppercase text-emerald-400 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" /> Referrals (£250)
            </button>
          )}
        </div>
      </div>

      {/* SECTION 2: MEMBER STATUS CARD */}
      <section className="bg-gradient-to-r from-neutral-950 via-[#161616] to-neutral-900 border border-gold/40 rounded-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center relative z-10">
          {/* Left Column Status Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-gold/20 rounded-lg text-gold border border-gold/40">
                <Star className="w-5 h-5 fill-gold" />
              </span>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-gold block">
                  Platinum Member since 2018
                </span>
                <h2 className="font-serif text-3xl md:text-4xl font-medium text-white">
                  Elite Platinum Status
                </h2>
              </div>
            </div>

            <p className="text-xs md:text-sm text-neutral-400 font-sans leading-relaxed">
              As a Platinum VIP Partner, you enjoy direct priority access to Carrara quarry blocks, zero-interest 120-day trade credit, and 2,500 bonus trade points per client slab introduction.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-end font-mono text-xs">
                <span className="text-neutral-300 font-bold uppercase tracking-wider">
                  CURRENT BALANCE: <span className="text-gold text-sm font-bold">{userPoints.toLocaleString()} PTS</span>
                </span>
                <span className="text-gold text-[11px]">250,000 pts to Black Diamond</span>
              </div>

              {/* Gold Shimmer Progress Bar */}
              <div className="h-2.5 w-full bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-neutral-700">
                <div className="h-full bg-gradient-to-r from-amber-500 via-gold to-yellow-200 rounded-full relative w-3/4 shadow-lg shadow-gold/50">
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                onClick={() => setActiveTab("rewards")}
                className="px-8 py-3 bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-gold/20 flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" /> REDEEM POINTS
              </button>

              <button
                onClick={() => setShowCreditModal(true)}
                className="px-6 py-3 border border-gold/50 hover:bg-gold/10 text-gold font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                MANAGE CREDIT
              </button>
            </div>
          </div>

          {/* Right Column: SMC PRO ELITE VIP Card */}
          <div className="flex flex-col items-center md:items-end justify-center">
            <div className="w-full max-w-sm aspect-[1.6/1] bg-gradient-to-br from-neutral-900 via-black to-neutral-950 rounded-2xl border border-gold/60 p-6 flex flex-col justify-between shadow-2xl transform transition-transform group-hover:scale-105 duration-500 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-gold/15 rounded-full blur-xl pointer-events-none" />

              <div className="flex justify-between items-start">
                <div>
                  <span className="font-serif text-xl font-bold tracking-widest text-gold block">
                    LUXE STONE
                  </span>
                  <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">
                    PRECISION FABRICATION
                  </span>
                </div>
                <div className="p-2 bg-gold/10 rounded-xl border border-gold/30 text-gold">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="font-mono text-xs text-gold tracking-widest uppercase font-bold">
                    SMC PRO ELITE VIP
                  </p>
                </div>
                <p className="font-serif text-lg text-white font-medium tracking-wide">
                  ARTHUR P. HARRISON
                </p>
                <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 pt-2 border-t border-white/10">
                  <span>MEMBER ID: #8829-VIP</span>
                  <span className="text-emerald-400 font-bold">ACTIVE PLATINUM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: TAB CONTENT */}

      {/* TAB 1: REWARDS MARKETPLACE */}
      {activeTab === "rewards" && (
        <section className="space-y-8">
          <div className="flex justify-between items-end border-l-2 border-gold pl-4">
            <div>
              <h2 className="font-serif text-2xl font-medium text-white uppercase tracking-wider">
                Rewards Marketplace
              </h2>
              <p className="text-xs text-neutral-400">Curated fabrication services, client kits, and luxury design experiences.</p>
            </div>
            <div className="text-right font-mono text-xs text-gold font-bold">
              BALANCE: {userPoints.toLocaleString()} PTS
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {marketplaceRewards.map((reward) => (
              <div
                key={reward.id}
                className="bg-neutral-900 border border-neutral-800 hover:border-gold/60 rounded-2xl overflow-hidden flex flex-col justify-between transition-all group shadow-xl hover:-translate-y-1"
              >
                <div>
                  <div className="relative aspect-[4/3] overflow-hidden bg-neutral-950">
                    <img
                      src={reward.image}
                      alt={reward.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-gold font-mono text-[9px] font-bold tracking-widest border border-gold/30">
                        {reward.badge}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />
                  </div>

                  <div className="p-5 space-y-2">
                    <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider block">
                      {reward.category}
                    </span>
                    <h3 className="font-serif text-lg font-medium text-white group-hover:text-gold transition-colors">
                      {reward.title}
                    </h3>
                    <p className="text-xs text-neutral-400 font-sans leading-relaxed line-clamp-3">
                      {reward.desc}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-neutral-800/80 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase block">Required</span>
                    <span className="font-mono text-sm font-bold text-gold">
                      {reward.pts.toLocaleString()} PTS
                    </span>
                  </div>

                  <button
                    onClick={() => setSelectedRewardModal(reward)}
                    className="px-5 py-2.5 bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold uppercase rounded-xl transition-all cursor-pointer shadow-md"
                  >
                    REDEEM
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 2: DAILY TREASURE CHESTS */}
      {activeTab === "daily-chests" && (
        <section className="space-y-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-neutral-800 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500 animate-bounce" />
                <h2 className="font-serif text-2xl font-medium text-white">Daily Attendance Treasure Chests</h2>
              </div>
              <p className="text-xs text-neutral-400 mt-1">Log in daily to claim bonus trade points and free fabrication accessories.</p>
            </div>

            <button
              onClick={handleClaimToday}
              disabled={isClaiming || claimedDays.includes(6)}
              className={`px-6 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                claimedDays.includes(6)
                  ? "bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 cursor-default"
                  : "bg-gold hover:bg-amber-400 text-neutral-950 shadow-gold/20 hover:scale-105"
              }`}
            >
              {isClaiming ? (
                <>
                  <div className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  Opening Chest...
                </>
              ) : claimedDays.includes(6) ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Day 6 Claimed!
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Claim Day 6 (+12,000 Pts)
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
            {streakRewards.map((item) => {
              const isClaimed = claimedDays.includes(item.day);
              const isToday = item.day === 6;
              const isLocked = item.day > 6;
              const IconComp = item.icon;

              return (
                <div
                  key={item.day}
                  className={`rounded-2xl p-5 border flex flex-col justify-between space-y-4 transition-all relative overflow-hidden ${
                    isToday
                      ? "bg-gradient-to-b from-neutral-900 to-[#1F1908] border-gold shadow-[0_0_20px_rgba(212,175,55,0.25)] scale-105 z-10"
                      : isClaimed
                      ? "bg-neutral-950/80 border-neutral-800 opacity-80"
                      : "bg-neutral-950/40 border-neutral-800 opacity-50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isToday ? "bg-gold text-neutral-950" : "bg-neutral-800 text-neutral-400"
                    }`}>
                      DAY {item.day}
                    </span>
                    {isClaimed && <Check className="w-4 h-4 text-emerald-400" />}
                    {isLocked && <Lock className="w-4 h-4 text-neutral-600" />}
                  </div>

                  <div className="flex flex-col items-center justify-center my-2 space-y-2 text-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      isToday
                        ? "bg-gold/20 border border-gold text-gold animate-bounce"
                        : isClaimed
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                        : "bg-neutral-800 border border-neutral-700 text-neutral-500"
                    }`}>
                      <IconComp className="w-6 h-6" />
                    </div>

                    <h4 className={`font-serif text-sm font-bold ${isToday ? "text-gold" : "text-white"}`}>
                      {item.title}
                    </h4>
                    <p className="text-[10px] text-neutral-400 font-sans leading-tight">
                      {item.desc}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-800 text-center">
                    <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                      isClaimed ? "text-emerald-400" : isToday ? "text-gold animate-pulse" : "text-neutral-500"
                    }`}>
                      {isClaimed ? "CLAIMED" : isToday ? "READY NOW" : "LOCKED"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 3: PLATINUM BENEFITS BENTO GRID */}
      {activeTab === "benefits" && (
        <section className="space-y-8">
          <div className="border-l-2 border-gold pl-4">
            <h2 className="font-serif text-2xl font-medium text-white uppercase tracking-wider">
              Platinum Tier Privileges
            </h2>
            <p className="text-xs text-neutral-400">Exclusive privileges unlocked for SMC PRO Platinum partners.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Perk 1 */}
            <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 hover:border-gold/60 rounded-2xl p-8 flex flex-col justify-between space-y-6 transition-all group min-h-[240px]">
              <div className="space-y-3">
                <div className="p-3 bg-gold/10 text-gold rounded-xl w-fit border border-gold/20">
                  <Mountain className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-xl font-medium text-white group-hover:text-gold transition-colors">
                  Private Quarry Tours
                </h3>
                <p className="text-xs md:text-sm text-neutral-400 font-sans leading-relaxed">
                  First-class travel and curated tours of our elite extraction sites in Carrara, Italy and Danby, Vermont. Select raw blocks before processing.
                </p>
              </div>

              <button
                onClick={() => setShowQuarryVisitModal(true)}
                className="text-gold font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 group-hover:translate-x-2 transition-transform cursor-pointer w-fit"
              >
                SCHEDULE VISIT <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Perk 2 */}
            <div className="md:col-span-1 bg-neutral-900 border border-neutral-800 hover:border-gold/60 rounded-2xl p-8 flex flex-col justify-between space-y-4 transition-all group">
              <div className="space-y-3">
                <div className="p-3 bg-gold/10 text-gold rounded-xl w-fit border border-gold/20">
                  <Eye className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-medium text-white group-hover:text-gold transition-colors">
                  Early Slab Access
                </h3>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  Reserve premium Italian stock 48 hours before the general trade market release.
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                ✓ UNLOCKED FOR PLATINUM
              </span>
            </div>

            {/* Perk 3 */}
            <div className="md:col-span-1 bg-neutral-900 border border-neutral-800 hover:border-gold/60 rounded-2xl p-8 flex flex-col justify-between space-y-4 transition-all group">
              <div className="space-y-3">
                <div className="p-3 bg-gold/10 text-gold rounded-xl w-fit border border-gold/20">
                  <Headphones className="w-6 h-6" />
                </div>
                <h3 className="font-serif text-lg font-medium text-white group-hover:text-gold transition-colors">
                  Dedicated Lead
                </h3>
                <p className="text-xs text-neutral-400 font-sans leading-relaxed">
                  Your personal stone logistics concierge, available 24/7 for CAD specs & rapid templating.
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">
                ✓ UNLOCKED FOR PLATINUM
              </span>
            </div>

            {/* Perk 4 */}
            <div className="md:col-span-4 bg-gradient-to-r from-neutral-900 via-black to-neutral-950 border border-gold/40 rounded-2xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-gold/10 rounded-2xl border border-gold/30 text-gold shrink-0">
                  <CreditCard className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-xl font-medium text-white">
                    Zero-Interest Trade Credit
                  </h3>
                  <p className="text-xs md:text-sm text-neutral-400 font-sans">
                    Extend your payment terms up to 120 days for large-scale commercial & residential developments.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCreditModal(true)}
                className="px-8 py-3 border border-gold text-gold hover:bg-gold hover:text-neutral-950 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shrink-0"
              >
                MANAGE CREDIT
              </button>
            </div>
          </div>
        </section>
      )}

      {/* TAB 4: POINTS TRANSACTION LOG */}
      {activeTab === "history" && (
        <section className="space-y-6">
          <div className="border-l-2 border-gold pl-4">
            <h2 className="font-serif text-2xl font-medium text-white uppercase tracking-wider">
              Points History
            </h2>
            <p className="text-xs text-neutral-400">Complete ledger of trade point accruals and reward redemptions.</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead className="bg-neutral-950 border-b border-neutral-800 font-mono text-[11px] text-neutral-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Transaction</th>
                  <th className="px-6 py-4 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 font-sans">
                {pointsHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-neutral-400">
                      {item.date}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-white">{item.title}</p>
                      <p className="text-xs text-neutral-400 uppercase font-mono">{item.subtext}</p>
                    </td>
                    <td className={`px-6 py-4 text-right font-mono text-base font-bold ${
                      item.isPositive ? "text-gold" : "text-amber-400"
                    }`}>
                      {item.pts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* MODAL 1: REDEEM REWARD CONFIRMATION */}
      {selectedRewardModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-gold/50 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedRewardModal(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-3 text-center">
              <div className="w-16 h-16 bg-gold/10 border border-gold/40 text-gold rounded-2xl mx-auto flex items-center justify-center">
                <Gift className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white">
                Confirm Reward Redemption
              </h3>
              <p className="text-xs text-neutral-400">
                Are you sure you want to redeem <span className="text-gold font-bold">{selectedRewardModal.title}</span> for <span className="text-gold font-bold font-mono">{selectedRewardModal.pts.toLocaleString()} PTS</span>?
              </p>
            </div>

            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">Current Balance:</span>
                <span className="font-mono text-white font-bold">{userPoints.toLocaleString()} PTS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Deduction:</span>
                <span className="font-mono text-amber-400 font-bold">-{selectedRewardModal.pts.toLocaleString()} PTS</span>
              </div>
              <div className="flex justify-between border-t border-neutral-800 pt-2 font-bold">
                <span className="text-gold">Remaining Balance:</span>
                <span className="font-mono text-gold">{(userPoints - selectedRewardModal.pts).toLocaleString()} PTS</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedRewardModal(null)}
                className="w-1/2 py-3 rounded-xl border border-neutral-700 text-neutral-300 text-xs font-mono font-bold uppercase hover:bg-neutral-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmRedeem(selectedRewardModal)}
                className="w-1/2 py-3 rounded-xl bg-gold hover:bg-amber-400 text-neutral-950 text-xs font-mono font-bold uppercase cursor-pointer shadow-lg shadow-gold/20"
              >
                Confirm Redemption
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SCHEDULE PRIVATE QUARRY VISIT */}
      {showQuarryVisitModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-gold/50 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <Mountain className="w-5 h-5 text-gold" /> Schedule Private Quarry Tour
              </h3>
              <button
                onClick={() => setShowQuarryVisitModal(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuarryVisitSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-neutral-300 block uppercase">
                  Quarry Location *
                </label>
                <select
                  value={quarryLocation}
                  onChange={(e) => setQuarryLocation(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold"
                >
                  <option value="Carrara, Italy">Carrara, Italy (Statuary & Calacatta)</option>
                  <option value="Danby, Vermont">Danby, Vermont, USA (Imperial Marble)</option>
                  <option value="Macael, Spain">Macael, Spain (White Macael Marble)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-neutral-300 block uppercase">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  required
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold"
                />
              </div>

              <div className="p-3 bg-gold/10 border border-gold/30 rounded-xl text-[11px] text-neutral-300 space-y-1">
                <p className="font-bold text-gold">Includes First-Class VIP Perks:</p>
                <p>• Helicopter transfer from Pisa/Florence airport to Quarry site.</p>
                <p>• Private block selection reservation with Master Carver.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuarryVisitModal(false)}
                  className="w-1/2 py-3 rounded-xl border border-neutral-700 text-neutral-300 text-xs font-mono font-bold uppercase hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-xl bg-gold hover:bg-amber-400 text-neutral-950 text-xs font-mono font-bold uppercase cursor-pointer shadow-lg shadow-gold/20 flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" /> Request Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ZERO INTEREST CREDIT */}
      {showCreditModal && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-neutral-900 border border-gold/50 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gold" /> Zero-Interest Trade Credit
              </h3>
              <button
                onClick={() => setShowCreditModal(false)}
                className="text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="p-4 bg-neutral-950 border border-gold/30 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Approved Credit Limit:</span>
                  <span className="font-mono text-gold font-bold text-sm">£150,000.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Available Facility:</span>
                  <span className="font-mono text-emerald-400 font-bold text-sm">£112,400.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Payment Terms:</span>
                  <span className="font-mono text-white font-bold">120 Days Net</span>
                </div>
              </div>

              <p className="text-neutral-400 leading-relaxed">
                Your trade credit line is active and automatically applied to all approved quote orders above £5,000. No personal guarantee required for Platinum VIP status.
              </p>

              <button
                onClick={() => {
                  setShowCreditModal(false);
                  alert("Credit extension request submitted! Your account executive will review your pending commercial projects.");
                }}
                className="w-full py-3 bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold uppercase rounded-xl transition-all cursor-pointer shadow-lg shadow-gold/20"
              >
                Request Facility Increase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
