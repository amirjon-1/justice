import React, { useState, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavLink = useCallback(
    (hash: string) => {
      setMobileOpen(false);
      if (location.pathname === "/") {
        const el = document.querySelector(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else {
        navigate("/" + hash);
      }
    },
    [location.pathname, navigate]
  );

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <>
      <nav
        style={{
          height: 60,
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #EAEAEA",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between"
        >
          {/* Logo */}
          <Link
            to="/"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
          >
            <span style={{ fontSize: 22, color: "#1A56DB", lineHeight: 1 }}>⚖</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginLeft: 6 }}>
              Justice
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#1A56DB" }}>Map</span>
          </Link>

          {/* Center nav links — hidden on mobile */}
          <div className="hidden md:flex items-center" style={{ gap: 40 }}>
            <NavLink onClick={() => handleNavLink("#how-it-works")}>
              How It Works
            </NavLink>
            <NavLink onClick={() => handleNavLink("#cities")}>
              Cities
            </NavLink>
            <Link
              to="/about"
              style={{
                fontWeight: 500,
                color: "#6B7280",
                textDecoration: "none",
                fontSize: 15,
                transition: "color 150ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#111827")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
            >
              About
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* CTA button — always visible */}
            <Link
              to="/analyze"
              style={{
                backgroundColor: "#1A56DB",
                color: "#FFFFFF",
                fontWeight: 600,
                fontSize: 14,
                padding: "8px 20px",
                borderRadius: 8,
                border: "none",
                textDecoration: "none",
                transition: "background-color 150ms",
                display: "inline-block",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1645B8")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#1A56DB")}
            >
              Check My Rights
            </Link>

            {/* Hamburger — visible on mobile only */}
            <button
              className="md:hidden flex flex-col justify-center items-center"
              style={{
                width: 32,
                height: 32,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                gap: 5,
              }}
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <span
                style={{
                  display: "block",
                  width: 24,
                  height: 2,
                  backgroundColor: "#111827",
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  display: "block",
                  width: 24,
                  height: 2,
                  backgroundColor: "#111827",
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  display: "block",
                  width: 24,
                  height: 2,
                  backgroundColor: "#111827",
                  borderRadius: 2,
                }}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeMobile}
              style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.4)",
                zIndex: 60,
              }}
            />

            {/* Slide-in panel */}
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: "0%" }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: 300,
                backgroundColor: "#FFFFFF",
                zIndex: 70,
                display: "flex",
                flexDirection: "column",
                padding: "24px 24px 40px",
              }}
            >
              {/* Panel header: logo + close */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
                <Link
                  to="/"
                  onClick={closeMobile}
                  style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                >
                  <span style={{ fontSize: 20, color: "#1A56DB" }}>⚖</span>
                  <span style={{ fontSize: 17, fontWeight: 800, color: "#111827", marginLeft: 5 }}>
                    Justice
                  </span>
                  <span style={{ fontSize: 17, fontWeight: 800, color: "#1A56DB" }}>Map</span>
                </Link>
                <button
                  onClick={closeMobile}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 22,
                    color: "#6B7280",
                    lineHeight: 1,
                    padding: 4,
                  }}
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              {/* Nav links stacked */}
              <div style={{ display: "flex", flexDirection: "column", gap: 0, flex: 1 }}>
                <MobileNavLink onClick={() => handleNavLink("#how-it-works")}>
                  How It Works
                </MobileNavLink>
                <MobileNavLink onClick={() => handleNavLink("#cities")}>
                  Cities
                </MobileNavLink>
                <Link
                  to="/about"
                  onClick={closeMobile}
                  style={{
                    display: "block",
                    padding: "14px 0",
                    fontWeight: 500,
                    fontSize: 16,
                    color: "#111827",
                    textDecoration: "none",
                    borderBottom: "1px solid #EAEAEA",
                  }}
                >
                  About
                </Link>
              </div>

              {/* CTA */}
              <Link
                to="/analyze"
                onClick={closeMobile}
                style={{
                  display: "block",
                  textAlign: "center",
                  backgroundColor: "#1A56DB",
                  color: "#FFFFFF",
                  fontWeight: 600,
                  fontSize: 15,
                  padding: "13px 20px",
                  borderRadius: 10,
                  textDecoration: "none",
                  marginTop: 32,
                }}
              >
                Check My Rights
              </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

/* ── Small helpers ───────────────────────────────────────────────────────── */

interface NavLinkProps {
  onClick: () => void;
  children: React.ReactNode;
}

const NavLink: React.FC<NavLinkProps> = ({ onClick, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontWeight: 500,
        color: hovered ? "#111827" : "#6B7280",
        fontSize: 15,
        padding: 0,
        transition: "color 150ms",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
};

const MobileNavLink: React.FC<NavLinkProps> = ({ onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      display: "block",
      width: "100%",
      textAlign: "left",
      padding: "14px 0",
      background: "none",
      border: "none",
      borderBottom: "1px solid #EAEAEA",
      cursor: "pointer",
      fontWeight: 500,
      fontSize: 16,
      color: "#111827",
      fontFamily: "inherit",
    }}
  >
    {children}
  </button>
);

export default Navbar;
