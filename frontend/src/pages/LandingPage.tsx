import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GlobeHero from "../components/GlobeHero";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
} from "framer-motion";

/* ─────────────────────────────────────────────────────────────────────────
   Utility: scroll to a hash on the current page
───────────────────────────────────────────────────────────────────────── */
function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ─────────────────────────────────────────────────────────────────────────
   Animated counter for Stats section
───────────────────────────────────────────────────────────────────────── */
interface CounterProps {
  target: number;
  display: string;
  label: string;
  inView: boolean;
}

const AnimatedCounter: React.FC<CounterProps> = ({ target, display, label, inView }) => {
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const [rendered, setRendered] = useState("0");

  useEffect(() => {
    if (inView) {
      motionVal.set(target);
    }
  }, [inView, motionVal, target]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      const rounded = Math.round(v);
      // Preserve display suffix logic
      if (display.endsWith("K+")) {
        setRendered(rounded >= target ? display : `${rounded}K+`);
      } else {
        setRendered(rounded >= target ? display : String(rounded));
      }
    });
    return unsub;
  }, [spring, target, display]);

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: "#FFFFFF",
          lineHeight: 1,
        }}
      >
        {rendered}
      </div>
      <div
        style={{
          fontSize: 14,
          color: "#94A3B8",
          fontWeight: 400,
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   SVG Icons
───────────────────────────────────────────────────────────────────────── */
const IconSearch: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A56DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconDatabase: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A56DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const IconDocCheck: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A56DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <polyline points="9 15 11 17 15 13" />
  </svg>
);

/* ─────────────────────────────────────────────────────────────────────────
   SECTION 1 — Hero
───────────────────────────────────────────────────────────────────────── */
const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section
      style={{
        backgroundColor: "#FFFFFF",
        paddingTop: 100,
        paddingBottom: 80,
      }}
    >
      <div
        className="max-w-6xl mx-auto px-6"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 48,
        }}
      >
        {/* LEFT col */}
        <div style={{ flex: "0 0 55%", maxWidth: "55%" }}>
          {/* Eyebrow tag */}
          <div
            style={{
              borderLeft: "3px solid #F59E0B",
              paddingLeft: 12,
              fontSize: 13,
              color: "#6B7280",
              fontWeight: 500,
              marginBottom: 24,
            }}
          >
            UN SDG 11 + 16 · Access to Justice
          </div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            style={{
              fontSize: 64,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "#0F172A",
              margin: 0,
            }}
          >
            Legal Rights,
            <br />
            Without the Lawyer.
          </motion.h1>

          {/* Paragraph */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
            style={{
              fontSize: 18,
              color: "#475569",
              lineHeight: 1.7,
              maxWidth: 460,
              marginTop: 24,
              marginBottom: 0,
            }}
          >
            Describe your situation in plain language. JusticeMap searches real
            city laws, verifies every citation mathematically, and hands you a
            demand letter ready to send.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.18 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 40,
              flexWrap: "wrap",
            }}
          >
            <HeroPrimaryBtn />
            <HeroSecondaryBtn />
          </motion.div>

          {/* Trust row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
              marginTop: 48,
              flexWrap: "wrap",
            }}
          >
            {[
              "🏛 50,000+ legal documents",
              "✓ Citation verified",
              "🌐 12 languages",
            ].map((item) => (
              <span
                key={item}
                style={{
                  fontSize: 14,
                  color: "#6B7280",
                  fontWeight: 500,
                }}
              >
                {item}
              </span>
            ))}
          </motion.div>
        </div>

        {/* RIGHT col — globe, hidden on mobile */}
        <div
          className="hidden lg:flex"
          style={{ flex: "0 0 45%", maxWidth: "45%", position: "relative", justifyContent: "center", alignItems: "center" }}
        >
          <GlobeHero onCitySelect={() => navigate("/analyze")} />
        </div>
      </div>
    </section>
  );
};

const HeroPrimaryBtn: React.FC = () => {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to="/analyze"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-block",
        backgroundColor: hovered ? "#1645B8" : "#1A56DB",
        color: "#FFFFFF",
        fontWeight: 600,
        fontSize: 16,
        padding: "14px 28px",
        borderRadius: 10,
        textDecoration: "none",
        boxShadow: hovered
          ? "0 6px 20px rgba(26,86,219,0.4)"
          : "0 4px 12px rgba(26,86,219,0.3)",
        transition: "box-shadow 150ms, background-color 150ms",
      } as React.CSSProperties}
    >
      Check My Rights
    </Link>
  );
};

