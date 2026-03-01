import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeRights } from "../api";
import { AnalysisResponse, ActionStep, Statute } from "../types";
import AgentPipeline from "../components/AgentPipeline";
import LawGraph from "../components/LawGraph";

/* ── Constants ─────────────────────────────────────────────────────────────── */

const LOADING_MESSAGES = [
  "Parsing your situation...",
  "Searching municipal codes...",
  "Verifying citations...",
  "Writing your letter...",
];

const CITIES: { name: string; emoji: string; count: string }[] = [
  { name: "New York City", emoji: "🗽", count: "12,400 ordinances" },
  { name: "Chicago", emoji: "🌃", count: "9,800 ordinances" },
  { name: "Los Angeles", emoji: "🌴", count: "11,200 ordinances" },
  { name: "General", emoji: "🌐", count: "Federal codes" },
];

const EXAMPLES: string[] = [
  "My landlord hasn't fixed the heat in my apartment for 3 weeks. It's winter and the temperature is dropping below 60°F.",
  "I received an eviction notice but I paid all my rent. My landlord says I have 5 days to leave.",
  "Police stopped me on the street and searched my bag without asking permission or giving a reason.",
];

const TABS = ["Your Rights", "The Laws", "Next Steps", "Demand Letter"];

/* ── Spinner SVG ────────────────────────────────────────────────────────────── */

const Spinner: React.FC = () => (
  <motion.svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="none"
    animate={{ rotate: 360 }}
    transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    style={{ flexShrink: 0 }}
  >
    <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
    <path d="M8 2 A6 6 0 0 1 14 8" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </motion.svg>
);

/* ── RightsTabContent ────────────────────────────────────────────────────────── */

interface RightsTabProps { results: AnalysisResponse }

