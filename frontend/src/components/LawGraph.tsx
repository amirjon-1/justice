import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { AnalysisResponse } from "../types";

/* ── Constants ────────────────────────────────────────────────────────────── */

const HEIGHT = 440;
const LAW_RADIUS    = 160;
const ACTION_RADIUS = 140;

/* ── Types ────────────────────────────────────────────────────────────────── */

interface LawGraphProps { results: AnalysisResponse }

interface TooltipData {
  x: number; y: number;
  type: "issue" | "law" | "action";
  issueType?: string;
  urgency?: string;
  lawName?: string;
  section?: string;
  excerpt?: string;
  score?: number | null;
  stepText?: string;
  explanation?: string;
  timeline?: string;
}

/* ── Pure helpers ─────────────────────────────────────────────────────────── */

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "";
}

function edgeLabelLaw(score: number | null): string {
  if (score === null)  return "applies";
  if (score > 0.85)   return "directly applies";
  if (score > 0.70)   return "applies";
  return "may apply";
}

function edgeLabelAction(step: string): string {
  const t = step.toLowerCase();
  if (t.includes("file") || t.includes("complaint"))  return "triggers";
  if (t.includes("notice") || t.includes("send"))     return "required by";
  if (t.includes("withhold") || t.includes("repair")) return "permitted by";
  return "based on";
}

function lawLines(name: string, section: string): [string, string] {
  const n = name.length > 22 ? name.slice(0, 22) : name;
  const s = section.length > 20 ? section.slice(0, 20) : section;
  return [n, s];
}

function nodeColor(type: string, score: number | null): string {
  if (type === "issue")  return "#1A56DB";
  if (type === "action") return "#7C3AED";
  return score === null || score >= 0.7 ? "#059669" : "#D97706";
}

/* ── LawGraph ─────────────────────────────────────────────────────────────── */

