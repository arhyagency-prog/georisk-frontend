import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";

const API_URL = "https://georisk-production.up.railway.app";
const API_KEY = "demo-key-123";

const COUNTRIES = [
  { name: "Ukraine", iso: "UKR" }, { name: "Russia", iso: "RUS" },
  { name: "Israel", iso: "ISR" }, { name: "Iran", iso: "IRN" },
  { name: "Taiwan", iso: "TWN" }, { name: "North Korea", iso: "PRK" },
  { name: "Sudan", iso: "SDN" }, { name: "Ethiopia", iso: "ETH" },
  { name: "Myanmar", iso: "MMR" }, { name: "Venezuela", iso: "VEN" },
  { name: "Pakistan", iso: "PAK" }, { name: "Haiti", iso: "HTI" },
  { name: "Afghanistan", iso: "AFG" }, { name: "Syria", iso: "SYR" },
  { name: "Iraq", iso: "IRQ" }, { name: "Libya", iso: "LBY" },
  { name: "Yemen", iso: "YEM" }, { name: "Somalia", iso: "SOM" },
  { name: "Mali", iso: "MLI" }, { name: "Niger", iso: "NER" },
  { name: "China", iso: "CHN" }, { name: "United States", iso: "USA" },
  { name: "France", iso: "FRA" }, { name: "Germany", iso: "DEU" },
  { name: "Brazil", iso: "BRA" }, { name: "India", iso: "IND" },
  { name: "Turkey", iso: "TUR" }, { name: "Saudi Arabia", iso: "SAU" },
  { name: "Egypt", iso: "EGY" }, { name: "Mexico", iso: "MEX" },
];

const ID_TO_NAME = {
  804: "Ukraine", 643: "Russia", 376: "Israel", 364: "Iran",
  158: "Taiwan", 408: "North Korea", 729: "Sudan", 231: "Ethiopia",
  104: "Myanmar", 862: "Venezuela", 586: "Pakistan", 332: "Haiti",
  4: "Afghanistan", 760: "Syria", 368: "Iraq", 434: "Libya",
  887: "Yemen", 706: "Somalia", 466: "Mali", 562: "Niger",
  156: "China", 840: "United States", 250: "France", 276: "Germany",
  76: "Brazil", 356: "India", 792: "Turkey", 682: "Saudi Arabia",
  818: "Egypt", 484: "Mexico",
};

const DIM_LABELS = {
  armed_conflict: "Conflit armé",
  political_instability: "Instabilité politique",
  economic_collapse: "Risque économique",
  sanctions_exposure: "Sanctions",
  terrorism: "Terrorisme",
  cyber_threat: "Menace cyber",
};

function riskColor(score) {
  if (score === undefined || score === null) return "#162032";
  if (score >= 80) return "#dc2626";
  if (score >= 60) return "#ea580c";
  if (score >= 40) return "#ca8a04";
  if (score >= 20) return "#65a30d";
  return "#16a34a";
}

function riskLabel(score) {
  if (score >= 80) return "CRITIQUE";
  if (score >= 60) return "ÉLEVÉ";
  if (score >= 40) return "MODÉRÉ-HAUT";
  if (score >= 20) return "MODÉRÉ";
  return "FAIBLE";
}