const HeroSecondaryBtn: React.FC = () => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={() => scrollToId("how-it-works")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-block",
        backgroundColor: "#FFFFFF",
        color: "#111827",
        fontWeight: 600,
        fontSize: 16,
        padding: "14px 28px",
        borderRadius: 10,
        border: hovered ? "1.5px solid #1A56DB" : "1.5px solid #EAEAEA",
        cursor: "pointer",
        transition: "border-color 150ms",
        fontFamily: "inherit",
      }}
    >
      See how it works
    </button>
  );
};


/* ─────────────────────────────────────────────────────────────────────────
   SECTION 2 — Stats Bar
───────────────────────────────────────────────────────────────────────── */
const stats = [
  { target: 50, display: "50K+", label: "Legal documents indexed" },
  { target: 4, display: "4", label: "Specialized AI agents" },
  { target: 3, display: "3", label: "Cities with local law data" },
  { target: 12, display: "12", label: "Languages supported" },
];

const StatsSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      style={{
        backgroundColor: "#0F172A",
        padding: "48px 0",
      }}
    >
      <div
        className="max-w-6xl mx-auto px-6"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 80,
          flexWrap: "wrap",
        }}
      >
        {stats.map((s) => (
          <AnimatedCounter
            key={s.label}
            target={s.target}
            display={s.display}
            label={s.label}
            inView={inView}
          />
        ))}
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   SECTION 3 — How It Works
───────────────────────────────────────────────────────────────────────── */
const howItWorksSteps = [
  {
    num: "01",
    Icon: IconSearch,
    title: "Describe in plain language",
    body:
      "Write what's happening in your own words. No legal jargon needed. JusticeMap works in English, Spanish, Chinese, French, and 8 more languages.",
  },
  {
    num: "02",
    Icon: IconDatabase,
    title: "We search real city law",
    body:
      "Our two-stage retrieval system — bi-encoder for recall, cross-encoder for precision — searches 50,000+ real municipal codes. Every result is ranked by mathematical relevance, not AI guesswork.",
  },
  {
    num: "03",
    Icon: IconDocCheck,
    title: "Get verified rights + a demand letter",
    body:
      "4 specialized AI agents analyze your situation, verify every citation against source documents, and generate a formal letter ready to send.",
  },
];

const HowItWorksSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      id="how-it-works"
      style={{
        backgroundColor: "#FFFFFF",
        padding: "96px 0",
      }}
    >
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#1A56DB",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            HOW IT WORKS
          </div>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: "#0F172A",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            From problem to action in 60 seconds
          </h2>
        </div>

        {/* Steps */}
        <div
          ref={ref}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 48,
          }}
        >
          {/* Vertical line */}
          <div
            style={{
              position: "absolute",
              left: 96,
              top: 24,
              bottom: 24,
              width: 2,
              backgroundColor: "#EAEAEA",
              zIndex: 0,
            }}
          />

          {howItWorksSteps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ duration: 0.45, ease: "easeOut", delay: i * 0.15 }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Large decorative number */}
              <div
                style={{
                  width: 120,
                  textAlign: "right",
                  marginRight: 40,
                  flexShrink: 0,
                  fontSize: 80,
                  fontWeight: 800,
                  color: "#F1F5F9",
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                {step.num}
              </div>

              {/* Content */}
              <div>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    border: "1.5px solid #EAEAEA",
                    borderRadius: 12,
                    padding: 12,
                    backgroundColor: "#FFFFFF",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}
                >
                  <step.Icon />
                </div>
                <h3
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#0F172A",
                    marginTop: 16,
                    marginBottom: 8,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontSize: 16,
                    color: "#475569",
                    lineHeight: 1.7,
                    maxWidth: 480,
                    margin: 0,
                  }}
                >
                  {step.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   SECTION 4 — Comparison Table
───────────────────────────────────────────────────────────────────────── */
const comparisonRows = [
  "Cites specific local ordinances",
  "Verifies citations mathematically",
  "Knows your city's specific laws",
  "Shows confidence score",
  "Escalates when it's not sure",
];

const ComparisonSection: React.FC = () => (
  <section
    style={{
      backgroundColor: "#F8FAFC",
      padding: "96px 0",
    }}
  >
    <div className="max-w-6xl mx-auto px-6">
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#1A56DB",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          THE DIFFERENCE
        </div>
        <h2
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "#0F172A",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Why not just ask an AI chatbot?
        </h2>
      </div>

      {/* Table */}
      <div
        style={{
          border: "1.5px solid #EAEAEA",
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#FFFFFF",
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        {/* Header row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 140px 160px",
            backgroundColor: "#F8FAFC",
            borderBottom: "1.5px solid #EAEAEA",
          }}
        >
          <div style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600 }} />
          <div
            style={{
              padding: "14px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "#374151",
              textAlign: "center",
            }}
          >
            Generic AI
          </div>
          <div
            style={{
              padding: "14px 20px",
              fontSize: 14,
              fontWeight: 600,
              color: "#1A56DB",
              backgroundColor: "#EFF6FF",
              textAlign: "center",
            }}
          >
            JusticeMap
          </div>
        </div>

        {/* Feature rows */}
        {comparisonRows.map((feature, i) => (
          <div
            key={feature}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 140px 160px",
              backgroundColor: i % 2 === 0 ? "#FFFFFF" : "#FAFAFA",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                fontSize: 14,
                color: "#374151",
                fontWeight: 500,
              }}
            >
              {feature}
            </div>
            <div
              style={{
                padding: "14px 20px",
                textAlign: "center",
                fontSize: 16,
                fontWeight: 700,
                color: "#EF4444",
              }}
            >
              ✗
            </div>
            <div
              style={{
                padding: "14px 20px",
                textAlign: "center",
                fontSize: 16,
                fontWeight: 700,
                color: "#059669",
                backgroundColor: "#F0F7FF",
              }}
            >
              ✓
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ─────────────────────────────────────────────────────────────────────────
   SECTION 5 — Cities
───────────────────────────────────────────────────────────────────────── */
interface CityItem {
  emoji: string;
  name: string;
  description: string;
  ordinances: string;
}

const cities: CityItem[] = [
  {
    emoji: "🗽",
    name: "New York City",
    description:
      "Admin Code §27-2029 · Housing Maintenance Code · HPD process · Rent Stabilization Law",
    ordinances: "12,400 ordinances indexed",
  },
  {
    emoji: "🌃",
    name: "Chicago",
    description:
      "RLTO §5-12-110 · Repair and deduct · Rent withholding · Retaliation protections",
    ordinances: "9,800 ordinances indexed",
  },
  {
    emoji: "🌴",
    name: "Los Angeles",
    description:
      "RSO · LAHD process · Just cause eviction · Relocation assistance",
    ordinances: "11,200 ordinances indexed",
  },
  {
    emoji: "🌐",
    name: "General / Federal",
    description:
      "Fair Housing Act · 42 USC §1983 · Warranty of habitability · FOIA rights",
    ordinances: "Federal codes",
  },
];

const CityCard: React.FC<{ city: CityItem }> = ({ city }) => {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/analyze")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: hovered ? "1.5px solid #1A56DB" : "1.5px solid #EAEAEA",
        borderRadius: 12,
        padding: 28,
        cursor: "pointer",
        transition: "border-color 200ms",
        backgroundColor: "#FFFFFF",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
        }}
      >
        <span style={{ fontSize: 32 }}>{city.emoji}</span>
        <span
          style={{
            fontWeight: 700,
            fontSize: 18,
            color: "#0F172A",
            marginLeft: 12,
          }}
        >
          {city.name}
        </span>
      </div>
      <p
        style={{
          marginTop: 12,
          fontSize: 14,
          color: "#475569",
          lineHeight: 1.6,
          margin: "12px 0 0 0",
        }}
      >
        {city.description}
      </p>
      <div
        style={{
          marginTop: 16,
          fontSize: 13,
          fontWeight: 600,
          color: "#1A56DB",
        }}
      >
        {city.ordinances}
      </div>
    </div>
  );
};

const CitiesSection: React.FC = () => (
  <section
    id="cities"
    style={{
      backgroundColor: "#FFFFFF",
      padding: "80px 0",
    }}
  >
    <div className="max-w-6xl mx-auto px-6">
      <h2
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: "#0F172A",
          margin: 0,
        }}
      >
        Cities we cover
      </h2>
      <p
        style={{
          fontSize: 16,
          color: "#6B7280",
          marginTop: 8,
          marginBottom: 0,
        }}
      >
        Real local law for real local situations
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 16,
          marginTop: 40,
        }}
      >
        {cities.map((city) => (
          <CityCard key={city.name} city={city} />
        ))}
      </div>
    </div>
  </section>
);

