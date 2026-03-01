import React from "react";
import { motion } from "framer-motion";
import { AnalysisResponse, Statute } from "../../types";

interface Props {
  results: AnalysisResponse;
}

const StatuteCard: React.FC<{
  statute: Statute;
  matchScore: number | null;
  index: number;
}> = ({ statute, matchScore, index }) => {
  const isVerified = matchScore === null || matchScore >= 0.70;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.25 }}
      className="rounded-xl border border-gray-200 p-4 space-y-2 hover:border-gray-300 transition-colors duration-150"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug">
            {statute.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{statute.section}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {matchScore !== null && (
            <span className="text-xs text-gray-400 tabular-nums">
              Match: {matchScore.toFixed(2)}
            </span>
          )}
          {!isVerified && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              ⚠ Low confidence
            </span>
          )}
        </div>
      </div>

      {statute.excerpt && (
        <p className="text-sm text-gray-600 leading-relaxed">{statute.excerpt}</p>
      )}

      {statute.applicability_score != null && (
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full"
              style={{ width: `${Math.round(statute.applicability_score * 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 tabular-nums">
            {Math.round(statute.applicability_score * 100)}% relevant
          </span>
        </div>
      )}

      {statute.source_url && (
        <a
          href={statute.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 hover:underline transition-colors"
        >
          View source
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      )}
    </motion.div>
  );
};

const TheLawsTab: React.FC<Props> = ({ results }) => {
  const statutes = results.research?.relevant_statutes ?? [];
  const grounding = results.grounding_results;
  const confidence = grounding?.overall_confidence ?? results.confidence_score ?? 0.8;
  const statuteScores = grounding?.statute_scores ?? {};

  const getMatchScore = (s: Statute): number | null => {
    const key = `${s.name} ${s.section}`.trim();
    return statuteScores[key] ?? null;
  };

  const confidenceColor =
    confidence >= 0.8 ? "bg-emerald-500" : confidence >= 0.6 ? "bg-amber-400" : "bg-red-500";

  return (
    <div className="space-y-5">
      {/* Legal Grounding confidence meter */}
      <div
        className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100"
        title="Score measures how closely this analysis matches retrieved legal text"
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-gray-500 font-medium">Legal Grounding:</span>
        </div>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${confidenceColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(confidence * 100)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 tabular-nums flex-shrink-0">
            {Math.round(confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Statute cards */}
      {statutes.length > 0 ? (
        <div className="space-y-3">
          {statutes.map((statute, i) => (
            <StatuteCard
              key={`${statute.section}-${i}`}
              statute={statute}
              matchScore={getMatchScore(statute)}
              index={i}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">
          No specific statutes retrieved. The analysis is based on general legal principles.
        </p>
      )}

      {/* Source links */}
      {results.source_urls?.filter(Boolean).length > 0 && (
        <div>
          <p className="section-label mb-2">Sources</p>
          <div className="space-y-1">
            {results.source_urls.filter(Boolean).map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 hover:underline"
              >
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="truncate">{url}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TheLawsTab;
