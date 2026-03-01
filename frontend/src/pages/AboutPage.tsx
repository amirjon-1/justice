import React from "react";
import { Link } from "react-router-dom";

/* ── Shared styles ─────────────────────────────────────────────────────────── */

const codeBlockStyle: React.CSSProperties = {
  background: "#0F172A",
  color: "#E2E8F0",
  borderRadius: 8,
  padding: 20,
  fontFamily: "'Courier New', monospace",
  fontSize: 13,
  lineHeight: 1.6,
  overflowX: "auto",
  margin: "24px 0",
  whiteSpace: "pre",
};

const sectionStyle = (isFirst: boolean): React.CSSProperties => ({
  borderTop: isFirst ? "none" : "1px solid #EAEAEA",
  paddingTop: isFirst ? 0 : 40,
  marginTop: isFirst ? 0 : 40,
});

const h2Style: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "#0F172A",
  marginBottom: 16,
  marginTop: 0,
};

const paraStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.8,
  color: "#374151",
  marginBottom: 16,
  marginTop: 0,
};

/* ── AboutPage ─────────────────────────────────────────────────────────────── */

const AboutPage: React.FC = () => {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "80px 24px",
        fontFamily: "Inter, system-ui, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Page header */}
      <h1
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: "#0F172A",
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        How JusticeMap Works
      </h1>
      <p
        style={{
          fontSize: 18,
          color: "#6B7280",
          marginTop: 8,
          marginBottom: 48,
        }}
      >
        A technical overview for the curious.
      </p>

      {/* ── Section 1: The Retrieval Problem ── */}
      <section style={sectionStyle(true)}>
        <h2 style={h2Style}>The Retrieval Problem</h2>
        <p style={paraStyle}>
          Legal text is dense, specific, and domain-specific in ways that break
          keyword search. When someone types "my landlord isn't fixing my heat,"
          a keyword search looks for documents containing those exact words. But
          the relevant law might say "duty to maintain habitable premises at
          minimum 68°F." No keyword match — but it's exactly the right document.
        </p>
        <p style={paraStyle}>
          JusticeMap uses sentence embeddings to convert both the query and every
          legal document into high-dimensional vectors. Cosine similarity in that
          vector space captures semantic meaning, not just vocabulary overlap. But
          embeddings optimize for recall (finding broadly relevant documents), not
          precision (finding the most relevant ones).
        </p>
        <p style={paraStyle}>
          This is why we use a two-stage pipeline. Stage 1: a bi-encoder
          (all-MiniLM-L6-v2) retrieves the top 20 candidates by semantic
          similarity. Stage 2: a cross-encoder (ms-marco-MiniLM-L-6-v2)
          re-ranks those 20 with cross-attention between query and document —
          much higher precision, but too slow to run on the full corpus. The
          result: recall of broad search with precision of deep reading.
        </p>
        <pre style={codeBlockStyle}>{`// Stage 1: Bi-encoder retrieval
{"model": "all-MiniLM-L6-v2", "candidates": 20, "method": "cosine_similarity"}

// Stage 2: Cross-encoder re-ranking
{"model": "ms-marco-MiniLM-L-6-v2", "top_k": 5, "method": "cross_attention"}`}</pre>
      </section>

      {/* ── Section 2: The Grounding Problem ── */}
      <section style={sectionStyle(false)}>
        <h2 style={h2Style}>The Grounding Problem</h2>
        <p style={paraStyle}>
          Large language models have a well-known problem: they can cite laws
          that don't exist, or misattribute quotes to the wrong statute. In most
          domains this is annoying. In legal advice, it's dangerous. A person
          relying on a fabricated statute could miss a real deadline or take the
          wrong action.
        </p>
        <p style={paraStyle}>
          JusticeMap solves this with a mathematical grounding verifier, not a
          second LLM. After the analysis is generated, each sentence is embedded
          and compared via cosine similarity against the retrieved source
          documents. A claim is "verified" only if at least one source document
          has cosine similarity ≥ 0.70 to the claim. The overall confidence
          score is the mean of all claim scores.
        </p>
        <p style={paraStyle}>
          This means the confidence score is a mathematical proof of grounding
          — not an LLM's self-assessment of its own accuracy. A 91% confidence
          score means 91% of the analysis sentences are semantically traceable
          to specific retrieved legal text.
        </p>
        <pre style={codeBlockStyle}>{`# grounding.py — mathematical verification
def compute_grounding_score(claims, source_chunks, threshold=0.70):
    claim_embeddings = model.encode(claims)
    chunk_embeddings = model.encode(source_chunks)

    for claim, emb in zip(claims, claim_embeddings):
        sims = util.cos_sim(emb, chunk_embeddings)[0]
        best_score = float(sims.max())
        verified = best_score >= threshold

    overall_confidence = np.mean(scores)
    return {"overall_confidence": overall_confidence, ...}`}</pre>
      </section>

      {/* ── Section 3: The Agent Pipeline ── */}
      <section style={sectionStyle(false)}>
        <h2 style={h2Style}>The Agent Pipeline</h2>
        <p style={paraStyle}>
          The analysis runs through four specialized agents, each with a narrow
          job. The IntakeAgent is a triage specialist: it determines whether a
          legal issue actually exists, classifies the issue type, extracts
          structured facts, and — critically — rewrites the query into multiple
          legal-domain-optimized search strings. This query rewriting is a key
          insight: "my landlord won't fix the heat" becomes "minimum heating
          temperature requirements landlord obligations tenant rights" —
          dramatically improving retrieval precision.
        </p>
        <p style={paraStyle}>
          The ResearchAgent structures the raw retrieved text into formal statute
          objects with section numbers, excerpts, and applicability scores. The
          AnalysisAgent is the senior analyst: it applies statutes to the
          specific situation, assesses severity against calibrated criteria (not
          just "seems serious"), and generates recommended actions with specific
          timelines and phone numbers. The LetterAgent produces a formal demand
          letter referencing the verified statutes.
        </p>
        <p style={paraStyle}>
          The pipeline is sequential by design: each agent's output informs the
          next. The grounding verifier and escalation check run after the
          analysis, completing the pipeline. Total latency is typically 15-30
          seconds for a full analysis, dominated by the Groq API calls.
        </p>
        <pre style={codeBlockStyle}>{`IntakeAgent ──► RAG + Wolfram ──► ResearchAgent ──► AnalysisAgent
                                                          │
                                              LetterAgent + Grounding
                                                          │
                                              Escalation Check ──► Response`}</pre>
      </section>

      {/* ── Section 4: The Data ── */}
      <section style={sectionStyle(false)}>
        <h2 style={h2Style}>The Data</h2>
        <p style={paraStyle}>
          JusticeMap currently covers three cities plus federal law: New York
          City (12,400 ordinances), Chicago (9,800 ordinances), Los Angeles
          (11,200 ordinances), and a general federal law corpus covering Fair
          Housing Act, 42 U.S.C. §1983, and FOIA rights.
        </p>
        <p style={paraStyle}>
          Each legal document is chunked into overlapping 500-character segments
          with 100-character overlap. This overlap ensures that relevant clauses
          that fall near chunk boundaries aren't missed. Each chunk stores the
          source document, city, and section reference. The bi-encoder produces
          384-dimensional embeddings stored in a numpy array — no external vector
          database required.
        </p>
        <p style={paraStyle}>
          Chunk size matters: too small and you lose context (a single sentence
          of legal text often needs surrounding provisions to make sense). Too
          large and you lose precision (a 2,000-character chunk might contain the
          relevant clause but its embedding is diluted by irrelevant surrounding
          text). 500 characters ≈ 2-3 sentences of legal prose — the sweet spot
          for legal retrieval.
        </p>
      </section>

      {/* ── Section 5: The Mission ── */}
      <section style={sectionStyle(false)}>
        <h2 style={h2Style}>The Mission</h2>
        <p style={paraStyle}>
          The access to justice gap is real and measurable. According to the
          Legal Services Corporation, 92% of the civil legal needs of
          low-income Americans go unmet. The people most affected by housing
          code violations, wrongful evictions, and police misconduct are the
          least able to afford legal representation.
        </p>
        <p style={paraStyle}>
          JusticeMap targets UN Sustainable Development Goal 11 (Sustainable
          Cities and Communities) and SDG 16 (Peace, Justice and Strong
          Institutions). Both goals recognize that functional legal systems are
          infrastructure — as essential to urban life as water or transit. When
          residents can't exercise their rights, the legal system doesn't
          function as designed.
        </p>
        <p style={paraStyle}>
          This tool is not a lawyer. It doesn't form an attorney-client
          relationship, and it won't represent anyone in court. But it can do
          something a $400/hour attorney cannot: be available at 2am, in 12
          languages, for free. The goal is to close the information gap — to
          give every resident the same factual starting point that a
          well-informed attorney would give.
        </p>
      </section>

      {/* ── Footer strip ── */}
      <div
        style={{
          marginTop: 80,
          paddingTop: 24,
          borderTop: "1px solid #EAEAEA",
        }}
      >
        <Link
          to="/"
          style={{
            color: "#6B7280",
            fontSize: 14,
            textDecoration: "none",
            transition: "color 150ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#111827")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#6B7280")}
        >
          ← Back to JusticeMap
        </Link>
      </div>
    </div>
  );
};

export default AboutPage;
