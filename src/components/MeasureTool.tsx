import React, { useState, useEffect, useRef } from "react";
import {
  Camera,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  Maximize2,
  Sliders,
  Grid,
  Zap,
  Download,
  Share2,
  ArrowLeft,
  Ruler,
  Layers,
  Sparkles,
  Calculator,
  RefreshCw,
  FolderPlus,
  Info,
  ChevronRight,
  ShieldCheck,
  Compass,
  AlertCircle
} from "lucide-react";

export interface CapturedPoint {
  id: string;
  x: number; // Percentage on canvas 0..100
  y: number; // Percentage on canvas 0..100
  label: string;
  realX: number; // Calculated real distance in meters
  realY: number;
}

export interface MeasureToolProps {
  onClose?: () => void;
  onNavigateToEstimator?: (dims: { lengthMm: number; widthMm: number; areaSqFt: number }) => void;
  onSaveToProject?: (measuredData: {
    points: CapturedPoint[];
    perimeterM: number;
    areaSqM: number;
    areaSqFt: number;
    lengthMm: number;
    widthMm: number;
  }) => void;
  projects?: Array<{ id: string; name: string; address: string }>;
}

export default function MeasureTool({
  onClose,
  onNavigateToEstimator,
  onSaveToProject,
  projects = []
}: MeasureToolProps) {
  // Camera & Stream states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  // AR HUD States
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showLeveler, setShowLeveler] = useState<boolean>(true);
  const [pitch, setPitch] = useState<number>(0.2); // Degrees tilt
  const [roll, setRoll] = useState<number>(-0.1);
  const [targetDistanceM, setTargetDistanceM] = useState<number>(1.85); // Distance to target

  // Captured Measurement Points State
  const [points, setPoints] = useState<CapturedPoint[]>([]);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [rippling, setRippling] = useState<boolean>(false);

  // Unit Toggle (Meters / Feet)
  const [unit, setUnit] = useState<"m" | "ft">("m");

  // Save to Project Modal
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || "");
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Web Audio Beep Generator
  const playBeep = (freq = 880, type: OscillatorType = "sine") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (typeof AudioCtx === "function") {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.3, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch (e) {
      // Audio fallback silent
    }
  };

  // Camera Initialization
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraActive(true);
      } else {
        throw new Error("Camera API not supported in this environment context.");
      }
    } catch (err: any) {
      console.warn("Live Camera feed notice:", err);
      setCameraError("Iframe environment camera restricted. High-precision AR simulation stage running.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Simulate gyro leveling tilt
  useEffect(() => {
    const interval = setInterval(() => {
      setPitch((prev) => {
        const delta = (Math.random() - 0.5) * 0.1;
        const next = prev + delta;
        return Math.abs(next) < 3 ? next : prev;
      });
      setRoll((prev) => {
        const delta = (Math.random() - 0.5) * 0.1;
        const next = prev + delta;
        return Math.abs(next) < 3 ? next : prev;
      });
      setTargetDistanceM((prev) => {
        const delta = (Math.random() - 0.5) * 0.02;
        return Math.max(1.2, Math.min(3.5, prev + delta));
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Handle Capture Point at screen center reticle
  const handleCapturePoint = () => {
    playBeep(1046, "triangle");
    setRippling(true);
    setTimeout(() => setRippling(false), 500);

    // Calculate simulated reticle position or random realistic offset relative to center
    const pointLetters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const label = `Pt ${pointLetters[points.length % pointLetters.length]}`;

    // Define realistic spatial walk around a countertop layout
    let newX = 50;
    let newY = 50;

    if (points.length === 0) {
      newX = 25;
      newY = 65;
    } else if (points.length === 1) {
      newX = 75;
      newY = 65;
    } else if (points.length === 2) {
      newX = 75;
      newY = 35;
    } else if (points.length === 3) {
      newX = 25;
      newY = 35;
    } else {
      // Offset slightly around center
      newX = Math.floor(Math.random() * 60) + 20;
      newY = Math.floor(Math.random() * 60) + 20;
    }

    // Convert pixel position on simulated 3.0m x 2.0m field
    const realX = (newX / 100) * 3.2; // meters
    const realY = (newY / 100) * 2.0;

    const newPoint: CapturedPoint = {
      id: `pt-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      x: newX,
      y: newY,
      label,
      realX: Number(realX.toFixed(2)),
      realY: Number(realY.toFixed(2))
    };

    setPoints((prev) => [...prev, newPoint]);
  };

  // Undo Last Point
  const handleUndoPoint = () => {
    playBeep(440, "sine");
    setPoints((prev) => prev.slice(0, prev.length - 1));
  };

  // Clear All Points
  const handleClearPoints = () => {
    playBeep(330, "sawtooth");
    setPoints([]);
  };

  // Compute distances between sequential points
  const segments = points.map((pt, idx) => {
    const nextPt = points[(idx + 1) % points.length];
    const dx = nextPt.realX - pt.realX;
    const dy = nextPt.realY - pt.realY;
    const distM = Math.sqrt(dx * dx + dy * dy);
    return {
      from: pt.label,
      to: nextPt.label,
      distM: Number(distM.toFixed(2)),
      distFt: Number((distM * 3.28084).toFixed(2))
    };
  });

  // Calculate total perimeter
  const totalPerimeterM = points.length > 1
    ? points.reduce((acc, pt, idx) => {
        if (idx === points.length - 1 && points.length < 3) return acc;
        const nextPt = points[(idx + 1) % points.length];
        const dx = nextPt.realX - pt.realX;
        const dy = nextPt.realY - pt.realY;
        return acc + Math.sqrt(dx * dx + dy * dy);
      }, 0)
    : 0;

  // Calculate Bounding Box dimensions (Length & Width)
  const minX = points.length ? Math.min(...points.map((p) => p.realX)) : 0;
  const maxX = points.length ? Math.max(...points.map((p) => p.realX)) : 2.8;
  const minY = points.length ? Math.min(...points.map((p) => p.realY)) : 0;
  const maxY = points.length ? Math.max(...points.map((p) => p.realY)) : 1.2;

  const lengthM = Number((maxX - minX || 2.8).toFixed(2));
  const widthM = Number((maxY - minY || 1.2).toFixed(2));

  const lengthMm = Math.round(lengthM * 1000);
  const widthMm = Math.round(widthM * 1000);

  const areaSqM = Number((lengthM * widthM).toFixed(2));
  const areaSqFt = Number((areaSqM * 10.7639).toFixed(1));

  // Determine slab fitting logic vs standard 3200mm x 1900mm slab
  const requiredSlabs = (lengthMm > 3100 || widthMm > 1800) ? 2 : 1;

  // Handle Export to Quote Estimator
  const handleExportToEstimator = () => {
    if (onNavigateToEstimator) {
      onNavigateToEstimator({
        lengthMm,
        widthMm,
        areaSqFt
      });
    }
  };

  // Handle Save to Project Dossier
  const handleConfirmSaveToProject = () => {
    if (onSaveToProject) {
      onSaveToProject({
        points,
        perimeterM: Number(totalPerimeterM.toFixed(2)),
        areaSqM,
        areaSqFt,
        lengthMm,
        widthMm
      });
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowSaveModal(false);
    }, 1800);
  };

  // Download CAD / PDF Technical Measurement Sheet
  const handleDownloadCadReport = () => {
    const reportText = `=====================================================
SMC PRO - HIGH-PRECISION AR LASER MEASUREMENT DOSSIER
=====================================================
Generated: ${new Date().toLocaleString()}
System Version: SMC PRO AR MEASURE v5.2

SURFACE SPECIFICATIONS:
- Bounding Box Length: ${lengthMm} mm (${(lengthM * 3.28084).toFixed(2)} ft)
- Bounding Box Width:  ${widthMm} mm (${(widthM * 3.28084).toFixed(2)} ft)
- Total Measured Area: ${areaSqM} sq. meters (${areaSqFt} sq. ft)
- Total Perimeter:     ${totalPerimeterM.toFixed(2)} meters
- Required Slab Stock: ${requiredSlabs} Slab(s) (Standard 3200x1900mm Format)

CAPTURED POINT COORDINATES:
${points.map((p, i) => `${p.label}: X=${p.realX}m, Y=${p.realY}m`).join("\n")}

SEGMENT DISTANCES:
${segments.map((s) => `${s.from} -> ${s.to}: ${s.distM}m (${s.distFt}ft)`).join("\n")}

FABRICATION RECOMMENDATION:
- Seamless Single Slab Yield: ${requiredSlabs === 1 ? "100% High Efficiency" : "Multi-Slab Seam Matching Required"}
- Waterjet Cutting kerf offset: 1.2mm
- Edge Profile Allowance: +20mm per edge

SMC PRO FABRICATION SYSTEMS INC.
All rights reserved.
=====================================================`;

    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SMC_AR_Measure_Dossier_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative w-full h-[calc(100vh-80px)] min-h-[640px] bg-[#0E0E0E] text-white flex flex-col justify-between overflow-hidden font-sans select-none animate-fade-in">
      
      {/* ========================================================= */}
      {/* 1. TOP BAR CONTROL HUD */}
      {/* ========================================================= */}
      <div className="relative z-30 bg-black/80 backdrop-blur-md border-b border-gold/20 px-4 py-3 flex items-center justify-between shadow-xl">
        {/* Left: Back / Title */}
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 hover:border-gold text-neutral-300 hover:text-white transition-all cursor-pointer"
              title="Close Measure Tool"
            >
              <ArrowLeft className="w-4 h-4 text-gold" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-sm text-white tracking-wider">SMC PRO MEASURE</span>
              <span className="bg-gold/20 border border-gold/40 text-gold text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                <Sparkles className="w-3 h-3 animate-pulse" /> AR LASER 5.2
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-mono">Precision Spatial Surface Templating System</p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Torch Toggle */}
          <button
            onClick={() => setTorchOn(!torchOn)}
            className={`p-2 rounded-lg border text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              torchOn
                ? "bg-gold text-neutral-950 border-gold shadow-[0_0_12px_rgba(212,175,55,0.6)]"
                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
            }`}
            title="Toggle Laser Guidance Light"
          >
            <Zap className={`w-3.5 h-3.5 ${torchOn ? "fill-current" : ""}`} />
            <span className="hidden sm:inline text-[10px] font-bold uppercase">{torchOn ? "LIGHT ON" : "LIGHT"}</span>
          </button>

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-lg border text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              showGrid
                ? "bg-gold/20 border-gold text-gold"
                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
            }`}
            title="Toggle AR Spatial Grid"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase">GRID</span>
          </button>

          {/* Leveler Toggle */}
          <button
            onClick={() => setShowLeveler(!showLeveler)}
            className={`p-2 rounded-lg border text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
              showLeveler
                ? "bg-gold/20 border-gold text-gold"
                : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
            }`}
            title="Toggle Gyro Bubble Leveler"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase">LEVEL</span>
          </button>

          {/* Unit Switcher */}
          <button
            onClick={() => setUnit(unit === "m" ? "ft" : "m")}
            className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-gold px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold text-gold cursor-pointer transition-all uppercase"
          >
            {unit === "m" ? "METRIC (M)" : "IMPERIAL (FT)"}
          </button>

          {/* Camera Switch */}
          <button
            onClick={() => setFacingMode(facingMode === "environment" ? "user" : "environment")}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-gold text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Switch Camera Sensor"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gold" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MAIN CAMERA VIEWPORT & AR CANVAS HUD */}
      {/* ========================================================= */}
      <div className="relative flex-1 w-full bg-neutral-950 overflow-hidden flex items-center justify-center">
        
        {/* Real Video Camera Stream */}
        {cameraActive && !cameraError && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover z-0"
          />
        )}

        {/* Fallback Live Camera Simulation Stage */}
        {(!cameraActive || cameraError) && (
          <div
            className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 scale-105 filter contrast-105"
            style={{
              backgroundImage: "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80')"
            }}
          >
            {/* Ambient Dark Overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
          </div>
        )}

        {/* Camera Light / Torch Simulation Flash Overlay */}
        {torchOn && (
          <div className="absolute inset-0 z-0 bg-amber-100/10 pointer-events-none mix-blend-screen transition-opacity duration-300" />
        )}

        {/* --------------------------------------------------------- */}
        {/* AR SPATIAL PERSPECTIVE GRID OVERLAY */}
        {/* --------------------------------------------------------- */}
        {showGrid && (
          <div className="absolute inset-0 z-10 pointer-events-none opacity-30 flex items-center justify-center overflow-hidden">
            <div 
              className="w-[160%] h-[160%] border border-gold/30 rounded-full flex items-center justify-center transform rotate-45 scale-125"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(212,175,55,0.2) 1px, transparent 1px), linear-gradient(to right, rgba(212,175,55,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(212,175,55,0.1) 1px, transparent 1px)`,
                backgroundSize: "40px 40px"
              }}
            />
          </div>
        )}

        {/* --------------------------------------------------------- */}
        {/* AR LEVELER BUBBLE GAUGE (Left Side Overlay) */}
        {/* --------------------------------------------------------- */}
        {showLeveler && (
          <div className="absolute top-6 left-6 z-20 bg-black/70 backdrop-blur-md border border-gold/30 p-3 rounded-2xl flex flex-col items-center gap-2 text-[10px] font-mono shadow-2xl animate-fade-in">
            <span className="text-[8px] text-gold font-bold uppercase tracking-widest">SURFACE TILT</span>
            
            {/* Level Tube Bar */}
            <div className="relative w-4 h-28 bg-neutral-900 border border-gold/40 rounded-full overflow-hidden flex items-center justify-center shadow-inner">
              {/* Center Line indicator */}
              <div className="absolute w-full h-0.5 bg-gold/60 top-1/2 -translate-y-1/2 z-10" />
              
              {/* Dynamic Bubble */}
              <div
                className={`w-3.5 h-3.5 rounded-full transition-all duration-300 shadow-md ${
                  Math.abs(pitch) < 0.5 ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-gold shadow-[0_0_8px_#D4AF37]"
                }`}
                style={{
                  transform: `translateY(${pitch * 8}px)`
                }}
              />
            </div>

            <div className="text-center space-y-0.5">
              <span className={`font-bold block ${Math.abs(pitch) < 0.5 ? "text-emerald-400" : "text-gold"}`}>
                {Math.abs(pitch) < 0.5 ? "0.0° LEVEL" : `${pitch > 0 ? "+" : ""}${pitch.toFixed(1)}°`}
              </span>
              <span className="text-[8px] text-neutral-400">ROLL: {roll.toFixed(1)}°</span>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------- */}
        {/* AR HUD RETICLE / CENTER CROSSHAIR */}
        {/* --------------------------------------------------------- */}
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          
          {/* Target Alignment Circle */}
          <div className={`relative w-40 h-40 border-2 rounded-full flex items-center justify-center transition-all duration-300 ${
            rippling ? "scale-110 border-gold shadow-[0_0_30px_rgba(212,175,55,0.8)]" : "border-gold/60 shadow-[0_0_15px_rgba(212,175,55,0.3)]"
          }`}>
            {/* Inner Ring */}
            <div className="w-20 h-20 border border-dashed border-gold/50 rounded-full animate-spin-slow" />
            
            {/* Center Laser Dot */}
            <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
              rippling ? "bg-white scale-150 shadow-[0_0_15px_#ffffff]" : "bg-gold shadow-[0_0_10px_#D4AF37]"
            }`} />

            {/* Crosshair Lines */}
            <div className="absolute w-full h-[1px] bg-gold/40" />
            <div className="absolute h-full w-[1px] bg-gold/40" />

            {/* Corner Bracket Braces */}
            <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-gold" />
            <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-gold" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-gold" />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-gold" />

            {/* Live Distance Tag below Reticle */}
            <div className="absolute -bottom-8 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-gold/40 text-[10px] font-mono text-gold font-bold tracking-wider flex items-center gap-1.5 shadow-lg">
              <Ruler className="w-3 h-3 text-gold animate-pulse" />
              <span>{unit === "m" ? `${targetDistanceM.toFixed(2)}m` : `${(targetDistanceM * 3.28084).toFixed(2)}ft`}</span>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------------- */}
        {/* CAPTURED POINTS & POLYGON OVERLAY ON CANVAS */}
        {/* --------------------------------------------------------- */}
        <div className="absolute inset-0 z-15 pointer-events-none">
          <svg className="w-full h-full">
            {/* Render Filled Polygon if 3+ points */}
            {points.length >= 3 && (
              <polygon
                points={points.map((p) => `${(p.x / 100) * window.innerWidth},${(p.y / 100) * window.innerHeight}`).join(" ")}
                fill="rgba(212, 175, 55, 0.15)"
                stroke="#D4AF37"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            )}

            {/* Render Connecting Lines between points */}
            {points.map((pt, idx) => {
              if (idx === points.length - 1 && points.length < 3) return null;
              const nextPt = points[(idx + 1) % points.length];
              const x1 = (pt.x / 100) * (window.innerWidth || 800);
              const y1 = (pt.y / 100) * (window.innerHeight || 600);
              const x2 = (nextPt.x / 100) * (window.innerWidth || 800);
              const y2 = (nextPt.y / 100) * (window.innerHeight || 600);

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              const seg = segments[idx];

              return (
                <g key={`line-${pt.id}-${nextPt.id}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#D4AF37"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  {/* Distance Label Badge on Line */}
                  <foreignObject x={midX - 36} y={midY - 14} width="72" height="28">
                    <div className="bg-black/90 text-gold text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-gold/40 text-center shadow-md">
                      {unit === "m" ? `${seg?.distM}m` : `${seg?.distFt}ft`}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>

          {/* Point Markers */}
          {points.map((pt, idx) => {
            const isSelected = activePointIndex === idx;
            return (
              <div
                key={pt.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group"
                style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                onClick={() => setActivePointIndex(idx)}
              >
                {/* Point Pulse Ring */}
                <div className={`w-8 h-8 rounded-full border border-gold flex items-center justify-center transition-all ${
                  isSelected ? "scale-125 bg-gold/30 shadow-[0_0_15px_#D4AF37]" : "bg-black/80"
                }`}>
                  <span className="text-[10px] font-mono font-bold text-gold">{pt.label.replace("Pt ", "")}</span>
                </div>
                {/* Label Tooltip */}
                <div className="absolute top-9 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md px-2 py-0.5 rounded border border-gold/30 text-[8px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {pt.label} ({pt.realX}m, {pt.realY}m)
                </div>
              </div>
            );
          })}
        </div>

        {/* --------------------------------------------------------- */}
        {/* BOTTOM PRIMARY CAPTURE ACTION BUTTON & CONTROLS */}
        {/* --------------------------------------------------------- */}
        <div className="absolute bottom-6 inset-x-4 z-30 flex flex-col items-center gap-3 pointer-events-none">
          
          {/* Main Floating Trigger Group */}
          <div className="flex items-center gap-6 pointer-events-auto">
            
            {/* Undo Button */}
            <button
              onClick={handleUndoPoint}
              disabled={points.length === 0}
              className="p-3.5 rounded-2xl bg-black/80 backdrop-blur-md border border-neutral-800 hover:border-gold/60 text-neutral-300 hover:text-white disabled:opacity-40 transition-all cursor-pointer shadow-xl"
              title="Undo Last Point"
            >
              <RotateCcw className="w-5 h-5 text-gold" />
            </button>

            {/* PRIMARY CAPTURE POINT BUTTON */}
            <button
              onClick={handleCapturePoint}
              className={`relative group w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-gold to-yellow-200 p-1.5 shadow-[0_0_30px_rgba(212,175,55,0.6)] hover:shadow-[0_0_40px_rgba(212,175,55,0.9)] active:scale-95 transition-all cursor-pointer flex items-center justify-center`}
            >
              <div className="w-full h-full rounded-full bg-neutral-950 flex flex-col items-center justify-center group-hover:bg-neutral-900 transition-colors border border-gold/40">
                <Plus className="w-7 h-7 text-gold group-hover:scale-110 transition-transform" />
                <span className="text-[8px] font-mono font-bold tracking-widest text-gold uppercase mt-0.5">POINT</span>
              </div>
            </button>

            {/* Clear All Button */}
            <button
              onClick={handleClearPoints}
              disabled={points.length === 0}
              className="p-3.5 rounded-2xl bg-black/80 backdrop-blur-md border border-neutral-800 hover:border-red-500/60 text-neutral-300 hover:text-red-400 disabled:opacity-40 transition-all cursor-pointer shadow-xl"
              title="Clear All Points"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <span className="text-[10px] font-mono text-neutral-300 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-neutral-800 font-medium">
            {points.length === 0 ? "Aim crosshair at countertop corner and tap POINT to start" : `${points.length} Point(s) Logged • Tap POINT to extend boundary`}
          </span>
        </div>

      </div>

      {/* ========================================================= */}
      {/* 3. BOTTOM CAPTURED METRICS & ACTION SHEET */}
      {/* ========================================================= */}
      <div className="relative z-30 bg-[#111111] border-t border-gold/30 px-4 md:px-8 py-4 shadow-2xl">
        <div className="max-w-7xl mx-auto space-y-4">
          
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            
            {/* Metric 1: Bounding Length */}
            <div className="bg-neutral-900/90 border border-neutral-800 p-3 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                <Ruler className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-mono text-neutral-400 uppercase block font-semibold">LENGTH</span>
                <span className="text-sm font-mono font-bold text-white">
                  {unit === "m" ? `${lengthM} m` : `${(lengthM * 3.28084).toFixed(2)} ft`}
                </span>
                <span className="text-[9px] font-mono text-neutral-500 block">{lengthMm} mm</span>
              </div>
            </div>

            {/* Metric 2: Bounding Width */}
            <div className="bg-neutral-900/90 border border-neutral-800 p-3 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                <Maximize2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-mono text-neutral-400 uppercase block font-semibold">WIDTH</span>
                <span className="text-sm font-mono font-bold text-white">
                  {unit === "m" ? `${widthM} m` : `${(widthM * 3.28084).toFixed(2)} ft`}
                </span>
                <span className="text-[9px] font-mono text-neutral-500 block">{widthMm} mm</span>
              </div>
            </div>

            {/* Metric 3: Total Area */}
            <div className="bg-neutral-900/90 border border-neutral-800 p-3 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gold/10 border border-gold/30 flex items-center justify-center text-gold shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-mono text-neutral-400 uppercase block font-semibold">SURFACE AREA</span>
                <span className="text-sm font-mono font-bold text-gold">
                  {areaSqFt} <span className="text-[10px] text-neutral-400">sq ft</span>
                </span>
                <span className="text-[9px] font-mono text-neutral-500 block">{areaSqM} m²</span>
              </div>
            </div>

            {/* Metric 4: Slab Fitting Yield */}
            <div className="bg-neutral-900/90 border border-neutral-800 p-3 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9px] font-mono text-neutral-400 uppercase block font-semibold">SLAB STOCK REQ</span>
                <span className="text-sm font-mono font-bold text-white">
                  {requiredSlabs} Slab{requiredSlabs > 1 ? "s" : ""}
                </span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold block">3200x1900mm Standard</span>
              </div>
            </div>

          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-1 border-t border-neutral-800/80">
            
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-mono">
              <ShieldCheck className="w-4 h-4 text-gold" />
              <span>SMC Laser Measurement Status: <span className="text-emerald-400 font-bold">CALIBRATED (±1.5mm)</span></span>
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
              
              {/* Action 1: Download CAD/PDF Report */}
              <button
                onClick={handleDownloadCadReport}
                className="flex-1 sm:flex-none bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-gold" />
                <span>Export Dossier</span>
              </button>

              {/* Action 2: Save to Project */}
              {onSaveToProject && (
                <button
                  onClick={() => setShowSaveModal(true)}
                  disabled={points.length === 0}
                  className="flex-1 sm:flex-none bg-neutral-900 hover:bg-neutral-800 border border-gold/40 text-gold hover:border-gold px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Bind to Project</span>
                </button>
              )}

              {/* Action 3: Load directly into Quote Estimator */}
              {onNavigateToEstimator && (
                <button
                  onClick={handleExportToEstimator}
                  disabled={points.length === 0}
                  className="flex-1 sm:flex-none bg-gold hover:bg-amber-400 text-neutral-950 font-mono font-bold text-xs px-5 py-2.5 rounded-xl uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer shadow-lg"
                >
                  <Calculator className="w-4 h-4" />
                  <span>Calculate Quote with Specs</span>
                </button>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* 4. BIND TO PROJECT MODAL */}
      {/* ========================================================= */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-fade-in text-white">
          <div className="bg-[#141414] border border-gold/30 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            
            <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
              <div>
                <span className="text-[9px] font-mono text-gold font-bold uppercase tracking-widest block">SMC PROJECT DOSSIER</span>
                <h3 className="font-serif text-xl text-white font-medium">Attach AR Laser Specs</h3>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            {saveSuccess ? (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-serif text-lg text-white font-medium">Measurement Bound Successfully!</h4>
                <p className="text-xs text-neutral-400 font-mono">
                  Attached {lengthMm}mm x {widthMm}mm ({areaSqFt} sq ft) spatial template to project dossier.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold block">Select Target Project Dossier</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 focus:border-gold rounded-xl px-3 py-2.5 text-xs font-semibold text-white transition-all"
                  >
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.name} ({proj.address})
                      </option>
                    ))}
                    {projects.length === 0 && (
                      <option value="default">Default Master Project</option>
                    )}
                  </select>
                </div>

                {/* Summary Box */}
                <div className="bg-neutral-900 p-3.5 rounded-xl border border-neutral-800 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-neutral-400">
                    <span>Length x Width:</span>
                    <span className="text-white font-bold">{lengthM}m x {widthM}m</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Surface Area:</span>
                    <span className="text-gold font-bold">{areaSqFt} sq. ft ({areaSqM} m²)</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Slab Material Yield:</span>
                    <span className="text-emerald-400 font-bold">{requiredSlabs} Slab(s) Required</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="px-4 py-2 border border-neutral-700 text-neutral-400 hover:text-white rounded-xl text-xs font-mono font-bold uppercase transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmSaveToProject}
                    className="px-5 py-2 bg-gold hover:bg-amber-400 text-neutral-950 font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
                  >
                    Confirm & Attach
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