/* ─────────────────────────────────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────────────────────────────────── */
const Footer: React.FC = () => (
  <footer
    style={{
      backgroundColor: "#0F172A",
      padding: "60px 0 40px",
    }}
  >
    <div className="max-w-6xl mx-auto px-6">
      {/* Top 3-column row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 48,
          alignItems: "flex-start",
        }}
      >
        {/* LEFT: Logo + tagline */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 20, color: "#FFFFFF" }}>⚖</span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#FFFFFF",
                marginLeft: 5,
              }}
            >
              Justice
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#1A56DB",
              }}
            >
              Map
            </span>
          </div>
          <p
            style={{
              color: "#94A3B8",
              fontSize: 14,
              marginTop: 8,
              marginBottom: 0,
              lineHeight: 1.6,
            }}
          >
            Know Your Rights. Hold Cities Accountable.
          </p>
        </div>

        {/* CENTER: Link columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 32,
          }}
        >
          {/* Product */}
          <div>
            <div
              style={{
                color: "#64748B",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 12,
              }}
            >
              Product
            </div>
            <FooterLink onClick={() => scrollToId("how-it-works")}>
              How It Works
            </FooterLink>
            <FooterLink onClick={() => scrollToId("cities")}>
              Cities
            </FooterLink>
            <FooterNavLink to="/analyze">Check My Rights</FooterNavLink>
          </div>

          {/* Project */}
          <div>
            <div
              style={{
                color: "#64748B",
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 12,
              }}
            >
              Project
            </div>
            <FooterAnchor href="https://github.com">GitHub</FooterAnchor>
            <FooterAnchor href="https://devpost.com">Devpost</FooterAnchor>
            <FooterAnchor href="https://sdgs.un.org/goals/goal11">
              SDG 11
            </FooterAnchor>
            <FooterAnchor href="https://sdgs.un.org/goals/goal16">
              SDG 16
            </FooterAnchor>
          </div>
        </div>

      </div>

      {/* Bottom bar */}
      <div
        style={{
          borderTop: "1px solid #1E293B",
          marginTop: 40,
          paddingTop: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span style={{ color: "#475569", fontSize: 13 }}>
          © 2026 JusticeMap. For informational purposes only.
        </span>
        <span style={{ color: "#475569", fontSize: 13 }}>
          Not legal advice. For emergencies call 311.
        </span>
      </div>
    </div>
  </footer>
);

/* Footer link helpers */
interface FooterLinkProps {
  onClick: () => void;
  children: React.ReactNode;
}

const FooterLink: React.FC<FooterLinkProps> = ({ onClick, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        background: "none",
        border: "none",
        padding: 0,
        marginBottom: 8,
        cursor: "pointer",
        color: hovered ? "#FFFFFF" : "#94A3B8",
        fontSize: 14,
        transition: "color 150ms",
        fontFamily: "inherit",
        textAlign: "left",
      }}
    >
      {children}
    </button>
  );
};

interface FooterNavLinkProps {
  to: string;
  children: React.ReactNode;
}

const FooterNavLink: React.FC<FooterNavLinkProps> = ({ to, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        marginBottom: 8,
        color: hovered ? "#FFFFFF" : "#94A3B8",
        fontSize: 14,
        textDecoration: "none",
        transition: "color 150ms",
      }}
    >
      {children}
    </Link>
  );
};

interface FooterAnchorProps {
  href: string;
  children: React.ReactNode;
}

const FooterAnchor: React.FC<FooterAnchorProps> = ({ href, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        marginBottom: 8,
        color: hovered ? "#FFFFFF" : "#94A3B8",
        fontSize: 14,
        textDecoration: "none",
        transition: "color 150ms",
      }}
    >
      {children}
    </a>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   ROOT EXPORT
───────────────────────────────────────────────────────────────────────── */
const LandingPage: React.FC = () => (
  <div style={{ minHeight: "100vh", backgroundColor: "#FFFFFF" }}>
    <HeroSection />
    <StatsSection />
    <HowItWorksSection />
    <ComparisonSection />
    <CitiesSection />
    <Footer />
  </div>
);

export default LandingPage;