// ─── World Map ────────────────────────────────────────────────────────────────
function WorldMap({ scores, onCountryClick, selected }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [worldData, setWorldData] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => r.json())
      .then(setWorldData);
  }, []);

  useEffect(() => {
    if (!worldData || !svgRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    svg.attr("width", width).attr("height", height);

    const projection = d3.geoNaturalEarth1()
      .scale(width / 6.3)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);
    const countries = topojson.feature(worldData, worldData.objects.countries);

    svg.append("rect").attr("width", width).attr("height", height).attr("fill", "#060d1a");

    const g = svg.append("g");

    g.append("path")
      .datum(d3.geoGraticule()())
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#ffffff05")
      .attr("stroke-width", 0.5);

    g.selectAll(".country")
      .data(countries.features)
      .join("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("fill", d => riskColor(scores[ID_TO_NAME[+d.id]]))
      .attr("stroke", d => selected === ID_TO_NAME[+d.id] ? "#fff" : "#0d1e35")
      .attr("stroke-width", d => selected === ID_TO_NAME[+d.id] ? 2 : 0.4)
      .attr("opacity", d => ID_TO_NAME[+d.id] ? 1 : 0.5)
      .style("cursor", d => ID_TO_NAME[+d.id] ? "pointer" : "default")
      .on("mouseover", function (event, d) {
        const name = ID_TO_NAME[+d.id];
        if (!name) return;
        d3.select(this).attr("opacity", 0.75);
        const rect = containerRef.current.getBoundingClientRect();
        setTooltip({ name, score: scores[name], x: event.clientX - rect.left, y: event.clientY - rect.top });
      })
      .on("mousemove", function (event) {
        const rect = containerRef.current.getBoundingClientRect();
        setTooltip(t => t ? { ...t, x: event.clientX - rect.left, y: event.clientY - rect.top } : null);
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("opacity", ID_TO_NAME[+d.id] ? 1 : 0.5);
        setTooltip(null);
      })
      .on("click", (_, d) => {
        const name = ID_TO_NAME[+d.id];
        if (name) onCountryClick(name);
      });

    g.append("path")
      .datum(topojson.mesh(worldData, worldData.objects.countries, (a, b) => a !== b))
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#0d1e35")
      .attr("stroke-width", 0.3);

  }, [worldData, scores, selected]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg ref={svgRef} style={{ display: "block" }} />
      {tooltip && (
        <div style={{
          position: "absolute", left: tooltip.x + 14, top: tooltip.y - 14,
          background: "#0d1830ee", border: `1px solid ${riskColor(tooltip.score)}`,
          borderRadius: 8, padding: "8px 12px", pointerEvents: "none",
          backdropFilter: "blur(10px)", zIndex: 50,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>{tooltip.name}</div>
          <div style={{ fontSize: 11, color: tooltip.score !== undefined ? riskColor(tooltip.score) : "#475569", marginTop: 2 }}>
            {tooltip.score !== undefined ? `${riskLabel(tooltip.score)} · ${tooltip.score}/100` : "Cliquer pour analyser"}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r = 58, stroke = 10;
  const circ = 2 * Math.PI * r;
  const color = riskColor(score);
  return (
    <div style={{ position: "relative", width: 144, height: 144, margin: "0 auto" }}>
      <svg width="144" height="144" style={{ transform: "rotate(-90deg)", filter: `drop-shadow(0 0 12px ${color}55)` }}>
        <circle cx="72" cy="72" r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1), stroke 0.5s" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 34, fontWeight: 900, color, lineHeight: 1, fontFamily: "'Syne', sans-serif" }}>{score}</div>
        <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.15em", marginTop: 3 }}>/ 100</div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [scores, setScores] = useState({});
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");

  const analyze = useCallback(async (country) => {
    setSelected(country);
    setLoading(true);
    setError(null);
    setData(null);
    setDropdownOpen(false);
    setSearch("");
    try {
      const res = await fetch(`${API_URL}/risk/${encodeURIComponent(country)}`, {
        headers: { "x-api-key": API_KEY }
      });
      if (!res.ok) throw new Error("API error");
      const result = await res.json();
      setData(result);
      setScores(s => ({ ...s, [country]: result.overall_score }));
    } catch {
      setError("Connexion à l'API échouée. Vérifie que ton service Railway est actif.");
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const color = data ? riskColor(data.overall_score) : "#3b82f6";
  const trend = !data ? null
    : data.trend === "DETERIORATING" ? { icon: "↘", c: "#ef4444", label: "Dégradation" }
    : data.trend === "IMPROVING" ? { icon: "↗", c: "#22c55e", label: "Amélioration" }
    : { icon: "→", c: "#94a3b8", label: "Stable" };

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: "#060d1a", color: "#f1f5f9",
      fontFamily: "'DM Sans', sans-serif", overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 99px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 56, flexShrink: 0,
        background: "#07101f", borderBottom: "1px solid #0f1e35",
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em" }}>
            GEO<span style={{ color: "#3b82f6" }}>PULSE</span>
          </span>
          <span style={{
            padding: "2px 8px", borderRadius: 4,
            background: "#0f2d1a", border: "1px solid #166534",
            fontSize: 10, color: "#22c55e", fontWeight: 600, letterSpacing: "0.08em",
          }}>● LIVE</span>
        </div>

        {/* Dropdown */}
        <div style={{ position: "relative", zIndex: 200 }}>
          <button onClick={() => setDropdownOpen(o => !o)} style={{
            display: "flex", alignItems: "center", gap: 10,
            background: dropdownOpen ? "#1e3a5f" : "#0d1830",
            border: `1px solid ${dropdownOpen ? "#3b82f6" : "#1e3a5f"}`,
            borderRadius: 10, padding: "9px 16px",
            color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500,
            minWidth: 230, justifyContent: "space-between", transition: "all 0.2s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🌍</span>
              <span style={{ color: selected ? "#fff" : "#475569" }}>
                {selected || "Sélectionner un pays"}
              </span>
            </div>
            <span style={{
              color: "#3b82f6", fontSize: 9,
              transform: dropdownOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}>▼</span>
          </button>

          {dropdownOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              width: 280, maxHeight: 400,
              background: "#07101f", border: "1px solid #1e3a5f",
              borderRadius: 12, overflow: "hidden",
              boxShadow: "0 24px 60px #000c",
              animation: "fadeUp 0.15s ease",
            }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid #0f1e35" }}>
                <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="🔍  Rechercher..."
                  style={{
                    width: "100%", background: "#060d1a",
                    border: "1px solid #1e293b", borderRadius: 8,
                    color: "#fff", padding: "8px 12px", fontSize: 12,
                    outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>
              <div style={{ overflowY: "auto", maxHeight: 340 }}>
                {filtered.map(c => {
                  const s = scores[c.name];
                  const isActive = selected === c.name;
                  return (
                    <button key={c.name} onClick={() => analyze(c.name)} style={{
                      width: "100%", textAlign: "left",
                      background: isActive ? "#1e3a5f22" : "transparent",
                      border: "none", borderBottom: "1px solid #0a1420",
                      padding: "10px 16px", cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: "background 0.1s",
                    }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#0d1830"; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 13, color: isActive ? "#fff" : "#94a3b8", fontWeight: isActive ? 600 : 400 }}>{c.name}</span>
                      {s !== undefined && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: riskColor(s), boxShadow: `0 0 8px ${riskColor(s)}` }} />
                          <span style={{ fontSize: 12, color: riskColor(s), fontWeight: 700 }}>{s}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ fontSize: 11, color: "#1e3a5f" }}>
          {Object.keys(scores).length > 0 && `${Object.keys(scores).length} pays analysés`}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 370px", overflow: "hidden" }}>

        {/* Map */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          <WorldMap scores={scores} onCountryClick={analyze} selected={selected} />

          {/* Legend */}
          <div style={{
            position: "absolute", bottom: 20, left: 20,
            background: "#07101fdd", border: "1px solid #1e293b",
            borderRadius: 10, padding: "12px 16px", backdropFilter: "blur(10px)",
          }}>
            <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.12em", marginBottom: 8 }}>NIVEAU DE RISQUE</div>
            {[
              { label: "Critique", color: "#dc2626", range: "80–100" },
              { label: "Élevé", color: "#ea580c", range: "60–79" },
              { label: "Modéré-haut", color: "#ca8a04", range: "40–59" },
              { label: "Modéré", color: "#65a30d", range: "20–39" },
              { label: "Faible", color: "#16a34a", range: "0–19" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color }} />
                <span style={{ fontSize: 11, color: "#64748b" }}>{l.label}</span>
                <span style={{ fontSize: 10, color: "#1e3a5f", marginLeft: "auto", paddingLeft: 12 }}>{l.range}</span>
              </div>
            ))}
          </div>

          {!selected && (
            <div style={{
              position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
              background: "#07101fcc", border: "1px solid #1e3a5f",
              borderRadius: 10, padding: "10px 18px", backdropFilter: "blur(8px)",
              fontSize: 12, color: "#3b82f6", pointerEvents: "none", whiteSpace: "nowrap",
            }}>
              👆 Clique sur un pays ou utilise le menu déroulant
            </div>
          )}
        </div>

        {/* Side panel */}
        <div style={{
          borderLeft: "1px solid #0f1e35", background: "#07101f",
          overflowY: "auto", display: "flex", flexDirection: "column",
        }}>

          {!selected && !loading && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 14, padding: 32, textAlign: "center",
            }}>
              <div style={{ fontSize: 56 }}>🌐</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: "#1e3a5f" }}>
                Intelligence Géopolitique
              </div>
              <div style={{ fontSize: 12, color: "#0f2040", lineHeight: 1.8, maxWidth: 260 }}>
                Sélectionne un pays pour obtenir une analyse IA complète : score de risque, dimensions, déclencheurs et perspectives.
              </div>
              <div style={{
                marginTop: 8, padding: "12px 18px",
                background: "#0a1628", border: "1px solid #1e293b", borderRadius: 10,
                fontSize: 11, color: "#1e3a5f", lineHeight: 2, textAlign: "left",
              }}>
                <span style={{ color: "#3b82f6" }}>GET</span> /risk/Ukraine<br />
                <span style={{ color: "#3b82f6" }}>POST</span> /risk/batch<br />
                <span style={{ color: "#3b82f6" }}>GET</span> /risk/global/trending
              </div>
            </div>
          )}

          {loading && (
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
                <div style={{
                  width: 16, height: 16, border: "2px solid #3b82f6",
                  borderTopColor: "transparent", borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                <span style={{ color: "#3b82f6", fontSize: 13 }}>Analyse de {selected}...</span>
              </div>
              {[150, "80%", "60%", "100%", "70%", "90%", "50%"].map((w, i) => (
                <div key={i} style={{
                  height: i === 0 ? 150 : 11, width: w, marginBottom: 14,
                  borderRadius: i === 0 ? "50%" : 6,
                  background: "linear-gradient(90deg,#1e293b 25%,#263447 50%,#1e293b 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                  ...(i === 0 ? { margin: "0 auto 24px" } : {}),
                }} />
              ))}
            </div>
          )}

          {error && !loading && (
            <div style={{ padding: 24 }}>
              <div style={{
                background: "#1f0a0a", border: "1px solid #7f1d1d",
                borderRadius: 10, padding: 14, color: "#fca5a5", fontSize: 13, lineHeight: 1.6,
              }}>⚠ {error}</div>
            </div>
          )}

          {data && !loading && (
            <div style={{ padding: 20, animation: "fadeUp 0.4s ease" }}>

              {/* Title */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, color: "#1e3a5f", letterSpacing: "0.18em", marginBottom: 6 }}>ANALYSE EN TEMPS RÉEL</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>
                  {data.country}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "4px 12px", borderRadius: 7,
                    background: `${color}15`, border: `1px solid ${color}40`,
                    fontSize: 11, fontWeight: 700, color, letterSpacing: "0.06em",
                  }}>{data.risk_level}</span>
                  {trend && (
                    <span style={{
                      padding: "4px 12px", borderRadius: 7,
                      background: "#0a1628", border: "1px solid #1e293b",
                      fontSize: 11, color: trend.c, fontWeight: 600,
                    }}>{trend.icon} {trend.label}</span>
                  )}
                  <span style={{
                    padding: "4px 12px", borderRadius: 7,
                    background: "#0a1628", border: "1px solid #1e293b",
                    fontSize: 11, color: "#475569",
                  }}>IA {data.confidence}%</span>
                </div>
              </div>

              {/* Score */}
              <div style={{
                background: "#0a1628", border: `1px solid ${color}25`,
                borderRadius: 14, padding: "20px 16px", marginBottom: 14,
                boxShadow: `inset 0 0 50px ${color}06`,
              }}>
                <ScoreRing score={data.overall_score} />
                <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "#334155" }}>
                  Score composite de risque géopolitique
                </div>
              </div>

              {/* Dimensions */}
              <div style={{ background: "#0a1628", border: "1px solid #0f1e35", borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.12em", marginBottom: 14 }}>DIMENSIONS DE RISQUE</div>
                {Object.entries(data.dimensions || {}).map(([k, v]) => {
                  const c = riskColor(v);
                  return (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{DIM_LABELS[k] || k}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{v}</span>
                      </div>
                      <div style={{ background: "#1e293b", height: 5, borderRadius: 99 }}>
                        <div style={{
                          width: `${v}%`, height: "100%",
                          background: `linear-gradient(90deg,${c}77,${c})`,
                          borderRadius: 99, transition: "width 1.3s cubic-bezier(.4,0,.2,1)",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Triggers */}
              <div style={{ background: "#0a1628", border: "1px solid #0f1e35", borderRadius: 14, padding: 16, marginBottom: 14 }}>
                <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.12em", marginBottom: 12 }}>FACTEURS DÉCLENCHEURS</div>
                {data.key_triggers?.map((t, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    padding: "8px 0",
                    borderBottom: i < data.key_triggers.length - 1 ? "1px solid #0a1420" : "none",
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      background: `${color}15`, color, fontSize: 10, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{i + 1}</div>
                    <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.65 }}>{t}</span>
                  </div>
                ))}
              </div>

              {/* Outlook */}
              <div style={{ background: "#0a1628", border: "1px solid #0f1e35", borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.12em", marginBottom: 8 }}>PERSPECTIVES 30 JOURS</div>
                <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.75, marginBottom: 14 }}>{data.outlook_30_days}</p>
                <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.12em", marginBottom: 8 }}>IMPACT INVESTISSEMENT</div>
                <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.75 }}>{data.investment_impact}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
