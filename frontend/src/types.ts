export interface WolframStats {
  median_income: string;
  median_rent: string;
  population: string;
}

export type Severity = "high" | "medium" | "low" | "not_applicable";
export type Urgency = "immediate" | "this_week" | "general" | "not_applicable";

export interface IntakeResult {
  is_actionable_legal_issue: boolean;
  non_issue_reason: string;
  issue_type: string;
  urgency: Urgency;
  key_facts: string[];
  likely_violations: string[];
  search_queries: string[];
}

export interface Statute {
  name: string;
  section: string;
  excerpt: string;
  applicability_score: number;
  source_url?: string;
}

export interface ResearchResult {
  relevant_statutes: Statute[];
  precedents: string[];
  jurisdiction_notes: string;
}

export interface ActionStep {
  step: string;
  explanation: string;
  timeline: string;
}

export interface AnalysisResult {
  legal_analysis: string;
  plain_english_summary: string;
  severity: Severity;
  recommended_actions: ActionStep[];
  estimated_resolution: string;
}

export interface ClaimScore {
  claim: string;
  best_match_chunk: string;
  score: number;
  verified: boolean;
}

export interface GroundingResult {
  overall_confidence: number;
  claim_scores: ClaimScore[];
  unverified_claims: string[];
  threshold: number;
  statute_scores: Record<string, number>;
}

export interface LegalAidOrg {
  name: string;
  phone: string | null;
  url: string;
  specialties: string[];
  free: boolean;
}

export interface AnalysisResponse {
  // Structured agent outputs
  intake: IntakeResult;
  research: ResearchResult;
  analysis: AnalysisResult;
  agents_used: number;

  // Content
  demand_letter: string;
  wolfram_stats: WolframStats;
  source_urls: string[];

  // Grounding (replaces LLM guard)
  grounding_results: GroundingResult;
  confidence_score: number;
  verified_citations: string[];
  unverified_citations: string[];
  guard_flags: string[];

  // Convenience top-level fields
  legal_analysis: string;
  plain_english_summary: string;
  severity: Severity;
  recommended_actions: ActionStep[];
  estimated_resolution: string;
  relevant_laws: string[];
  jurisdiction_notes: string;

  // Escalation
  should_escalate: boolean;
  escalation_reason: string;
  legal_aid_orgs: LegalAidOrg[];

  // Language
  detected_language: string;
  language_code: string;

  processing_time_seconds: number;
}

export interface AnalyzeRequest {
  city: string;
  problem: string;
}
