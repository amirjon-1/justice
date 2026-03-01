import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface AgentPipelineProps {
  isLoading: boolean;
}

type AgentState = "waiting" | "active" | "complete";

/* ── Agent config ───────────────────────────────────────────────────────────── */

const AGENTS = [
  { emoji: "🔍", name: "Intake Agent",    status: "Parsing your situation...",   completeAt: 1500 },
  { emoji: "📚", name: "Research Agent",  status: "Searching municipal codes...", completeAt: 3500 },
  { emoji: "⚖️", name: "Analysis Agent",  status: "Analyzing your rights...",    completeAt: 5500 },
  { emoji: "✉️", name: "Letter Agent",    status: "Writing demand letter...",     completeAt: Infinity },
];

/* ── DotsText ───────────────────────────────────────────────────────────────── */

const DotsText: React.FC<{ text: string }> = ({ text }) => {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const i = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 400);
    return () => clearInterval(i);
  }, []);
  return <>{text.replace(/\.\.\.$/, "")}{dots}</>;
};

/* ── Box style per state ────────────────────────────────────────────────────── */

function boxStyle(state: AgentState): React.CSSProperties {
  if (state === "waiting") {
    return {
      opacity: 0.35,
      border: "1.5px solid #2D3748",
      boxShadow: "none",
    };
  }
  if (state === "active") {
    return {
      opacity: 1,
      border: "1.5px solid #1A56DB",
      boxShadow: "0 0 20px rgba(26,86,219,0.4)",
    };
  }
  // complete
  return {
    opacity: 1,
    border: "1.5px solid #10B981",
    boxShadow: "0 0 16px rgba(16,185,129,0.3)",
  };
}

/* ── AgentBox ───────────────────────────────────────────────────────────────── */

interface AgentBoxProps {
  agent: typeof AGENTS[number];
  state: AgentState;
}

const AgentBox: React.FC<AgentBoxProps> = ({ agent, state }) => {
  const { border, boxShadow, opacity } = boxStyle(state);
  return (
    <div
      style={{
        width: 160,
        minHeight: 80,
        background: "#0F172A",
        borderRadius: 12,
        padding: "14px 16px",
        border,
        boxShadow,
        opacity,
        transition: "all 400ms ease",
        boxSizing: "border-box",
        flexShrink: 0,
        zIndex: 1,
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{agent.emoji}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "white" }}>{agent.name}</div>
      <div style={{ fontSize: 11, color: state === "complete" ? "#10B981" : "#9CA3AF", marginTop: 3 }}>
        {state === "complete"
          ? "Complete ✓"
          : state === "active"
          ? <DotsText text={agent.status} />
          : agent.status}
      </div>
    </div>
  );
};

/* ── Connector ──────────────────────────────────────────────────────────────── */

interface ConnectorProps {
  isActive: boolean;
  index: number;
}

const Connector: React.FC<ConnectorProps> = ({ isActive }) => (
  <div
    style={{
      position: "relative",
      width: 60,
      height: 2,
      background: "#2D3748",
      flexShrink: 0,
    }}
  >
    {/* Arrow tip */}
    <div
      style={{
        position: "absolute",
        right: 0,
        top: -3,
        width: 0,
        height: 0,
        borderTop: "4px solid transparent",
        borderBottom: "4px solid transparent",
        borderLeft: "6px solid #2D3748",
      }}
    />
    {/* Animated packet */}
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="packet"
          initial={{ x: 0, opacity: 1 }}
          animate={{ x: 60, opacity: 0 }}
          transition={{ duration: 0.6, ease: "linear", repeat: Infinity, repeatDelay: 0.4 }}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#1A56DB",
            boxShadow: "0 0 8px #1A56DB",
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        />
      )}
    </AnimatePresence>
  </div>
);

/* ── AgentPipeline ──────────────────────────────────────────────────────────── */

const AgentPipeline: React.FC<AgentPipelineProps> = ({ isLoading }) => {
  const [agentStates, setAgentStates] = useState<AgentState[]>(["waiting", "waiting", "waiting", "waiting"]);

  useEffect(() => {
    if (!isLoading) {
      // When loading ends, complete agent 4 if it was active
      setAgentStates(prev =>
        prev.map((s, i) => (i === 3 && s === "active" ? "complete" : s))
      );
      return;
    }

    // Reset and start fresh
    setAgentStates(["active", "waiting", "waiting", "waiting"]);

    const t1 = setTimeout(() => setAgentStates(["complete", "active", "waiting", "waiting"]), 1500);
    const t2 = setTimeout(() => setAgentStates(["complete", "complete", "active", "waiting"]), 3500);
    const t3 = setTimeout(() => setAgentStates(["complete", "complete", "complete", "active"]), 5500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isLoading]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 40,
        position: "relative",
      }}
    >
      {/* Subtle grid background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(#E2E8F0 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          opacity: 0.3,
          pointerEvents: "none",
        }}
      />

      {/* Pipeline boxes */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          flexWrap: "wrap",
          justifyContent: "center",
          zIndex: 1,
        }}
      >
        {AGENTS.map((agent, i) => (
          <React.Fragment key={agent.name}>
            <AgentBox agent={agent} state={agentStates[i]} />
            {i < AGENTS.length - 1 && (
              <Connector isActive={agentStates[i] === "complete"} index={i} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Caption */}
      <div
        style={{
          fontSize: 13,
          color: "#9CA3AF",
          textAlign: "center",
          zIndex: 1,
        }}
      >
        Analyzing using real municipal codes · Citation verified · Mathematically grounded
      </div>
    </div>
  );
};

export default AgentPipeline;
