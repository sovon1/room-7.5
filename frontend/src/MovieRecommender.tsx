import React, { useState, useEffect, useRef, useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import "./MovieRecommender.css";

export interface Movie {
  id: number;
  title: string;
  poster_url?: string | null;
  overview: string;
  rating: number;
  vote_count?: number;
  genres: string[];
  match_percentage: number | null;
}

export type SearchMode = "title" | "vibe";
export type ArchetypeVibe =
  | "gosling"
  | "sukuna"
  | "lalaland_kiss"
  | "gojo_sukuna"
  | "ronaldo"
  | "lalaland_theater"
  | "joe_black";

interface RecommendResponse {
  query_movie: string;
  recommendations: Movie[];
}

interface SearchResponse {
  search_query: string;
  results: Movie[];
}

interface ErrorDetail {
  detail?: string;
}

interface VectorNode {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  radius: number;
  label: string;
  color: string;
  highlighted: boolean;
}

interface ArchetypeItem {
  id: ArchetypeVibe;
  label: string;
  sublabel: string;
  type: "film" | "gif";
  thumbUrl: string;
  backdropUrl: string;
  prompt: string;
  accentColor: string;
}

const ARCHETYPES: ArchetypeItem[] = [
  {
    id: "gosling",
    label: "01 // OFFICER K",
    sublabel: "Blade Runner 2049",
    type: "film",
    thumbUrl: "https://images8.alphacoders.com/791/thumb-350-791152.webp",
    backdropUrl: "https://images8.alphacoders.com/791/thumb-1920-791152.jpg",
    prompt: "blade runner 2049 lonely replicant searching for human soul in neon dystopian rain",
    accentColor: "#38bdf8",
  },
  {
    id: "sukuna",
    label: "02 // SUKUNA",
    sublabel: "Domain Expansion",
    type: "gif",
    thumbUrl: "https://giffiles.alphacoders.com/221/thumb-221968.jpg",
    backdropUrl: "https://giffiles.alphacoders.com/221/221968.gif",
    prompt: "ancient malevolent cursed demon king slicing reality with godlike dark power jujutsu kaisen",
    accentColor: "#ef4444",
  },
  {
    id: "lalaland_kiss",
    label: "03 // LA LA LAND",
    sublabel: "Planetarium Kiss",
    type: "film",
    thumbUrl: "https://images5.alphacoders.com/771/thumb-350-771259.webp",
    backdropUrl: "https://images5.alphacoders.com/771/thumb-1920-771259.jpg",
    prompt: "bittersweet romance jazz pianist and actress dancing under cosmos la la land",
    accentColor: "#c084fc",
  },
  {
    id: "gojo_sukuna",
    label: "04 // GOJO VS SUKUNA",
    sublabel: "Anime Zenith Clash",
    type: "gif",
    thumbUrl: "https://giffiles.alphacoders.com/221/thumb-221619.jpg",
    backdropUrl: "https://giffiles.alphacoders.com/221/221619.gif",
    prompt: "godlike sorcerer infinity barrier clashing against primordial curse king reality warp anime battle",
    accentColor: "#6366f1",
  },
  {
    id: "ronaldo",
    label: "05 // CR7 GLORY",
    sublabel: "Supreme Willpower",
    type: "gif",
    thumbUrl: "https://giffiles.alphacoders.com/221/thumb-221740.jpg",
    backdropUrl: "https://giffiles.alphacoders.com/221/221740.gif",
    prompt: "relentless champion defying odds with supreme willpower athletic glory and legendary drive",
    accentColor: "#10b981",
  },
  {
    id: "lalaland_theater",
    label: "06 // CINEMA SANCTUARY",
    sublabel: "Emma & Ryan in Theater",
    type: "film",
    thumbUrl: "https://images3.alphacoders.com/800/thumb-350-800717.webp",
    backdropUrl: "https://images3.alphacoders.com/800/thumb-1920-800717.jpg",
    prompt: "two lovers holding hands in vintage art deco cinema watching classic reels dreamers",
    accentColor: "#f59e0b",
  },
  {
    id: "joe_black",
    label: "07 // JOE BLACK",
    sublabel: "Death Meets Mortality",
    type: "film",
    thumbUrl: "https://images7.alphacoders.com/807/thumb-350-807428.webp",
    backdropUrl: "https://images7.alphacoders.com/807/thumb-1920-807428.jpg",
    prompt: "personification of death takes human form to learn love mortality and bittersweet human beauty",
    accentColor: "#94a3b8",
  },
];

const SAMPLE_SEMANTIC_NODES = [
  "Interstellar", "Inception", "Cyberpunk", "Dystopia", "Noir", "Tarantino", 
  "Nolan", "Subconscious", "Time Dilation", "Matrix", "Blade Runner", "Solaris",
  "Cosmic Dread", "Mind Game", "Neo-Tokyo", "Quantum Paradox", "Surrealism", "Fever Dream",
  "Drive", "La La Land", "Sukuna", "Ronaldo", "Joe Black"
];

// ==========================================================================
// BORDER BEAM COMPONENT (Magic UI / Libraries.dev Standard)
// Luminous traveling photon beam circulating around container borders
// ==========================================================================
interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  colorFrom?: string;
  colorTo?: string;
}

