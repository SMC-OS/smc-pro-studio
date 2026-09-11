import React, { useState } from "react";
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Award,
  Sparkles,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Trophy,
  Clock,
  Zap,
  Check,
  ChevronRight,
  ShieldCheck,
  Lightbulb,
  ExternalLink,
  Layers,
  Flame
} from "lucide-react";

interface RenovationQuizProps {
  onNavigate?: (tab: string) => void;
  onAddVaultPoints?: (points: number) => void;
}

interface Question {
  id: number;
  category: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  image?: string;
  imageAlt?: string;
}

const QUIZ_QUESTIONS: Question[] = [
  {
    id: 1,
    category: "Hardness & Durability",
    question: "Which architectural surface material possesses the highest Mohs scale hardness rating, delivering supreme resistance against kitchen knife scratches and acidic etching?",
    options: ["Quartzite & Sintered Stone (Mohs 7-8)", "Italian Carrara Marble (Mohs 3-4)", "Classic Limestone (Mohs 3)", "Terrazzo (Mohs 4-5)"],
    correctIndex: 0,
    explanation: "Sintered Stone and natural Quartzite rank 7-8 on the Mohs scale, outperforming marble (Mohs 3-4) and resisting scratch damage from steel blades and acidic liquids."
  },
  {
    id: 2,
    category: "Edge Fabrication",
    question: "Identify this premium architectural edge profile frequently specified for luxury waterfall kitchen islands to create a continuous, seamless grain wrap.",
    options: ["Classic Bullnose Edge", "45° Mitered Waterfall Edge", "Standard Eased Flat Edge", "Ogee Double Bevel Edge"],
    correctIndex: 1,
    explanation: "A 45° Mitered Waterfall edge joins the horizontal counter to the vertical side slab at a perfect miter angle, creating the visual illusion of a monolithic stone block.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAhSpzeuVHHg2PNupTYS8HDzSxJSW-U3yPQe_g-yisnA-ps7_EUjwLq3B2kp8HffVrxEGLHdH3cx0JeITxv5h4tfFlb-dkDKFQrf9jJkbr9yGrgXod2KfJcTiY6eUi5VgUr-H-DGkbG1s84rIR53B3xBhFkiu080Ev7vpA6dmh6RX5jn0pybSp423Q_Ln3I580WNhEN8elynw4EIYkxujBb98yVCOu8udW-ZedD_ZxE29c7eKOgb3wjlaRjG0BZCkdugL7M5fykhBc",
    imageAlt: "Mitered Waterfall Edge Joinery Detail"
  },
  {
    id: 3,
    category: "Sealing Protocols",
    question: "How frequently should high-grade natural Calacatta or Carrara marble in a wet master bath be treated with a high-performance nano-barrier sealer?",
    options: ["Every 12 to 18 Months", "Every 10 Years", "Never (Marble is naturally non-porous)", "Once every 2 Weeks"],
    correctIndex: 0,
    explanation: "Natural marble has microscopic pores. Applying a professional fluoropolymer or nano-tech impregnating sealer every 12–18 months preserves the surface against water and oil staining."
  },
  {
    id: 4,
    category: "Thermal Shock & Heat",
    question: "Which material allows direct contact with boiling pans and open flame cookware without cracking or suffering thermal shock scorching?",
    options: ["Ultra-Compact Sintered Porcelain (Dekton / Neolith)", "Standard Engineered Quartz", "Laminated Composite Acrylic", "Wood Butcher Block"],
    correctIndex: 0,
    explanation: "Sintered stone is fused at over 1,200°C under extreme pressure, making it 100% heat-proof, flame-resistant, and immune to thermal shock from hot pans."
  },
  {
    id: 5,
    category: "Precision Fabrication",
    question: "What technology is utilized during site measurement to ensure slab cutouts fit around complex walls with sub-millimeter accuracy?",
    options: ["3D Laser Digitizing & CAD Templating", "Hand-ruled String & Chalk Lines", "Standard Cardboard Tracing", "Eye Estimation & Grinding on Site"],
    correctIndex: 0,
    explanation: "SMC PRO uses 3D laser digitizing to create precise CAD DXF wireframes of the site, which feed directly into 5-axis CNC water-jets for millimeter-perfect fitment."
  }
];

