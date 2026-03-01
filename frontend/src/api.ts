import { AnalyzeRequest, AnalysisResponse } from "./types";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

export async function analyzeRights(
  request: AnalyzeRequest
): Promise<AnalysisResponse> {
  console.log("[JusticeMap] POST /analyze →", { city: request.city, problemLength: request.problem.length });
  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    let message = `Server error (${response.status})`;
    try {
      const error = await response.json();
      message = error.detail || message;
    } catch {
      // Use the default message
    }
    throw new Error(message);
  }

  return response.json() as Promise<AnalysisResponse>;
}
