import React from "react";
import { AnalysisResponse, Severity } from "../../types";

interface Props {
  results: AnalysisResponse;
}

const SEVERITY: Record<Exclude<Severity, "not_applicable">, { dot: string; label: string; text: string }> = {
  high:   { dot: "bg-red-500",     label: "High concern",     text: "text-red-700"   },
  medium: { dot: "bg-amber-500",   label: "Moderate concern", text: "text-amber-700" },
  low:    { dot: "bg-emerald-500", label: "Low concern",      text: "text-emerald-700" },
};

const YourRightsTab: React.FC<Props> = ({ results }) => {
  // Non-issue short-circuit — friendly "not a legal issue yet" screen
  if (results.severity === "not_applicable") {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
          <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">No legal issue detected yet</p>
          <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
            {results.plain_english_summary || "Based on what you've described, this doesn't appear to be a legal violation at this time."}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 max-w-sm text-left">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1.5">
            When to come back
          </p>
          <p className="text-xs text-amber-800 leading-relaxed">
            If the situation persists, worsens, or you receive a formal notice — describe the updated situation and we'll analyze it for you.
          </p>
        </div>
      </div>
    );
  }

  const sev = SEVERITY[results.severity as Exclude<Severity, "not_applicable">] ?? SEVERITY.low;
  const paragraphs = results.legal_analysis
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 0);

  return (
    <div className="space-y-5">
      {/* Severity row — subtle, one line */}
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sev.dot}`} />
        <span className={`text-sm font-medium ${sev.text}`}>{sev.label}</span>
        {results.analysis?.estimated_resolution && (
          <>
            <span className="text-gray-200">·</span>
            <span className="text-sm text-gray-400">
              {results.analysis.estimated_resolution}
            </span>
          </>
        )}
      </div>

      {/* Legal analysis */}
      <div className="space-y-3.5">
        {paragraphs.map((para, i) => (
          <p key={i} className="text-sm text-gray-700 leading-7">
            {para}
          </p>
        ))}
      </div>

      {/* Plain English summary */}
      {results.plain_english_summary && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">
            What this means for you
          </p>
          <p className="text-sm text-blue-800 leading-relaxed">
            {results.plain_english_summary}
          </p>
        </div>
      )}

      {/* Jurisdiction note */}
      {results.jurisdiction_notes && (
        <div className="flex gap-2.5 p-3 rounded-lg bg-gray-50 border border-gray-100">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-gray-500 leading-relaxed">
            {results.jurisdiction_notes}
          </p>
        </div>
      )}
    </div>
  );
};

export default YourRightsTab;
