import React, { useState, useCallback } from "react";

interface Props {
  letter: string;
}

const DemandLetterTab: React.FC<Props> = ({ letter }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(letter);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = letter;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [letter]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([letter], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `demand_letter_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [letter]);

  if (!letter) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No demand letter was generated. Please try again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Instruction note */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-100">
        <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Before sending:</strong> Replace all{" "}
          <code className="bg-amber-100 px-1 rounded font-mono">[BRACKETED]</code>{" "}
          placeholders with your real information. Send via certified mail with return receipt.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-600">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy letter
            </>
          )}
        </button>

        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download .txt
        </button>
      </div>

      {/* Paper */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
        <pre className="text-sm text-gray-800 leading-7 whitespace-pre-wrap font-mono break-words">
          {letter}
        </pre>
      </div>

      {/* Send guidance */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: "📬", text: "Certified mail, return receipt" },
          { icon: "📋", text: "Keep a copy for records" },
          { icon: "🗓", text: "Note the date sent" },
        ].map((tip) => (
          <div key={tip.text} className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-center">
            <div className="text-base mb-1">{tip.icon}</div>
            <p className="text-xs text-gray-500">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DemandLetterTab;
