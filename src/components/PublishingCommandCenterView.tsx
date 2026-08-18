import React, { useState, useEffect } from "react";
import {
  Rocket,
  CheckCircle2,
  Database,
  Palette,
  RefreshCw,
  ShieldCheck,
  Bell,
  Menu,
  Sparkles,
  Terminal,
  Activity,
  Layers,
  FileCheck2,
  Server,
  Zap,
  ArrowLeft,
  X,
  Check,
  Diamond,
  Lock,
  ArrowRight
} from "lucide-react";

interface PublishingCommandCenterViewProps {
  onClose?: () => void;
  onNavigateHome?: () => void;
  userEmail?: string;
}

const WebGLShaderBackground: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let resizeObserver: ResizeObserver | null = null;

    const syncSize = () => {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(syncSize);
      resizeObserver.observe(canvas);
    }
    syncSize();

    const gl = canvas.getContext("webgl") || (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);
    if (!gl) return;

    const vs = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      varying vec2 v_texCoord;

      vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
      float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v - i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m;
        m = m*m;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 a0 = x - floor(x + 0.5);
        vec3 g = a0 * vec3(m.x, m.y, m.z);
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = v_texCoord;
        vec3 color1 = vec3(0.04, 0.04, 0.04);
        vec3 color2 = vec3(0.83, 0.69, 0.22);

        float n = snoise(uv * 2.0 + u_time * 0.1);
        n += 0.5 * snoise(uv * 4.0 - u_time * 0.2);
        
        float mask = smoothstep(0.4, 0.9, n);
        vec3 finalColor = mix(color1, color2, mask * 0.14);
        
        float grid = sin(uv.x * 40.0) * sin(uv.y * 40.0);
        grid = smoothstep(0.98, 1.0, grid);
        finalColor = mix(finalColor, color2, grid * 0.07);
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const vertShader = createShader(gl.VERTEX_SHADER, vs);
    const fragShader = createShader(gl.FRAGMENT_SHADER, fs);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const pos = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uMouse = gl.getUniformLocation(program, "u_mouse");

    let mouse = { x: canvas.width / 2, y: canvas.height / 2 };

    const handleMouseMove = (event: MouseEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = 1.0 - (event.clientY - rect.top) / rect.height;
        mouse.x = nx * canvas.width;
        mouse.y = ny * canvas.height;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    const render = (t: number) => {
      if (!canvas || !gl) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      if (resizeObserver && canvas) {
        resizeObserver.unobserve(canvas);
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};

export const PublishingCommandCenterView: React.FC<PublishingCommandCenterViewProps> = ({
  onClose,
  onNavigateHome,
  userEmail = "alexander.wright@kensington.co.uk"
}) => {
  const [deploymentProgress, setDeploymentProgress] = useState<number>(85);
  const [overallReadiness, setOverallReadiness] = useState<number>(98);
  const [isDeploying, setIsDeploying] = useState<boolean>(true);
  const [launchInitiated, setLaunchInitiated] = useState<boolean>(false);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "checklist" | "nodes">("overview");

  // Checklist interactive state
  const [checkedTasks, setCheckedTasks] = useState<boolean[]>([true, true, false, false, false]);

  const handleToggleTask = (index: number) => {
    const updated = [...checkedTasks];
    updated[index] = !updated[index];
    setCheckedTasks(updated);
  };

  const completedCount = checkedTasks.filter(Boolean).length;
  const isAllChecked = completedCount === 5;

  // Timeline interactive states
  const [phase1Verified, setPhase1Verified] = useState<boolean>(true);
  const [phase2Approved, setPhase2Approved] = useState<boolean>(false);
  const [phase3Initiated, setPhase3Initiated] = useState<boolean>(false);

  // Simulated node status list
  const [nodeList, setNodeList] = useState([
    { id: "node-uk-lon-01", location: "London SW3 (Egress Edge)", status: "Active - Synced", latency: "1.2ms" },
    { id: "node-uk-lon-02", location: "Verona Depot Gateway", status: "Active - Synced", latency: "14.8ms" },
    { id: "node-uk-mayfair", location: "Mayfair CNC Realtime Relay", status: "Propagating", latency: "4.5ms" },
    { id: "node-eu-fra-01", location: "Frankfurt Primary Vault", status: "Active - Synced", latency: "22.1ms" },
  ]);

  // Deployment propagation timer
  useEffect(() => {
    if (!isDeploying || launchInitiated) return;

    const interval = setInterval(() => {
      setDeploymentProgress((prev) => {
        if (prev >= 99) {
          clearInterval(interval);
          return 99;
        }
        return Math.min(99, prev + 1);
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isDeploying, launchInitiated]);

  const handleInitiateLaunch = () => {
    setLaunchInitiated(true);
    setPhase3Initiated(true);
    setDeploymentProgress(100);
    setOverallReadiness(100);
    setIsDeploying(false);

    setNodeList((prev) =>
      prev.map((node) => ({
        ...node,
        status: "Active - Synced",
        latency: (Math.random() * 5 + 1).toFixed(1) + "ms"
      }))
    );
  };

  const handleResetPreflight = () => {
    setLaunchInitiated(false);
    setPhase3Initiated(false);
    setPhase2Approved(false);
    setDeploymentProgress(85);
    setOverallReadiness(98);
    setIsDeploying(true);
  };

  return (
    <div className="relative bg-[#0e0e0e] text-[#e2e2e2] min-h-screen flex flex-col font-sans selection:bg-[#D4AF37] selection:text-[#000000] rounded-2xl border border-[#D4AF37]/30 overflow-hidden shadow-2xl animate-fade-in my-2">
      
      {/* WebGL Shader Procedural Gold Background */}
      <WebGLShaderBackground />

      {/* Top AppBar */}
      <header className="w-full top-0 sticky z-50 bg-[#000000]/90 backdrop-blur-md border-b border-[#D4AF37]/40 flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-3">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="text-[#D4AF37] hover:text-white transition-all flex items-center gap-1.5 text-xs font-mono font-bold mr-2 bg-neutral-900 border border-[#D4AF37]/30 px-3 py-1.5 rounded cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>RETURN</span>
            </button>
          )}
          <img
            alt="SMC PRO Logo"
            className="h-8 object-contain brightness-0 invert"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBXNV_RiofajRHjAoUdeRL9DEe2QkYbM7Tc0A4TQGbDMcjFQw7Q5zg9KIK2ijao316cxP_79D-6J5NzIHqGSsKu4We4TrVBU9wXJ-Oki7eDSGHaKKrZC6H9bitIoGlyNOMKRzOMOxJ7P98OaPN4DFpS7I8k6ifbcEAbyIrTMtqR8d6Yfx7XBkh3itiTP9iEqSYh_FMLknw4CwMtdIRxcCZr-5-A3zhzsZvV5yGDXPOTs9J_FTIffTZ0lCxFXwpnnkh4xJeo_osw6k"
          />
          <h1 className="font-serif text-xl tracking-tighter text-[#D4AF37] hidden md:block font-bold">
            ELITE PRECISION // LUXE STONE
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs text-neutral-300 font-medium">{userEmail}</span>
            <span className="text-[10px] font-mono text-[#D4AF37] font-extrabold uppercase tracking-wider">
              Deployment Protocol Active
            </span>
          </div>
          <button
            onClick={() => setShowLogModal(true)}
            className="text-[#D4AF37] hover:bg-neutral-900 p-2 rounded transition-all relative border border-[#D4AF37]/30 cursor-pointer"
            title="View Realtime Console Logs"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
          </button>
        </div>
      </header>

      {/* Main Content Canvas (Mission Control & Linear Protocol) */}
      <main className="relative z-10 flex-grow w-full px-6 md:px-16 py-8 md:py-12 flex flex-col items-center">
        
        {/* Header Section */}
        <div className="w-full max-w-4xl mb-8 text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/40 px-3 py-1 rounded-full text-[11px] font-mono font-bold text-[#D4AF37] uppercase tracking-widest">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            <span>SMC PRO DEPLOYMENT PROTOCOL</span>
          </div>
          <h2 className="font-serif text-3xl md:text-5xl text-white font-semibold tracking-tight">
            Deployment Protocol
          </h2>
          <p className="font-sans text-xs md:text-sm text-neutral-400 max-w-2xl mx-auto">
            Execute the final synthesis of digital models to physical stone. Review each stage of the architectural timeline before global launch.
          </p>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 p-1.5 rounded-xl mb-10">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-[#D4AF37] text-neutral-950 shadow-md font-extrabold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            COMMAND GAUGE
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === "timeline"
                ? "bg-[#D4AF37] text-neutral-950 shadow-md font-extrabold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            LINEAR PROTOCOL TIMELINE
          </button>
          <button
            onClick={() => setActiveTab("checklist")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === "checklist"
                ? "bg-[#D4AF37] text-neutral-950 shadow-md font-extrabold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            FINAL LAUNCH CHECKLIST
          </button>
          <button
            onClick={() => setActiveTab("nodes")}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              activeTab === "nodes"
                ? "bg-[#D4AF37] text-neutral-950 shadow-md font-extrabold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            EDGE NODES ({nodeList.length})
          </button>
          <button
            onClick={() => setShowLogModal(true)}
            className="px-4 py-2 rounded-lg text-xs font-mono font-bold text-neutral-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>CONSOLE LOGS</span>
          </button>
        </div>

        {/* ================= OVERVIEW GAUGE & OBSIDIAN COMMAND TAB ================= */}
        {activeTab === "overview" && (
          <div className="w-full max-w-5xl space-y-12">
            
            {/* Executive Marble Header Banner */}
            <div className="relative h-[320px] md:h-[420px] rounded-xl overflow-hidden group border border-[#D4AF37]/30 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
              <div
                className="w-full h-full bg-cover bg-center transition-transform duration-1000 group-hover:scale-105 opacity-80"
                style={{
                  backgroundImage:
                    "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBvl6r3KBcb7f2ZVWPXmbO05auPp_EHY23GZ7G9h1RBLA64qLaU4krhCdZbzzLydi343-sIkQnfYOPpqNLYDiK9M4q7pFVwlUeTtyLh_Xyk85CwEzJ532rBmrvjyZMoTXIHV2XrxTs2xg3Dgf4CUGo6-aXRRy1MSVVhuqAt-d9NRLSj9vTdyYysLpDXVOF2KsOnwGR0yc5993YOyqbY1KVD7RlDEAR3chIwEzzGcGbvdWXEn6j2x3lKSPh1mWT8l0ZxSxouRACYlf0')"
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent flex flex-col justify-end p-6 md:p-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] animate-ping" />
                  <span className="font-mono text-xs text-[#D4AF37] tracking-[0.2em] uppercase font-bold drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]">
                    Agent Status: Active
                  </span>
                </div>
                <h2 className="font-serif text-3xl md:text-5xl text-white font-bold leading-tight max-w-2xl">
                  Obsidian Command: Deployment Journey
                </h2>
                <div className="w-24 h-1 bg-[#D4AF37] mt-6 shadow-[0_0_12px_rgba(212,175,55,0.8)]" />
              </div>
            </div>

            {/* Real-Time Agent Monitoring & Swatches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-serif text-2xl font-bold text-white">Real-Time Agent Monitoring</h3>
                </div>
                <p className="font-sans text-sm text-neutral-300 leading-relaxed">
                  Our 'Obsidian Command' interface provides an unfiltered, high-stakes view into the{" "}
                  <span className="text-[#D4AF37] font-semibold drop-shadow-[0_0_4px_rgba(212,175,55,0.8)]">
                    Deployment Journey
                  </span>
                  . Operating at peak technical precision, this translucent layer surfaces live agent telemetry, ensuring seamless synchronization across all operational nodes.
                </p>
                
                {/* Color Swatches */}
                <div className="flex gap-6 pt-2">
                  <div className="flex flex-col space-y-1.5">
                    <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Base Core</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-black border border-neutral-700 rounded-sm" />
                      <span className="font-mono text-xs text-neutral-200">#000000</span>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <span className="font-mono text-[10px] text-neutral-400 uppercase tracking-widest font-bold">Active Node</span>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.8)] rounded-sm" />
                      <span className="font-mono text-xs text-[#D4AF37] font-bold">#D4AF37</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Macro Stone Slab Preview Glass Card */}
              <div className="bg-[#121212]/80 backdrop-blur-xl p-3 rounded-xl border border-[#D4AF37]/20 shadow-2xl relative group">
                <div className="aspect-square relative rounded-lg overflow-hidden border border-neutral-800">
                  <div
                    className="w-full h-full bg-cover bg-center opacity-90 transition-transform duration-700 group-hover:scale-105"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAJTkIQAwfnJenKZ6hBvRc260VxbB5kMwxTVVn_NvItJRxFyUx0n8f8sPwfYeYFW5PnkWYf1TLkQVGYBoRl8vPd1ygHZARxlwh7RL--x1LATCrA5ICD15JZ6OPExbf0igge6GgOHffLHarhwXk9WFX2g4nvIbp89L0C_PEqhIQC_UAJre3oDLTJRKS0SDYAv--njZ3CQK7OeYr-Mr2Ac9QFnmeyAL6n2GfJFuBMFY20xejx1P-XAJao5FEEY8ezC-mxbQqhEW5L7Z0')"
                    }}
                  />
                  <div className="absolute inset-0 bg-[#D4AF37]/5 mix-blend-overlay" />
                  <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded border border-[#D4AF37]/30 text-[10px] font-mono text-[#D4AF37] font-bold uppercase tracking-wider">
                    Elite Precision Edge Match
                  </div>
                </div>
              </div>
            </div>

            {/* Central Gauge (Launch Readiness) */}
            <div className="w-full max-w-md mx-auto relative flex flex-col justify-center items-center py-4">
              <svg className="w-56 h-56 drop-shadow-[0_0_25px_rgba(212,175,55,0.25)]" viewBox="0 0 36 36">
                <path
                  className="fill-none stroke-[#1A1A1A] stroke-[2]"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="fill-none stroke-[2.5] stroke-linecap-square transition-all duration-1000 stroke-[#D4AF37]"
                  strokeDasharray={`${overallReadiness}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text className="fill-white font-serif font-bold text-[0.5em] text-anchor-middle text-center" x="18" y="18" textAnchor="middle">
                  {overallReadiness}%
                </text>
                <text className="fill-[#c6c6c6] font-sans text-[0.14em] text-anchor-middle tracking-widest uppercase text-center" x="18" y="23" textAnchor="middle">
                  {launchInitiated ? "RELEASE LIVE" : "Ready for Launch"}
                </text>
              </svg>
            </div>

            {/* Telemetry & Sync: The Four Pillars */}
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-neutral-800 pb-3">
                <h3 className="font-serif text-2xl font-bold text-white">Telemetry &amp; Sync</h3>
                <span className="font-mono text-xs text-[#D4AF37] animate-pulse font-bold tracking-widest uppercase">
                  LIVE STREAM: SECURE
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Pillar 1 */}
                <div className="bg-[#121212]/80 backdrop-blur-xl p-6 rounded-xl border border-neutral-800 hover:border-[#D4AF37]/50 transition-all duration-500 flex flex-col justify-between group">
                  <div>
                    <Server className="w-8 h-8 text-[#D4AF37] mb-4 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                    <h4 className="font-serif text-lg font-bold text-white mb-3">Network Core</h4>
                    <ul className="space-y-2.5 font-sans text-xs text-neutral-400">
                      <li className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Latency Logs
                      </li>
                      <li className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Bandwidth Status
                      </li>
                      <li className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Encryption Key
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="bg-[#121212]/80 backdrop-blur-xl p-6 rounded-xl border border-neutral-800 hover:border-[#D4AF37]/50 transition-all duration-500 flex flex-col justify-between group">
                  <div>
                    <Zap className="w-8 h-8 text-[#D4AF37] mb-4 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                    <h4 className="font-serif text-lg font-bold text-white mb-3">Agent Precision</h4>
                    <ul className="space-y-2.5 font-sans text-xs text-neutral-400">
                      <li className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Algorithmic Sync
                      </li>
                      <li className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Process Load
                      </li>
                      <li className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Compute Units
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="bg-[#121212]/80 backdrop-blur-xl p-6 rounded-xl border border-neutral-800 hover:border-[#D4AF37]/50 transition-all duration-500 flex flex-col justify-between group">
                  <div>
                    <Layers className="w-8 h-8 text-[#D4AF37] mb-4 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                    <h4 className="font-serif text-lg font-bold text-white mb-3">Deployment Nodes</h4>
                    <ul className="space-y-2.5 font-sans text-xs text-neutral-400">
                      <li className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Regional Up-time
                      </li>
                      <li className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Package Transfer
                      </li>
                      <li className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Active Monitors
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Pillar 4 */}
                <div className="bg-[#121212]/80 backdrop-blur-xl p-6 rounded-xl border border-neutral-800 hover:border-[#D4AF37]/50 transition-all duration-500 flex flex-col justify-between group">
                  <div>
                    <ShieldCheck className="w-8 h-8 text-[#D4AF37] mb-4 drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                    <h4 className="font-serif text-lg font-bold text-white mb-3">System Integrity</h4>
                    <ul className="space-y-2.5 font-sans text-xs text-neutral-400">
                      <li className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Firewall Audit
                      </li>
                      <li className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Threat Matrix
                      </li>
                      <li className="flex items-center gap-2 group-hover:text-[#D4AF37] transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" /> Data Vault
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Quote & Action Card */}
            <div className="text-center max-w-3xl mx-auto space-y-8 pt-4 pb-8">
              <div className="relative py-12 px-8 bg-[#121212]/90 backdrop-blur-xl rounded-full overflow-hidden border border-[#D4AF37]/30 shadow-[0_0_25px_rgba(212,175,55,0.2)]">
                <div className="absolute inset-0 bg-[#D4AF37]/10 opacity-30 animate-pulse" />
                <blockquote className="font-serif text-xl md:text-3xl text-[#D4AF37] italic relative z-10 drop-shadow-[0_0_10px_rgba(212,175,55,0.5)] font-semibold">
                  "Precision is the foundation of deployment."
                </blockquote>
              </div>

              <div className="flex flex-col items-center gap-6">
                <p className="font-sans text-xs md:text-sm text-neutral-400 max-w-xl text-center leading-relaxed">
                  This command module serves as the central orchestration point. By initiating below, all agents, telemetry feeds, and deployment sequences will be executed with absolute precision.
                </p>

                <button
                  onClick={handleInitiateLaunch}
                  className="px-10 py-4 bg-[#D4AF37] hover:bg-white text-black font-mono text-xs font-bold tracking-widest uppercase transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.6)] hover:shadow-[0_0_30px_rgba(212,175,55,1)] cursor-pointer rounded"
                >
                  {launchInitiated ? "DEPLOYMENT SEQUENCE ACTIVE" : "INITIALIZE DEPLOYMENT SEQUENCE"}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ================= LINEAR PROTOCOL TIMELINE TAB ================= */}
        {activeTab === "timeline" && (
          <div className="relative max-w-4xl mx-auto w-full mb-16">
            {/* Timeline Vertical Axis Line */}
            <div className="absolute left-[24px] md:left-1/2 top-0 bottom-0 w-[1px] bg-[#D4AF37]/40 -translate-x-1/2 z-0" />

            {/* STAGE 1: DIGITAL FOUNDATION */}
            <div className="relative z-10 flex flex-col md:flex-row items-start mb-20 md:mb-28 group">
              <div className="md:w-1/2 md:pr-12 md:text-right pt-2 md:pt-0 pl-16 md:pl-0">
                <span className="inline-block px-3 py-1 bg-neutral-900 border border-[#D4AF37]/40 text-[#D4AF37] font-mono text-xs font-bold rounded mb-3">
                  PHASE 01 // FOUNDATION
                </span>
                <h3 className="font-serif text-2xl md:text-3xl text-white font-bold mb-2">
                  Digital Foundation
                </h3>
                <p className="font-sans text-xs md:text-sm text-neutral-400 mb-5">
                  Finalization of CAD topologies and structural load analyses. Ensuring absolute precision before physical fabrication commences.
                </p>

                <div className="bg-[#1A1A1A] border border-neutral-800 rounded-lg p-5 inline-block text-left mb-4 shadow-lg w-full max-w-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs text-neutral-400">Topology Scan</span>
                    <span className="font-mono text-xs text-[#D4AF37] font-extrabold">100% COMPLETE</span>
                  </div>
                  <div className="w-full bg-neutral-900 h-1.5 rounded-full mb-4 overflow-hidden border border-neutral-800">
                    <div className="bg-[#D4AF37] h-full w-full" />
                  </div>
                  <button
                    onClick={() => setPhase1Verified(true)}
                    className={`w-full py-2.5 px-4 font-mono text-xs font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      phase1Verified
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                        : "bg-white text-neutral-950 hover:bg-[#D4AF37]"
                    }`}
                  >
                    {phase1Verified && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{phase1Verified ? "TOPOLOGY DATA VERIFIED" : "VERIFY DATA"}</span>
                  </button>
                </div>
              </div>

              {/* Timeline Node Icon 1 */}
              <div className="absolute left-[24px] md:left-1/2 top-0 transform -translate-x-1/2 w-8 h-8 rounded-full bg-[#D4AF37] border-4 border-black flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 text-neutral-950 font-black" />
              </div>

              {/* Stage 1 Asset Render */}
              <div className="md:w-1/2 md:pl-12 w-full pl-16 md:pl-12 mt-4 md:mt-0">
                <div className="aspect-[4/3] bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden shadow-xl relative group">
                  <img
                    alt="CAD Wireframe Topology Render"
                    className="w-full h-full object-cover opacity-80 mix-blend-luminosity group-hover:scale-105 transition-transform duration-700"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQipIIidTeioabXDpXNrK0S8-fOGNvCJpzo6JQ5zUWChS9uFjPShj4E93zkwZ2AX3cWczBULwUEjDseWdSXngL-s28BLlClIzfT7UzTi9eLedFQF9nYzmJqyGmHcI6YYHVanDVnBvexXmnZxZCxZpiLZQHtu_mV-Se47jLTHcRAdn67JKTg6Y4sjA4KpFihWYrsrpOmMQL3dM2Oeat56ReVjfBg4NJ5nBQtYihq_fbhJcUUvOLMLol0bdzPWwcwyS-BkrxVmAR9AQ"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded border border-[#D4AF37]/30 text-[10px] font-mono text-[#D4AF37]">
                    CAD TOPOLOGY SCAN // VERONA CNC
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE 2: ARTISANAL SYNTHESIS */}
            <div className="relative z-10 flex flex-col md:flex-row-reverse items-start mb-20 md:mb-28 group">
              <div className="md:w-1/2 md:pl-12 pt-2 md:pt-0 pl-16 md:pl-0">
                <span className="inline-block px-3 py-1 bg-neutral-900 border border-[#D4AF37]/40 text-[#D4AF37] font-mono text-xs font-bold rounded mb-3">
                  PHASE 02 // SYNTHESIS
                </span>
                <h3 className="font-serif text-2xl md:text-3xl text-white font-bold mb-2">
                  Artisanal Synthesis
                </h3>
                <p className="font-sans text-xs md:text-sm text-neutral-400 mb-5">
                  Merging machine precision with human craftsmanship. Alignment of book-matched marble veining across primary waterfall edges.
                </p>

                <div className="bg-[#1A1A1A] border border-neutral-800 rounded-lg p-5 inline-block text-left mb-4 shadow-lg w-full max-w-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Diamond className="w-4 h-4 text-[#D4AF37]" />
                    <span className="font-mono text-xs font-bold text-white uppercase">Material Validation</span>
                  </div>
                  <ul className="space-y-2 font-mono text-xs text-neutral-400 mb-5">
                    <li className="flex justify-between border-b border-neutral-800 pb-1">
                      <span>Vein Alignment</span>
                      <strong className="text-white">0.05mm Delta</strong>
                    </li>
                    <li className="flex justify-between border-b border-neutral-800 pb-1">
                      <span>Edge Polish</span>
                      <strong className="text-white">Honed</strong>
                    </li>
                    <li className="flex justify-between pb-1">
                      <span>Hardware</span>
                      <strong className="text-[#D4AF37]">Champagne Gold</strong>
                    </li>
                  </ul>

                  <button
                    onClick={() => setPhase2Approved(!phase2Approved)}
                    className={`w-full py-2.5 px-4 font-mono text-xs font-bold rounded transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      phase2Approved
                        ? "bg-emerald-500 text-neutral-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        : "bg-[#D4AF37] text-neutral-950 hover:bg-amber-300"
                    }`}
                  >
                    {phase2Approved && <Check className="w-3.5 h-3.5 text-neutral-950" />}
                    <span>{phase2Approved ? "ASSEMBLY APPROVED" : "APPROVE ASSEMBLY"}</span>
                  </button>
                </div>
              </div>

              {/* Timeline Node Icon 2 */}
              <div className="absolute left-[24px] md:left-1/2 top-0 transform -translate-x-1/2 w-8 h-8 rounded-full bg-black border-2 border-[#D4AF37] flex items-center justify-center">
                <div className={`w-3 h-3 rounded-full ${phase2Approved ? "bg-emerald-400" : "bg-[#D4AF37] animate-pulse"}`} />
              </div>

              {/* Stage 2 Mandatory Image Asset */}
              <div className="md:w-1/2 md:pr-12 w-full pl-16 md:pr-12 mt-4 md:mt-0">
                <div className="aspect-[4/3] bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden shadow-xl relative group">
                  <img
                    alt="Finished kitchen island with marble waterfall edges"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    src="https://lh3.googleusercontent.com/aida/AP1WRLvpimV5j72DxV9Tzd6TRskN0d6mpndiVBDMoYzn7qfhbKEqxQJi_0oICQLkeybOk5F9N41JPks_wmv49sZFwXbc5XW76FsghwB6o1tdEREGugjByCFdpah3ANKNZAw5MAI7w_8C58STc8VRkilhEiCW3utiaPPuT7A6u0yCycynYw0EAlNs97mPDkrOsG36onLaOM5B9CqriAprCHz9q4AJLyKtATTQQzjCu_9Qgqo_d58T098d7UvSfnE"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-xs px-2.5 py-1 rounded border border-[#D4AF37]/30 text-[10px] font-mono text-[#D4AF37]">
                    SYNTHESIZED WATERFALL ISLAND // KENSINGTON
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE 3: GLOBAL LAUNCH */}
            <div className="relative z-10 flex flex-col md:flex-row items-start mb-12 group">
              <div className="md:w-1/2 md:pr-12 md:text-right pt-2 md:pt-0 pl-16 md:pl-0">
                <span className="inline-block px-3 py-1 bg-neutral-900 border border-[#D4AF37]/40 text-[#D4AF37] font-mono text-xs font-bold rounded mb-3">
                  PHASE 03 // DEPLOYMENT
                </span>
                <h3 className="font-serif text-2xl md:text-3xl text-white font-bold mb-2">
                  Global Launch
                </h3>
                <p className="font-sans text-xs md:text-sm text-neutral-400 mb-5">
                  Final sign-off and deployment of the completed architectural asset to the client portfolio network.
                </p>

                <button
                  onClick={handleInitiateLaunch}
                  disabled={launchInitiated}
                  className={`inline-flex items-center justify-center gap-2 py-3.5 px-8 font-mono text-xs font-extrabold rounded-lg border transition-all cursor-pointer shadow-lg active:scale-95 ${
                    launchInitiated
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 cursor-default"
                      : "bg-[#D4AF37] text-neutral-950 border-amber-300 hover:bg-amber-300 shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                  }`}
                >
                  <Rocket className="w-4 h-4" />
                  <span>{launchInitiated ? "DEPLOYMENT LIVE" : "INITIATE DEPLOYMENT"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Timeline Node Icon 3 */}
              <div className="absolute left-[24px] md:left-1/2 top-0 transform -translate-x-1/2 w-8 h-8 rounded-full bg-black border-2 border-neutral-700 flex items-center justify-center">
                {launchInitiated ? (
                  <Check className="w-4 h-4 text-emerald-400 font-bold" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-neutral-500" />
                )}
              </div>

              {/* Stage 3 Authorization Status Render */}
              <div className="md:w-1/2 md:pl-12 w-full pl-16 md:pl-12 mt-4 md:mt-0">
                <div className="h-44 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-center overflow-hidden relative shadow-xl">
                  <div
                    className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
                    style={{
                      backgroundImage:
                        "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCy2JF-nbd03cdx8mjG_81HygQk9bM2H3WWhWHAcwZrMAWqzS0knZ-2ha3BAkCXLmnWd5EqAUka-q04YzkwaPLS3xV2lLvom6dZvqdHnA4mTpX1R9ZmR3OnHusTXKEa0iucBJIjIow9dGX0C1cfdkL1u1b3zTqoMZYKJ2YSjCyKU4h7aAiLpqBkOKazRjx3i6AxcDCkkYBVNaqFqW45F47TxnHsEkbcsGTAU4IJ-MTiZgGwVByQo_EHW2LtF-DOMfC9iLJ4sb7Ckp4')"
                    }}
                  />
                  <div className="relative z-10 text-center space-y-1">
                    <span className="font-mono text-xs text-[#D4AF37] font-bold tracking-widest uppercase block">
                      {launchInitiated ? "PORTFOLIO LIVE & AUTHORIZED" : "AWAITING AUTHORIZATION"}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono block">
                      {launchInitiated ? "SW3-KENSINGTON-3920" : "PRE-FLIGHT STAGE READY"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= LAUNCH CHECKLIST (PROTOCOL ALPHA) TAB ================= */}
        {activeTab === "checklist" && (
          <div className="w-full max-w-3xl space-y-8 mb-12 animate-fade-in">
            {/* Header Banner */}
            <div className="text-center space-y-2">
              <span className="font-mono text-xs font-bold text-[#D4AF37] tracking-widest uppercase block">
                Protocol Alpha
              </span>
              <h3 className="font-serif text-3xl md:text-4xl text-white font-bold">
                Final Launch Checklist
              </h3>
              <p className="font-sans text-xs md:text-sm text-neutral-400 max-w-xl mx-auto">
                Authorize the deployment sequence. Ensure all parameters meet the rigorous standards of the SMC PRO architecture before initiating the final handover.
              </p>
            </div>

            {/* Progress Bar Container */}
            <div className="border border-neutral-800 rounded-xl bg-[#131313] p-6 shadow-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs font-bold text-neutral-200 uppercase tracking-wider">
                  Deployment Readiness
                </span>
                <span className="font-mono text-xs font-extrabold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded border border-[#D4AF37]/30">
                  {completedCount} / 5 TASKS VERIFIED
                </span>
              </div>
              <div className="h-2 w-full bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-[#D4AF37] transition-all duration-500 ease-out"
                  style={{ width: `${(completedCount / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-4">
              {[
                {
                  title: "Forensic Code Audit",
                  description:
                    "Executing ±0.05mm precision check across all computational geometry modules. Validating structural integrity of the core algorithmic framework."
                },
                {
                  title: "High-Fidelity Asset Sync",
                  description:
                    "Synchronizing luxury architectural marks, comprehensive hero imagery, and vector assets across global Content Delivery Networks."
                },
                {
                  title: "Trade Partner Beta Activation",
                  description:
                    "Initializing secure access protocols for Tier 1 fabrication partners. Generating cryptographic keys for secure portal entry."
                },
                {
                  title: "Global Slab Sourcing API Handshake",
                  description:
                    "Establishing real-time inventory telemetry with international quarry databases. Confirming latency metrics are within acceptable thresholds."
                },
                {
                  title: "Executive Handover Protocol",
                  description:
                    "Finalizing executive dashboards. Compiling exhaustive launch telemetry into the authoritative dossier for stakeholder review."
                }
              ].map((task, idx) => {
                const isChecked = checkedTasks[idx];
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleTask(idx)}
                    className={`border rounded-xl p-5 flex items-start gap-4 transition-all duration-300 cursor-pointer ${
                      isChecked
                        ? "bg-[#1A1A1A] border-[#D4AF37]/50 shadow-md"
                        : "bg-neutral-900/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        isChecked
                          ? "bg-[#D4AF37] border-[#D4AF37] text-neutral-950 font-bold"
                          : "border-neutral-600 bg-neutral-950 text-transparent"
                      }`}
                    >
                      <Check className="w-4 h-4 text-neutral-950 stroke-[3]" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`font-mono text-sm font-bold transition-colors ${
                            isChecked ? "text-[#D4AF37]" : "text-white"
                          }`}
                        >
                          {task.title}
                        </h4>
                        {isChecked && (
                          <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                            PASSED
                          </span>
                        )}
                      </div>
                      <p className="font-sans text-xs text-neutral-400 leading-relaxed">
                        {task.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Launch Button Action Area */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={handleInitiateLaunch}
                disabled={!isAllChecked && !launchInitiated}
                className={`px-8 py-3.5 rounded-lg font-mono text-xs font-extrabold uppercase transition-all duration-300 flex items-center gap-2.5 active:scale-95 ${
                  launchInitiated
                    ? "bg-emerald-500 text-neutral-950 cursor-default shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                    : isAllChecked
                    ? "bg-[#D4AF37] text-neutral-950 hover:bg-amber-300 shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer"
                    : "bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-60 border border-neutral-700"
                }`}
              >
                <Rocket className="w-4 h-4" />
                <span>
                  {launchInitiated
                    ? "SYSTEM DEPLOYED & LIVE"
                    : isAllChecked
                    ? "INITIATE LAUNCH"
                    : "COMPLETE CHECKLIST TO LAUNCH"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ================= EDGE NODES TAB ================= */}
        {activeTab === "nodes" && (
          <div className="w-full max-w-4xl space-y-4 mb-12">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="font-mono text-sm font-bold text-[#D4AF37] uppercase tracking-wider">
                Edge Node Telemetry Matrix
              </h3>
              <span className="text-xs font-mono text-emerald-400 font-bold">100% HEALTHY</span>
            </div>

            <div className="space-y-3">
              {nodeList.map((node) => (
                <div
                  key={node.id}
                  className="bg-[#1A1A1A] border border-neutral-800 p-4 rounded-lg flex justify-between items-center shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <Server className="w-4 h-4 text-[#D4AF37]" />
                    <div>
                      <span className="font-mono text-xs font-bold text-white block">{node.id}</span>
                      <span className="text-[11px] text-neutral-400">{node.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono">
                    <span className="text-neutral-400">Latency: <strong className="text-white">{node.latency}</strong></span>
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold">
                      {node.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Realtime Console Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#131313] border border-[#D4AF37]/50 rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl space-y-0">
            <div className="bg-black p-4 border-b border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#D4AF37]" />
                <span className="font-mono text-xs font-bold text-[#D4AF37]">
                  PRODUCTION CONSOLE LOGS &amp; SYSTEM AUDIT
                </span>
              </div>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-black font-mono text-xs text-neutral-300 space-y-2 max-h-80 overflow-y-auto leading-relaxed">
              <div className="text-neutral-500">[16:48:00] Pre-flight initialization started...</div>
              <div className="text-emerald-400">[16:48:01] Static analysis check complete: 0 errors, 0 warnings.</div>
              <div className="text-emerald-400">[16:48:02] Security audit complete: ISO-27001 token validated.</div>
              <div className="text-emerald-400">[16:48:03] Database schema validation: 100% alignment across 14 collections.</div>
              <div className="text-amber-300">[16:48:04] Brand alignment tokens mapped (High-DPI 4K assets).</div>
              <div className="text-sky-400">[16:48:05] Propagating edge nodes to London SW3, Mayfair, and Verona...</div>
              {launchInitiated && (
                <div className="text-emerald-400 font-bold bg-emerald-950/40 p-2 rounded border border-emerald-500/40">
                  [16:48:06] FINAL LAUNCH SEQUENCE EXECUTED. SYSTEM BROADCASTING LIVE.
                </div>
              )}
            </div>

            <div className="p-3 bg-neutral-900 border-t border-neutral-800 flex justify-between items-center">
              <span className="text-[10px] font-mono text-neutral-400">STATUS: ALL SYSTEMS OPERATIONAL</span>
              <button
                onClick={() => setShowLogModal(false)}
                className="bg-[#D4AF37] text-neutral-950 px-4 py-1.5 rounded font-mono text-xs font-bold cursor-pointer"
              >
                CLOSE CONSOLE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