export default function RenovationQuiz({ onNavigate, onAddVaultPoints }: RenovationQuizProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<(number | null)[]>([]);
  const [earnedVaultPoints, setEarnedVaultPoints] = useState(0);

  const currentQ = QUIZ_QUESTIONS[currentQuestionIndex];
  const totalQuestions = QUIZ_QUESTIONS.length;

  const handleSelectOption = (index: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;
    setIsAnswerSubmitted(true);
    const isCorrect = selectedOption === currentQ.correctIndex;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
    setUserAnswers(prev => [...prev, selectedOption]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      // Finish Quiz
      const finalScore = score + (selectedOption === currentQ.correctIndex ? 1 : 0);
      const calculatedPoints = finalScore * 50 + (finalScore === totalQuestions ? 100 : 0);
      setEarnedVaultPoints(calculatedPoints);
      if (onAddVaultPoints) {
        onAddVaultPoints(calculatedPoints);
      }
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setQuizFinished(false);
    setUserAnswers([]);
    setEarnedVaultPoints(0);
  };

  return (
    <div className="space-y-8 animate-fade-in text-white pb-12 max-w-5xl mx-auto">
      {/* Top Header Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-neutral-900 via-[#1A1A1A] to-neutral-950 border border-gold/30 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="flex items-center gap-3">
            {onNavigate && (
              <button
                onClick={() => onNavigate("dashboard")}
                className="p-2 rounded-xl bg-neutral-800/80 hover:bg-gold hover:text-neutral-950 text-neutral-300 transition-all cursor-pointer flex items-center justify-center"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-gold/20 text-gold border border-gold/40 uppercase tracking-widest">
              <Award className="w-3.5 h-3.5 text-gold animate-pulse" />
              SMC PRO TECHNICAL LIBRARY
            </div>
          </div>

          <h2 className="font-serif text-3xl md:text-5xl text-white font-medium tracking-tight">
            Renovation Technical Mastery
          </h2>
          <p className="text-xs md:text-sm text-neutral-400 max-w-xl leading-relaxed font-sans">
            Test your knowledge on natural stone, sintered porcelain, miter fabrication, and surface care.
          </p>
        </div>
      </div>

      {!quizFinished ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Question Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono text-neutral-400">
                <span>QUESTION {currentQuestionIndex + 1} OF {totalQuestions}</span>
                <span className="text-gold font-bold">{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}% COMPLETED</span>
              </div>
              <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-gold transition-all duration-500"
                  style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold px-3 py-1 bg-gold/10 text-gold rounded-full border border-gold/30 uppercase tracking-widest">
                  {currentQ.category}
                </span>

                <span className="text-xs font-mono text-neutral-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" /> Untimed Mode
                </span>
              </div>

              <h3 className="font-serif text-xl md:text-2xl text-white font-medium leading-relaxed">
                {currentQ.question}
              </h3>

              {/* Optional Image */}
              {currentQ.image && (
                <div className="rounded-xl overflow-hidden border border-neutral-800 relative group aspect-[16/9]">
                  <img
                    src={currentQ.image}
                    alt={currentQ.imageAlt || "Question reference"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 rounded-md border border-white/10 text-[10px] font-mono text-gold flex items-center gap-1.5 uppercase">
                    <Layers className="w-3.5 h-3.5" /> {currentQ.imageAlt || "Visual Reference"}
                  </div>
                </div>
              )}

              {/* Options */}
              <div className="space-y-3 pt-2">
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  let optionStyle = "bg-neutral-950/60 border-neutral-800 text-neutral-300 hover:border-gold/50";

                  if (isAnswerSubmitted) {
                    if (idx === currentQ.correctIndex) {
                      optionStyle = "bg-emerald-950/80 border-emerald-500/80 text-emerald-200 font-bold";
                    } else if (isSelected && idx !== currentQ.correctIndex) {
                      optionStyle = "bg-rose-950/80 border-rose-500/80 text-rose-200";
                    } else {
                      optionStyle = "bg-neutral-950/30 border-neutral-900 text-neutral-600 opacity-50";
                    }
                  } else if (isSelected) {
                    optionStyle = "bg-gold/10 border-gold text-white font-bold shadow-md shadow-gold/10";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswerSubmitted}
                      className={`w-full p-4 md:p-5 rounded-xl border text-left text-xs md:text-sm transition-all flex items-center justify-between cursor-pointer ${optionStyle}`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full font-mono text-[11px] flex items-center justify-center border ${
                          isSelected ? "bg-gold text-neutral-950 border-gold font-bold" : "bg-neutral-800/80 border-neutral-700 text-neutral-400"
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {option}
                      </span>

                      {isAnswerSubmitted && idx === currentQ.correctIndex && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      )}

                      {isAnswerSubmitted && isSelected && idx !== currentQ.correctIndex && (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Banner */}
              {isAnswerSubmitted && (
                <div className={`p-5 rounded-xl border space-y-2 animate-fade-in ${
                  selectedOption === currentQ.correctIndex
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-amber-950/40 border-amber-500/40 text-amber-200"
                }`}>
                  <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider">
                    <Lightbulb className="w-4 h-4 text-gold" />
                    Technical Insight & Protocol
                  </div>
                  <p className="text-xs md:text-sm font-sans leading-relaxed opacity-90">
                    {currentQ.explanation}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-neutral-800 flex justify-end">
                {!isAnswerSubmitted ? (
                  <button
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null}
                    className={`px-8 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer ${
                      selectedOption !== null
                        ? "bg-gold hover:bg-amber-400 text-neutral-950 shadow-lg shadow-gold/20"
                        : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                    }`}
                  >
                    Confirm Answer
                  </button>
                ) : (
                  <button
                    onClick={handleNextQuestion}
                    className="px-8 py-3 rounded-xl bg-gold hover:bg-amber-400 text-neutral-950 font-mono text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-gold/20 flex items-center gap-2 cursor-pointer"
                  >
                    {currentQuestionIndex < totalQuestions - 1 ? "Next Question" : "View Final Results"}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar / Leaderboard Info */}
          <div className="lg:col-span-4 space-y-6">
            {/* Status Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h4 className="font-serif text-lg font-medium text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gold" /> Quiz Progress Status
              </h4>

              <div className="space-y-3 pt-2 text-xs font-mono">
                <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Current Score</span>
                  <span className="text-gold font-bold">{score} / {totalQuestions} Correct</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-800">
                  <span className="text-neutral-400">Points Accumulated</span>
                  <span className="text-emerald-400 font-bold">+{score * 50} Vault Pts</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-neutral-400">Accuracy Target</span>
                  <span className="text-sky-400 font-bold">100% for Bonus</span>
                </div>
              </div>
            </div>

            {/* Architectural Tip */}
            <div className="bg-neutral-900/80 border border-gold/30 rounded-2xl p-6 space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-2 text-gold text-xs font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Pro Fabrication Tip
              </div>
              <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                Always specify bookmatched slab pairing when designing long kitchen runs over 3.2 meters to ensure natural vein alignment across all mitered seams.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* QUIZ FINISHED / RESULTS CARD */
        <div className="max-w-2xl mx-auto bg-neutral-900/90 border border-gold/40 rounded-3xl p-8 md:p-12 space-y-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 mx-auto rounded-full bg-gold/20 border-2 border-gold flex items-center justify-center text-gold animate-bounce">
            <Trophy className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h3 className="font-serif text-3xl md:text-4xl text-white font-medium">
              Quiz Completed!
            </h3>
            <p className="text-xs md:text-sm text-neutral-400 font-sans">
              You scored <span className="text-gold font-bold">{score} out of {totalQuestions}</span> questions correctly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleRestartQuiz}
              className="px-6 py-3 rounded-xl border border-neutral-700 hover:border-gold text-neutral-300 hover:text-white font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Retry Quiz
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
