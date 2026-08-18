import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  QrCode,
  Download,
  Share2,
  ExternalLink,
  Cpu,
  Layers,
  Database,
  MapPin,
  FileCheck,
  Key,
  RefreshCw,
  Search,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Copy,
  Check,
  Building2,
  Award,
  Zap,
  Globe
} from "lucide-react";

interface GeologicalProvenanceViewProps {
  onNavigateHome: () => void;
  userEmail?: string;
}

interface StoneBlock {
  id: string;
  blockNumber: string;
  materialName: string;
  category: "Marble" | "Quartzite" | "Granite" | "Porcelain";
  quarryOrigin: string;
  coordinates: string;
  geologicalHash: string;
  ipfsCid: string;
  l2BlockHeight: number;
  stripeTxHash: string;
  measureAccuracy: string;
  cncTelemetryId: string;
  handoverDate: string;
  status: "Architecturally Verified" | "In Minting" | "Transfer Pending";
  ownerName: string;
  thumbnail: string;
}

const INITIAL_BLOCKS: StoneBlock[] = [
  {
    id: "BLK-774B",
    blockNumber: "Block 774-B",
    materialName: "Calacatta Viola Premium Marble",
    category: "Marble",
    quarryOrigin: "Carrara Quarry #12, Tuscany, Italy",
    coordinates: "44.0792° N, 10.0984° E",
    geologicalHash: "0x774b99f2e811c4d9a2039485bcf7128a349d90e21a8",
    ipfsCid: "ipfs://QmX7v94A2kB9pL8zQW3M7nK1vP59rZ24X98bC12d",
    l2BlockHeight: 18492041,
    stripeTxHash: "pi_3M9aL2x87Kd1009A_secret_99A",
    measureAccuracy: "±0.045mm LiDAR Scan",
    cncTelemetryId: "CNC-WATERJET-2026-X99",
    handoverDate: "2026-07-28",
    status: "Architecturally Verified",
    ownerName: "SIMO Marble & Construction Ltd",
    thumbnail:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBvl6r3KBcb7f2ZVWPXmbO05auPp_EHY23GZ7G9h1RBLA64qLaU4krhCdZbzzLydi343-sIkQnfYOPpqNLYDiK9M4q7pFVwlUeTtyLh_Xyk85CwEzJ532rBmrvjyZMoTXIHV2XrxTs2xg3Dgf4CUGo6-aXRRy1MSVVhuqAt-d9NRLSj9vTdyYysLpDXVOF2KsOnwGR0yc5993YOyqbY1KVD7RlDEAR3chIwEzzGcGbvdWXEn6j2x3lKSPh1mWT8l0ZxSxouRACYlf0"
  },
  {
    id: "BLK-889C",
    blockNumber: "Block 889-C",
    materialName: "Nero Marquina Book-Matched Slab",
    category: "Marble",
    quarryOrigin: "Markina Quarry, Basque Country, Spain",
    coordinates: "43.2683° N, 2.4981° W",
    geologicalHash: "0x889c102aef884193b004928157cdf82110a778b4d",
    ipfsCid: "ipfs://QmY8z11P4kM7zB29vX49L21k900xP99A27vC88m",
    l2BlockHeight: 18491980,
    stripeTxHash: "pi_3M9aK1x76Kd9001B_secret_88B",
    measureAccuracy: "±0.038mm LiDAR Scan",
    cncTelemetryId: "CNC-INTERMAC-5AXIS-889",
    handoverDate: "2026-07-25",
    status: "Architecturally Verified",
    ownerName: "Private Kensington Residence",
    thumbnail:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAJTkIQAwfnJenKZ6hBvRc260VxbB5kMwxTVVn_NvItJRxFyUx0n8f8sPwfYeYFW5PnkWYf1TLkQVGYBoRl8vPd1ygHZARxlwh7RL--x1LATCrA5ICD15JZ6OPExbf0igge6GgOHffLHarhwXk9WFX2g4nvIbp89L0C_PEqhIQC_UAJre3oDLTJRKS0SDYAv--njZ3CQK7OeYr-Mr2Ac9QFnmeyAL6n2GfJFuBMFY20xejx1P-XAJao5FEEY8ezC-mxbQqhEW5L7Z0"
  },
  {
    id: "BLK-402D",
    blockNumber: "Block 402-D",
    materialName: "Statuario Extra Extra Fine Vein",
    category: "Marble",
    quarryOrigin: "Carrara Monte Altissimo, Italy",
    coordinates: "44.0211° N, 10.1245° E",
    geologicalHash: "0x402d77c18921a55f90118374bcf9012a884d99c1e",
    ipfsCid: "ipfs://QmZ402d99A82kB71zX88nK31P99a00X87vK99m",
    l2BlockHeight: 18491500,
    stripeTxHash: "pi_3M9aJ9x55Kd8004C_secret_77C",
    measureAccuracy: "±0.050mm LiDAR Scan",
    cncTelemetryId: "CNC-WATERJET-2026-402",
    handoverDate: "2026-07-20",
    status: "Architecturally Verified",
    ownerName: "Mayfair Penthouse Suite",
    thumbnail:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDQq9F-ikISDLO_jvAIuXFZrHfY-5qXHkeIBABT0LdnfCT1YT_teEydI6UVz6t6V1Yle-8nq7b-oaPfwgJtNQKErPOKlRBgIF_7mKG3j0YkN1PlBIo0FK4Inb_fcnzhGw4Gocnk1dw5f8uiqIIiDRYT1erAdwrmeojMNV-dcih5YC1MLay9gWn5zNF8QoUSK-avuxrD1cUNyiIzU3g0Y_hpG35Lancm_8P4GvEHf9tCyWbG0Juo-rLn"
  }
];