const LawGraph: React.FC<LawGraphProps> = ({ results }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const statutes = results.research?.relevant_statutes ?? [];
  const actions  = (results.recommended_actions ?? []).slice(0, 4);
  const scores: Record<string, number> = results.grounding_results?.statute_scores ?? {};

  useEffect(() => {
    if (!svgRef.current) return;

    const width = svgRef.current.clientWidth || 700;
    const cx = width / 2;
    const cy = HEIGHT / 2;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    /* ── Build node data with radial pre-positions ── */

    const issueNode: any = {
      id: "issue", type: "issue", r: 36,
      x: cx, y: cy, fx: cx, fy: cy,
      issueType: results.intake?.issue_type ?? "legal issue",
      urgency: (results.intake as any)?.urgency ?? "",
    };

    const lawNodes: any[] = statutes.map((s, i) => {
      const n = statutes.length;
      const start = -140, end = -40;
      const deg = n === 1 ? -90 : start + ((end - start) / (n - 1)) * i;
      const rad = deg * (Math.PI / 180);
      const score = scores[`${s.name ?? ""} ${s.section ?? ""}`.trim()] ?? null;
      return {
        id: `law-${i}`, type: "law", r: 24,
        x: cx + LAW_RADIUS * Math.cos(rad),
        y: cy + LAW_RADIUS * Math.sin(rad),
        lawName: s.name ?? "",
        section: s.section ?? "",
        excerpt: s.excerpt ?? "",
        score,
      };
    });

    const actionNodes: any[] = actions.map((a, i) => {
      const n = actions.length;
      const start = 40, end = 140;
      const deg = n === 1 ? 90 : start + ((end - start) / (n - 1)) * i;
      const rad = deg * (Math.PI / 180);
      return {
        id: `action-${i}`, type: "action", r: 18,
        x: cx + ACTION_RADIUS * Math.cos(rad),
        y: cy + ACTION_RADIUS * Math.sin(rad),
        stepText: a.step ?? "",
        explanation: a.explanation ?? "",
        timeline: a.timeline ?? "",
        score: null,
        lawRef: lawNodes[i % Math.max(lawNodes.length, 1)]?.id ?? "issue",
      };
    });

    const allNodes = [issueNode, ...lawNodes, ...actionNodes];

    /* ── Build edges ── */

    const lawEdges = lawNodes.map(l => ({
      source: "issue", target: l.id,
      edgeType: "law", score: l.score,
      label: edgeLabelLaw(l.score),
    }));
    const actionEdges = actionNodes.map(a => ({
      source: a.lawRef, target: a.id,
      edgeType: "action", score: null,
      label: edgeLabelAction(a.stepText),
    }));
    const allEdges = [...lawEdges, ...actionEdges];

    /* ── Simulate — collision only, 100 ticks ── */

    const sim = d3
      .forceSimulation(allNodes)
      .force("link", d3.forceLink(allEdges).id((d: any) => d.id).distance(0).strength(0))
      .force("collide", d3.forceCollide().radius((d: any) => d.r + 6).strength(0.5))
      .stop();

    for (let t = 0; t < 100; t++) sim.tick();

    /* ── Draw edges ── */

    const edgeG = svg.append("g");

    allEdges.forEach((e: any) => {
      const isLaw        = e.edgeType === "law";
      const isUnverified = isLaw && e.score !== null && e.score < 0.7;
      const stroke       = isLaw ? (isUnverified ? "#D97706" : "#059669") : "#7C3AED";
      const opacity      = isLaw ? (isUnverified ? 0.4 : 0.6) : 0.5;

      edgeG.append("line")
        .attr("x1", e.source.x).attr("y1", e.source.y)
        .attr("x2", e.target.x).attr("y2", e.target.y)
        .attr("stroke", stroke)
        .attr("stroke-width", 1.5)
        .attr("opacity", opacity)
        .attr("stroke-dasharray", isUnverified ? "4" : "none");

      // Edge label with background rect
      const mx  = (e.source.x + e.target.x) / 2;
      const my  = (e.source.y + e.target.y) / 2;
      const tw  = e.label.length * 6 + 8;

      edgeG.append("rect")
        .attr("x", mx - tw / 2).attr("y", my - 8)
        .attr("width", tw).attr("height", 13)
        .attr("rx", 3).attr("fill", "#0F172A");

      edgeG.append("text")
        .attr("x", mx).attr("y", my + 2)
        .attr("text-anchor", "middle")
        .attr("font-size", 10)
        .attr("fill", "#94A3B8")
        .text(e.label);
    });

    /* ── Draw nodes ── */

    const nodeG = svg.append("g");

    allNodes.forEach((d: any, i: number) => {
      const color = nodeColor(d.type, d.score ?? null);

      const g = nodeG.append("g")
        .attr("transform", `translate(${d.x},${d.y})`)
        .style("cursor", "pointer")
        .attr("opacity", 0);

      // Circle
      g.append("circle")
        .attr("r", d.r)
        .attr("fill", color)
        .attr("stroke", d.type === "issue" ? "white" : "rgba(255,255,255,0.3)")
        .attr("stroke-width", d.type === "issue" ? 2 : 1.5);

      // Score inside law circles
      if (d.type === "law" && d.score !== null) {
        g.append("text")
          .attr("text-anchor", "middle").attr("dy", "0.35em")
          .attr("font-size", 10).attr("font-weight", 700)
          .attr("fill", "white").attr("pointer-events", "none")
          .text(`${Math.round(d.score * 100)}%`);
      }

      // Labels below each node
      const tg = g.append("text")
        .attr("text-anchor", "middle")
        .attr("fill", "white")
        .attr("pointer-events", "none");

      if (d.type === "issue") {
        tg.append("tspan")
          .attr("x", 0).attr("dy", d.r + 16)
          .attr("font-size", 12).attr("font-weight", 700)
          .text(cap(d.issueType));
      } else if (d.type === "law") {
        const [line1, line2] = lawLines(d.lawName, d.section);
        tg.append("tspan")
          .attr("x", 0).attr("dy", d.r + 15)
          .attr("font-size", 11).attr("font-weight", 600)
          .text(line1);
        if (line2) {
          tg.append("tspan")
            .attr("x", 0).attr("dy", 14)
            .attr("font-size", 11).attr("font-weight", 600)
            .text(line2);
        }
      } else if (d.type === "action") {
        const words = (d.stepText || "Action").split(/\s+/);
        const ln1 = words.slice(0, 2).join(" ");
        const ln2 = words.slice(2, 4).join(" ");
        tg.append("tspan")
          .attr("x", 0).attr("dy", d.r + 14)
          .attr("font-size", 10).attr("font-weight", 600)
          .text(ln1);
        if (ln2) {
          tg.append("tspan")
            .attr("x", 0).attr("dy", 13)
            .attr("font-size", 10).attr("font-weight", 600)
            .text(ln2);
        }
      }

      // Hover: scale circle + show tooltip
      g.on("mouseover", (event: any) => {
        d3.select(event.currentTarget as Element)
          .select("circle")
          .transition().duration(150)
          .attr("r", d.r * 1.2);
        setTooltip({
          x: event.offsetX, y: event.offsetY,
          type: d.type,
          issueType:   d.issueType,
          urgency:     d.urgency,
          lawName:     d.lawName,
          section:     d.section,
          excerpt:     d.excerpt,
          score:       d.score ?? null,
          stepText:    d.stepText,
          explanation: d.explanation,
          timeline:    d.timeline,
        });
      })
      .on("mouseleave", (event: any) => {
        d3.select(event.currentTarget as Element)
          .select("circle")
          .transition().duration(150)
          .attr("r", d.r);
        setTooltip(null);
      });

      // Staggered entrance
      g.transition().delay(i * 60).duration(300).attr("opacity", 1);
    });

    return () => { sim.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  /* ── Render ── */

  return (
    <div style={{ position: "relative", background: "#0F172A", borderRadius: 12, overflow: "hidden", height: HEIGHT }}>
      <svg ref={svgRef} width="100%" height={HEIGHT} />

      {/* Legend */}
      <div style={{ position: "absolute", bottom: 12, left: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {([
          { color: "#1A56DB", label: "Your Issue" },
          { color: "#059669", label: "Verified Law" },
          { color: "#D97706", label: "May Apply" },
          { color: "#7C3AED", label: "Action Step" },
        ] as const).map(item => (
          <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Rich tooltip */}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x + 14,
          top: Math.max(tooltip.y - 10, 8),
          background: "white",
          border: "1px solid #EAEAEA",
          borderRadius: 8,
          padding: "10px 14px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          maxWidth: 240,
          fontSize: 13,
          pointerEvents: "none",
          zIndex: 10,
        }}>
          {tooltip.type === "issue" && (
            <>
              <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>Your Situation</div>
              <div style={{ color: "#374151" }}>Issue: {cap(tooltip.issueType ?? "")}</div>
              {tooltip.urgency && (
                <div style={{ color: "#374151", marginTop: 2 }}>Urgency: {cap(tooltip.urgency)}</div>
              )}
            </>
          )}
          {tooltip.type === "law" && (
            <>
              <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 4, lineHeight: 1.3 }}>
                {tooltip.lawName}
              </div>
              {tooltip.section && (
                <div style={{ color: "#1A56DB", fontWeight: 500, marginBottom: 4 }}>
                  {tooltip.section}
                </div>
              )}
              {tooltip.excerpt && (
                <div style={{ color: "#6B7280", fontStyle: "italic", marginBottom: 6, lineHeight: 1.4, fontSize: 12 }}>
                  &ldquo;{tooltip.excerpt.slice(0, 100)}{tooltip.excerpt.length > 100 ? "…" : ""}&rdquo;
                </div>
              )}
              {tooltip.score != null && (
                <div style={{ color: "#059669", fontWeight: 600 }}>
                  Match score: {tooltip.score.toFixed(2)}
                </div>
              )}
            </>
          )}
          {tooltip.type === "action" && (
            <>
              <div style={{ fontWeight: 700, color: "#0F172A", marginBottom: 4, lineHeight: 1.3 }}>
                {tooltip.stepText}
              </div>
              {tooltip.explanation && (
                <div style={{ color: "#6B7280", lineHeight: 1.4, marginBottom: 6, fontSize: 12 }}>
                  {tooltip.explanation}
                </div>
              )}
              {tooltip.timeline && (
                <span style={{
                  display: "inline-block", background: "#F1F5F9",
                  borderRadius: 5, padding: "2px 8px",
                  fontSize: 12, color: "#374151", fontWeight: 500,
                }}>
                  {tooltip.timeline}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LawGraph;
