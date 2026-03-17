import { XCircle, CheckCircle, AlertTriangle, HelpCircle, RotateCcw, FileText, ChevronDown, ChevronUp, Target, Music, Mic, Headphones } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface Issue {
  name: string;
  description: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

interface ReportCategory {
  name: string;
  status: "pass" | "fail" | "warning" | "neutral";
  finding: string;
  details: string;
}

interface DetailedReport {
  overview: string;
  categories: ReportCategory[];
  key_evidence: string[];
  conclusion: string;
}

interface AudioMetadata {
  estimated_duration: string;
  detected_language: string;
  likely_source: string;
  suspected_tool: string;
  quality_assessment: string;
}

export interface AudioAnalysisData {
  verdict: string;
  confidence: number;
  audio_type: string;
  summary: string;
  detailed_report?: DetailedReport;
  issues: Issue[];
  clear: string[];
  audio_metadata?: AudioMetadata;
}

interface AudioAnalysisResultProps {
  data: AudioAnalysisData;
  fileName: string;
  onReset: () => void;
}

const severityColor = {
  HIGH: "bg-destructive/10 border-destructive/30 text-destructive",
  MEDIUM: "bg-warning/10 border-warning/30 text-warning",
  LOW: "bg-warning/10 border-warning/20 text-warning",
};

const severityBadge = {
  HIGH: "bg-destructive text-destructive-foreground",
  MEDIUM: "bg-warning text-warning-foreground",
  LOW: "bg-secondary text-secondary-foreground",
};

const statusConfig = {
  pass: { color: "text-success", bg: "bg-success/5 border-success/20", icon: CheckCircle, label: "PASS" },
  fail: { color: "text-destructive", bg: "bg-destructive/5 border-destructive/20", icon: XCircle, label: "FAIL" },
  warning: { color: "text-warning", bg: "bg-warning/5 border-warning/20", icon: AlertTriangle, label: "WARNING" },
  neutral: { color: "text-muted-foreground", bg: "bg-secondary/30 border-border", icon: HelpCircle, label: "NEUTRAL" },
};

const getVerdictIcon = (verdict: string) => {
  if (verdict.includes("Real")) return <CheckCircle className="w-6 h-6 text-success" />;
  if (verdict.includes("Uncertain")) return <HelpCircle className="w-6 h-6 text-warning" />;
  return <XCircle className="w-6 h-6 text-destructive" />;
};

const getVerdictColor = (verdict: string) => {
  if (verdict.includes("Real")) return "text-success";
  if (verdict.includes("Uncertain")) return "text-warning";
  return "text-destructive";
};

const getAudioTypeIcon = (type: string) => {
  if (type === "Speech") return <Mic className="w-4 h-4" />;
  if (type === "Music") return <Music className="w-4 h-4" />;
  return <Headphones className="w-4 h-4" />;
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

const CategoryCard = ({ category, index }: { category: ReportCategory; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[category.status] || statusConfig.neutral;
  const StatusIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 + index * 0.06 }}
      className={`rounded-xl border ${config.bg} overflow-hidden`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-foreground/[0.02] transition-colors"
      >
        <StatusIcon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm text-foreground">{category.name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${config.color} bg-foreground/5`}>
                {config.label}
              </span>
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{category.finding}</p>
        </div>
      </button>
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-4 pb-4 pl-11"
        >
          <div className="rounded-lg bg-background/50 border border-border p-3">
            <p className="text-xs text-foreground leading-relaxed">{category.details}</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

const AudioAnalysisResult = ({ data, fileName, onReset }: AudioAnalysisResultProps) => {
  const isRealVerdict = data.verdict.includes("Real");
  const barPosition = isRealVerdict ? (100 - data.confidence) : data.confidence;

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto space-y-6"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.12 } } }}
    >
      {/* Audio Info */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Analyzed Audio</h3>
              <p className="text-xs text-muted-foreground">{fileName}</p>
            </div>
          </div>
          <button
            onClick={onReset}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            New Analysis
          </button>
        </div>
        {data.audio_type && (
          <div className="px-6 py-3 bg-secondary/30 flex items-center gap-2">
            {getAudioTypeIcon(data.audio_type)}
            <span className="text-xs font-medium text-foreground">Detected Type: {data.audio_type}</span>
            {data.audio_metadata?.estimated_duration && (
              <span className="text-xs text-muted-foreground ml-auto">Duration: {data.audio_metadata.estimated_duration}</span>
            )}
          </div>
        )}
      </motion.div>

      {/* Verdict */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getVerdictIcon(data.verdict)}
            <div>
              <p className="text-sm text-muted-foreground">Verdict</p>
              <p className={`text-lg font-bold ${getVerdictColor(data.verdict)}`}>{data.verdict}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Confidence</p>
            <motion.p
              className={`text-3xl font-bold ${getVerdictColor(data.verdict)}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              {data.confidence}%
            </motion.p>
          </div>
        </div>
        <div className="relative h-3 rounded-full overflow-hidden gradient-bar">
          <motion.div
            className="absolute top-0 h-full w-1 bg-foreground rounded-full shadow-lg"
            initial={{ left: "0%" }}
            animate={{ left: `${barPosition}%` }}
            transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Real</span>
          <span>AI Generated</span>
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-foreground leading-relaxed">{data.summary}</p>
      </motion.div>

      {/* Detailed Report */}
      {data.detailed_report && (
        <motion.div variants={item} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-primary/5">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              DeepTrust Audio Analysis Report
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Comprehensive forensic breakdown of audio authenticity</p>
          </div>
          <div className="p-6 space-y-5">
            <div className="rounded-xl bg-secondary/30 border border-border p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Overview</p>
              <p className="text-sm text-foreground leading-relaxed">{data.detailed_report.overview}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Category Analysis</p>
              <div className="space-y-2">
                {data.detailed_report.categories.map((cat, i) => (
                  <CategoryCard key={i} category={cat} index={i} />
                ))}
              </div>
            </div>

            {data.detailed_report.key_evidence.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5" />
                  Key Evidence
                </p>
                <div className="space-y-2">
                  {data.detailed_report.key_evidence.map((evidence, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + i * 0.1 }}
                      className="flex items-start gap-2.5 rounded-lg bg-primary/5 border border-primary/15 px-4 py-3"
                    >
                      <span className="text-primary font-bold text-sm mt-0.5 shrink-0">•</span>
                      <p className="text-sm text-foreground leading-relaxed">{evidence}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className={`rounded-xl border p-4 ${
              data.verdict.includes("Real") ? "bg-success/5 border-success/20"
                : data.verdict.includes("Uncertain") ? "bg-warning/5 border-warning/20"
                : "bg-destructive/5 border-destructive/20"
            }`}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Conclusion</p>
              <p className="text-sm text-foreground leading-relaxed font-medium">{data.detailed_report.conclusion}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Detection Signals */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <span className="text-lg">🔍</span> Detection Signals
        </h3>

        {data.issues.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3">Issues Detected</p>
            <div className="space-y-3">
              {data.issues.map((issue, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className={`rounded-xl border p-4 ${severityColor[issue.severity]}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-semibold text-sm">{issue.name}</span>
                      </div>
                      <p className="text-xs opacity-80 leading-relaxed">{issue.description}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md whitespace-nowrap ${severityBadge[issue.severity]}`}>
                      {issue.severity}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {data.clear.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-success uppercase tracking-wider mb-3">Clear</p>
            <div className="grid grid-cols-2 gap-2">
              {data.clear.map((c, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.08 }}
                  className="flex items-center gap-2 rounded-lg bg-success/5 border border-success/20 px-3 py-2"
                >
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm text-foreground">{c}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Audio Metadata */}
      {data.audio_metadata && (
        <motion.div variants={item} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-primary" />
            Audio Metadata
          </h3>
          <div className="space-y-3">
            {[
              { label: "Detected Language", value: data.audio_metadata.detected_language },
              { label: "Likely Source", value: data.audio_metadata.likely_source },
              { label: "Suspected Tool", value: data.audio_metadata.suspected_tool },
              { label: "Quality Assessment", value: data.audio_metadata.quality_assessment },
            ].map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 + i * 0.08 }}
                className="rounded-lg bg-secondary/30 border border-border px-4 py-3"
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{row.label}</p>
                <p className="text-sm text-foreground leading-relaxed">{row.value}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default AudioAnalysisResult;
