import { useState, useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

// ─── Your Railway API URL ─────────────────────────────────────────────────────
const API_URL = "https://georisk-production.up.railway.app";
const API_KEY = "demo-key-123";

// ─── Countries data with ISO codes ───────────────────────────────────────────
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

function riskColor(score) {
  if (score === undefined || score === null) return "#1e293b";
  if (score >= 80) return "#dc2626";
  if (score >= 60) return "#ea580c";
  if (score >= 40) return "#ca8a04";
  if (score >= 20) return "#65a30d";
  return "#16a34a";
}

function riskLabel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "ELEVATED";
  if (score >= 20) return "MODERATE";
  return "LOW";
}

function riskGlow(score) {
  if (score >= 80) return "0 0 20px #dc262688";
  if (score >= 60) return "0 0 16px #ea580c66";
  if (score >= 40) return "0 0 12px #ca8a0444";
  return "none";
}

// ─── World Map Component ──────────────────────────────────────────────────────
function WorldMap({ scores, onCountryClick, selected }) {
  const svgRef = useRef(null);
  const [worldData, setWorldData] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
      .then(r => r.json())
      .then(data => setWorldData(data));
  }, []);

  useEffect(() => {
    if (!worldData || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 400;

    const projection = d3.geoNaturalEarth1()
      .scale(width / 6.5)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const { feature } = require("topojson-client") || window.topojson;
    // fallback: fetch from cdn
    const countries = feature(worldData, worldData.objects.countries);

    // Name lookup by numeric id → approximate mapping
    const numericToName = {
      804: "Ukraine", 643: "Russia", 376: "Israel", 364: "Iran",
      158: "Taiwan", 408: "North Korea", 729: "Sudan", 231: "Ethiopia",
      104: "Myanmar", 862: "Venezuela", 586: "Pakistan", 332: "Haiti",
      4: "Afghanistan", 760: "Syria", 368: "Iraq", 434: "Libya",
      887: "Yemen", 706: "Somalia", 466: "Mali", 562: "Niger",
      156: "China", 840: "United States", 250: "France", 276: "Germany",
      76: "Brazil", 356: "India", 792: "Turkey", 682: "Saudi Arabia",
      818: "Egypt", 484: "Mexico",
    };

    const g = svg.append("g");

    // Ocean background
    svg.insert("rect", ":first-child")
      .attr("width", width).attr("height", height)
      .attr("fill", "#0a1628");

    // Graticule
    const graticule = d3.geoGraticule();
    g.append("path")
      .datum(graticule())
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#ffffff06")
      .attr("stroke-width", 0.5);

    // Countries
    g.selectAll(".country")
      .data(countries.features)
      .join("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("fill", d => {
        const name = numericToName[+d.id];
        const score = name ? scores[name] : undefined;
        return score !== undefined ? riskColor(score) : "#162032";
      })
      .attr("stroke", d => {
        const name = numericToName[+d.id];
        return selected === name ? "#fff" : "#0d1e35";
      })
      .attr("stroke-width", d => {
        const name = numericToName[+d.id];
        return selected === name ? 1.5 : 0.5;
      })
      .attr("opacity", d => {
        const name = numericToName[+d.id];
        if (!name) return 0.6;
        const score = scores[name];
        return score !== undefined ? 1 : 0.5;
      })
      .style("cursor", d => numericToName[+d.id] ? "pointer" : "default")
      .style("transition", "fill 0.5s ease, opacity 0.3s ease")
      .on("mouseover", function(event, d) {
        const name = numericToName[+d.id];
        if (!name) return;
        d3.select(this).attr("opacity", 0.85);
        const score = scores[name];
        setTooltip({
          name,
          score,
          x: event.offsetX,
          y: event.offsetY,
        });
      })
      .on("mousemove", function(event) {
        setTooltip(t => t ? { ...t, x: event.offsetX, y: event.offsetY } : null);
      })
      .on("mouseout", function(event, d) {
        const name = numericToName[+d.id];
        d3.select(this).attr("opacity", name && scores[name] !== undefined ? 1 : 0.5);
        setTooltip(null);
      })
      .on("click", (event, d) => {
        const name = numericToName[+d.id];
        if (name) onCountryClick(name);
      });

    // Borders
    const { mesh } = require("topojson-client") || window.topojson;
    g.append("path")
      .datum(mesh(worldData, worldData.objects.countries, (a, b) => a !== b))
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#0d1e35")
      .attr("stroke-width", 0.3);

  }, [worldData, scores, selected]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x + 12, top: tooltip.y - 10,
          background: "#0d1424ee",
          border: `1px solid ${tooltip.score !== undefined ? riskColor(tooltip.score) : "#1e293b"}`,
          borderRadius: 8, padding: "8px 12px",
          pointerEvents: "none", zIndex: 100,
          backdropFilter: "blur(8px)",
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 2 }}>{tooltip.name}</div>
          {tooltip.score !== undefined ? (
            <div style={{ fontSize: 11, color: riskColor(tooltip.score) }}>
              {riskLabel(tooltip.score)} · {tooltip.score}/100
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#475569" }}>Click to analyze</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Score Arc ────────────────────────────────────────────────────────────────
function ScoreArc({ score }) {
  const r = 60, stroke = 10;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = riskColor(score);
  return (
    <div style={{ position: "relative", width: 150, height: 150, margin: "0 auto" }}>
      <svg width="150" height="150" style={{ transform: "rotate(-90deg)", filter: `drop-shadow(${riskGlow(score)})` }}>
        <circle cx="75" cy="75" r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
        <circle cx="75" cy="75" r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1), stroke 0.5s" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"
      }}>
        <div style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1, fontFamily: "'Syne', sans-serif" }}>{score}</div>
        <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.15em", marginTop: 2 }}>RISK SCORE</div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function GeoPulse() {
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
      const result = await res.json();
      setData(result);
      setScores(s => ({ ...s, [country]: result.overall_score }));
    } catch (e) {
      // Fallback: use Claude API directly
      try {
        const prompt = `Geopolitical risk for ${country}. Return ONLY JSON:
{"country":"${country}","overall_score":<0-100>,"risk_level":"LOW|MODERATE|ELEVATED|HIGH|CRITICAL","dimensions":{"armed_conflict":<0-100>,"political_instability":<0-100>,"economic_collapse":<0-100>,"sanctions_exposure":<0-100>,"terrorism":<0-100>,"cyber_threat":<0-100>},"key_triggers":["<t1>","<t2>","<t3>"],"trend":"DETERIORATING|STABLE|IMPROVING","investment_impact":"<sentence>","outlook_30_days":"<sentence>","confidence":<0-100>}`;
        const r2 = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514", max_tokens: 800,
            messages: [{ role: "user", content: prompt }]
          })
        });
        const d2 = await r2.json();
        const text = d2.content?.find(b => b.type === "text")?.text || "{}";
        const result = JSON.parse(text.replace(/```json|```/g, "").trim());
        setData(result);
        setScores(s => ({ ...s, [country]: result.overall_score }));
      } catch {
        setError("Connexion à l'API échouée.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const color = data ? riskColor(data.overall_score) : "#3b82f6";
  const trend = data?.trend === "DETERIORATING" ? { icon: "↘", c: "#ef4444" }
    : data?.trend === "IMPROVING" ? { icon: "↗", c: "#22c55e" }
    : { icon: "→", c: "#94a3b8" };

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
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 54, flexShrink: 0,
        background: "#080f1f",
        borderBottom: "1px solid #0f1e35",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            fontFamily: "'Syne', sans-serif", fontWeight: 800,
            fontSize: 20, letterSpacing: "-0.03em",
          }}>
            GEO<span style={{ color: "#3b82f6" }}>PULSE</span>
          </div>
          <div style={{
            padding: "2px 8px", borderRadius: 4,
            background: "#0f2d1a", border: "1px solid #166534",
            fontSize: 10, color: "#22c55e", fontWeight: 600, letterSpacing: "0.08em",
          }}>● LIVE</div>
        </div>

        {/* ── Dropdown Selector ── */}
        <div style={{ position: "relative", zIndex: 200 }}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#0d1830", border: "1px solid #1e3a5f",
              borderRadius: 10, padding: "8px 16px",
              color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500,
              transition: "all 0.2s", minWidth: 220,
              justifyContent: "space-between",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#3b82f6"}
            onMouseLeave={e => e.currentTarget.style.borderColor = dropdownOpen ? "#3b82f6" : "#1e3a5f"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🌍</span>
              <span style={{ color: selected ? "#fff" : "#64748b" }}>
                {selected || "Sélectionner un pays"}
              </span>
            </div>
            <span style={{
              color: "#3b82f6", fontSize: 10,
              transform: dropdownOpen ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}>▼</span>
          </button>

          {dropdownOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", right: 0,
              width: 280, maxHeight: 380,
              background: "#0d1830", border: "1px solid #1e3a5f",
              borderRadius: 12, overflow: "hidden",
              boxShadow: "0 20px 60px #000a",
              animation: "fadeUp 0.15s ease",
            }}>
              <div style={{ padding: "10px 12px", borderBottom: "1px solid #1e293b" }}>
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un pays..."
                  style={{
                    width: "100%", background: "#060d1a",
                    border: "1px solid #1e293b", borderRadius: 7,
                    color: "#fff", padding: "7px 10px", fontSize: 12,
                    outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>
              <div style={{ overflowY: "auto", maxHeight: 320 }}>
                {filtered.map(c => {
                  const score = scores[c.name];
                  return (
                    <button key={c.name} onClick={() => analyze(c.name)}
                      style={{
                        width: "100%", textAlign: "left",
                        background: selected === c.name ? "#1e3a5f" : "transparent",
                        border: "none", borderBottom: "1px solid #0f1e35",
                        padding: "10px 14px", cursor: "pointer",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => { if (selected !== c.name) e.currentTarget.style.background = "#111d30"; }}
                      onMouseLeave={e => { if (selected !== c.name) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 500 }}>{c.name}</span>
                      {score !== undefined && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: riskColor(score),
                            boxShadow: `0 0 6px ${riskColor(score)}`,
                          }} />
                          <span style={{ fontSize: 11, color: riskColor(score), fontWeight: 700 }}>{score}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#334155" }}>
          <span>{Object.keys(scores).length} pays analysés</span>
          <span style={{ color: "#1e293b" }}>|</span>
          <span>GeoPulse Risk API v1.0</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 380px", overflow: "hidden" }}>

        {/* ── Map ── */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          <WorldMap scores={scores} onCountryClick={analyze} selected={selected} />

          {/* Legend */}
          <div style={{
            position: "absolute", bottom: 20, left: 20,
            background: "#080f1fcc", border: "1px solid #1e293b",
            borderRadius: 10, padding: "12px 16px",
            backdropFilter: "blur(8px)",
          }}>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.1em", marginBottom: 8 }}>
              NIVEAU DE RISQUE
            </div>
            {[
              { label: "Critique", color: "#dc2626", range: "80-100" },
              { label: "Élevé", color: "#ea580c", range: "60-79" },
              { label: "Modéré-haut", color: "#ca8a04", range: "40-59" },
              { label: "Modéré", color: "#65a30d", range: "20-39" },
              { label: "Faible", color: "#16a34a", range: "0-19" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{l.label}</span>
                <span style={{ fontSize: 10, color: "#334155", marginLeft: "auto" }}>{l.range}</span>
              </div>
            ))}
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #1e293b" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: "#162032", border: "1px solid #1e293b", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: "#334155" }}>Non analysé</span>
              </div>
            </div>
          </div>

          {/* Hint */}
          {!selected && (
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none", textAlign: "center",
            }}>
              <div style={{
                background: "#080f1fcc", border: "1px solid #1e3a5f",
                borderRadius: 12, padding: "14px 20px",
                backdropFilter: "blur(8px)",
              }}>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  👆 Clique sur un pays ou utilise le menu
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Side Panel ── */}
        <div style={{
          borderLeft: "1px solid #0f1e35",
          background: "#080f1f",
          overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}>

          {/* No selection */}
          {!selected && !loading && (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 12, padding: 24, color: "#1e3a5f", textAlign: "center",
            }}>
              <div style={{ fontSize: 48 }}>🌐</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#1e3a5f", fontFamily: "'Syne', sans-serif" }}>
                Intelligence géopolitique
              </div>
              <div style={{ fontSize: 12, color: "#0f2040", lineHeight: 1.7, maxWidth: 260 }}>
                Sélectionne un pays sur la carte ou dans le menu pour obtenir une analyse IA complète en temps réel.
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{
                  width: 16, height: 16, border: "2px solid #3b82f6",
                  borderTopColor: "transparent", borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
                <span style={{ color: "#3b82f6", fontSize: 13 }}>Analyse de {selected}...</span>
              </div>
              {[140, "100%", "100%", "80%", "60%", "90%", "70%"].map((w, i) => (
                <div key={i} style={{
                  height: i === 0 ? 140 : 12, width: w, marginBottom: 12,
                  borderRadius: i === 0 ? "50%" : 6,
                  background: "linear-gradient(90deg, #1e293b 25%, #263447 50%, #1e293b 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                  ...(i === 0 ? { margin: "0 auto 20px" } : {}),
                }} />
              ))}
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ padding: 24 }}>
              <div style={{
                background: "#1f0a0a", border: "1px solid #7f1d1d",
                borderRadius: 10, padding: 14, color: "#fca5a5", fontSize: 13,
              }}>⚠ {error}</div>
            </div>
          )}

          {/* Results */}
          {data && !loading && (
            <div style={{ padding: 20, animation: "fadeUp 0.4s ease" }}>

              {/* Country header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.15em", marginBottom: 6 }}>
                  ANALYSE EN TEMPS RÉEL
                </div>
                <div style={{
                  fontFamily: "'Syne', sans-serif", fontSize: 26,
                  fontWeight: 800, letterSpacing: "-0.02em", color: "#fff",
                  marginBottom: 10,
                }}>{data.country}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 6,
                    background: `${color}18`, border: `1px solid ${color}44`,
                    fontSize: 11, fontWeight: 700, color, letterSpacing: "0.05em",
                  }}>{data.risk_level}</span>
                  <span style={{
                    padding: "3px 10px", borderRadius: 6,
                    background: "#0f1e35", border: "1px solid #1e3a5f",
                    fontSize: 11, color: trend.c, fontWeight: 600,
                  }}>{trend.icon} {data.trend}</span>
                </div>
              </div>

              {/* Score ring */}
              <div style={{
                background: "#0a1628", border: `1px solid ${color}33`,
                borderRadius: 14, padding: 20, marginBottom: 16,
                boxShadow: `inset 0 0 40px ${color}08`,
              }}>
                <ScoreArc score={data.overall_score} />
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <div style={{ fontSize: 11, color: "#475569" }}>
                    Confiance IA : <span style={{ color: "#64748b", fontWeight: 700 }}>{data.confidence}%</span>
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div style={{
                background: "#0a1628", border: "1px solid #0f1e35",
                borderRadius: 14, padding: 16, marginBottom: 16,
              }}>
                <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", marginBottom: 14 }}>
                  DIMENSIONS DE RISQUE
                </div>
                {Object.entries(data.dimensions || {}).map(([k, v]) => {
                  const c = riskColor(v);
                  const labels = {
                    armed_conflict: "Conflit armé",
                    political_instability: "Instabilité pol.",
                    economic_collapse: "Risque éco.",
                    sanctions_exposure: "Sanctions",
                    terrorism: "Terrorisme",
                    cyber_threat: "Menace cyber",
                  };
                  return (
                    <div key={k} style={{ marginBottom: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: "#64748b" }}>{labels[k] || k}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{v}</span>
                      </div>
                      <div style={{ background: "#1e293b", height: 5, borderRadius: 99 }}>
                        <div style={{
                          width: `${v}%`, height: "100%",
                          background: `linear-gradient(90deg, ${c}88, ${c})`,
                          borderRadius: 99, transition: "width 1.2s cubic-bezier(.4,0,.2,1)",
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Triggers */}
              <div style={{
                background: "#0a1628", border: "1px solid #0f1e35",
                borderRadius: 14, padding: 16, marginBottom: 16,
              }}>
                <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", marginBottom: 12 }}>
                  FACTEURS DÉCLENCHEURS
                </div>
                {data.key_triggers?.map((t, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    padding: "8px 0",
                    borderBottom: i < data.key_triggers.length - 1 ? "1px solid #0f1e35" : "none",
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      background: `${color}18`, color, fontSize: 10, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{i + 1}</div>
                    <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>{t}</span>
                  </div>
                ))}
              </div>

              {/* Outlook */}
              <div style={{
                background: "#0a1628", border: "1px solid #0f1e35",
                borderRadius: 14, padding: 16,
              }}>
                <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", marginBottom: 10 }}>
                  PERSPECTIVES 30 JOURS
                </div>
                <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, marginBottom: 12 }}>
                  {data.outlook_30_days}
                </p>
                <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", marginBottom: 8 }}>
                  IMPACT INVESTISSEMENT
                </div>
                <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.7 }}>
                  {data.investment_impact}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
