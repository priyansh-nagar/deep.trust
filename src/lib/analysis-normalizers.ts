type Severity = "HIGH" | "MEDIUM" | "LOW";
type CategoryStatus = "pass" | "fail" | "warning" | "neutral";

const VALID_SEVERITIES = new Set<Severity>(["HIGH", "MEDIUM", "LOW"]);
const VALID_STATUSES = new Set<CategoryStatus>(["pass", "fail", "warning", "neutral"]);

const asObject = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asString = (value: unknown, fallback: string) =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const asConfidence = (value: unknown, fallback = 50) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(100, Math.max(1, Math.round(value)));
};

const asStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

const normalizeIssues = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item, index) => {
        const issue = asObject(item);
        const rawSeverity = typeof issue.severity === "string" ? issue.severity.toUpperCase() : "LOW";
        const severity = VALID_SEVERITIES.has(rawSeverity as Severity) ? (rawSeverity as Severity) : "LOW";

        return {
          name: asString(issue.name, `Signal ${index + 1}`),
          description: asString(issue.description, "No additional details were returned for this signal."),
          severity,
        };
      })
    : [];

const normalizeCategories = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item, index) => {
        const category = asObject(item);
        const rawStatus = typeof category.status === "string" ? category.status.toLowerCase() : "neutral";
        const status = VALID_STATUSES.has(rawStatus as CategoryStatus)
          ? (rawStatus as CategoryStatus)
          : "neutral";

        return {
          name: asString(category.name, `Check ${index + 1}`),
          status,
          finding: asString(category.finding, "No concise finding was returned for this category."),
          details: asString(category.details, "Detailed reasoning was not provided for this category."),
        };
      })
    : [];

const normalizeDetailedReport = (
  value: unknown,
  fallbackOverview: string,
  fallbackConclusion: string,
) => {
  const report = asObject(value);
  const categories = normalizeCategories(report.categories);
  const key_evidence = asStringArray(report.key_evidence);
  const hasContent =
    categories.length > 0 ||
    key_evidence.length > 0 ||
    (typeof report.overview === "string" && report.overview.trim().length > 0) ||
    (typeof report.conclusion === "string" && report.conclusion.trim().length > 0);

  if (!hasContent) {
    return undefined;
  }

  return {
    overview: asString(report.overview, fallbackOverview),
    categories,
    key_evidence,
    conclusion: asString(report.conclusion, fallbackConclusion),
  };
};

export const normalizeAudioAnalysis = (value: unknown) => {
  const analysis = asObject(value);
  const metadata = asObject(analysis.audio_metadata);

  return {
    verdict: asString(analysis.verdict, "Uncertain"),
    confidence: asConfidence(analysis.confidence),
    audio_type: asString(analysis.audio_type, "Unknown"),
    summary: asString(
      analysis.summary,
      "The audio analysis completed, but the response was partially incomplete.",
    ),
    detailed_report: normalizeDetailedReport(
      analysis.detailed_report,
      "The model returned a partial audio report, so some sections may be abbreviated.",
      "The available audio signals were combined into a best-effort conclusion.",
    ),
    issues: normalizeIssues(analysis.issues),
    clear: asStringArray(analysis.clear),
    audio_metadata: {
      estimated_duration: asString(metadata.estimated_duration, "Unknown"),
      detected_language: asString(metadata.detected_language, "Unknown"),
      likely_source: asString(metadata.likely_source, "Unknown"),
      suspected_tool: asString(metadata.suspected_tool, "None detected"),
      quality_assessment: asString(
        metadata.quality_assessment,
        "Not enough metadata was returned for a full quality assessment.",
      ),
    },
  };
};

export const normalizeVideoAnalysis = (value: unknown) => {
  const analysis = asObject(value);
  const metadata = asObject(analysis.video_metadata);

  return {
    verdict: asString(analysis.verdict, "Uncertain"),
    confidence: asConfidence(analysis.confidence),
    video_type: asString(analysis.video_type, "Unknown"),
    summary: asString(
      analysis.summary,
      "The video analysis completed, but the response was partially incomplete.",
    ),
    detailed_report: normalizeDetailedReport(
      analysis.detailed_report,
      "The model returned a partial video report, so some sections may be abbreviated.",
      "The available video signals were combined into a best-effort conclusion.",
    ),
    issues: normalizeIssues(analysis.issues),
    clear: asStringArray(analysis.clear),
    video_metadata: {
      estimated_duration: asString(metadata.estimated_duration, "Unknown"),
      resolution_quality: asString(metadata.resolution_quality, "Unknown"),
      likely_source: asString(metadata.likely_source, "Unknown"),
      suspected_tool: asString(metadata.suspected_tool, "None detected"),
      content_type: asString(metadata.content_type, "Unknown"),
    },
  };
};