const RightsTabContent: React.FC<RightsTabProps> = ({ results }) => {
  const rawText = results.legal_analysis ?? "";
  const paragraphs = rawText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  return (
    <div>
      {paragraphs.map((para, i) => {
        if (i === 0) {
          const sentenceMatch = para.match(/^[^.!?]+[.!?]/);
          const firstSentence = sentenceMatch ? sentenceMatch[0] : para.split(" ").slice(0, 8).join(" ");
          const rest = sentenceMatch ? para.slice(firstSentence.length) : para.split(" ").slice(8).join(" ");
          return (
            <p key={i} style={{ fontSize: 15, lineHeight: 1.8, color: "#374151", marginBottom: 16 }}>
              <strong style={{ fontWeight: 600, color: "#0F172A" }}>{firstSentence}</strong>
              {rest ? " " + rest.trimStart() : ""}
            </p>
          );
        }
        return (
          <p key={i} style={{ fontSize: 15, lineHeight: 1.8, color: "#374151", marginBottom: 16 }}>
            {para}
          </p>
        );
      })}

      {results.plain_english_summary && (
        <div
          style={{
            marginTop: 24,
            background: "#F0F7FF",
            borderLeft: "3px solid #1A56DB",
            borderRadius: "0 10px 10px 0",
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#1A56DB",
              marginBottom: 8,
            }}
          >
            PLAIN ENGLISH
          </div>
          <div style={{ fontSize: 14, color: "#1E40AF", lineHeight: 1.65 }}>
            {results.plain_english_summary}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── LawsTabContent ─────────────────────────────────────────────────────────── */

interface LawsTabProps { results: AnalysisResponse }

const LawsTabContent: React.FC<LawsTabProps> = ({ results }) => {
  const [view, setView] = useState<"list" | "graph">("list");
  const statutes: Statute[] = results.research?.relevant_statutes ?? [];
  const statuteScores: Record<string, number> = results.grounding_results?.statute_scores ?? {};
  const confidence = results.grounding_results?.overall_confidence ?? results.confidence_score ?? 0.8;
  const confidenceColor = confidence >= 0.8 ? "#10B981" : confidence >= 0.6 ? "#F59E0B" : "#EF4444";

  if (statutes.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "#9CA3AF", paddingTop: 24, paddingBottom: 24, fontSize: 14 }}>
        No specific statutes retrieved.
      </div>
    );
  }

  return (
    <div>
      {/* View toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          marginBottom: 20,
          background: "#F1F5F9",
          borderRadius: 8,
          padding: 3,
          width: "fit-content",
        }}
      >
        {(["list", "graph"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              border: "none",
              fontSize: 13,
              fontWeight: view === v ? 600 : 400,
              background: view === v ? "white" : "transparent",
              color: view === v ? "#0F172A" : "#6B7280",
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 150ms",
            }}
          >
            {v === "list" ? "List view" : "Graph view"}
          </button>
        ))}
      </div>

      {view === "list" && (
        <>
          {statutes.map((statute, i) => {
            const key = `${statute.name} ${statute.section}`.trim();
            const score: number | null = statuteScores[key] ?? null;
            const isVerified = score === null || score >= 0.7;
            const isLast = i === statutes.length - 1;

            return (
              <div
                key={i}
                style={{ borderBottom: isLast ? "none" : "1px solid #F1F5F9", paddingTop: 18, paddingBottom: 18 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: "#0F172A" }}>{statute.name}</span>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "3px 8px",
                      borderRadius: 4,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                      backgroundColor: isVerified ? "#ECFDF5" : "#FFFBEB",
                      color: isVerified ? "#059669" : "#D97706",
                    }}
                  >
                    {isVerified ? "✓ Verified" : "⚠ Low confidence"}
                  </span>
                </div>

                {statute.section && (
                  <div style={{ fontSize: 13, color: "#1A56DB", fontWeight: 500, marginTop: 3 }}>
                    {statute.section}
                  </div>
                )}

                {statute.excerpt && (
                  <div
                    style={{
                      fontStyle: "italic",
                      fontSize: 13,
                      color: "#6B7280",
                      lineHeight: 1.5,
                      marginTop: 4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    } as React.CSSProperties}
                  >
                    {statute.excerpt}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  {score !== null ? (
                    <span style={{ fontSize: 12, color: "#9CA3AF" }}>Match: {score.toFixed(2)}</span>
                  ) : (
                    <span />
                  )}
                  {statute.source_url && (
                    <a
                      href={statute.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 12, color: "#1A56DB", fontWeight: 500, textDecoration: "none" }}
                      onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                      onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                    >
                      View source →
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {/* Bottom confidence summary */}
          {statutes.length > 0 && (
            <div
              style={{
                borderTop: "1px solid #F1F5F9",
                marginTop: 4,
                paddingTop: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <span style={{ color: "#374151", fontWeight: 500 }}>Overall legal grounding</span>
              <span style={{ fontWeight: 700, color: confidenceColor }}>{Math.round(confidence * 100)}%</span>
            </div>
          )}
        </>
      )}

      {view === "graph" && <LawGraph results={results} />}
    </div>
  );
};

/* ── StepsTabContent ────────────────────────────────────────────────────────── */

interface StepsTabProps { results: AnalysisResponse }

const StepsTabContent: React.FC<StepsTabProps> = ({ results }) => {
  const actions: ActionStep[] = results.recommended_actions ?? [];
  const wolframStats = results.wolfram_stats;

  const hasRent = wolframStats?.median_rent && wolframStats.median_rent !== "N/A";
  const hasIncome = wolframStats?.median_income && wolframStats.median_income !== "N/A";
  const hasPop = wolframStats?.population && wolframStats.population !== "N/A";
  const hasWolframData = hasRent || hasIncome || hasPop;

  return (
    <div>
      {/* Escalation card */}
      {results.should_escalate && results.legal_aid_orgs && results.legal_aid_orgs.length > 0 && (
        <div
          style={{
            background: "#FFFBEB",
            border: "1.5px solid #FDE68A",
            borderRadius: 10,
            padding: "16px 20px",
            marginBottom: 20,
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 14, color: "#92400E" }}>
            👤 Professional help recommended
          </div>
          {results.escalation_reason && (
            <div style={{ fontSize: 13, color: "#78350F", marginTop: 4 }}>
              {results.escalation_reason}
            </div>
          )}
          <div style={{ marginTop: 14 }}>
            {results.legal_aid_orgs.map((org, i) => {
              const isLast = i === results.legal_aid_orgs.length - 1;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: isLast ? "none" : "1px solid #FEF3C7",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: "#92400E" }}>{org.name}</span>
                      {org.free && (
                        <span
                          style={{
                            fontSize: 11,
                            background: "#ECFDF5",
                            color: "#059669",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontWeight: 600,
                          }}
                        >
                          Free
                        </span>
                      )}
                    </div>
                    {org.phone && (
                      <a
                        href={`tel:${org.phone}`}
                        style={{ fontSize: 12, color: "#1A56DB", textDecoration: "none", marginTop: 2, display: "block" }}
                      >
                        {org.phone}
                      </a>
                    )}
                  </div>
                  <a
                    href={org.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: "#1A56DB", textDecoration: "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
                  >
                    Website →
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action steps */}
      {actions.map((action, i) => {
        const isLast = i === actions.length - 1;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 14,
              padding: "16px 0",
              borderBottom: isLast && !hasWolframData ? "none" : "1px solid #F1F5F9",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                background: "#EFF6FF",
                borderRadius: "50%",
                color: "#1A56DB",
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#0F172A" }}>{action.step}</div>
              <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.55, marginTop: 3 }}>
                {action.explanation}
              </div>
              {action.timeline && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 8,
                    background: "#F1F5F9",
                    borderRadius: 5,
                    padding: "3px 10px",
                    fontSize: 12,
                    color: "#374151",
                    fontWeight: 500,
                  }}
                >
                  {action.timeline}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Wolfram city stats */}
      {hasWolframData && (
        <div style={{ marginTop: 20, background: "#F8FAFC", borderRadius: 10, padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>📊 City Data</span>
            <span style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 400 }}>(via Wolfram Alpha)</span>
          </div>
          <div
            style={{
              display: "flex",
              border: "1.5px solid #EAEAEA",
              borderRadius: 8,
              overflow: "hidden",
              background: "white",
            }}
          >
            {hasRent && (
              <div
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRight: hasIncome || hasPop ? "1px solid #EAEAEA" : "none",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>{wolframStats!.median_rent}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>Median Rent</div>
              </div>
            )}
            {hasIncome && (
              <div
                style={{
                  flex: 1,
                  padding: "12px 14px",
                  borderRight: hasPop ? "1px solid #EAEAEA" : "none",
                }}
              >
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>{wolframStats!.median_income}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>Median Income</div>
              </div>
            )}
            {hasPop && (
              <div style={{ flex: 1, padding: "12px 14px" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>{wolframStats!.population}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>Population</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── LetterTabContent ───────────────────────────────────────────────────────── */

interface LetterTabProps { letter: string }

const LetterTabContent: React.FC<LetterTabProps> = ({ letter }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!letter) return;
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: do nothing
    }
  }, [letter]);

  const handleDownload = useCallback(() => {
    if (!letter) return;
    const blob = new Blob([letter], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "demand-letter.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [letter]);

  if (!letter) {
    return (
      <div style={{ textAlign: "center", color: "#9CA3AF", paddingTop: 24, paddingBottom: 24, fontSize: 14 }}>
        No demand letter generated.
      </div>
    );
  }

  const parts = letter.split(/(\[[A-Z ]+\])/);

  return (
    <div>
      <style>{`
        .letter-scroll::-webkit-scrollbar { width: 4px; }
        .letter-scroll::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 4px; }
        .letter-scroll::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#0F172A" }}>Demand Letter</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleCopy}
            style={{
              background: copied ? "#ECFDF5" : "white",
              border: `1.5px solid ${copied ? "#A7F3D0" : "#EAEAEA"}`,
              borderRadius: 7,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: copied ? "#059669" : "#374151",
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 150ms",
            }}
            onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.backgroundColor = "#FAFAFA"; } }}
            onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.borderColor = "#EAEAEA"; e.currentTarget.style.backgroundColor = "white"; } }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            style={{
              background: "white",
              border: "1.5px solid #EAEAEA",
              borderRadius: 7,
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 500,
              color: "#374151",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.backgroundColor = "#FAFAFA"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#EAEAEA"; e.currentTarget.style.backgroundColor = "white"; }}
          >
            ⬇ Download
          </button>
        </div>
      </div>

      <div
        className="letter-scroll"
        style={{
          background: "white",
          border: "1.5px solid #EAEAEA",
          borderRadius: 10,
          padding: "28px 32px",
          fontFamily: "'Courier New', monospace",
          fontSize: 13,
          lineHeight: 1.85,
          color: "#374151",
          maxHeight: 500,
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {parts.map((part, i) =>
          /^\[[A-Z ]+\]$/.test(part) ? (
            <span
              key={i}
              style={{
                background: "#FEF9C3",
                color: "#92400E",
                padding: "1px 4px",
                borderRadius: 3,
                fontWeight: 600,
              }}
            >
              {part}
            </span>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "flex-start", gap: 6 }}>
        <span style={{ color: "#9CA3AF", fontSize: 13, lineHeight: 1 }}>ⓘ</span>
        <span style={{ fontSize: 12, color: "#9CA3AF" }}>Fill in highlighted placeholders before sending.</span>
      </div>
    </div>
  );
};

/* ── ResultsPanel ───────────────────────────────────────────────────────────── */

interface ResultsPanelProps {
  results: AnalysisResponse;
  activeTab: number;
  setActiveTab: (tab: number) => void;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({ results, activeTab, setActiveTab }) => {
  const isNotApplicable = results.severity === "not_applicable";

  const confidence =
    results.grounding_results?.overall_confidence ?? results.confidence_score ?? 0.8;

  const severityDotColor: Record<string, string> = {
    high: "#EF4444", medium: "#F59E0B", low: "#10B981", not_applicable: "#9CA3AF",
  };
  const severityTextColor: Record<string, string> = {
    high: "#DC2626", medium: "#D97706", low: "#059669", not_applicable: "#9CA3AF",
  };
  const severityLabel: Record<string, string> = {
    high: "High Concern", medium: "Moderate", low: "Informational", not_applicable: "Not Applicable",
  };

  const confidenceBarColor =
    confidence >= 0.8 ? "#10B981" : confidence >= 0.6 ? "#F59E0B" : "#EF4444";
  const confidenceTextColor =
    confidence >= 0.8 ? "#059669" : confidence >= 0.6 ? "#D97706" : "#DC2626";

  const issueType = results.intake?.issue_type ?? "";
  const issueTypeLabel = issueType.charAt(0).toUpperCase() + issueType.slice(1).replace(/_/g, " ");

  const availableTabs = isNotApplicable ? [TABS[0]] : TABS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {isNotApplicable ? (
        <div>
          <div
            style={{
              background: "#F0FDF4",
              border: "1.5px solid #BBF7D0",
              borderRadius: 14,
              padding: 28,
              textAlign: "center",
            }}
          >
            <svg width={28} height={28} viewBox="0 0 28 28" fill="none" style={{ margin: "0 auto" }}>
              <circle cx="14" cy="14" r="14" fill="#059669" />
              <path d="M8 14.5l4 4 8-9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div style={{ fontWeight: 700, color: "#166534", marginTop: 14, fontSize: 16 }}>
              No legal issue detected yet
            </div>
            <div style={{ fontSize: 14, color: "#166534", marginTop: 8, lineHeight: 1.65 }}>
              {results.plain_english_summary}
            </div>
          </div>
          <div
            style={{
              marginTop: 14,
              background: "#FFFBEB",
              border: "1px solid #FDE68A",
              borderRadius: 10,
              padding: "12px 16px",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 12, color: "#92400E" }}>When to come back:</div>
            <div style={{ fontSize: 13, color: "#78350F", marginTop: 4, lineHeight: 1.5 }}>
              If the situation persists or worsens, come back and describe what changed.
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Header card — severity + grounding in one block */}
          <div
            style={{
              background: "white",
              border: "1.5px solid #EAEAEA",
              borderRadius: 14,
              padding: "18px 22px",
              marginBottom: 16,
            }}
          >
            {/* Row 1: severity + metadata */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: severityDotColor[results.severity] ?? "#9CA3AF",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontWeight: 600, fontSize: 15, color: severityTextColor[results.severity] ?? "#9CA3AF" }}>
                  {severityLabel[results.severity] ?? results.severity}
                </span>
                {issueTypeLabel && (
                  <>
                    <span style={{ color: "#E5E7EB" }}>—</span>
                    <span style={{ color: "#6B7280", fontSize: 14, fontWeight: 400 }}>{issueTypeLabel}</span>
                  </>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#9CA3AF", fontSize: 13 }}>
                  ⚡ {results.agents_used} agents
                </span>
                <span style={{ color: "#E5E7EB" }}>·</span>
                <span style={{ color: "#9CA3AF", fontSize: 13 }}>
                  {results.processing_time_seconds}s
                </span>
                {results.detected_language && results.detected_language !== "English" && (
                  <span
                    style={{
                      background: "#EFF6FF",
                      color: "#1A56DB",
                      fontSize: 12,
                      fontWeight: 600,
                      borderRadius: 6,
                      padding: "3px 10px",
                      marginLeft: 4,
                    }}
                  >
                    🌐 {results.detected_language}
                  </span>
                )}
              </div>
            </div>

            {/* Row 2: grounding bar */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Legal Grounding</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: confidenceTextColor }}>
                  {Math.round(confidence * 100)}%
                </span>
              </div>
              <div style={{ marginTop: 6, height: 5, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(confidence * 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ height: "100%", backgroundColor: confidenceBarColor, borderRadius: 3 }}
                />
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div
            style={{
              background: "white",
              border: "1.5px solid #EAEAEA",
              borderRadius: 10,
              padding: 4,
              display: "flex",
              gap: 3,
              marginBottom: 16,
            }}
          >
            {availableTabs.map((tab, i) => {
              const isActive = activeTab === i;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  style={{
                    flex: 1,
                    padding: "9px 8px",
                    textAlign: "center",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    borderRadius: 7,
                    cursor: "pointer",
                    border: "none",
                    transition: "all 150ms",
                    backgroundColor: isActive ? "#1A56DB" : "transparent",
                    color: isActive ? "white" : "#6B7280",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "#F8FAFC";
                      e.currentTarget.style.color = "#374151";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#6B7280";
                    }
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div
            style={{
              background: "white",
              border: "1.5px solid #EAEAEA",
              borderRadius: 14,
              padding: 28,
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 0 && <RightsTabContent results={results} />}
                {activeTab === 1 && <LawsTabContent results={results} />}
                {activeTab === 2 && <StepsTabContent results={results} />}
                {activeTab === 3 && <LetterTabContent letter={results.demand_letter} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
};

/* ── AnalyzePage ────────────────────────────────────────────────────────────── */

const AnalyzePage: React.FC = () => {
  const [city, setCity] = useState("New York City");
  const [problem, setProblem] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showExamples, setShowExamples] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingMessage((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!city || !problem.trim()) return;
      setIsLoading(true);
      setError(null);
      setResults(null);
      setLoadingMessage(0);
      setActiveTab(0);
      try {
        const data = await analyzeRights({ city, problem });
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    },
    [city, problem]
  );

  const isDisabled = isLoading || !problem.trim();

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: "hidden",
      }}
    >
      <style>{`
        .analyze-textarea::placeholder { color: #C4CEDD; }
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div
        style={{
          width: 440,
          flexShrink: 0,
          background: "white",
          borderRight: "1.5px solid #EAEAEA",
          padding: "40px 36px",
          height: "100vh",
          overflowY: "auto",
          boxSizing: "border-box",
          position: "sticky",
          top: 0,
        }}
      >
        {/* Back link */}
        <Link
          to="/"
          style={{
            display: "block",
            fontSize: 13,
            color: "#9CA3AF",
            textDecoration: "none",
            marginBottom: 32,
            transition: "color 150ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
        >
          ← Home
        </Link>

        {/* Title */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: "#0F172A",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            margin: 0,
          }}
        >
          Check Your Rights
        </h1>

        {/* Subtext dots */}
        <div style={{ display: "flex", gap: 16, marginTop: 8, alignItems: "center" }}>
          {["Free", "Private", "60 seconds"].map((item, i) => (
            <React.Fragment key={item}>
              {i > 0 && <span style={{ color: "#E5E7EB", fontSize: 13 }}>·</span>}
              <span style={{ fontSize: 13, color: "#9CA3AF", fontWeight: 500 }}>{item}</span>
            </React.Fragment>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid #F1F5F9", margin: "28px 0" }} />

        {/* City section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Your city</span>
          <span style={{ fontSize: 13, color: "#9CA3AF" }}>{city}</span>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}
        >
          {CITIES.map((c) => {
            const isSelected = city === c.name;
            return (
              <button
                key={c.name}
                onClick={() => setCity(c.name)}
                style={{
                  border: `1.5px solid ${isSelected ? "#1A56DB" : "#EAEAEA"}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  textAlign: "left",
                  background: isSelected ? "#F0F7FF" : "white",
                  cursor: "pointer",
                  transition: "all 150ms",
                  fontFamily: "inherit",
                  boxShadow: isSelected ? "0 0 0 3px rgba(26,86,219,0.08)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "#CBD5E1";
                    e.currentTarget.style.backgroundColor = "#FAFAFA";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "#EAEAEA";
                    e.currentTarget.style.backgroundColor = "white";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{c.emoji}</span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: isSelected ? "#1A56DB" : "#0F172A",
                      marginLeft: 8,
                    }}
                  >
                    {c.name}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2, fontWeight: 400 }}>
                  {c.count}
                </div>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid #F1F5F9", margin: "24px 0" }} />

        {/* Situation section */}
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>What's happening?</div>
        <div style={{ fontSize: 13, color: "#9CA3AF", lineHeight: 1.5, marginTop: 4, marginBottom: 10 }}>
          Be specific — what happened, for how long, and what you've already tried.
        </div>

        <textarea
          className="analyze-textarea"
          value={problem}
          onChange={(e) => setProblem(e.target.value.slice(0, 5000))}
          placeholder="Describe what's happening..."
          style={{
            width: "100%",
            minHeight: 160,
            padding: "14px 16px",
            border: "1.5px solid #E2E8F0",
            borderRadius: 10,
            fontSize: 15,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            lineHeight: 1.65,
            color: "#0F172A",
            background: "#FAFAFA",
            resize: "none",
            boxSizing: "border-box",
            outline: "none",
            transition: "border 150ms, box-shadow 150ms, background 150ms",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "#1A56DB";
            e.currentTarget.style.background = "white";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(26,86,219,0.08)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#E2E8F0";
            e.currentTarget.style.background = "#FAFAFA";
            e.currentTarget.style.boxShadow = "none";
          }}
        />

        {/* Char count row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <span style={{ fontSize: 12, color: "#C4CEDD" }}>{problem.length} / 5000</span>
          <span style={{ fontSize: 12, color: "#C4CEDD" }}>⌘↵ to submit</span>
        </div>

        {/* Examples toggle */}
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setShowExamples((prev) => !prev)}
            style={{
              fontSize: 13,
              color: "#9CA3AF",
              cursor: "pointer",
              border: "none",
              background: "none",
              padding: 0,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "color 150ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
          >
            Try an example
            <motion.span
              animate={{ rotate: showExamples ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: "inline-block", fontSize: 12 }}
            >
              →
            </motion.span>
          </button>

          <AnimatePresence>
            {showExamples && (
              <motion.div
                key="examples"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    background: "#F8FAFC",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginTop: 8,
                  }}
                >
                  {EXAMPLES.map((ex, i) => {
                    const isLast = i === EXAMPLES.length - 1;
                    return (
                      <div
                        key={i}
                        onClick={() => { setProblem(ex); setShowExamples(false); }}
                        style={{
                          padding: "10px 14px",
                          borderBottom: isLast ? "none" : "1px solid #F1F5F9",
                          fontSize: 13,
                          color: "#374151",
                          cursor: "pointer",
                          lineHeight: 1.4,
                          transition: "background 150ms, color 150ms",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#EFF6FF";
                          e.currentTarget.style.color = "#1A56DB";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#374151";
                        }}
                      >
                        {ex}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid #F1F5F9", margin: "24px 0" }} />

        {/* Submit button */}
        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            disabled={isDisabled}
            style={{
              width: "100%",
              height: 52,
              background: isDisabled ? "#93B4F0" : "#1A56DB",
              color: "white",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              border: "none",
              cursor: isDisabled ? "not-allowed" : "pointer",
              boxShadow: isDisabled ? "none" : "0 4px 14px rgba(26,86,219,0.25)",
              fontFamily: "inherit",
              transition: "all 150ms",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.backgroundColor = "#1547BF";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(26,86,219,0.35)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.backgroundColor = "#1A56DB";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(26,86,219,0.25)";
              }
            }}
          >
            {isLoading ? (
              <>
                <Spinner />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={loadingMessage}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {LOADING_MESSAGES[loadingMessage]}
                  </motion.span>
                </AnimatePresence>
              </>
            ) : (
              "Analyze My Rights →"
            )}
          </button>
        </form>

        {/* Disclaimer */}
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: "#C4CEDD", lineHeight: 1.5 }}>
          <div>Legal information only — not legal advice.</div>
          <div>For emergencies, call 311 or 911.</div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div
        style={{
          flex: 1,
          background: "#F7F9FC",
          overflowY: "auto",
          padding: "40px 44px",
          boxSizing: "border-box",
        }}
      >
        {/* Error state */}
        {error && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1.5px solid #FECACA",
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 24,
              fontSize: 14,
              color: "#991B1B",
            }}
          >
            {error}
          </div>
        )}

        {/* Empty state */}
        {!results && !isLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: "white",
                border: "1.5px solid #EAEAEA",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <span style={{ fontSize: 28, color: "#CBD5E1", lineHeight: 1 }}>⚖</span>
            </div>
            <h3 style={{ color: "#374151", fontWeight: 600, fontSize: 18, margin: 0 }}>
              Your analysis will appear here
            </h3>
            <p style={{ color: "#9CA3AF", fontSize: 14, marginTop: 8, marginBottom: 0, maxWidth: 280 }}>
              Select a city and describe your situation to get started.
            </p>
            <div
              style={{
                marginTop: 32,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              {["Semantic retrieval", "Citation verified", "Demand letter"].map((chip) => (
                <span
                  key={chip}
                  style={{
                    background: "white",
                    border: "1.5px solid #EAEAEA",
                    borderRadius: 100,
                    padding: "6px 14px",
                    fontSize: 12,
                    color: "#6B7280",
                    fontWeight: 500,
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && !results && (
          <div style={{ height: "100%", position: "relative" }}>
            <AgentPipeline isLoading={isLoading} />
          </div>
        )}

        {/* Results */}
        {results && (
          <ResultsPanel results={results} activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
      </div>
    </div>
  );
};

export default AnalyzePage;
