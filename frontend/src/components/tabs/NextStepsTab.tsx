import React from "react";
import { motion } from "framer-motion";
import { AnalysisResponse, ActionStep, LegalAidOrg } from "../../types";

interface Props {
  results: AnalysisResponse;
}

const TIMELINE_COLORS: Record<string, string> = {
  "Today":            "bg-red-50 text-red-700",
  "Within 24 hours":  "bg-orange-50 text-orange-700",
  "Within 7 days":    "bg-amber-50 text-amber-700",
  "Within 30 days":   "bg-blue-50 text-blue-700",
};

const Step: React.FC<{ action: ActionStep; index: number }> = ({ action, index }) => {
  const timelineClass =
    TIMELINE_COLORS[action.timeline] ?? "bg-gray-100 text-gray-600";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.25 }}
      className="flex gap-4"
    >
      {/* Number circle */}
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
          {index + 1}
        </div>
        {/* Connector line */}
        <div className="w-px flex-1 bg-gray-100 mt-2 min-h-[16px]" />
      </div>

      {/* Content */}
      <div className="pb-6 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <p className="text-sm font-semibold text-gray-900">{action.step}</p>
          {action.timeline && (
            <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${timelineClass}`}>
              {action.timeline}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{action.explanation}</p>
      </div>
    </motion.div>
  );
};

const EscalationCard: React.FC<{ reason: string; orgs: LegalAidOrg[] }> = ({ reason, orgs }) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3"
    style={{ borderLeftWidth: "4px", borderLeftColor: "#2D6BE4" }}
  >
    <div className="flex items-start gap-3">
      <span className="text-lg flex-shrink-0">👤</span>
      <div>
        <p className="text-sm font-semibold text-blue-900">
          This case may benefit from professional legal help
        </p>
        <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">{reason}</p>
      </div>
    </div>

    {orgs.length > 0 && (
      <div className="space-y-2 pt-1">
        {orgs.map((org) => (
          <div
            key={org.name}
            className="flex items-center justify-between gap-3 bg-white rounded-lg border border-blue-100 px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">{org.name}</p>
                {org.free && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    Free service
                  </span>
                )}
              </div>
              {org.phone && (
                <a
                  href={`tel:${org.phone}`}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {org.phone}
                </a>
              )}
            </div>
            <a
              href={org.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors whitespace-nowrap"
            >
              Visit Website →
            </a>
          </div>
        ))}
      </div>
    )}
  </motion.div>
);

const NextStepsTab: React.FC<Props> = ({ results }) => {
  const actions = results.recommended_actions ?? [];
  const stats = results.wolfram_stats;
  const incomeStr = stats?.median_income ?? "N/A";
  const rentStr   = stats?.median_rent ?? "N/A";

  const showEscalation = results.should_escalate && results.legal_aid_orgs?.length > 0;

  return (
    <div className="space-y-6">
      {/* Escalation card — shown first if applicable */}
      {showEscalation && (
        <EscalationCard
          reason={results.escalation_reason}
          orgs={results.legal_aid_orgs}
        />
      )}

      {/* Action steps */}
      {actions.length > 0 ? (
        <div>
          <p className="section-label mb-4">Recommended actions</p>
          <div>
            {actions.map((action, i) => (
              <Step key={i} action={action} index={i} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-6">
          No specific actions generated. Please consult a local legal aid organization.
        </p>
      )}

      {/* Wolfram stats callout */}
      {(incomeStr !== "N/A" || rentStr !== "N/A") && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            City context
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            {incomeStr !== "N/A" && rentStr !== "N/A" ? (
              <>
                In this area, the median household income is{" "}
                <strong className="text-gray-800">{incomeStr}</strong> and median
                rent is <strong className="text-gray-800">{rentStr}</strong>
                {stats?.population !== "N/A" && ` (city population: ${stats.population})`}.
                These figures provide context for rent withholding calculations and
                relocation assistance amounts.
              </>
            ) : incomeStr !== "N/A" ? (
              <>Median household income: <strong className="text-gray-800">{incomeStr}</strong></>
            ) : (
              <>Median rent: <strong className="text-gray-800">{rentStr}</strong></>
            )}
          </p>
        </div>
      )}

      {/* Key facts from intake */}
      {results.intake?.key_facts?.length > 0 && (
        <div>
          <p className="section-label mb-2">Key facts from your situation</p>
          <ul className="space-y-1.5">
            {results.intake.key_facts.map((fact, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-blue-400 mt-1 flex-shrink-0">›</span>
                {fact}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NextStepsTab;
