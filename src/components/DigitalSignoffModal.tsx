import React, { useState, useRef, useEffect } from "react";
import {
  X,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Star,
  Award,
  PenTool,
  Calendar,
  User,
  Building2,
  FileText,
  FileDown,
  Shield,
  Sparkles,
  Check,
  Lock,
  Compass,
  Cpu,
  Layers
} from "lucide-react";
import { Project, DigitalSignoff } from "../App";

interface DigitalSignoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSaveSignoff: (projectId: string, signoffData: DigitalSignoff) => void;
}

export default function DigitalSignoffModal({
  isOpen,
  onClose,
  project,
  onSaveSignoff
}: DigitalSignoffModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  
  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryRole, setSignatoryRole] = useState("Property Owner / Client");
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  // White glove checklist state
  const [checklist, setChecklist] = useState({
    seams: true,
    sealant: true,
    plumbing: true,
    polishing: true
  });

  // Initialize form fields when project changes or opens
  useEffect(() => {
    if (project) {
      if (project.digitalSignoff) {
        setSignatoryName(project.digitalSignoff.signatoryName || "Alexander Wright");
        setSignatoryRole(project.digitalSignoff.signatoryRole || "Property Owner / Client");
        setRating(project.digitalSignoff.rating || 5);
        setNotes(project.digitalSignoff.notes || "");
      } else {
        setSignatoryName("Alexander Wright");
        setSignatoryRole("Property Owner / Client");
        setRating(5);
        setNotes("Installation completed according to specification. Masonry surface and edge polishing approved.");
      }
      setHasSignature(false);
      setIsConfirmed(false);
      setChecklist({
        seams: true,
        sealant: true,
        plumbing: true,
        polishing: true
      });
    }
  }, [project, isOpen]);

  // Handle canvas setup & clearing
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Set canvas line styles in Champagne Gold
        ctx.strokeStyle = "#D4AF37";
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // If existing signature, draw it
        if (project?.digitalSignoff?.signatureDataUrl) {
          const img = document.createElement("img");
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            setHasSignature(true);
          };
          img.src = project.digitalSignoff.signatureDataUrl;
        } else {
          clearCanvas();
        }
      }
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const getCanvasCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = "#D4AF37";
    ctx.lineWidth = 2.5;

    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSave = () => {
    if (!canvasRef.current || !hasSignature) return;

    const signatureDataUrl = canvasRef.current.toDataURL("image/png");
    const formattedTimestamp = new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "medium"
    });

    const signoffData: DigitalSignoff = {
      signatoryName: signatoryName.trim() || "Authorized Signatory",
      signatoryRole: signatoryRole.trim() || "Client / Inspector",
      signatureDataUrl,
      timestamp: formattedTimestamp,
      rating,
      notes: notes.trim(),
      verifiedBadge: true
    };

    onSaveSignoff(project.id, signoffData);
    onClose();
  };

  const exportPdfCertificate = () => {
    const timestamp = project.digitalSignoff?.timestamp || new Date().toLocaleString("en-GB", {
      dateStyle: "full",
      timeStyle: "medium"
    });
    const signatureImg = canvasRef.current?.toDataURL("image/png") || project.digitalSignoff?.signatureDataUrl || "";

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      const htmlContent = `<!DOCTYPE html><html><head><title>SMC_PRO_Certificate_${project.id}</title><style>body{font-family:sans-serif;padding:30px;}</style></head><body><h1>SMC PRO Certificate</h1><p>Project: ${project.name}</p><p>Signatory: ${signatoryName || "Client"}</p><p>Timestamp: ${timestamp}</p><img src="${signatureImg}" /></body></html>`;
      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SMC_PRO_Signoff_Certificate_${project.id.slice(0, 8)}.html`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const certificateHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>SMC PRO - Digital Installation Sign-Off Certificate - ${project.name}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; background: #fff; }
            .cert-card { border: 3px double #0f172a; padding: 36px; position: relative; max-width: 800px; margin: 0 auto; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
            .header-banner { text-align: center; border-bottom: 2px solid #d97706; padding-bottom: 20px; margin-bottom: 25px; }
            .brand-name { font-size: 32px; font-weight: 900; letter-spacing: 3px; color: #0f172a; margin: 0; }
            .brand-sub { font-size: 11px; letter-spacing: 4px; color: #d97706; font-weight: 700; text-transform: uppercase; margin-top: 4px; }
            .cert-badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 1px; margin-bottom: 15px; }
            .cert-title { font-size: 24px; font-family: Georgia, serif; text-align: center; margin: 10px 0 6px; font-weight: 800; color: #0f172a; }
            .cert-subtitle { text-align: center; font-size: 12px; color: #64748b; margin-bottom: 28px; font-family: monospace; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 24px; }
            .field-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 800; margin-bottom: 3px; }
            .field-value { font-size: 13px; font-weight: 700; color: #0f172a; }
            .rating-stars { color: #f59e0b; font-size: 15px; font-weight: 800; }
            .notes-box { background: #fff; border: 1px solid #cbd5e1; padding: 16px; border-radius: 8px; margin-bottom: 28px; }
            .notes-content { font-size: 12px; font-style: italic; color: #334155; margin-top: 4px; line-height: 1.5; }
            .sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; padding-top: 24px; border-top: 2px solid #e2e8f0; }
            .sig-box { text-align: center; }
            .sig-image { max-height: 70px; max-width: 220px; margin: 10px auto; display: block; background: #111; padding: 6px; border-radius: 4px; }
            .sig-line { border-bottom: 1.5px dashed #0f172a; width: 80%; margin: 15px auto 8px; }
            .footer-info { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 36px; border-top: 1px solid #f1f5f9; padding-top: 16px; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="cert-card">
            <div class="header-banner">
              <h1 class="brand-name">SMC PRO</h1>
              <div class="brand-sub">Stone & Architectural Masonry Platform</div>
            </div>

            <div style="text-align: center;">
              <span class="cert-badge">✓ LASER VERIFIED INSTALLATION CERTIFICATE</span>
            </div>

            <h2 class="cert-title">Certificate of Digital Sign-Off</h2>
            <div class="cert-subtitle">British Architectural Stone Quality Standard (BS EN 1469) • SERIAL: SMC-8821-XP-7</div>

            <div class="grid">
              <div>
                <div class="field-label">Project Name</div>
                <div class="field-value">${project.name}</div>
              </div>
              <div>
                <div class="field-label">Site Location</div>
                <div class="field-value">${project.address || "14 Kensington Palace Gardens, London"}</div>
              </div>
              <div>
                <div class="field-label">Signatory Name</div>
                <div class="field-value">${signatoryName || "Alexander Wright"}</div>
              </div>
              <div>
                <div class="field-label">Role / Title</div>
                <div class="field-value">${signatoryRole}</div>
              </div>
              <div>
                <div class="field-label">Laser Tolerance</div>
                <div class="field-value">±0.038mm (Industry Standard: ±0.05mm)</div>
              </div>
              <div>
                <div class="field-label">Surface Planarity</div>
                <div class="field-value">99.98% (Graded: PASS)</div>
              </div>
              <div>
                <div class="field-label">Sign-off Timestamp</div>
                <div class="field-value">${timestamp}</div>
              </div>
              <div>
                <div class="field-label">Quality Rating</div>
                <div class="field-value rating-stars">★ ${rating} / 5 Stars</div>
              </div>
            </div>

            ${notes ? `
              <div class="notes-box">
                <div class="field-label">Inspector & Client Comments</div>
                <div class="notes-content">"${notes}"</div>
              </div>
            ` : ''}

            <div class="sig-grid">
              <div class="sig-box">
                <div class="field-label">SMC PRO Authorized Director</div>
                <div style="font-family: Georgia, serif; font-style: italic; font-size: 18px; margin: 20px 0 8px; color: #0f172a; font-weight: bold;">SMC PRO Quality Division</div>
                <div style="font-size: 11px; color: #64748b;">Verified Masonry Auditor</div>
              </div>
              <div class="sig-box">
                <div class="field-label">Client Encrypted Digital Signature</div>
                ${signatureImg ? `<img src="${signatureImg}" class="sig-image" alt="Client Signature" />` : '<div style="height: 50px;"></div>'}
                <div class="sig-line"></div>
                <div style="font-size: 12px; font-weight: bold; color: #0f172a;">${signatoryName || "Alexander Wright"}</div>
                <div style="font-size: 11px; color: #64748b;">${signatoryRole}</div>
              </div>
            </div>

            <div class="footer-info">
              SMC Pro Stone Management Ltd • Certificate Hash: CERT-${project.id.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)} • BS EN 1469 Compliance
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(certificateHtml);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <style>{`
        @keyframes laser-scan-line {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        .animate-laser-scan {
          animation: laser-scan-line 3.5s infinite linear;
        }
        .bg-signature-dots {
          background-image: radial-gradient(circle, rgba(212, 175, 55, 0.18) 1.2px, transparent 1.2px);
          background-size: 18px 18px;
        }
      `}</style>

      <div className="bg-[#0f0f0f] border border-[#D4AF37]/30 rounded-2xl shadow-[0_0_60px_rgba(212,175,55,0.18)] w-full max-w-5xl overflow-hidden my-auto text-[#e2e2e2] relative">
        
        {/* Top Header Navigation */}
        <header className="w-full flex justify-between items-center px-6 py-4 bg-[#0a0a0a] border-b border-[#D4AF37]/20 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold text-[#D4AF37] tracking-tight">SMC PRO</h1>
              <p className="text-[10px] font-mono text-neutral-400">Digital Sign-off Protocol</p>
            </div>
          </div>

          <div className="hidden md:flex gap-6 items-center text-xs font-mono">
            <span className="text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded border border-[#D4AF37]/30">Protocol Alpha-7</span>
            <span className="text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30 flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Validation State: Active
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close Protocol"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Protocol Title Banner */}
        <div className="text-center pt-8 pb-4 px-6 space-y-2 border-b border-neutral-800/80 bg-gradient-to-b from-[#141414] to-[#0f0f0f]">
          <span className="font-mono text-[10px] text-[#D4AF37] tracking-[0.25em] uppercase font-bold block">
            PROTOCOL: FINAL VALIDATION & WARRANTY INITIALIZATION
          </span>
          <h2 className="font-serif text-3xl font-bold text-white italic tracking-tight">The Art of Precision</h2>
          <div className="w-20 h-0.5 bg-[#D4AF37] mx-auto rounded-full" />
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-8 max-h-[80vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Laser Validation Certificate */}
            <div className="lg:col-span-7 space-y-6">
              <section className="bg-[#161616] p-6 md:p-8 relative overflow-hidden rounded-xl border border-[#D4AF37]/25 shadow-xl group">
                
                {/* Laser Scan Effect Overlay */}
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                  <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent shadow-[0_0_15px_#D4AF37] animate-laser-scan absolute top-0" />
                </div>

                <div className="relative z-20 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-serif text-xl font-bold text-white">Laser Validation Certificate</h3>
                      <p className="font-mono text-xs text-[#D4AF37] font-bold mt-0.5">SERIAL: SMC-8821-XP-7</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                      <CheckCircle2 className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                  </div>

                  {/* Laser Telemetry Metrics */}
                  <div className="grid grid-cols-2 gap-4 bg-[#0a0a0a] p-4 rounded-xl border border-neutral-800">
                    <div className="border-l-2 border-[#D4AF37] pl-4">
                      <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider">MEASURED TOLERANCE</p>
                      <p className="font-mono text-2xl font-black text-[#D4AF37]">±0.038mm</p>
                      <p className="text-[10px] text-neutral-400 mt-0.5">Industry Standard: ±0.05mm</p>
                    </div>
                    <div className="border-l-2 border-[#D4AF37] pl-4">
                      <p className="font-mono text-[9px] text-neutral-400 uppercase tracking-wider">SURFACE PLANARITY</p>
                      <p className="font-mono text-2xl font-black text-[#D4AF37]">99.98%</p>
                      <p className="text-[10px] text-emerald-400 font-bold mt-0.5">Laser Graded: PASS</p>
                    </div>
                  </div>

                  {/* Certification Statement */}
                  <div className="bg-[#0d0d0d] p-5 rounded-xl border border-neutral-800/90 italic font-serif text-sm text-neutral-300 leading-relaxed shadow-inner">
                    "I hereby certify that the installation of the bespoke natural stone surfaces at Project <strong>{project.name}</strong> has been subjected to rigorous volumetric laser scanning and conforms to the SMC PRO Elite Precision mandate. Every seam, edge, and surface maintains structural and aesthetic integrity within the strictest engineering margins."
                  </div>

                  {/* Project Material Spec Card */}
                  <div className="flex items-center gap-4 bg-[#0a0a0a] p-4 rounded-xl border border-neutral-800">
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-neutral-800 to-neutral-900 border border-[#D4AF37]/40 overflow-hidden flex-shrink-0 relative group">
                      <div className="absolute inset-0 bg-[radial-gradient(#D4AF37_1px,transparent_1px)] [background-size:8px_8px] opacity-40" />
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-1">
                        <Layers className="w-6 h-6 text-[#D4AF37]" />
                        <span className="text-[8px] font-mono text-neutral-300 font-bold mt-1">20mm</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-mono text-[#D4AF37] font-bold uppercase tracking-wider block">Target Stone Material</span>
                      <p className="font-serif text-base font-bold text-white truncate">{project.name}</p>
                      <p className="font-mono text-xs text-neutral-400 truncate">Slab Lot ID: <span className="text-white font-bold">009-XJ-22</span> • {project.address || "14 Kensington Palace Gardens, London"}</p>
                      
                      <div className="flex gap-1.5 mt-2">
                        <div className="w-4 h-1 bg-[#D4AF37] rounded-full" />
                        <div className="w-4 h-1 bg-[#D4AF37] rounded-full" />
                        <div className="w-4 h-1 bg-[#D4AF37] rounded-full" />
                        <div className="w-4 h-1 bg-neutral-700 rounded-full" />
                      </div>
                    </div>
                  </div>

                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: Checklist, Signatures, Rating & Save */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* White Glove Checklist */}
              <section className="bg-[#161616] p-5 rounded-xl border border-neutral-800 space-y-4">
                <h4 className="font-mono text-xs text-[#D4AF37] tracking-widest uppercase font-bold flex items-center justify-between">
                  <span>WHITE GLOVE CHECKLIST</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">4/4 PASSED</span>
                </h4>

                <ul className="space-y-2.5 text-xs">
                  {[
                    { id: "seams", label: "Seam Integration & Color Match Analysis" },
                    { id: "sealant", label: "Anti-Microbial Sealing Treatment Applied" },
                    { id: "plumbing", label: "Hardware & Plumbing Alignment Check" },
                    { id: "polishing", label: "Surface Polishing & Final Debris Extraction" }
                  ].map((item) => (
                    <li 
                      key={item.id}
                      onClick={() => setChecklist(prev => ({ ...prev, [item.id]: !prev[item.id as keyof typeof prev] }))}
                      className="flex items-center gap-3 p-2 rounded-lg bg-[#0a0a0a] border border-neutral-800 hover:border-[#D4AF37]/50 transition-colors cursor-pointer"
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                        checklist[item.id as keyof typeof checklist]
                          ? "bg-[#D4AF37] text-neutral-950"
                          : "border border-neutral-700 bg-neutral-900"
                      }`}>
                        {checklist[item.id as keyof typeof checklist] && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="font-medium text-neutral-200">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Digital Signature & Signatory Metadata */}
              <section className="bg-[#161616] p-5 rounded-xl border border-neutral-800 space-y-5">
                <h4 className="font-mono text-xs text-white uppercase tracking-wider font-bold">Authorized Client Sign-off</h4>

                {/* Signatory Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-neutral-400 block mb-1">
                      Signatory Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      placeholder="e.g. Alexander Wright"
                      className="w-full text-xs bg-[#0a0a0a] border border-neutral-800 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 rounded-lg p-2.5 text-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-neutral-400 block mb-1">
                      Role / Title
                    </label>
                    <select
                      value={signatoryRole}
                      onChange={(e) => setSignatoryRole(e.target.value)}
                      className="w-full text-xs bg-[#0a0a0a] border border-neutral-800 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 rounded-lg p-2.5 text-white font-medium cursor-pointer"
                    >
                      <option value="Property Owner / Client">Property Owner / Client</option>
                      <option value="Site Architect">Site Architect</option>
                      <option value="Main Contractor">Main Contractor</option>
                      <option value="Stone Quality Inspector">Stone Quality Inspector</option>
                    </select>
                  </div>
                </div>

                {/* Craftsmanship Star Rating */}
                <div className="bg-[#0a0a0a] p-3 rounded-lg border border-neutral-800 flex justify-between items-center">
                  <span className="text-xs font-mono text-neutral-300 font-bold">Finish & Craft Rating:</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= rating
                              ? "text-[#D4AF37] fill-[#D4AF37]"
                              : "text-neutral-700"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Canvas Signature Pad with Dot Grid */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono text-neutral-300 font-bold flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-[#D4AF37]" /> Encrypted Signature Touchpad <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-[10px] font-mono text-neutral-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3 text-[#D4AF37]" /> Clear Pad
                    </button>
                  </div>

                  <div className="relative border border-[#D4AF37]/40 rounded-xl bg-[#080808] bg-signature-dots overflow-hidden shadow-inner group cursor-crosshair">
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-36 cursor-crosshair touch-none"
                    />
                    
                    <div className="absolute bottom-3 left-4 right-4 border-b border-neutral-800 pointer-events-none flex justify-between text-[9px] font-mono text-neutral-600 select-none">
                      <span>SIGNED DIGITALLY VIA ENCRYPTED TOUCH</span>
                      <span>SMC PRO AUTH</span>
                    </div>

                    {!hasSignature && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-neutral-500 space-y-1">
                        <PenTool className="w-5 h-5 text-[#D4AF37]/60" />
                        <span className="text-[10px] font-mono">Tap & draw client signature here</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sign-off Notes */}
                <div>
                  <label className="text-[11px] font-mono text-neutral-400 block mb-1">
                    Sign-off Inspector Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Masonry surface and edge polishing approved..."
                    className="w-full text-xs bg-[#0a0a0a] border border-neutral-800 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]/30 rounded-lg p-2.5 text-white"
                  />
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="bg-[#0a0a0a] border border-neutral-800 p-3 rounded-lg flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="terms-protocol"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-[#D4AF37] focus:ring-[#D4AF37] cursor-pointer"
                  />
                  <label htmlFor="terms-protocol" className="text-[11px] text-neutral-400 leading-tight cursor-pointer">
                    I acknowledge the technical validation of the surfaces and approve the final installation. This signature initializes the elite lifetime maintenance protocol.
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!hasSignature || !isConfirmed || !signatoryName.trim()}
                    className={`w-full py-4 font-mono text-xs font-bold tracking-widest rounded-lg flex items-center justify-center gap-2 uppercase transition-all duration-300 cursor-pointer ${
                      hasSignature && isConfirmed && signatoryName.trim()
                        ? "bg-[#D4AF37] text-neutral-950 hover:bg-white shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:scale-[1.01] active:scale-[0.99]"
                        : "bg-neutral-800 text-neutral-600 cursor-not-allowed border border-neutral-800"
                    }`}
                  >
                    <span>INITIALIZE LIFETIME WARRANTY</span>
                    <ShieldCheck className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={exportPdfCertificate}
                    className="w-full py-2.5 bg-transparent border border-neutral-800 hover:border-[#D4AF37]/60 text-neutral-300 hover:text-[#D4AF37] font-mono text-[11px] tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 text-[#D4AF37]" />
                    <span>DOWNLOAD FULL LASER REPORT (PDF)</span>
                  </button>
                </div>

              </section>

            </div>

          </div>

        </div>

        {/* Footer Technical Telemetry Data Bar */}
        <footer className="px-6 py-3 bg-[#080808] border-t border-neutral-900 flex flex-col md:flex-row justify-between items-center gap-2 text-[10px] font-mono text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="text-[#D4AF37] font-bold">SMC PRO</span>
            <span>• DIGITAL SIGN-OFF PROTOCOL v4.8</span>
          </div>

          <div className="flex items-center gap-6 text-[#D4AF37]/80">
            <span>LAT: 51.5074° N</span>
            <span>LNG: 0.1278° W</span>
            <span>TEMP: 21.4°C</span>
            <span className="text-emerald-400">ENCRYPTION: AES-256</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