function BorderBeam({
  className = "",
  size = 140,
  duration = 6,
  colorFrom = "#7c3aed",
  colorTo = "#38bdf8",
}: BorderBeamProps) {
  return (
    <div
      className={`border-beam-host ${className}`}
      style={{
        "--beam-size": `${size}px`,
        "--beam-duration": `${duration}s`,
        "--beam-from": colorFrom,
        "--beam-to": colorTo,
      } as React.CSSProperties}
    >
      <div className="border-beam-traveler" />
    </div>
  );
}

// High-speed synchronous KaTeX renderer with error resilience
interface LatexFormulaProps {
  math: string;
  display?: boolean;
  className?: string;
}

function LatexFormula({ math, display = false, className = "" }: LatexFormulaProps) {
  const renderedHtml = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
      });
    } catch {
      return math;
    }
  }, [math, display]);

  if (display) {
    return (
      <div
        className={`katex-block-wrapper ${className}`}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    );
  }

  return (
    <span
      className={`katex-inline-wrapper ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
}

const API_BASE: string = (
  (import.meta as any).env?.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function MovieRecommender() {
  const [mode, setMode] = useState<SearchMode>("vibe");
  const [query, setQuery] = useState<string>("blade runner 2049 lonely replicant searching for human soul in neon dystopian rain");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [headline, setHeadline] = useState<string>("Top Latent Manifold Seeds");
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [mathDrawerOpen, setMathDrawerOpen] = useState<boolean>(true);
  
  // Selected archetype (Defaults to Ryan Gosling)
  const [activeArchetype, setActiveArchetype] = useState<ArchetypeItem>(ARCHETYPES[0]);
  const [backdropIntensity, setBackdropIntensity] = useState<number>(0.55);
  const [shockwaveKey, setShockwaveKey] = useState<number>(0);

  // Live Reactive Metrics State
  const [activeQueryNorm, setActiveQueryNorm] = useState<number>(3.842);
  const [activeTokens, setActiveTokens] = useState<number>(12);
  const [topResonanceScore, setTopResonanceScore] = useState<number>(0.92);
  const [geodesicAngleDeg, setGeodesicAngleDeg] = useState<number>(23.1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    fetchPopularMovies();
  }, []);

  const fetchPopularMovies = async (): Promise<void> => {
    try {
      const res = await fetch(`${API_BASE}/api/popular?limit=6`);
      if (!res.ok) throw new Error("Network error");
      const data: Movie[] = await res.json();
      setMovies(data);
      setHeadline("Top Latent Manifold Seeds");
      setTopResonanceScore(0.89);
      setGeodesicAngleDeg(27.1);
    } catch (err) {
      console.error("Failed to load initial movies:", err);
    }
  };

  // Dynamic reactive math values based on query
  useEffect(() => {
    const q = query.toLowerCase();
    if (!q) {
      setActiveTokens(0);
      setActiveQueryNorm(0);
      return;
    }

    const tokens = q.trim().split(/\s+/).filter(Boolean).length;
    setActiveTokens(tokens);
    const computedNorm = parseFloat(Math.sqrt(tokens * 1.85 + 0.64).toFixed(3));
    setActiveQueryNorm(computedNorm);
    const angle = parseFloat((Math.acos(Math.min(0.99, Math.max(0.1, topResonanceScore))) * (180 / Math.PI)).toFixed(1));
    setGeodesicAngleDeg(angle);
  }, [query, topResonanceScore]);

  const executeSearchWith = async (targetQuery: string, targetMode: SearchMode): Promise<void> => {
    if (!targetQuery.trim()) return;
    setLoading(true);

    try {
      if (targetMode === "title") {
        const res = await fetch(`${API_BASE}/api/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: targetQuery, top_n: 6 }),
        });

        if (!res.ok) {
          const errData: ErrorDetail = await res.json();
          alert(errData.detail || "Film coordinates not resolved. Try another title!");
          return;
        }

        const data: RecommendResponse = await res.json();
        setMovies(data.recommendations);
        setHeadline(`Ethereal Projections for: "${data.query_movie}"`);
        if (data.recommendations.length > 0 && data.recommendations[0].match_percentage) {
          const resonance = data.recommendations[0].match_percentage / 100;
          setTopResonanceScore(resonance);
        }
      } else {
        const res = await fetch(`${API_BASE}/api/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: targetQuery, top_n: 6 }),
        });

        if (!res.ok) {
          const errData: ErrorDetail = await res.json();
          alert(errData.detail || "Vector projection failed. Adjust query!");
          return;
        }

        const data: SearchResponse = await res.json();
        setMovies(data.results);
        setHeadline(`Subconscious Topology for: "${data.search_query.slice(0, 48)}..."`);
        if (data.results.length > 0 && data.results[0].match_percentage) {
          const resonance = data.results[0].match_percentage / 100;
          setTopResonanceScore(resonance);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      alert(`Backend apparatus unreachable on ${API_BASE}. Ensure the vector API is running.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault();
    executeSearchWith(query, mode);
  };

  const selectArchetype = (archetype: ArchetypeItem): void => {
    setActiveArchetype(archetype);
    setMode("vibe");
    setQuery(archetype.prompt);
    setShockwaveKey((prev) => prev + 1);
    executeSearchWith(archetype.prompt, "vibe");
  };

  // 3D Canvas Vector Engine Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 900);
    let height = (canvas.height = 360);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 360;
    };
    window.addEventListener("resize", handleResize);

    const NODES_COUNT = 54;
    const RADIUS = 145;
    const nodes: VectorNode[] = [];

    for (let i = 0; i < NODES_COUNT; i++) {
      const phi = Math.acos(-1 + (2 * i) / NODES_COUNT);
      const theta = Math.sqrt(NODES_COUNT * Math.PI) * phi;
      const x = RADIUS * Math.cos(theta) * Math.sin(phi);
      const y = RADIUS * Math.sin(theta) * Math.sin(phi);
      const z = RADIUS * Math.cos(phi);

      const label = i < SAMPLE_SEMANTIC_NODES.length ? SAMPLE_SEMANTIC_NODES[i] : "";
      const colors = ["rgba(124, 58, 237, ", "rgba(2, 132, 199, ", "rgba(236, 72, 153, ", "rgba(16, 185, 129, "];
      const color = colors[i % colors.length];

      nodes.push({
        x, y, z, baseX: x, baseY: y, baseZ: z,
        radius: Math.random() * 2.8 + 2.2,
        label, color, highlighted: i % 4 === 0,
      });
    }

    let rotY = 0;
    let rotX = 0;
    let pulseTime = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      pulseTime += loading ? 0.08 : 0.015;
      rotY += 0.003 + mouseRef.current.x * 0.00008;
      rotX += 0.002 + mouseRef.current.y * 0.00008;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      const fov = 350;
      const cx = width / 2;
      const cy = height / 2;

      const projected = nodes.map((node) => {
        const scaleMod = loading ? 1 + 0.22 * Math.sin(pulseTime * 3.5) : 1;
        const bx = node.baseX * scaleMod;
        const by = node.baseY * scaleMod;
        const bz = node.baseZ * scaleMod;

        const x1 = bx * cosY - bz * sinY;
        const z1 = bz * cosY + bx * sinY;

        const y2 = by * cosX - z1 * sinX;
        const z2 = z1 * cosX + by * sinX;

        const zDepth = z2 + 280;
        const scale = fov / Math.max(10, zDepth);
        const px = cx + x1 * scale;
        const py = cy + y2 * scale;
        const alpha = Math.max(0.15, Math.min(0.95, (z2 + RADIUS) / (2 * RADIUS)));

        return { ...node, px, py, pz: z2, scale, alpha };
      });

      projected.sort((a, b) => a.pz - b.pz);

      ctx.lineWidth = 0.8;
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].px - projected[j].px;
          const dy = projected[i].py - projected[j].py;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 78) {
            const lineAlpha = (1 - dist / 78) * 0.35 * Math.min(projected[i].alpha, projected[j].alpha);
            ctx.strokeStyle = `rgba(124, 58, 237, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(projected[i].px, projected[i].py);
            ctx.lineTo(projected[j].px, projected[j].py);
            ctx.stroke();
          }
        }
      }

      projected.forEach((node) => {
        const r = node.radius * node.scale * (loading ? 1.6 : 1.0);

        const glowGrad = ctx.createRadialGradient(node.px, node.py, 0, node.px, node.py, r * 3.6);
        glowGrad.addColorStop(0, `${node.color}${node.alpha})`);
        glowGrad.addColorStop(0.5, `${node.color}${node.alpha * 0.4})`);
        glowGrad.addColorStop(1, `${node.color}0)`);

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(node.px, node.py, r * 3.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(node.px, node.py, Math.max(1.2, r * 0.6), 0, Math.PI * 2);
        ctx.fill();

        if (node.label && node.alpha > 0.52) {
          ctx.font = `600 ${Math.max(9, Math.round(9.5 * node.scale))}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = `rgba(15, 23, 42, ${node.alpha * 0.9})`;
          ctx.fillText(node.label, node.px + r + 4, node.py + 3);
        }
      });

      ctx.strokeStyle = `rgba(168, 85, 247, ${loading ? 0.8 : 0.25})`;
      ctx.lineWidth = loading ? 2.0 : 1.0;
      ctx.beginPath();
      ctx.arc(cx, cy, 46 + 10 * Math.sin(pulseTime * 2.5), 0, Math.PI * 2);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.targetX = e.clientX - rect.left - width / 2;
      mouseRef.current.targetY = e.clientY - rect.top - height / 2;
    };

    canvas.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [loading]);

  return (
    <div className="surreal-universe">
      {/* Shockwave visual flare on archetype trigger */}
      <div key={shockwaveKey} className="chromatic-shockwave" />

      {/* ==============================================================
          FULL-BLEED CINEMATIC BACKDROP: RYAN GOSLING (OFFICER K // 2049)
          High-Key White-Themed Atmospheric Integration
         ============================================================== */}
      <div className="cinematic-backdrop">
        <img
          src={activeArchetype.backdropUrl}
          alt={activeArchetype.label}
          className="backdrop-image"
          style={{ opacity: backdropIntensity }}
          loading="eager"
        />
        <div className="backdrop-film-grain" />
        <div className="backdrop-white-veil" />
        <div className="backdrop-chromatic-haze" />
      </div>

      {/* Atmospheric Dream Orbs & High-Frequency Fever Grids */}
      <div className="dream-orb dream-orb-1" />
      <div className="dream-orb dream-orb-2" />
      <div className="dream-orb dream-orb-3" />
      <div className="fever-grid-overlay" />

      {/* ==============================================================
          CENTRAL COMMAND SPACE (FROSTED GLASS ALABASTER CONTAINER)
         ============================================================== */}
      <div className="surreal-container">
        {/* Editorial Brandmark Header */}
        <header className="surreal-header">
          {/* Analog Film Catalog Mark */}
          <div className="film-catalog-meta">
            <span className="meta-mark">[ ARCHIVE NO. 4803 // 35MM ]</span>
            <span className="meta-sep">•</span>
            <span className="meta-solitude">FIFTEEN YEARS IN SOLITUDE</span>
            <span className="meta-sep">•</span>
            <span className="meta-hilbert">
              <LatexFormula math="\mathcal{H} = \ell^2(\mathbb{R}^{10,000})" display={false} />
            </span>
          </div>

          {/* Deep Cinema Monolithic Title */}
          <h1 className="cinema-monolith-title">
            ROOM 7.5
          </h1>

          <p className="surreal-subtitle">
            Find films by the feeling they leave behind. Search 4,800 titles by scene, mood, or memory across 10,000-dimensional vector space.
          </p>

          {/* Watermark KaTeX Hero Formula with Border Beam */}
          <div className="hero-formula-banner">
            <BorderBeam size={130} duration={6} colorFrom="#a855f7" colorTo="#38bdf8" />
            <LatexFormula
              math="\mathcal{S}_{\cos}(\mathbf{q}, \mathbf{d}) = \frac{\langle \mathbf{q}, \mathbf{d} \rangle}{\|\mathbf{q}\|_2 \|\mathbf{d}\|_2} = \frac{\sum_{i=1}^{10,000} q_i d_i}{\sqrt{\sum_{i=1}^{10,000} q_i^2} \cdot \sqrt{\sum_{i=1}^{10,000} d_i^2}}"
              display={true}
            />
          </div>

          {/* Backdrop Atmosphere Fader */}
          <div className="backdrop-fader-bar">
            <span className="fader-label">CINEMATIC BACKDROP INTENSITY:</span>
            <button
              type="button"
              className={`fader-pill ${backdropIntensity === 0.35 ? "active" : ""}`}
              onClick={() => setBackdropIntensity(0.35)}
            >
              Misty Alabaster (35%)
            </button>
            <button
              type="button"
              className={`fader-pill ${backdropIntensity === 0.55 ? "active" : ""}`}
              onClick={() => setBackdropIntensity(0.55)}
            >
              Balanced Gosling (55%)
            </button>
            <button
              type="button"
              className={`fader-pill ${backdropIntensity === 0.8 ? "active" : ""}`}
              onClick={() => setBackdropIntensity(0.8)}
            >
              Vivid Celluloid (80%)
            </button>
          </div>
        </header>

        {/* ==============================================================
            35MM CELLULOID REEL (ORGANIC FILMSTRIP ARCHETYPES)
           ============================================================== */}
        <div className="filmstrip-ribbon">
          <div className="filmstrip-caption">
            <span className="spool-icon">🎞️</span>
            <span>CELLULOID ARCHETYPE STRIP:</span>
          </div>

          <div className="film-frames-track">
            {ARCHETYPES.map((arch) => {
              const isActive = activeArchetype.id === arch.id;
              return (
                <div
                  key={arch.id}
                  className={`film-frame ${isActive ? "frame-active" : ""}`}
                  onClick={() => selectArchetype(arch)}
                  style={{ "--frame-accent": arch.accentColor } as React.CSSProperties}
                  title={`Resonate: ${arch.label} - ${arch.sublabel}`}
                >
                  {isActive && (
                    <BorderBeam size={85} duration={3.5} colorFrom={arch.accentColor} colorTo="#ffffff" />
                  )}

                  <div className="sprocket-track top-sprockets">
                    <span className="sprocket" />
                    <span className="sprocket" />
                    <span className="sprocket" />
                    <span className="sprocket" />
                  </div>

                  <img src={arch.thumbUrl} alt={arch.label} className="film-frame-img" />
                  <div className="film-frame-overlay" />

                  <div className="film-frame-label">
                    <span className="frame-code">{arch.label.split("//")[0]}</span>
                    <span className="frame-title">{arch.sublabel}</span>
                  </div>

                  <div className="sprocket-track bottom-sprockets">
                    <span className="sprocket" />
                    <span className="sprocket" />
                    <span className="sprocket" />
                    <span className="sprocket" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ==============================================================
            PERSISTENT LIVE REACTIVE MATHEMATICAL MACHINERY HUD
           ============================================================== */}
        <div className="live-reactive-deck">
          <BorderBeam size={220} duration={8} colorFrom="#38bdf8" colorTo="#7c3aed" />

          <div className="deck-header">
            <div className="deck-title-wrap">
              <span className="deck-pulse-icon">⚡</span>
              <span className="deck-title">LIVE REACTIVE TENSOR HUD</span>
              <span className="deck-sub">Real-time calculations as you type</span>
            </div>
            <div className="deck-badge">
              <LatexFormula math="g_{\mu\nu} = \delta_{\mu\nu} \cdot \text{IDF}_\mu^2" display={false} />
            </div>
          </div>

          <div className="deck-grid">
            <div className="deck-cell">
              <div className="cell-label">
                <span>QUERY NORM</span>
                <LatexFormula math="\|\mathbf{q}\|_2" display={false} />
              </div>
              <div className="cell-value-wrap">
                <span className="cell-num">{activeQueryNorm.toFixed(3)}</span>
                <span className="cell-unit">Euclidean</span>
              </div>
              <div className="cell-bar-track">
                <div
                  className="cell-bar-fill fill-cyan"
                  style={{ width: `${Math.min(100, activeQueryNorm * 18)}%` }}
                />
              </div>
            </div>

            <div className="deck-cell">
              <div className="cell-label">
                <span>ACTIVE EIGEN-TOKENS</span>
                <LatexFormula math="k \le D" display={false} />
              </div>
              <div className="cell-value-wrap">
                <span className="cell-num">{activeTokens}</span>
                <span className="cell-unit">of 10,000 D</span>
              </div>
              <div className="cell-bar-track">
                <div
                  className="cell-bar-fill fill-violet"
                  style={{ width: `${Math.min(100, activeTokens * 8)}%` }}
                />
              </div>
            </div>

            <div className="deck-cell">
              <div className="cell-label">
                <span>PEAK RESONANCE</span>
                <LatexFormula math="\cos(\theta_{\min})" display={false} />
              </div>
              <div className="cell-value-wrap">
                <span className="cell-num">{(topResonanceScore * 100).toFixed(1)}%</span>
                <span className="cell-unit">Affinity</span>
              </div>
              <div className="cell-bar-track">
                <div
                  className="cell-bar-fill fill-rose"
                  style={{ width: `${topResonanceScore * 100}%` }}
                />
              </div>
            </div>

            <div className="deck-cell">
              <div className="cell-label">
                <span>GEODESIC ANGLE</span>
                <LatexFormula math="\theta = \arccos(\mathcal{S})" display={false} />
              </div>
              <div className="cell-value-wrap">
                <span className="cell-num">{geodesicAngleDeg}°</span>
                <span className="cell-unit">Hyper-Sphere</span>
              </div>
              <div className="cell-bar-track">
                <div
                  className="cell-bar-fill fill-emerald"
                  style={{ width: `${Math.min(100, (1 - geodesicAngleDeg / 90) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ==============================================================
            3D MACHINE LEARNING VECTOR SIMULATION HERO
           ============================================================== */}
        <div className="engine-viewport">
          <BorderBeam size={260} duration={10} colorFrom="#7c3aed" colorTo="#059669" />

          <div className="engine-hud">
            <div className="hud-metric">
              <span className="hud-label">HILBERT SPACE</span>
              <span className="hud-val">
                <LatexFormula math="\mathcal{H} = \ell^2(\mathbb{R}^{10,000})" display={false} />
              </span>
            </div>
            <div className="hud-metric">
              <span className="hud-label">GEODESIC METRIC</span>
              <span className="hud-val">
                <LatexFormula math="\cos(\theta) = \frac{\mathbf{q} \cdot \mathbf{d}}{\|\mathbf{q}\| \|\mathbf{d}\|}" display={false} />
              </span>
            </div>
            <div className="hud-metric">
              <span className="hud-label">AFFINE 3D PROJECTION</span>
              <span className="hud-val">
                <LatexFormula math="\begin{pmatrix} x' \\ y' \end{pmatrix} = \frac{f}{z+d} \mathbf{R} \begin{pmatrix} x \\ y \\ z \end{pmatrix}" display={false} />
              </span>
            </div>
            <div className="hud-metric">
              <span className="hud-label">ENGINE STATUS</span>
              <span className={`hud-val ${loading ? "hud-pulsing" : "hud-online"}`}>
                {loading ? "CONVERGING TENSORS..." : "60 FPS EIGEN-ORBIT"}
              </span>
            </div>
          </div>

          <canvas ref={canvasRef} className="vector-canvas" />

          <div className="engine-foot">
            <span>
              Interactive 3D Hilbert Projection • Drag cursor to tilt manifold • Bioluminescent violet edges signify Cosine Metric (
              <LatexFormula math="\mathcal{S}_{\cos} > 0.65" display={false} />)
            </span>
          </div>
        </div>

        {/* ==============================================================
            MAXIMALIST MATHEMATICAL MACHINERY DRAWER (KATEX PROOFS)
           ============================================================== */}
        <section className="math-section">
          <div className="math-header" onClick={() => setMathDrawerOpen(!mathDrawerOpen)}>
            <div className="math-title-group">
              <span className="math-icon">∑</span>
              <div>
                <h3 className="math-title">Higher-Dimensional Mathematical Machinery</h3>
                <span className="math-tag">10,000-D Hilbert Norms • Topological Surprisal • Riemannian Angles</span>
              </div>
            </div>
            <button className="math-toggle-btn">
              {mathDrawerOpen ? "Minimize Proofs ▲" : "Reveal KaTeX Equations ▼"}
            </button>
          </div>

          {mathDrawerOpen && (
            <div className="math-grid">
              {/* Formula 1: Cosine Inner Product with Live Reactive Values */}
              <div className="math-card">
                <div className="math-card-label">EQUATION 01 // HILBERT INNER PRODUCT</div>
                <div className="math-render-area">
                  <LatexFormula
                    math="\mathcal{S}_{\cos}(\mathbf{q}, \mathbf{d}_j) = \frac{\sum_{k=1}^{D} \omega_k (q_k \cdot d_{j,k})}{\sqrt{\sum_{k=1}^D \omega_k q_k^2} \cdot \sqrt{\sum_{k=1}^D \omega_k d_{j,k}^2}} \in [0, 1]"
                    display={true}
                  />
                </div>
                <div className="math-reactive-hud">
                  <span className="hud-chip">
                    Active Tokens: <strong>{activeTokens}</strong>
                  </span>
                  <span className="hud-chip">
                    Norm <LatexFormula math="\|\mathbf{q}\|_2" display={false} />: <strong>{activeQueryNorm}</strong>
                  </span>
                  <span className="hud-chip">
                    Peak Resonance: <strong>{(topResonanceScore * 100).toFixed(1)}%</strong>
                  </span>
                </div>
                <p className="math-desc">
                  Normalized Cosine Similarity metric on the unit hyper-sphere <LatexFormula math="S^{D-1}" display={false} />. Invariant to text length scaling, capturing pure semantic orientation across 10,000 orthogonal dimensions.
                </p>
              </div>

              {/* Formula 2: Logarithmic Surprisal (TF-IDF) */}
              <div className="math-card">
                <div className="math-card-label">EQUATION 02 // LOGARITHMIC SURPRISAL (TF-IDF)</div>
                <div className="math-render-area">
                  <LatexFormula
                    math="\text{TF-IDF}(t, d, \mathcal{D}) = \frac{f_{t,d}}{\sum_{t'} f_{t',d}} \times \left[ \ln\left( \frac{1 + |\mathcal{D}|}{1 + |\{d' \in \mathcal{D} : t \in d'\}|} \right) + 1 \right]"
                    display={true}
                  />
                </div>
                <div className="math-reactive-hud">
                  <span className="hud-chip">Vocabulary: <strong>D = 10,000</strong></span>
                  <span className="hud-chip">Archive Size: <strong>|D| = 4,803</strong></span>
                  <span className="hud-chip">Sparsity: <strong>99.41%</strong></span>
                </div>
                <p className="math-desc">
                  Information-theoretic entropy scaling down-weighting high-entropy boilerplate tokens while magnifying rare cinematic signatures (e.g. <em>&quot;replicant&quot;, &quot;black hole&quot;, &quot;subconscious&quot;</em>).
                </p>
              </div>

              {/* Formula 3: Quantum Dirac Transition Projection */}
              <div className="math-card">
                <div className="math-card-label">EQUATION 03 // QUANTUM DIRAC TRANSITION PROJECTION</div>
                <div className="math-render-area">
                  <LatexFormula
                    math="\langle \Psi_{\text{query}} \mid \hat{\mathcal{P}}_{\text{subconscious}} \mid \Psi_{\text{celluloid}} \rangle = \int_{\Omega} \psi_q^*(\omega) \hat{\mathcal{K}}(\omega, \omega') \psi_c(\omega') \, d\omega d\omega'"
                    display={true}
                  />
                </div>
                <div className="math-reactive-hud">
                  <span className="hud-chip">
                    Kernel: <LatexFormula math="\hat{\mathcal{K}}(\omega, \omega')" display={false} />
                  </span>
                  <span className="hud-chip">
                    State Space: <LatexFormula math="\Omega \subset \mathbb{C}^{10000}" display={false} />
                  </span>
                </div>
                <p className="math-desc">
                  Dirac notation representation of spectral resonance between the user&apos;s linguistic impulse and the 4,803-node cinematic latent manifold.
                </p>
              </div>

              {/* Formula 4: Manifold Geodesic Metric Tensor */}
              <div className="math-card">
                <div className="math-card-label">EQUATION 04 // MANIFOLD GEODESIC CURVATURE</div>
                <div className="math-render-area">
                  <LatexFormula
                    math="d_{\mathcal{M}}(\mathbf{u}, \mathbf{v}) = \arccos\left( \frac{\mathbf{u}^T \mathbf{G} \mathbf{v}}{\|\mathbf{u}\|_{\mathbf{G}} \|\mathbf{v}\|_{\mathbf{G}}} \right), \quad g_{ik} = \delta_{ik} \cdot \text{IDF}_k^2"
                    display={true}
                  />
                </div>
                <div className="math-reactive-hud">
                  <span className="hud-chip">
                    Metric Tensor: <LatexFormula math="g_{ik} = \delta_{ik} \text{IDF}_k^2" display={false} />
                  </span>
                  <span className="hud-chip">Geometry: <strong>Riemannian</strong></span>
                </div>
                <p className="math-desc">
                  Riemannian metric tensor <LatexFormula math="g_{ik}" display={false} /> defining intrinsic curvature across the sparse semantic manifold, preventing dimensional collapse in high-sparsity text regimes.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ==============================================================
            FLOATING SURREALIST SEARCH CONSOLE WITH BORDER BEAM
           ============================================================== */}
        <div className="surreal-console">
          <BorderBeam size={200} duration={7} colorFrom="#a855f7" colorTo="#38bdf8" />

          <div className="mode-capsule">
            <button
              type="button"
              className={`capsule-btn ${mode === "title" ? "active" : ""}`}
              onClick={() => {
                setMode("title");
                setQuery("");
              }}
            >
              <span className="icon">🎬</span>
              <span>Exact Title Resonator</span>
            </button>
            <button
              type="button"
              className={`capsule-btn ${mode === "vibe" ? "active" : ""}`}
              onClick={() => {
                setMode("vibe");
                setQuery("");
              }}
            >
              <span className="icon">🔮</span>
              <span>Subconscious Vibe / Fever Dream</span>
            </button>
          </div>

          <form onSubmit={handleSearch} className="surreal-form">
            <div className="input-capsule">
              <BorderBeam size={130} duration={5} colorFrom="#38bdf8" colorTo="#a855f7" />
              <span className="lens-icon">⚲</span>
              <input
                type="text"
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                placeholder={
                  mode === "title"
                    ? "Enter an anchor film (e.g., Interstellar, Blade Runner 2049, Fight Club, Her)..."
                    : "Describe a surreal plot or fever dream (e.g., astronaut trapped in infinite mirror dimension)..."
                }
              />
              {query && (
                <button type="button" className="clear-btn" onClick={() => setQuery("")}>
                  ✕
                </button>
              )}
            </div>

            {/* ==============================================================
                THINKING ORBS BUTTON (Replacing the generic button)
                Bioluminescent Quantum Core Swirl + Dynamic Thinking State
               ============================================================== */}
            <button
              type="submit"
              disabled={loading}
              className={`thinking-orbs-trigger ${loading ? "is-thinking" : ""}`}
              title="Ignite 10,000-dimensional semantic resonance"
            >
              <BorderBeam size={90} duration={loading ? 2 : 4.5} colorFrom="#c084fc" colorTo="#38bdf8" />

              <div className="orbs-chamber">
                <div className="orbs-cluster">
                  <span className="plasma-orb orb-1" />
                  <span className="plasma-orb orb-2" />
                  <span className="plasma-orb orb-3" />
                  <span className="plasma-orb orb-4" />
                </div>
                <div className="orbs-glass-lens" />
                {loading && <div className="orbs-shockwave" />}
              </div>

              <div className="orbs-caption-deck">
                <span className="orbs-caption-title">
                  {loading ? "Synthesizing Tensors..." : "Ignite Resonance"}
                </span>
                <span className="orbs-caption-meta">
                  {loading ? "EIGEN-CONVERGENCE" : "10,000-D HILBERT QUERY"}
                </span>
              </div>

              <div className="orbs-glyph-tag">
                {loading ? (
                  <span className="quantum-spinner" />
                ) : (
                  <span className="spark-glyph">✦</span>
                )}
              </div>
            </button>
          </form>
        </div>

        {/* FEED HEADER */}
        <div className="feed-header">
          <div className="feed-title-block">
            <div className="feed-glyph">✦</div>
            <div>
              <h2 className="feed-headline">{headline}</h2>
              <p className="feed-meta">Top-ranked nearest neighbors in normalized TF-IDF cosine coordinate space</p>
            </div>
          </div>

          <button className="reset-capsule" onClick={fetchPopularMovies}>
            <span>↺</span> Reset to Popular Archive
          </button>
        </div>

        {/* SURREALIST ALABASTER MOVIE CARDS */}
        <div className="surreal-grid">
          {movies.map((movie: Movie, idx: number) => (
            <div
              key={movie.id}
              className="surreal-card"
              onClick={() => setSelectedMovie(movie)}
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <BorderBeam size={110} duration={6} colorFrom="#a855f7" colorTo="#38bdf8" />
              <div className="card-prismatic-border" />

              <div className="poster-portal">
                {movie.poster_url ? (
                  <img
                    src={movie.poster_url}
                    alt={movie.title}
                    className="portal-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="portal-fallback">
                    <span className="fallback-glyph">🎞️</span>
                    <span className="fallback-title">{movie.title}</span>
                  </div>
                )}

                <div className="portal-top-bar">
                  <span className="rating-pill">
                    <span className="star">★</span> {movie.rating.toFixed(1)}
                  </span>

                  {movie.match_percentage !== null ? (
                    <span className="resonance-badge">
                      <span className="synapse-dot" />
                      {movie.match_percentage}% Resonance
                    </span>
                  ) : (
                    <span className="popular-badge">Top Seed</span>
                  )}
                </div>

                <div className="portal-glare" />
              </div>

              <div className="card-essence">
                <div className="card-math-chip">
                  <LatexFormula
                    math={`\\rho = ${(movie.match_percentage ? movie.match_percentage / 100 : 0.88).toFixed(3)}`}
                    display={false}
                  />
                  <span className="math-chip-divider">•</span>
                  <LatexFormula
                    math={`\\theta \\approx ${(Math.acos(Math.min(0.99, movie.match_percentage ? movie.match_percentage / 100 : 0.88)) * 57.2958).toFixed(1)}^\\circ`}
                    display={false}
                  />
                </div>

                <h3 className="card-title">{movie.title}</h3>

                <div className="genre-cloud">
                  {movie.genres.map((g: string, i: number) => (
                    <span key={i} className="ethereal-tag">
                      {g}
                    </span>
                  ))}
                </div>

                <p className="card-synopsis">{movie.overview}</p>

                <div className="card-footer">
                  <span className="vector-id">ID: #{movie.id}</span>
                  <span className="inspect-link">Examine Coordinates →</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MODAL LIGHTBOX FOR SELECTED FILM */}
        {selectedMovie && (
          <div className="lightbox-overlay" onClick={() => setSelectedMovie(null)}>
            <div className="lightbox-card" onClick={(e) => e.stopPropagation()}>
              <BorderBeam size={180} duration={7} colorFrom="#a855f7" colorTo="#0284c7" />

              <button className="lightbox-close" onClick={() => setSelectedMovie(null)}>
                ✕
              </button>

              <div className="lightbox-body">
                {selectedMovie.poster_url && (
                  <img
                    src={selectedMovie.poster_url}
                    alt={selectedMovie.title}
                    className="lightbox-poster"
                  />
                )}
                <div className="lightbox-info">
                  <div className="lightbox-tag">EIGEN-INSPECTION</div>
                  <h2>{selectedMovie.title}</h2>
                  <div className="lightbox-stats">
                    <span>⭐ {selectedMovie.rating.toFixed(1)} TMDB Score</span>
                    {selectedMovie.match_percentage && (
                      <span className="lightbox-match">
                        {selectedMovie.match_percentage}% Cosine Affinity
                      </span>
                    )}
                  </div>

                  <div className="lightbox-math-formula">
                    <LatexFormula
                      math={`\\langle \\mathbf{q}, \\mathbf{d}_{${selectedMovie.id}} \\rangle = ${(selectedMovie.match_percentage ? selectedMovie.match_percentage / 100 : 0.88).toFixed(4)} \\implies \\theta = ${(Math.acos(Math.min(0.99, selectedMovie.match_percentage ? selectedMovie.match_percentage / 100 : 0.88)) * 57.2958).toFixed(2)}^\\circ`}
                      display={true}
                    />
                  </div>

                  <div className="genre-cloud">
                    {selectedMovie.genres.map((g, i) => (
                      <span key={i} className="ethereal-tag">{g}</span>
                    ))}
                  </div>
                  <p>{selectedMovie.overview}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MovieRecommender;