export default function GeologicalProvenanceView({
  onNavigateHome,
  userEmail = "client@smcpro.co.uk"
}: GeologicalProvenanceViewProps) {
  const [blocks, setBlocks] = useState<StoneBlock[]>(INITIAL_BLOCKS);
  const [selectedBlock, setSelectedBlock] = useState<StoneBlock>(INITIAL_BLOCKS[0]);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [transferTargetEmail, setTransferTargetEmail] = useState<string>("");
  const [copiedHash, setCopiedHash] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isMintingNew, setIsMintingNew] = useState<boolean>(false);

  const filteredBlocks = blocks.filter(
    (b) =>
      b.blockNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.quarryOrigin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleMintNewBlock = () => {
    setIsMintingNew(true);
    setTimeout(() => {
      const newBlock: StoneBlock = {
        id: `BLK-${Math.floor(100 + Math.random() * 900)}X`,
        blockNumber: `Block ${Math.floor(500 + Math.random() * 400)}-E`,
        materialName: "Taj Mahal Luxury Quartzite",
        category: "Quartzite",
        quarryOrigin: "Ceará Quarries, Northeastern Brazil",
        coordinates: "5.1982° S, 39.2941° W",
        geologicalHash: `0x${Array.from({ length: 40 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}`,
        ipfsCid: `ipfs://Qm${Array.from({ length: 34 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}`,
        l2BlockHeight: 18492100 + Math.floor(Math.random() * 50),
        stripeTxHash: `pi_3M9a${Math.floor(Math.random() * 90000)}`,
        measureAccuracy: "±0.035mm LiDAR Scan",
        cncTelemetryId: `CNC-BRETON-5AXIS-${Math.floor(100 + Math.random() * 900)}`,
        handoverDate: new Date().toISOString().split("T")[0],
        status: "Architecturally Verified",
        ownerName: userEmail,
        thumbnail:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuC5SVjUEYbJgiomgdsloMffK4YumSGqg7V8elDmJWIhCrpv_N33rwgprEFONRVuC25F4nC1zjBktXn40PLEcVV5czHKfpwuWthGm-n53i9hGUBuPWQUewfG3ZmeJa2heOuByLlQxODE81qhhVwSZbM6BVnsyYL08N0I9FjJm0ysL8KW1Zvsa0S-Zx94rTry5wwQJRxFvNKkhza4blRJv8PRCCZpHzpOKSuGbb74NOrxMR2yNjhNJBbm"
      };
      setBlocks([newBlock, ...blocks]);
      setSelectedBlock(newBlock);
      setIsMintingNew(false);
    }, 1200);
  };

  const handleExecuteTransfer = () => {
    if (!transferTargetEmail) return;
    setBlocks(
      blocks.map((b) =>
        b.id === selectedBlock.id ? { ...b, ownerName: transferTargetEmail } : b
      )
    );
    setSelectedBlock({ ...selectedBlock, ownerName: transferTargetEmail });
    setShowTransferModal(false);
    setTransferTargetEmail("");
    alert(`Ownership token for ${selectedBlock.blockNumber} successfully transferred on L2 blockchain to ${transferTargetEmail}`);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#D4AF37] selection:text-black relative pb-20">
      
      {/* Top Banner Header */}
      <div className="border-b border-[#D4AF37]/30 bg-[#121212]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[0_4px_20px_rgba(212,175,55,0.1)]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-black border border-[#D4AF37] rounded flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.4)]">
            <Lock className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-bold text-white tracking-wide">
                Geological Provenance &amp; Blockchain Ledger
              </span>
              <span className="bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                L2 ROLLUP LIVE
              </span>
            </div>
            <p className="text-xs font-mono text-neutral-400">
              Immutable Digital Identity, Zero-Knowledge Verification &amp; Technical Sourcing Payload
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleMintNewBlock}
            disabled={isMintingNew}
            className="bg-[#D4AF37] hover:bg-white text-black font-mono text-xs font-bold px-4 py-2.5 rounded flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(212,175,55,0.4)] cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isMintingNew ? "animate-spin" : ""}`} />
            <span>{isMintingNew ? "MINTING ON L2..." : "MINT STONE TOKEN"}</span>
          </button>

          <button
            onClick={onNavigateHome}
            className="bg-neutral-900 border border-neutral-800 hover:border-[#D4AF37]/50 text-neutral-300 font-mono text-xs px-4 py-2.5 rounded transition-all cursor-pointer"
          >
            EXIT TO DASHBOARD
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Hero Architectural Card */}
        <div className="relative rounded-2xl overflow-hidden border border-[#D4AF37]/30 bg-gradient-to-r from-[#121212] via-[#1A1A1A] to-[#121212] p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                <span className="font-mono text-xs text-[#D4AF37] font-bold tracking-widest uppercase">
                  SCREEN_222 • ARCHITECTURAL SPECIFICATION
                </span>
              </div>
              <h1 className="font-serif text-3xl md:text-5xl font-bold text-white leading-tight">
                The Immutable Ledger of Stone
              </h1>
              <p className="font-sans text-sm text-neutral-300 max-w-2xl leading-relaxed">
                Every rare geological asset sourced through SMC PRO receives an unalterable digital twin. The <span className="text-[#D4AF37] font-semibold">Geological Hash</span> certifies quarry origin, 0.05mm precision laser measurement, CNC toolpaths, and Stripe transaction finality on Ethereum Layer 2.
              </p>

              <div className="flex flex-wrap items-center gap-6 pt-2 font-mono text-xs">
                <div className="flex items-center gap-2 text-neutral-300">
                  <Globe className="w-4 h-4 text-[#D4AF37]" />
                  <span>Protocol: L2 Architectural Rollup</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-300">
                  <Zap className="w-4 h-4 text-[#D4AF37]" />
                  <span>ZK-Proofs Enabled</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-300">
                  <Database className="w-4 h-4 text-[#D4AF37]" />
                  <span>IPFS Storage Pinning</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 bg-[#0A0A0A] p-6 rounded-xl border border-neutral-800 space-y-4 shadow-xl">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-neutral-400">LEDGER METRICS</span>
                <span className="text-[#D4AF37] font-bold">100% VERIFIED</span>
              </div>
              
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-500">Active Stone Tokens:</span>
                  <span className="text-white font-bold">{blocks.length} Blocks</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-500">L2 Block Height:</span>
                  <span className="text-emerald-400 font-bold">#18,492,041</span>
                </div>
                <div className="flex justify-between border-b border-neutral-800 pb-2">
                  <span className="text-neutral-500">Laser Accuracy:</span>
                  <span className="text-white font-bold">0.05mm LiDAR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Handover Protocol:</span>
                  <span className="text-[#D4AF37] font-bold">SCREEN_222 Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Selector Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Block List (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#D4AF37]" />
                <span>Stone Vault Inventory</span>
              </h3>
              <span className="text-xs font-mono text-neutral-500">
                {filteredBlocks.length} Items
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search Block ID, Material or Origin..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#121212] border border-neutral-800 rounded py-2 pl-9 pr-3 text-xs font-mono text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {/* Block Cards List */}
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {filteredBlocks.map((block) => {
                const isSelected = selectedBlock.id === block.id;
                return (
                  <div
                    key={block.id}
                    onClick={() => setSelectedBlock(block)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#1A1A1A] border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                        : "bg-[#121212] border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="w-14 h-14 rounded overflow-hidden border border-neutral-800 shrink-0">
                        <img
                          src={block.thumbnail}
                          alt={block.materialName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-bold text-[#D4AF37]">
                            {block.blockNumber}
                          </span>
                          <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                            VERIFIED
                          </span>
                        </div>
                        <h4 className="font-serif text-xs font-semibold text-white truncate">
                          {block.materialName}
                        </h4>
                        <p className="text-[10px] font-mono text-neutral-400 truncate">
                          {block.quarryOrigin}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Selected Block Details (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-[#121212] border border-neutral-800 rounded-2xl p-6 md:p-8 space-y-8 shadow-xl">
              
              {/* Top Details Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-800 pb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-xs font-bold text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2 py-0.5 rounded">
                      {selectedBlock.blockNumber}
                    </span>
                    <span className="font-mono text-xs text-neutral-400">
                      ID: {selectedBlock.id}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl md:text-3xl font-bold text-white">
                    {selectedBlock.materialName}
                  </h2>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCertificateModal(true)}
                    className="bg-[#D4AF37] hover:bg-white text-black font-mono text-xs font-bold px-4 py-2.5 rounded flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(212,175,55,0.3)] cursor-pointer"
                  >
                    <Award className="w-4 h-4" />
                    <span>VIEW CERTIFICATE (SCREEN_222)</span>
                  </button>

                  <button
                    onClick={() => setShowQrModal(true)}
                    className="bg-neutral-900 border border-neutral-700 hover:border-[#D4AF37] text-white font-mono text-xs px-3.5 py-2.5 rounded flex items-center gap-2 transition-all cursor-pointer"
                    title="Scan QR Code"
                  >
                    <QrCode className="w-4 h-4 text-[#D4AF37]" />
                  </button>

                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="bg-neutral-900 border border-neutral-700 hover:border-[#D4AF37] text-white font-mono text-xs px-3.5 py-2.5 rounded flex items-center gap-2 transition-all cursor-pointer"
                    title="Transfer Ownership"
                  >
                    <Share2 className="w-4 h-4 text-[#D4AF37]" />
                  </button>
                </div>
              </div>

              {/* Cryptographic Technical Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Geological Hash Block */}
                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Geological Hash</span>
                    </span>
                    <button
                      onClick={() => handleCopyHash(selectedBlock.geologicalHash)}
                      className="text-[#D4AF37] hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedHash ? "COPIED" : "COPY"}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-emerald-400 bg-neutral-950 p-2.5 rounded border border-neutral-900 overflow-x-auto break-all font-semibold">
                    {selectedBlock.geologicalHash}
                  </div>
                </div>

                {/* IPFS CID Storage Block */}
                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-neutral-800 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>IPFS Vault CID</span>
                    </span>
                    <span className="text-emerald-400 text-[10px] font-bold">PINNED</span>
                  </div>
                  <div className="font-mono text-xs text-neutral-300 bg-neutral-950 p-2.5 rounded border border-neutral-900 overflow-x-auto break-all">
                    {selectedBlock.ipfsCid}
                  </div>
                </div>

              </div>

              {/* Four Payload Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                
                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-neutral-800 space-y-2">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">
                    Quarry Origin
                  </span>
                  <div className="flex items-start gap-2 text-xs font-mono text-white">
                    <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{selectedBlock.quarryOrigin}</p>
                      <p className="text-[10px] text-neutral-400">{selectedBlock.coordinates}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-neutral-800 space-y-2">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">
                    SMC Measure Scan
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono text-white">
                    <Cpu className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <div>
                      <p className="font-semibold">{selectedBlock.measureAccuracy}</p>
                      <p className="text-[10px] text-emerald-400">0.05mm Verified</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-neutral-800 space-y-2">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">
                    CNC Telemetry
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono text-white">
                    <Zap className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    <div>
                      <p className="font-semibold">{selectedBlock.cncTelemetryId}</p>
                      <p className="text-[10px] text-neutral-400">5-Axis Waterjet</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-neutral-800 space-y-2">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">
                    Financial Finality
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-semibold truncate max-w-[100px]">{selectedBlock.stripeTxHash}</p>
                      <p className="text-[10px] text-emerald-400">Stripe Verified</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Owner Info & Smart Contract Status */}
              <div className="bg-[#0A0A0A] p-5 rounded-xl border border-[#D4AF37]/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest font-bold block">
                      Registered Owner Token
                    </span>
                    <span className="font-serif text-sm font-bold text-white">
                      {selectedBlock.ownerName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 font-mono text-xs">
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 block">L2 BLOCK HEIGHT</span>
                    <span className="text-white font-bold">#{selectedBlock.l2BlockHeight}</span>
                  </div>
                  <div className="w-px h-8 bg-neutral-800" />
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 block">HANDOVER DATE</span>
                    <span className="text-[#D4AF37] font-bold">{selectedBlock.handoverDate}</span>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* SCREEN_222: Elite Authenticity Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121212] border-2 border-[#D4AF37] rounded-2xl max-w-2xl w-full p-8 space-y-8 relative shadow-[0_0_50px_rgba(212,175,55,0.3)]">
            
            {/* Header Crest */}
            <div className="text-center space-y-2 border-b border-[#D4AF37]/30 pb-6">
              <div className="w-16 h-16 bg-black border-2 border-[#D4AF37] rounded-full mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.5)]">
                <Award className="w-8 h-8 text-[#D4AF37]" />
              </div>
              <span className="font-mono text-xs text-[#D4AF37] tracking-[0.3em] uppercase font-bold block">
                SMC PRO • SCREEN_222 CERTIFICATION
              </span>
              <h2 className="font-serif text-3xl font-bold text-white tracking-wide">
                Elite Authenticity &amp; Geological Provenance Certificate
              </h2>
            </div>

            {/* Certificate Details */}
            <div className="space-y-4 font-mono text-xs">
              <div className="bg-black/80 p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex justify-between">
                  <span className="text-neutral-500">STONE ASSET:</span>
                  <span className="text-white font-bold">{selectedBlock.materialName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">BLOCK NUMBER:</span>
                  <span className="text-[#D4AF37] font-bold">{selectedBlock.blockNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">QUARRY ORIGIN:</span>
                  <span className="text-white">{selectedBlock.quarryOrigin} ({selectedBlock.coordinates})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">MEASURE PRECISION:</span>
                  <span className="text-emerald-400 font-bold">{selectedBlock.measureAccuracy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">GEOLOGICAL HASH:</span>
                  <span className="text-emerald-400 font-bold truncate max-w-[260px]">{selectedBlock.geologicalHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">REGISTERED OWNER:</span>
                  <span className="text-white font-bold">{selectedBlock.ownerName}</span>
                </div>
              </div>

              {/* Seal & Sign-off Notice */}
              <div className="p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
                  <div>
                    <span className="text-[#D4AF37] font-bold block text-xs">IMMUTABLE L2 PROOF CERTIFIED</span>
                    <span className="text-neutral-300 text-[10px]">Signed by Stitch AI &amp; SIMO Marble Architectural Authority</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full border border-[#D4AF37] flex items-center justify-center font-serif text-[10px] font-bold text-[#D4AF37] uppercase">
                  SEAL
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setShowCertificateModal(false)}
                className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-xs font-bold py-3.5 rounded-lg border border-neutral-800 transition-all cursor-pointer"
              >
                CLOSE
              </button>
              <button
                onClick={() => {
                  alert(`Certificate for ${selectedBlock.blockNumber} generated and saved to your architectural package.`);
                  setShowCertificateModal(false);
                }}
                className="flex-1 bg-[#D4AF37] hover:bg-white text-black font-mono text-xs font-bold py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD CERTIFICATE</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* QR Code Scanner / Vault Link Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121212] border border-[#D4AF37]/50 rounded-2xl max-w-md w-full p-6 text-center space-y-6">
            <h3 className="font-serif text-xl font-bold text-white">
              QR Vault Link Scanner
            </h3>
            <p className="font-mono text-xs text-neutral-400">
              Physical slab labels contain this embedded QR link for direct AR Scanner verification on site.
            </p>

            <div className="bg-white p-6 rounded-xl w-48 h-48 mx-auto flex items-center justify-center shadow-2xl border-4 border-[#D4AF37]">
              <QrCode className="w-36 h-36 text-black" />
            </div>

            <div className="bg-black p-3 rounded font-mono text-[11px] text-emerald-400 border border-neutral-800 truncate">
              https://smcpro.co.uk/verify/{selectedBlock.geologicalHash.slice(0, 16)}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full bg-[#D4AF37] hover:bg-white text-black font-mono text-xs font-bold py-3 rounded transition-all cursor-pointer"
            >
              CLOSE QR VAULT
            </button>
          </div>
        </div>
      )}

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#121212] border border-[#D4AF37]/50 rounded-2xl max-w-md w-full p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <Share2 className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-serif text-lg font-bold text-white">
                Transfer Ownership Token
              </h3>
            </div>

            <p className="font-sans text-xs text-neutral-300 leading-relaxed">
              Transfer the digital twin and all associated blockchain records for <span className="text-[#D4AF37] font-bold">{selectedBlock.blockNumber}</span> to a new property owner or client upon property resale.
            </p>

            <div className="space-y-2 font-mono text-xs">
              <label className="text-neutral-400 block">Recipient Email / Wallet Address:</label>
              <input
                type="email"
                placeholder="newowner@kensington-estates.co.uk"
                value={transferTargetEmail}
                onChange={(e) => setTransferTargetEmail(e.target.value)}
                className="w-full bg-black border border-neutral-800 rounded p-3 text-white font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 py-3 rounded font-mono text-xs cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={handleExecuteTransfer}
                disabled={!transferTargetEmail}
                className="flex-1 bg-[#D4AF37] hover:bg-white text-black font-mono text-xs font-bold py-3 rounded transition-all disabled:opacity-50 cursor-pointer"
              >
                EXECUTE TRANSFER
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
